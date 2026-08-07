import fs from "fs";
import path from "path";
import crypto from "crypto";
import { addSystemLog } from "../logging/logService";

const UPLOADS_TEMP_DIR = path.join(process.cwd(), "public", "uploads", "temp");

function ensureUploadsDirExists() {
  if (!fs.existsSync(UPLOADS_TEMP_DIR)) {
    fs.mkdirSync(UPLOADS_TEMP_DIR, { recursive: true });
  }
}

/**
 * Save Base64 image string to local disk in /public/uploads/temp/ and return public HTTP/HTTPS URL.
 */
export function saveBase64ImageToLocal(base64Str: string, hostOrigin: string = ""): string | null {
  try {
    const publicTemp = path.join(process.cwd(), "public", "uploads", "temp");
    const distTemp = path.join(process.cwd(), "dist", "uploads", "temp");
    if (!fs.existsSync(publicTemp)) fs.mkdirSync(publicTemp, { recursive: true });
    if (!fs.existsSync(distTemp)) fs.mkdirSync(distTemp, { recursive: true });

    if (typeof base64Str !== "string") return null;
    const trimmed = base64Str.trim();

    let mimeType = "image/jpeg";
    let base64Data = trimmed;

    if (trimmed.startsWith("data:image")) {
      const parts = trimmed.split(";base64,");
      if (parts.length < 2) return null;
      mimeType = parts[0].replace("data:", "") || "image/jpeg";
      base64Data = parts[1];
    }

    const ext = mimeType.split("/")[1]?.replace("svg+xml", "svg") || "jpg";
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length === 0) return null;

    const hash = crypto.createHash("md5").update(buffer).digest("hex").substring(0, 10);
    const filename = `img_${Date.now()}_${hash}.${ext}`;
    const filePathPublic = path.join(publicTemp, filename);
    const filePathDist = path.join(distTemp, filename);

    fs.writeFileSync(filePathPublic, buffer);
    try {
      fs.writeFileSync(filePathDist, buffer);
    } catch (e) {
      // ignore dist write if dist doesn't exist yet
    }

    console.log(`[Base64 Local Saver] Saved image (${buffer.length} bytes) -> ${filePathPublic}`);

    const relativePath = `/uploads/temp/${filename}`;
    if (hostOrigin && hostOrigin.startsWith("http")) {
      const cleanOrigin = hostOrigin.replace(/\/+$/, "");
      return `${cleanOrigin}${relativePath}`;
    }

    return relativePath;
  } catch (err: any) {
    console.error(`[Base64 Local Saver Error]:`, err.message || err);
    return null;
  }
}

export interface WooCommerceConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  publishMode?: "publish" | "draft";
  status?: "connected" | "disconnected" | "testing" | "error";
  lastTestedAt?: string;
  storeName?: string;
  currency?: string;
  wcVersion?: string;
  productsCount?: number;
}

export interface WordPressPostRecord {
  id: string;
  product_id: string;
  wordpress_product_id: number;
  status: "pending" | "publishing" | "published" | "draft" | "failed";
  product_url: string;
  created_time: string;
  updated_time: string;
  error_log?: string;
  media_id?: number;
  media_url?: string;
}

function getAuthHeader(consumerKey: string, consumerSecret: string): string {
  const credentials = `${consumerKey}:${consumerSecret}`;
  const base64 = Buffer.from(credentials).toString("base64");
  return `Basic ${base64}`;
}

function normalizeUrl(url: string): string {
  let clean = url.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  return clean.replace(/\/$/, "");
}

/**
 * 1. Test WooCommerce REST API Connection
 */
