import fetch from "node-fetch";

export interface WooCommerceConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  publishMode?: "publish" | "draft"; // Auto publish vs draft review
  status?: "connected" | "disconnected" | "testing" | "error";
  lastTestedAt?: string;
  storeName?: string;
  currency?: string;
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

// Basic Auth header generator for WooCommerce & WordPress REST API
function getAuthHeader(consumerKey: string, consumerSecret: string): string {
  const credentials = `${consumerKey}:${consumerSecret}`;
  const base64 = Buffer.from(credentials).toString("base64");
  return `Basic ${base64}`;
}

// Normalize Site URL
function normalizeUrl(url: string): string {
  let clean = url.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  return clean.replace(/\/$/, "");
}

/**
 * 1. connect_store / test_connection
 * Tests connection to WordPress WooCommerce REST API
 */
export async function testConnection(config: WooCommerceConfig) {
  const siteUrl = normalizeUrl(config.siteUrl);
  if (!siteUrl || !config.consumerKey || !config.consumerSecret) {
    throw new Error("请提供完整的 WordPress 网址、Consumer Key 与 Consumer Secret");
  }

  const endpoint = `${siteUrl}/wp-json/wc/v3/system_status`;
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

    if (res.ok) {
      const data: any = await res.json();
      return {
        success: true,
        siteUrl,
        storeName: data?.environment?.site_title || "WooCommerce Store",
        version: data?.environment?.version || "8.x",
        currency: data?.settings?.currency || "USD",
        testedAt: new Date().toISOString(),
      };
    } else {
      // Try fallback GET /wp-json/wc/v3/products?per_page=1
      const fallbackUrl = `${siteUrl}/wp-json/wc/v3/products?per_page=1`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "User-Agent": "AI-Ecom-Studio-Publisher/1.0",
          Accept: "application/json",
        },
      });

      if (fallbackRes.ok) {
        return {
          success: true,
          siteUrl,
          storeName: "WooCommerce Store",
          version: "REST API v3 Ready",
          currency: "USD",
          testedAt: new Date().toISOString(),
        };
      }

      const errText = await res.text();
      let msg = `HTTP ${res.status} ${res.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) msg = parsed.message;
      } catch {
        if (errText) msg = errText.substring(0, 200);
      }

      throw new Error(`连接失败 (${res.status}): ${msg}`);
    }
  } catch (err: any) {
    if (err.message.includes("fetch failed") || err.message.includes("ENOTFOUND")) {
      throw new Error(`无法连接到目标站点 ${siteUrl}，请检查网址拼写及服务器网络是否正常`);
    }
    throw err;
  }
}

/**
 * 2. upload_media
 * Uploads product image to WordPress Media Library via /wp-json/wp/v2/media
 */
export async function uploadMedia(
  config: WooCommerceConfig,
  imageUrl: string,
  filename: string = "optimized_image.jpg"
): Promise<{ media_id?: number; image_url: string }> {
  const siteUrl = normalizeUrl(config.siteUrl);
  const endpoint = `${siteUrl}/wp-json/wp/v2/media`;
  const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);

  try {
    // If imageUrl is a web URL, download the buffer
    let imageBuffer: Buffer;
    let contentType = "image/jpeg";

    if (imageUrl.startsWith("data:image")) {
      const parts = imageUrl.split(";base64,");
      contentType = parts[0].replace("data:", "");
      imageBuffer = Buffer.from(parts[1], "base64");
    } else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        throw new Error(`从源地址拉取图片失败 (${imgRes.status})`);
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      const ct = imgRes.headers.get("content-type");
      if (ct) contentType = ct;
    } else {
      // Local or mock fallback
      return { image_url: imageUrl };
    }

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

    if (res.ok) {
      const mediaData: any = await res.json();
      return {
        media_id: mediaData.id,
        image_url: mediaData.source_url || mediaData.guid?.rendered || imageUrl,
      };
    } else {
      console.warn(`[WP Media API] Media upload returned ${res.status}, proceeding with external URL directly`);
      return { image_url: imageUrl };
    }
  } catch (err: any) {
    console.warn("[WP Media API] Upload warning:", err.message);
    // Graceful fallback to original image URL
    return { image_url: imageUrl };
  }
}

/**
 * 3. create_product
 * Creates product on WooCommerce via /wp-json/wc/v3/products
 */
export async function createProduct(
  config: WooCommerceConfig,
  productData: any,
  publishMode: "publish" | "draft" = "publish"
): Promise<{ id: number; permalink: string; status: string }> {
  const siteUrl = normalizeUrl(config.siteUrl);
  const endpoint = `${siteUrl}/wp-json/wc/v3/products`;
  const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);

  // Format categories
  const categoriesPayload = (productData.categories || ["3C数码"]).map((catName: string, idx: number) => {
    return typeof catName === "string" ? { name: catName } : catName;
  });

  // Format tags
  const tagsPayload = (productData.tags || ["AI精品"]).map((tagName: string) => {
    return typeof tagName === "string" ? { name: tagName } : tagName;
  });

  // Format images
  let imagesPayload = [];
  if (productData.media_id) {
    imagesPayload.push({ id: productData.media_id });
  } else if (productData.optimizedMainImage || productData.mainImage) {
    imagesPayload.push({ src: productData.optimizedMainImage || productData.mainImage });
  }

  const payload = {
    name: productData.title || productData.name || "AI 精选优质商品",
    slug: productData.seo?.slug || productData.slug || ("prod-" + Date.now()),
    type: "simple",
    status: publishMode, // "publish" or "draft"
    description: productData.longDescription || productData.ai_description || productData.description || "",
    short_description: productData.shortDescription || productData.ai_short_description || productData.short_description || "",
    regular_price: String(productData.price || productData.regular_price || "189"),
    sale_price: productData.promoPrice ? String(productData.promoPrice) : (productData.sale_price ? String(productData.sale_price) : undefined),
    sku: productData.sku || ("SKU-WC-" + Math.floor(100000 + Math.random() * 900000)),
    manage_stock: true,
    stock_quantity: productData.stock || 200,
    weight: String(productData.weight || "0.35"),
    categories: categoriesPayload,
    tags: tagsPayload,
    images: imagesPayload,
    attributes: productData.attributesList || productData.attributes || []
  };

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

  if (res.ok) {
    const data: any = await res.json();
    return {
      id: data.id,
      permalink: data.permalink || `${siteUrl}/product/${data.slug || payload.slug}`,
      status: data.status || publishMode,
    };
  } else {
    const errText = await res.text();
    let errMsg = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.message) errMsg = parsed.message;
    } catch {
      if (errText) errMsg = errText.substring(0, 200);
    }
    throw new Error(`WooCommerce REST API 商品创建失败 (${res.status}): ${errMsg}`);
  }
}

/**
 * 4. update_product
 * Updates product on WooCommerce via PUT /wp-json/wc/v3/products/<id>
 */
export async function updateProduct(
  config: WooCommerceConfig,
  wordpressProductId: number,
  productData: any
) {
  const siteUrl = normalizeUrl(config.siteUrl);
  const endpoint = `${siteUrl}/wp-json/wc/v3/products/${wordpressProductId}`;
  const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);

  const payload = {
    name: productData.title || productData.name,
    description: productData.longDescription || productData.description,
    short_description: productData.shortDescription || productData.short_description,
    regular_price: String(productData.price || productData.regular_price),
    sale_price: productData.promoPrice ? String(productData.promoPrice) : undefined,
    stock_quantity: productData.stock,
    status: productData.status || "publish",
  };

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

  if (res.ok) {
    const data: any = await res.json();
    return {
      id: data.id,
      permalink: data.permalink,
      status: data.status,
    };
  } else {
    const errText = await res.text();
    throw new Error(`WooCommerce 商品更新失败 (${res.status}): ${errText.substring(0, 150)}`);
  }
}

/**
 * 5. sync_product_status
 * Queries WooCommerce for current product status (publish, draft, trash)
 */
export async function syncProductStatus(
  config: WooCommerceConfig,
  wordpressProductId: number
): Promise<{ id: number; status: string; permalink: string; name: string }> {
  const siteUrl = normalizeUrl(config.siteUrl);
  const endpoint = `${siteUrl}/wp-json/wc/v3/products/${wordpressProductId}`;
  const authHeader = getAuthHeader(config.consumerKey, config.consumerSecret);

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "User-Agent": "AI-Ecom-Studio-Publisher/1.0",
      Accept: "application/json",
    },
  });

  if (res.ok) {
    const data: any = await res.json();
    return {
      id: data.id,
      status: data.status,
      permalink: data.permalink,
      name: data.name,
    };
  } else {
    throw new Error(`无法查询 WooCommerce 商品状态 (HTTP ${res.status})`);
  }
}