export async function testConnection(config: WooCommerceConfig) {
  const siteUrl = normalizeUrl(config.siteUrl);
  const startTime = Date.now();

  if (!siteUrl || !config.consumerKey || !config.consumerSecret) {
    const latencyMs = Date.now() - startTime;
    addSystemLog({
      type: "woocommerce",
      action: "test_connection",
      target: siteUrl || "empty_url",
      status: "error",
      latencyMs,
      errorMessage: "请提供完整的 WordPress 网址、Consumer Key 与 Consumer Secret"
    });
    throw new Error("请提供完整的 WordPress 网址、Consumer Key 与 Consumer Secret");
  }

  const endpoint = `${siteUrl}/wp-json/wc/v3/products?per_page=1`;
  const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "User-Agent": "AI-Ecom-Studio-Publisher/1.0",
        Accept: "application/json",
      },
    });

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      const totalHeader = res.headers.get("x-wp-total");
      const totalProducts = totalHeader ? parseInt(totalHeader, 10) : 0;
      
      // Secondary call to system status if permitted for version & currency info
      let storeName = "WooCommerce Store";
      let version = "v3 API Active";
      let currency = "USD";

      try {
        const sysRes = await fetch(`${siteUrl}/wp-json/wc/v3/system_status`, {
          method: "GET",
          headers: { Authorization: authHeader, Accept: "application/json" }
        });
        if (sysRes.ok) {
          const sysData: any = await sysRes.json();
          storeName = sysData?.environment?.site_title || sysData?.settings?.store_name || storeName;
          version = sysData?.environment?.version ? `WooCommerce v${sysData.environment.version}` : version;
          currency = sysData?.settings?.currency || currency;
        }
      } catch (sysErr) {
        // Non-blocking
      }

      addSystemLog({
        type: "woocommerce",
        action: "test_connection",
        target: siteUrl,
        status: "success",
        httpCode: res.status,
        latencyMs,
        responsePayload: { storeName, version, currency, totalProducts }
      });

      return {
        success: true,
        siteUrl,
        storeName,
        version,
        currency,
        totalProducts,
        latencyMs,
        testedAt: new Date().toISOString()
      };
    } else {
      const errText = await res.text();
      let detail = errText.substring(0, 150);
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) detail = parsed.message;
      } catch {}

      let formattedError = `HTTP ${res.status}: ${detail}`;

      if (res.status === 401) {
        formattedError = `401 Unauthorized: Consumer Key 或 Consumer Secret 无效/权限不足`;
      } else if (res.status === 403) {
        formattedError = `403 Forbidden: 服务器拒绝访问，请检查 WordPress 账户权限或防火墙拦截`;
      } else if (res.status === 404) {
        formattedError = `404 Not Found: 未找到 WooCommerce REST API 路径 (/wp-json/wc/v3/)，请确认目标站点已启用 WooCommerce 插件`;
      }

      addSystemLog({
        type: "woocommerce",
        action: "test_connection",
        target: siteUrl,
        status: "error",
        httpCode: res.status,
        latencyMs,
        errorMessage: formattedError
      });

      throw new Error(formattedError);
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    let errorMsg = err.message || "无法连接到目标 WooCommerce 站点";

    if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("EAI_AGAIN")) {
      errorMsg = `DNS 域名解析失败: 无法解析域名 ${siteUrl}`;
    } else if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ECONNRESET")) {
      errorMsg = `网络连接拒绝: 目标服务器端口未开放或拒绝建立连接 (${siteUrl})`;
    } else if (errorMsg.includes("CERT_") || errorMsg.includes("SSL")) {
      errorMsg = `SSL 证书错误: 目标站点 SSL 证书验证失败 (${siteUrl})`;
    } else if (errorMsg.includes("ETIMEDOUT") || errorMsg.includes("timeout")) {
      errorMsg = `请求超时: 连接 WordPress 服务器超时 (10s)`;
    }

    addSystemLog({
      type: "woocommerce",
      action: "test_connection",
      target: siteUrl,
      status: "error",
      latencyMs,
      errorMessage: errorMsg
    });

    throw new Error(errorMsg);
  }
}

/**
 * Helper to check if a string is Base64 image data
 */
function isBase64Image(str: any): boolean {
  return typeof str === "string" && str.trim().startsWith("data:image");
}

/**
 * 2. Upload Product Media to WordPress Library (POST /wp-json/wp/v2/media) - Non-blocking fallback
 */
export async function uploadMedia(
  config: WooCommerceConfig,
  imageUrl: string,
  filename: string = "product_image.jpg"
): Promise<{ media_id?: number; image_url: string }> {
  const siteUrl = normalizeUrl(config.siteUrl);
  const endpoint = `${siteUrl}/wp-json/wp/v2/media`;
  const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);
  const startTime = Date.now();

  try {
    let imageBuffer: Buffer;
    let contentType = "image/jpeg";

    if (isBase64Image(imageUrl)) {
      const parts = imageUrl.split(";base64,");
      contentType = parts[0].replace("data:", "") || "image/jpeg";
      imageBuffer = Buffer.from(parts[1], "base64");
    } else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      console.log(`[WP Media Upload] 下载远程公网图片素材: ${imageUrl}`);
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        console.warn(`[WP Media Upload Warning] 无法下载图片 (HTTP ${imgRes.status})，降级使用原始 URL`);
        return { image_url: imageUrl };
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      const ct = imgRes.headers.get("content-type");
      if (ct) contentType = ct;
    } else if (imageUrl.startsWith("/uploads/")) {
      const publicPath = path.join(process.cwd(), "public", imageUrl);
      const distPath = path.join(process.cwd(), "dist", imageUrl);
      let localFilePath = publicPath;
      if (!fs.existsSync(localFilePath) && fs.existsSync(distPath)) {
        localFilePath = distPath;
      }
      if (fs.existsSync(localFilePath)) {
        console.log(`[WP Media Upload] 读取本地磁盘图片文件: ${localFilePath}`);
        imageBuffer = fs.readFileSync(localFilePath);
        if (imageUrl.endsWith(".png")) contentType = "image/png";
        else if (imageUrl.endsWith(".webp")) contentType = "image/webp";
        else contentType = "image/jpeg";
      } else {
        return { image_url: imageUrl };
      }
    } else {
      return { image_url: imageUrl };
    }

    console.log(`[WP Media Uploading] POST ${endpoint} (Filename: ${filename})`);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "User-Agent": "AI-Ecom-Studio-Publisher/1.0",
      },
      body: imageBuffer,
    });

    const latencyMs = Date.now() - startTime;
    const resText = await res.text();

    if (res.ok) {
      let mediaData: any;
      try {
        mediaData = JSON.parse(resText);
      } catch {
        return { image_url: imageUrl };
      }

      const sourceUrl = mediaData.source_url || mediaData.guid?.rendered || imageUrl;
      console.log(`[WP Media Upload Success] Media ID: #${mediaData.id} | Public URL: ${sourceUrl}`);

      addSystemLog({
        type: "woocommerce",
        action: "upload_media",
        target: siteUrl,
        status: "success",
        httpCode: res.status,
        latencyMs,
        responsePayload: { mediaId: mediaData.id, sourceUrl }
      });

      return {
        media_id: mediaData.id,
        image_url: sourceUrl,
      };
    } else {
      console.warn(`[WP Media Upload Warning] WP Core 媒体 API 返回 HTTP ${res.status} (ck_/cs_ 密钥无 WP 核心权限)，自动降级使用图片数据直接发送给 WooCommerce REST API`);
      return { image_url: imageUrl };
    }
  } catch (err: any) {
    console.warn(`[WP Media Upload Exception]: ${err.message || err}，降级使用原始图片 URL`);
    return { image_url: imageUrl };
  }
}

/**
 * Pre-processes product images prior to WooCommerce product creation/update.
 * Packages HTTP/HTTPS URLs directly or converts Base64 images to local static HTTP/HTTPS URLs.
 */
export async function prepareProductImages(
  config: WooCommerceConfig,
  productData: any,
  explicitHostOrigin?: string
): Promise<Array<{ id?: number; src?: string }>> {
  console.log(`[Image Pre-processor] 打包与处理商品图片供 WooCommerce REST API (/wc/v3/products) 使用...`);

  const finalWcImages: Array<{ id?: number; src?: string }> = [];
  const processedUrls = new Set<string>();

  const hostOrigin = explicitHostOrigin || productData._hostOrigin || process.env.APP_URL || process.env.DEV_SERVER_URL || "http://localhost:3000";

  // 1. If media_id already exists and is valid
  if (productData.media_id && typeof productData.media_id === "number") {
    finalWcImages.push({ id: productData.media_id });
  }

  // Collect all potential image sources
  const rawCandidates: Array<string> = [];

  const mainImg = productData.optimizedMainImage || productData.mainImage;
  if (mainImg && typeof mainImg === "string") {
    rawCandidates.push(mainImg);
  }

  if (Array.isArray(productData.images)) {
    productData.images.forEach((imgItem: any) => {
      if (typeof imgItem === "string") {
        rawCandidates.push(imgItem);
      } else if (imgItem && typeof imgItem.src === "string") {
        rawCandidates.push(imgItem.src);
      } else if (imgItem && typeof imgItem.id === "number") {
        finalWcImages.push({ id: imgItem.id });
      }
    });
  }

  const gallery = productData.gallery || productData.galleryImages;
  if (Array.isArray(gallery)) {
    gallery.forEach((gItem: any) => {
      if (typeof gItem === "string") {
        rawCandidates.push(gItem);
      } else if (gItem && typeof gItem.src === "string") {
        rawCandidates.push(gItem.src);
      }
    });
  }

  // Iterate candidates and convert Base64 -> Local Static Public URL
  for (const itemSrc of rawCandidates) {
    const rawSrc = itemSrc.trim();
    if (!rawSrc || processedUrls.has(rawSrc)) continue;
    processedUrls.add(rawSrc);

    if (rawSrc.startsWith("http://") || rawSrc.startsWith("https://")) {
      finalWcImages.push({ src: rawSrc });
    } else if (rawSrc.startsWith("/uploads/")) {
      const cleanOrigin = hostOrigin ? hostOrigin.replace(/\/+$/, "") : "";
      if (cleanOrigin) {
        finalWcImages.push({ src: `${cleanOrigin}${rawSrc}` });
      } else {
        finalWcImages.push({ src: rawSrc });
      }
    } else if (isBase64Image(rawSrc) || rawSrc.length > 300) {
      console.log(`[Image Pre-processor] 拦截到 Base64 格式图片，解码并转存至本地静态服务...`);
      const publicUrl = saveBase64ImageToLocal(rawSrc, hostOrigin);
      if (publicUrl && (publicUrl.startsWith("http://") || publicUrl.startsWith("https://"))) {
        console.log(`[Image Pre-processor Success] Base64 图片转存成功，公网 URL: ${publicUrl}`);
        finalWcImages.push({ src: publicUrl });
      } else {
        console.warn(`[Image Pre-processor Warning] Base64 转存失败或未能生成公网 URL`);
      }
    } else {
      console.warn(`[Image Pre-processor Warning] 格式未识别的图片跳过: ${rawSrc.substring(0, 40)}`);
    }
  }

  // 2. Fallback to original productUrl / public image link if no valid HTTP/HTTPS image exists
  const hasValidHttpImage = finalWcImages.some(img => img.src && (img.src.startsWith("http://") || img.src.startsWith("https://")));
  if (!hasValidHttpImage) {
    const fallbackCandidate = productData.productUrl || productData.originalUrl || productData.sourceUrl || productData.originalImage;
    if (typeof fallbackCandidate === "string" && (fallbackCandidate.startsWith("http://") || fallbackCandidate.startsWith("https://"))) {
      console.log(`[Image Pre-processor Fallback] 降级使用商品原始公网图片/网页 URL: ${fallbackCandidate}`);
      finalWcImages.push({ src: fallbackCandidate });
    }
  }

  // 3. Strict Payload Validation: Ensure NO Base64 strings reach WooCommerce REST API
  const validatedImages = finalWcImages.filter(item => {
    if (item.id && typeof item.id === "number") return true;
    if (item.src && typeof item.src === "string") {
      const isHttp = item.src.startsWith("http://") || item.src.startsWith("https://");
      const isDataUri = item.src.includes("data:image");
      return isHttp && !isDataUri;
    }
    return false;
  });

  console.log(`[Image Pre-processor Finished] 最终交付 WooCommerce REST API 的已校验图片数组 (${validatedImages.length} 张):`, validatedImages.map(i => i.src || i.id));
  return validatedImages;
}

/**
 * 3. Create Product on WooCommerce via REST API POST /wp-json/wc/v3/products
 */
export async function createProduct(
  config: WooCommerceConfig,
  productData: any,
  publishMode: "publish" | "draft" = "publish"
): Promise<{ id: number; permalink: string; status: string; sku: string }> {
  const siteUrl = normalizeUrl(config.siteUrl);
  const endpoint = `${siteUrl}/wp-json/wc/v3/products`;
  const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);
  const startTime = Date.now();

  const categoriesPayload = (productData.categories || ["3C数码"]).map((catName: string) => {
    return typeof catName === "string" ? { name: catName } : catName;
  });

  const tagsPayload = (productData.tags || ["AI精品"]).map((tagName: string) => {
    return typeof tagName === "string" ? { name: tagName } : tagName;
  });

  // Step 1: Pre-process images (Base64 -> WP Media Public URL)
  let imagesPayload: Array<{ id?: number; src?: string }> = [];
  try {
    imagesPayload = await prepareProductImages(config, productData);
  } catch (imgErr: any) {
    console.error(`[WooCommerce Create Product Error - Image Pre-processing Failed]:`, imgErr.message || imgErr);
    throw new Error(`商品创建中断，图片预处理失败: ${imgErr.message}`);
  }

  const generatedSku = productData.sku || ("AIECOM-CAT-" + Math.floor(100000 + Math.random() * 900000));
  const regularPrice = String(productData.regular_price || productData.regularPrice || productData.price || "129.00");
  const salePrice = productData.sale_price ? String(productData.sale_price) : (productData.promoPrice ? String(productData.promoPrice) : undefined);
  const manageStock = productData.manage_stock !== undefined ? Boolean(productData.manage_stock) : true;
  const stockQuantity = productData.stock_quantity !== undefined ? Number(productData.stock_quantity) : (productData.stock !== undefined ? Number(productData.stock) : Math.floor(50 + Math.random() * 151));

  const payload = {
    name: productData.title || productData.name || "AI 智能商品",
    slug: productData.seo?.slug || productData.slug || ("prod-" + Date.now()),
    type: "simple",
    status: publishMode,
    description: productData.longDescription || productData.ai_description || productData.description || "",
    short_description: productData.shortDescription || productData.ai_short_description || productData.short_description || "",
    regular_price: regularPrice,
    sale_price: salePrice,
    sku: generatedSku,
    manage_stock: manageStock,
    stock_quantity: stockQuantity,
    weight: String(productData.weight || "0.35"),
    categories: categoriesPayload,
    tags: tagsPayload,
    images: imagesPayload,
    attributes: productData.attributesList || productData.attributes || []
  };

  console.log(`[WooCommerce Create Product] POST ${endpoint} (SKU: ${payload.sku}, Images Count: ${payload.images.length})`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": "AI-Ecom-Studio-Publisher/1.0",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const latencyMs = Date.now() - startTime;
    const resText = await res.text();

    if (res.ok) {
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch {
        data = {};
      }

      const createdProduct = {
        id: data.id,
        permalink: data.permalink || `${siteUrl}/product/${data.slug || payload.slug}`,
        status: data.status || publishMode,
        sku: data.sku || generatedSku
      };

      console.log(`[WooCommerce Create Product Success] Created Product ID: #${createdProduct.id}, Permalink: ${createdProduct.permalink}`);

      addSystemLog({
        type: "woocommerce",
        action: "create_product",
        target: siteUrl,
        status: "success",
        httpCode: res.status,
        latencyMs,
        requestPayload: { name: payload.name, sku: payload.sku, price: payload.regular_price },
        responsePayload: createdProduct
      });

      return createdProduct;
    } else {
      console.error(`[WooCommerce Create Product Failed] HTTP Status: ${res.status} ${res.statusText}`);
      console.error(`[WooCommerce Create Product Response Body]:`, resText);

      let errMsg = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(resText);
        if (parsed.message) errMsg = parsed.message;
      } catch {
        if (resText) errMsg = resText.substring(0, 200);
      }

      const fullErrorMsg = `WooCommerce REST API 商品创建失败 (${res.status}): ${errMsg}`;

      addSystemLog({
        type: "woocommerce",
        action: "create_product",
        target: siteUrl,
        status: "error",
        httpCode: res.status,
        latencyMs,
        requestPayload: { name: payload.name, sku: payload.sku },
        errorMessage: fullErrorMsg
      });

      throw new Error(fullErrorMsg);
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error(`[WooCommerce Create Product Exception]:`, err.message || err);

    addSystemLog({
      type: "woocommerce",
      action: "create_product",
      target: siteUrl,
      status: "error",
      latencyMs,
      errorMessage: err.message
    });
    throw err;
  }
}

/**
 * 4. Sync Single Product Status from WooCommerce REST API
 */
export async function syncProductStatus(
  config: WooCommerceConfig,
  wcProductId: number
) {
  const siteUrl = normalizeUrl(config.siteUrl);
  const endpoint = `${siteUrl}/wp-json/wc/v3/products/${wcProductId}`;
  const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);
  const startTime = Date.now();

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "User-Agent": "AI-Ecom-Studio-Publisher/1.0",
        Accept: "application/json",
      },
    });

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      const data: any = await res.json();
      addSystemLog({
        type: "woocommerce",
        action: "sync_product",
        target: siteUrl,
        status: "success",
        httpCode: res.status,
        latencyMs,
        responsePayload: { id: data.id, status: data.status, permalink: data.permalink }
      });

      return {
        success: true,
        id: data.id,
        status: data.status,
        permalink: data.permalink,
        price: data.price,
        stock: data.stock_quantity,
        sku: data.sku,
        updatedAt: data.date_modified || new Date().toISOString()
      };
    } else {
      const errText = await res.text();
      addSystemLog({
        type: "woocommerce",
        action: "sync_product",
        target: siteUrl,
        status: "error",
        httpCode: res.status,
        latencyMs,
        errorMessage: `Sync failed HTTP ${res.status}: ${errText.substring(0, 100)}`
      });
      throw new Error(`WooCommerce 同步失败 HTTP ${res.status}`);
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    addSystemLog({
      type: "woocommerce",
      action: "sync_product",
      target: siteUrl,
      status: "error",
      latencyMs,
      errorMessage: err.message
    });
    throw err;
  }
}

/**
 * 5. Update Existing Product on WooCommerce REST API
 */
export async function updateProduct(
  config: WooCommerceConfig,
  wcProductId: number,
  updateData: any
) {
  const siteUrl = normalizeUrl(config.siteUrl);
  const endpoint = `${siteUrl}/wp-json/wc/v3/products/${wcProductId}`;
  const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);
  const startTime = Date.now();

  const payload = { ...updateData };

  // Pre-process images if present in updateData
  if (updateData.optimizedMainImage || updateData.mainImage || updateData.images || updateData.gallery) {
    try {
      const processedImages = await prepareProductImages(config, updateData);
      if (processedImages.length > 0) {
        payload.images = processedImages;
      }
    } catch (imgErr: any) {
      console.error(`[WooCommerce Update Product Image Pre-process Error]:`, imgErr.message || imgErr);
    }
  }

  console.log(`[WooCommerce Update Product] PUT ${endpoint}`);

  try {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": "AI-Ecom-Studio-Publisher/1.0",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const latencyMs = Date.now() - startTime;
    const resText = await res.text();

    if (res.ok) {
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch {
        data = {};
      }

      console.log(`[WooCommerce Update Product Success] Updated Product ID: #${data.id}`);

      addSystemLog({
        type: "woocommerce",
        action: "update_product",
        target: siteUrl,
        status: "success",
        httpCode: res.status,
        latencyMs,
        responsePayload: { id: data.id, status: data.status, permalink: data.permalink }
      });
      return {
        id: data.id,
        permalink: data.permalink,
        status: data.status,
        sku: data.sku
      };
    } else {
      console.error(`[WooCommerce Update Product Failed] HTTP Status: ${res.status}`);
      console.error(`[WooCommerce Update Product Response Body]:`, resText);

      addSystemLog({
        type: "woocommerce",
        action: "update_product",
        target: siteUrl,
        status: "error",
        httpCode: res.status,
        latencyMs,
        errorMessage: `Update failed HTTP ${res.status}: ${resText.substring(0, 150)}`
      });
      throw new Error(`WooCommerce 更新失败 (HTTP ${res.status}): ${resText.substring(0, 200)}`);
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error(`[WooCommerce Update Product Exception]:`, err.message || err);

    addSystemLog({
      type: "woocommerce",
      action: "update_product",
      target: siteUrl,
      status: "error",
      latencyMs,
      errorMessage: err.message
    });
    throw err;
  }
}

