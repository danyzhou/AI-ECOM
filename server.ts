import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { runGeminiProductAgent } from "./server/gemini/productContentAgent.js";
import {
  getAIConfig,
  updateAIConfig,
  testProviderConnection,
  executeImageVisionAnalysis,
  executeProductContentGeneration,
  getMaskedAIConfig,
  runGeminiVisionStep,
  runGeminiContentStep
} from "./server/ai/aiManager.js";
import { callGeminiWithRetry, callOpenAICompatibleAPI, extractAndParseJSON, ensureSlimImageInput, processProductImageWithAI } from "./server/ai/geminiService.js";
import { getSystemLogs, clearSystemLogs } from "./server/logging/logService.js";
import {
  getSKUConfig,
  updateSKUConfig,
  generateNextSKU
} from "./server/sku/skuService.js";
import {
  getStores,
  getRawStoreById,
  addStore,
  updateStore,
  deleteStore,
  testStoreConnectionById,
  getAllPublications,
  getPublicationsByProduct,
  createMultiStorePublicationTasks,
  recordPublicationLog,
  updatePublicationLogStatus
} from "./server/stores/storeService.js";
import {
  testConnection,
  uploadMedia,
  createProduct,
  updateProduct,
  syncProductStatus,
  WooCommerceConfig as WcConfigType,
  WordPressPostRecord
} from "./server/woocommerce/publisherService.js";

import {
  initDatabase,
  getDbProducts,
  saveDbProduct,
  deleteDbProduct,
  getDbTasks,
  saveDbTask,
  deleteDbTask,
  getSystemDomain,
  saveSystemDomain,
  getDbConfig,
  saveDbConfig,
  testDatabaseConnection
} from "./server/db/databaseService.js";
import {
  seedAdminUser,
  findUserByUsernameOrEmail,
  createUserInDB,
  verifyUserPassword,
  generateJWTToken,
  verifyJWTToken,
  updateAdminCredentials,
  DBUserRecord
} from "./server/db/userService.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Ensure public uploads temp directory exists and serve static uploads
const UPLOADS_TEMP_DIR = path.join(process.cwd(), "public", "uploads", "temp");
if (!fs.existsSync(UPLOADS_TEMP_DIR)) {
  fs.mkdirSync(UPLOADS_TEMP_DIR, { recursive: true });
}
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// ----------------------------------------------------
// Password Encryption & Security Utilities (PBKDF2)
// ----------------------------------------------------

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const userSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, userSalt, 1000, 64, "sha512").toString("hex");
  return { hash, salt: userSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return testHash === hash;
}

// Custom Express Request interface with User payload
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
    email: string;
    role: "admin" | "operations";
    avatar: string;
  };
  token?: string;
}

// ----------------------------------------------------
// User Database & Session Store (In-Memory / SQLite ready)
// ----------------------------------------------------

interface UserRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "admin" | "operations";
  avatar: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

// Pre-seeded User Database with encrypted credentials from environment variables
const envAdminUser = (process.env.ADMIN_USER || "admin").trim().toLowerCase();
const envAdminPass = process.env.ADMIN_PASSWORD || "admin123";
const defaultAdminPass = hashPassword(envAdminPass);
const defaultOpPass = hashPassword("ecom2026");

const usersDb: Map<string, UserRecord> = new Map([
  [
    envAdminUser,
    {
      id: "usr-admin-01",
      username: envAdminUser,
      name: "E-Com Director (Admin)",
      email: process.env.ADMIN_EMAIL || `${envAdminUser}@ecom-ai.com`,
      role: "admin",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      passwordHash: defaultAdminPass.hash,
      salt: defaultAdminPass.salt,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "operator",
    {
      id: "usr-op-02",
      username: "operator",
      name: "Senior Operations Specialist",
      email: "operator@ecom-ai.com",
      role: "operations",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      passwordHash: defaultOpPass.hash,
      salt: defaultOpPass.salt,
      createdAt: new Date().toISOString(),
    },
  ],
]);

// Active Sessions: token -> { user, createdAt, expiresAt }
const activeSessions: Map<string, { user: UserRecord; token: string; createdAt: string }> = new Map();

// Default initial admin session token for seamless dev initialization
const initialAdminUser = usersDb.get(envAdminUser)!;
const initialToken = "ecom_token_admin_session_8899776655";
activeSessions.set(initialToken, {
  user: initialAdminUser,
  token: initialToken,
  createdAt: new Date().toISOString(),
});

// ----------------------------------------------------
// Authentication Middleware & Permission Guards
// ----------------------------------------------------

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const headerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const customHeaderToken = (req.headers["x-session-token"] as string) || null;
  const queryToken = (req.query.token as string) || null;

  const token = headerToken || customHeaderToken || queryToken;

  if (!token) {
    return res.status(401).json({ error: "未凭证认证：请先登录账号以访问系统资源" });
  }

  // 1. JWT verification
  const decodedJwt = verifyJWTToken(token);
  if (decodedJwt) {
    req.user = {
      id: decodedJwt.id,
      username: decodedJwt.username,
      name: decodedJwt.name || decodedJwt.username,
      email: decodedJwt.email || "",
      role: decodedJwt.role || "operations",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
    };
    req.token = token;
    return next();
  }

  // 2. Session store lookup fallback
  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: "登录 Session 已过期或无效，请重新登录" });
  }

  const { passwordHash, salt, ...safeUser } = session.user;
  req.user = safeUser;
  req.token = token;
  next();
}

function requireAdminRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "权限不足：当前操作需要超级管理员 (Admin) 权限" });
  }
  next();
}

// ----------------------------------------------------
// Store State Configurations
// ----------------------------------------------------

let storeWcConfig: WcConfigType = {
  siteUrl: "https://mx-fashion-trend.com",
  consumerKey: "ck_7d92837f6a5b4c3e2109817234567890abcdef12",
  consumerSecret: "cs_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
  publishMode: "publish",
  status: "connected",
  lastTestedAt: new Date().toISOString(),
  storeName: "WordPress WooCommerce Independent Store",
  currency: "USD",
};


let storeAiConfig = {
  provider: "gemini" as const,
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-2.0-flash",
    purpose: "vision_analysis_and_content_generation" as const,
  },
  autoApproveReviewToggle: true, // Admin switch: true = Auto-publish to WooCommerce, false = Require Manual Review
  defaultLanguage: "zh-CN" as const,
};

// In-Memory Database for Pipeline Tasks
let pipelineTasksList: any[] = [];

let tasksList: any[] = [];

// In-Memory Database for E-Commerce Products
const productsDb: Map<string, any> = new Map([
  [
    "prod-001",
    {
      id: "prod-001",
      title: "智能声学高保真降噪无线蓝牙耳机 Pro",
      multilingualTitles: {
        zh: "智能声学高保真降噪无线蓝牙耳机 Pro",
        en: "Smart Noise-Canceling Wireless Ergonomic Headphones Pro",
        es: "Auriculares Inalámbricos Inteligentes con Cancelación de Ruido Pro"
      },
      multilingualShortDescriptions: {
        zh: "旗舰级智能声学降噪耳机，专为现代高品质生活与办公设计，兼具惊艳工业美学与卓越性能表现。",
        en: "<ul><li>45dB Active Hybrid Noise Cancellation</li><li>40 Hours Playtime with USB-C Fast Charging</li><li>Bluetooth 5.3 Low Latency Chipset</li></ul>",
        es: "<ul><li>Cancelación Activa de Ruido Híbrida de 45 dB</li><li>40 Horas de Batería y Carga Rápida USB-C</li><li>Chipset Bluetooth 5.3 de Baja Latencia</li></ul>"
      },
      multilingualLongDescriptions: {
        zh: "<h3>极致美学与强大性能的完美融合</h3><p>采用最新一代精密集成工艺，专为追求极致品质的消费者量身定制。</p><ul><li><strong>人体工学设计：</strong> 质感亲肤细腻，长时间使用依然舒适。</li><li><strong>智能电源管理：</strong> 支持快充与超长待机模式。</li></ul>",
        en: "<h3>Unmatched Acoustic Performance & Comfort</h3><p>Engineered with 40mm titanium diaphragm drivers to deliver studio-quality sound reproduction.</p><ul><li><strong>Ergonomic Fit:</strong> Lightweight skin-friendly protein leather ear cushions.</li><li><strong>Smart ANC Technology:</strong> Adaptive sound control for office, travel, and quiet study environments.</li></ul>",
        es: "<h3>Fusión Perfecta de Estética y Rendimiento</h3><p>Diseñados con transductores de diafragma de titanio de 40 mm para ofrecer una reproducción de sonido con calidad de estudio.</p><ul><li><strong>Ajuste Ergonómico:</strong> Almohadillas ligeras de cuero de proteína suaves al tacto.</li><li><strong>Tecnología ANC Inteligente:</strong> Control de sonido adaptativo para viajes, oficina y entornos exigentes.</li></ul>"
      },
      subtitle: "45dB 深度混合降噪 | 40小时超长续航 | 钛金大动圈单元",
      sku: "SKU-ECOM-884102",
      brand: "AcousticStudio",
      categories: ["3C数码", "影音娱乐", "无线耳机"],
      tags: ["爆款推荐", "主动降噪", "高音质", "跨境好物"],
      status: "pending_review",
      mainImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80"
      ],
      optimizedMainImage: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
      whiteBgImage: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
      price: 189.00,
      promoPrice: 149.00,
      costPrice: 42.00,
      estimatedMargin: 71.8,
      stock: 500,
      weight: 0.35,
      dimensions: { length: 15, width: 10, height: 5, unit: "cm" },
      sellingPoints: [
        "全新 45dB 深度主动混合降噪引擎，屏蔽全频段杂音",
        "40mm 钛金振膜动圈单元，还原录音室级原音高保真",
        "40小时强劲电池续航，极速 Type-C 快充技术",
        "低延迟蓝牙 5.3 芯片，全端设备无缝极速配对"
      ],
      shortDescription: "旗舰级智能声学降噪耳机，专为现代高品质生活与办公设计，兼具惊艳工业美学与卓越性能表现。",
      longDescription: "<h3>极致美学与强大性能的完美融合</h3><p>采用最新一代精密集成工艺，专为追求极致品质的消费者量身定制。</p><ul><li><strong>人体工学设计：</strong> 质感亲肤细腻，长时间使用依然舒适。</li><li><strong>智能电源管理：</strong> 支持快充与超长待机模式。</li></ul>",
      parameters: [
        { name: "主芯片", value: "AI Smart Core v3.0" },
        { name: "防水等级", value: "IP68" },
        { name: "续航时长", value: "40小时" }
      ],
      usageInstructions: "首次使用请连接电源充电15分钟激活设备。",
      cautions: "请勿将设备置于强酸或极端高压环境中。",
      seo: {
        title: "智能声学高保真降噪无线耳机 - 跨境爆款正品保障",
        keywords: ["降噪耳机", "无线蓝牙耳机", "高保真音质", "AI电商"],
        metaDescription: "极速选购旗舰级智能数码快充科技装备，工厂直发保证品质，支持全球一键代发与快速派送。",
        slug: "smart-noise-canceling-wireless-headphones-pro"
      },
      ai_title: "智能声学高保真降噪无线蓝牙耳机 Pro",
      ai_description: "<h3>极致美学与强大性能的完美融合</h3><p>采用最新一代精密集成工艺，专为追求极致品质的消费者量身定制。</p>",
      ai_short_description: "旗舰级智能声学降噪耳机，专为现代高品质生活与办公设计。",
      seo_title: "智能声学高保真降噪无线耳机 - 跨境爆款正品保障",
      seo_keywords: ["降噪耳机", "无线蓝牙耳机", "高保真音质", "AI电商"],
      attributesList: [
        { name: "Color", options: ["Matte Black", "Pure White"] },
        { name: "Material", options: ["Aluminum Alloy", "Protein Leather"] }
      ],
      woocommerceJson: {
        name: "Smart Noise-Canceling Wireless Ergonomic Headphones Pro",
        slug: "smart-noise-canceling-wireless-headphones-pro",
        description: "<h3>Product Overview</h3><p>Engineered with precision for modern lifestyle and high convenience.</p>",
        short_description: "<ul><li>45dB Hybrid ANC</li><li>40 Hours Battery</li><li>Bluetooth 5.3</li></ul>",
        regular_price: "189.00",
        sale_price: "149.00",
        categories: [{ id: 1, name: "3C数码" }, { id: 2, name: "影音娱乐" }],
        tags: [{ id: 1, name: "爆款推荐" }, { id: 2, name: "主动降噪" }],
        images: [{ src: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80" }],
        attributes: [
          { name: "Color", options: ["Matte Black", "Pure White"] },
          { name: "Material", options: ["Aluminum Alloy", "Protein Leather"] }
        ],
        sku: "SKU-ECOM-884102",
        stock_quantity: 500
      },
      source: { type: "upload" },
      wordpress_id: 8841,
      publish_status: "published",
      publish_url: "https://mx-fashion-trend.com/product/smart-noise-canceling-wireless-headphones-pro",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
]);

// In-Memory Database for WordPress Posts Audit Log (wordpress_posts Table)
const wordpressPostsDb: Map<string, WordPressPostRecord> = new Map([
  [
    "post-001",
    {
      id: "post-001",
      product_id: "prod-001",
      wordpress_product_id: 8841,
      status: "published",
      product_url: "https://mx-fashion-trend.com/product/smart-noise-canceling-wireless-headphones-pro",
      created_time: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_time: new Date(Date.now() - 3600000 * 2).toISOString(),
      error_log: "",
      media_id: 1042,
      media_url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80"
    }
  ]
]);


// Helper: Initialize Gemini SDK
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

// Healthcheck Route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

// 1. Auth Endpoints

// 1a. User Registration
app.post("/api/auth/register", async (req, res) => {
  const { username, password, email, name, role = "operations" } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: "注册失败：用户名、密码和电子邮箱为必填项" });
  }

  const cleanUsername = username.trim().toLowerCase();
  const existingUser = await findUserByUsernameOrEmail(cleanUsername);

  if (existingUser) {
    return res.status(400).json({ error: "注册失败：该用户名或邮箱已被注册" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "注册失败：密码长度不能少于 6 位字符" });
  }

  const newUser = await createUserInDB({
    username: cleanUsername,
    passwordRaw: password,
    email: email.trim().toLowerCase(),
    name: name || cleanUsername.toUpperCase() + " (E-Com User)",
    role: role === "admin" ? "admin" : "operations",
  });

  const token = generateJWTToken(newUser);
  const { password_hash, salt, ...safeUser } = newUser;

  return res.status(201).json({
    success: true,
    message: "用户注册成功，已自动登录系统",
    user: safeUser,
    token,
  });
});

// 1b. User Login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "请填写用户名和密码" });
  }

  const cleanUsername = username.trim().toLowerCase();
  const user = await findUserByUsernameOrEmail(cleanUsername);

  if (!user) {
    return res.status(401).json({ error: "登录失败：用户名不存在，请检查或先注册账号" });
  }

  const isValidPassword = verifyUserPassword(password, user.password_hash, user.salt);
  if (!isValidPassword) {
    return res.status(401).json({ error: "登录失败：密码不正确，请重新输入" });
  }

  const token = generateJWTToken(user);
  const { password_hash, salt, ...safeUser } = user;

  return res.json({
    success: true,
    message: "登录成功",
    user: safeUser,
    token,
  });
});

// 1c. Get Current Session Profile
app.get("/api/auth/me", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const headerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const customHeaderToken = (req.headers["x-session-token"] as string) || null;
  const queryToken = (req.query.token as string) || null;

  const token = headerToken || customHeaderToken || queryToken;

  if (!token) {
    return res.status(401).json({
      authenticated: false,
      error: "未凭证认证或 Token 已缺失",
    });
  }

  const decoded = verifyJWTToken(token);
  if (decoded) {
    const user = await findUserByUsernameOrEmail(decoded.username);
    if (user) {
      const { password_hash, salt, ...safeUser } = user;
      return res.json({
        authenticated: true,
        user: safeUser,
        token,
      });
    }
  }

  const session = activeSessions.get(token);
  if (session) {
    const { passwordHash, salt, ...safeUser } = session.user;
    return res.json({
      authenticated: true,
      user: safeUser,
      token: session.token,
    });
  }

  return res.status(401).json({
    authenticated: false,
    error: "未凭证认证或 Session 已过期",
  });
});

// 1d. User Logout
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : req.body.token;

  if (token && activeSessions.has(token)) {
    activeSessions.delete(token);
  }

  return res.json({
    success: true,
    message: "已成功安全退出登录",
  });
});

// 1e. Get All System Users (Admin Role Protected)
app.get("/api/auth/users", authenticateToken, requireAdminRole, (req, res) => {
  const userList = Array.from(usersDb.values()).map((u) => {
    const { passwordHash, salt, ...safeUser } = u;
    return safeUser;
  });

  return res.json({
    success: true,
    users: userList,
  });
});

// 2. Gemini AI Product Content Analyzer
app.post("/api/gemini/analyze-product", async (req, res) => {
  try {
    const { imageBase64, imageMimeType, productUrl, userPrompt, language = "zh-CN" } = req.body;
    const ai = getGeminiClient();
    const activeProvider = getAIConfig().provider || 'gemini';

    if (!ai || activeProvider !== 'gemini') {
      const imageUrl = imageBase64 
        ? (imageBase64.startsWith("data:") ? imageBase64 : `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}`)
        : productUrl || "";

      const visionAnalysis = await runGeminiVisionStep(imageUrl);
      const content = await runGeminiContentStep({
        imageInput: imageUrl,
        visionAnalysis,
        userNotes: userPrompt,
        language
      });

      return res.json({
        success: true,
        ...content,
        visionAnalysis
      });
    }

    const systemInstruction = `You are a world-class E-Commerce Product Operations Manager and Copywriting AI.
Analyze the provided product image or description, and output structured JSON detailing a complete e-commerce product listing in language '${language}'.

Respond ONLY with JSON matching the following schema:
{
  "title": "Short catchy high-converting product title (max 70 chars)",
  "subtitle": "Informative subtitle highlighting primary benefits",
  "sku": "Auto generated unique SKU e.g. ECOM-ITEM-9812",
  "categories": ["Main Category", "Sub Category"],
  "tags": ["Tag1", "Tag2", "Tag3"],
  "price": number (suggested retail USD),
  "promoPrice": number (suggested promotional price),
  "costPrice": number (estimated wholesale cost),
  "estimatedMargin": number (profit margin percentage e.g. 68.5),
  "sellingPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "shortDescription": "1-2 sentence compelling summary",
  "longDescription": "Detailed HTML description with h3, p, ul, li tags",
  "parameters": [{"name": "Param Name", "value": "Param Value"}],
  "usageInstructions": "Brief user guide",
  "cautions": "Safety or care warnings",
  "seo": {
    "title": "SEO Optimized Product Title (50-60 chars)",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "metaDescription": "SEO meta description (120-150 chars)",
    "slug": "url-friendly-kebab-case-slug"
  }
}`;

    const contentsParts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contentsParts.push({
        inlineData: {
          mimeType: imageMimeType || "image/jpeg",
          data: cleanBase64,
        },
      });
    }

    const promptText = `Analyze this product for an e-commerce catalog. ${productUrl ? "Product Link: " + productUrl : ""} ${userPrompt ? "Additional context: " + userPrompt : ""}`;
    contentsParts.push({ text: promptText });

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: { parts: contentsParts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              sku: { type: Type.STRING },
              categories: { type: Type.ARRAY, items: { type: Type.STRING } },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              price: { type: Type.NUMBER },
              promoPrice: { type: Type.NUMBER },
              costPrice: { type: Type.NUMBER },
              estimatedMargin: { type: Type.NUMBER },
              sellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              shortDescription: { type: Type.STRING },
              longDescription: { type: Type.STRING },
              parameters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    value: { type: Type.STRING }
                  }
                }
              },
              usageInstructions: { type: Type.STRING },
              cautions: { type: Type.STRING },
              seo: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                  metaDescription: { type: Type.STRING },
                  slug: { type: Type.STRING }
                }
              }
            }
          }
        }
      })
    );

    const parsedData = JSON.parse(response.text || "{}");
    res.json({ success: true, ...parsedData });
  } catch (err: any) {
    console.error("Gemini Analyze Error:", err);
    res.status(500).json({ error: err.message || "AI Analysis failed" });
  }
});

// 3. AI Single Field Re-generation
app.post("/api/gemini/regenerate-field", async (req, res) => {
  try {
    const { field, currentTitle, currentDescription, language = "zh-CN" } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        field,
        value: field === "seoTitle" ? `${currentTitle || "爆款商品"} - 官方正品包邮` : "AI 优化更新后的精彩描述"
      });
    }

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Improve the '${field}' for an e-commerce product titled "${currentTitle}". Existing details: ${currentDescription || ""}. Language: ${language}. Keep concise and compelling.`,
      })
    );

    res.json({
      success: true,
      field,
      value: response.text?.trim()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3b. Gemini Product Content Agent Handler (Full Workflow Generation)
app.post("/api/gemini/generate-product-content", async (req, res) => {
  try {
    const {
      taskId,
      productId,
      optimizedImage,
      originalImage,
      geminiVision,
      userNotes,
      costPrice,
      targetMarket,
      language = "zh-CN"
    } = req.body;

    const inputData = {
      optimizedImage: optimizedImage || originalImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
      originalImage,
      geminiVision: geminiVision || {
        productType: "电子数码 / 智能潮品",
        brand: "AI-Ecom-Labs",
        color: "极夜黑",
        materials: "阳极氧化铝合金",
        keyFeatures: ["高精光学传感", "IP68级防水", "急速无线快充"]
      },
      userNotes,
      costPrice: costPrice ? Number(costPrice) : undefined,
      targetMarket: targetMarket || "Global Cross-Border E-Commerce",
      targetLanguage: language
    };

    const geminiResult = await runGeminiProductAgent(inputData);

    // Save or update in productsDb
    const targetProdId = productId || "prod-" + Math.floor(100 + Math.random() * 900);
    const updatedProduct = {
      id: targetProdId,
      title: geminiResult.aiTitle,
      multilingualTitles: geminiResult.multilingualTitles,
      multilingualShortDescriptions: geminiResult.multilingualShortDescriptions,
      multilingualLongDescriptions: geminiResult.multilingualLongDescriptions,
      subtitle: geminiResult.seo.seoDescription,
      sku: geminiResult.attributes.sku,
      brand: geminiResult.attributes.brand,
      categories: geminiResult.attributes.categories,
      tags: geminiResult.attributes.tags,
      status: "pending_review",
      mainImage: inputData.optimizedImage || inputData.originalImage,
      optimizedMainImage: inputData.optimizedImage,
      galleryImages: [inputData.optimizedImage],
      price: geminiResult.pricing.regularPrice,
      promoPrice: geminiResult.pricing.salePrice,
      costPrice: geminiResult.pricing.costPrice,
      estimatedMargin: geminiResult.pricing.estimatedMargin,
      stock: 200,
      weight: geminiResult.attributes.weightKg,
      dimensions: { length: 15, width: 10, height: 5, unit: "cm" },
      sellingPoints: geminiResult.attributes.tags,
      shortDescription: geminiResult.aiShortDescription,
      longDescription: geminiResult.aiDescription,
      parameters: [
        { name: "Brand", value: geminiResult.attributes.brand },
        { name: "Color", value: geminiResult.attributes.color },
        { name: "Material", value: geminiResult.attributes.material }
      ],
      usageInstructions: "请参照产品说明书使用并保持设备清洁干燥。",
      cautions: "请勿将设备放置于强酸或极端高压环境中。",
      seo: {
        title: geminiResult.seo.seoTitle,
        keywords: geminiResult.seo.focusKeywords,
        metaDescription: geminiResult.seo.seoDescription,
        slug: geminiResult.seo.urlSlug
      },
      ai_title: geminiResult.aiTitle,
      ai_description: geminiResult.aiDescription,
      ai_short_description: geminiResult.aiShortDescription,
      seo_title: geminiResult.seo.seoTitle,
      seo_keywords: geminiResult.seo.focusKeywords,
      attributesList: geminiResult.attributes.attributesList,
      woocommerceJson: geminiResult.woocommerceJson,
      source: { type: "upload" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    productsDb.set(targetProdId, updatedProduct);

    // Update pipeline task if taskId provided
    if (taskId) {
      const task = pipelineTasksList.find((t) => t.id === taskId);
      if (task) {
        task.currentStep = "content_completed";
        task.status = "processing";
        task.progress = 75;
        task.productId = targetProdId;
        task.productTitle = geminiResult.aiTitle;
        task.geminiContent = updatedProduct;
        task.message = "Gemini AI 商品资料生成完成，包含三语标题、描述、SEO 与 WooCommerce 标准 JSON";
        task.logs.push(`[${new Date().toLocaleTimeString()}] [Gemini Content Agent] 多语言文案与 SEO 生成成功`);
      }
    }

    res.json({
      success: true,
      product: updatedProduct,
      geminiResult
    });
  } catch (err: any) {
    console.error("Gemini Product Content Agent Error:", err);
    if (req.body.taskId) {
      const task = pipelineTasksList.find((t) => t.id === req.body.taskId);
      if (task) {
        task.status = "failed";
        task.currentStep = "failed";
        task.errorLog = err.message || "Gemini 商品内容生成失败";
        task.logs.push(`[${new Date().toLocaleTimeString()}] [ERROR 错误] Gemini 生成失败: ${err.message}`);
      }
    }
    res.status(500).json({ success: false, error: err.message || "Gemini 商品内容生成失败" });
  }
});

// Products API Routes
app.get("/api/products", (req, res) => {
  const productsFilePath = path.join(process.cwd(), "data_db", "products.json");
  const productsFileExists = fs.existsSync(productsFilePath);
  let products = getDbProducts();

  if (!productsFileExists) {
    products = Array.from(productsDb.values());
    products.forEach((p: any) => saveDbProduct(p));
  } else {
    productsDb.clear();
    products.forEach((p: any) => productsDb.set(p.id, p));
  }
  res.json({ success: true, products });
});

app.get("/api/products/:id", (req, res) => {
  const products = getDbProducts();
  let product = products.find((p: any) => p.id === req.params.id) || productsDb.get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "找不到该商品" });
  }
  res.json({ success: true, product });
});

app.post("/api/products/save", (req, res) => {
  const { product } = req.body;
  if (!product || !product.id) {
    return res.status(400).json({ error: "必须提供完整的商品对象及 ID" });
  }
  product.updatedAt = new Date().toISOString();
  productsDb.set(product.id, product);
  saveDbProduct(product);
  res.json({ success: true, product, message: "商品资料成功保存到数据库！" });
});

app.delete("/api/products/:id", async (req, res) => {
  const id = req.params.id;
  productsDb.delete(id);
  await deleteDbProduct(id);
  res.json({ success: true, message: "商品已成功从数据库永久删除" });
});

// ----------------------------------------------------
// AI API Settings & Provider Management Routes
// ----------------------------------------------------

app.get("/api/settings/ai", (req, res) => {
  res.json({ success: true, ai: getMaskedAIConfig() });
});

app.post("/api/settings/ai", (req, res) => {
  const { ai } = req.body;
  if (!ai) {
    return res.status(400).json({ error: "AI 配置信息不能为空" });
  }
  const updated = updateAIConfig(ai);
  res.json({
    success: true,
    message: "AI API 设置已完成加密加密保存！",
    ai: getMaskedAIConfig()
  });
});

app.post("/api/ai/test/gemini", async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    const result = await testProviderConnection('gemini', { apiKey, model });
    res.json({ success: true, ...result });
  } catch (err: any) {
    const errMsg = err.message || "Gemini API 测试失败";
    res.status(500).json({ success: false, error: errMsg, message: errMsg });
  }
});

app.post("/api/ai/test/:provider", async (req, res) => {
  try {
    const provider = req.params.provider as any;
    const { apiKey, baseUrl, model } = req.body;
    const result = await testProviderConnection(provider, { apiKey, baseUrl, model });
    res.json({ success: true, ...result });
  } catch (err: any) {
    const errMsg = err.message || `${req.params.provider} API 测试失败`;
    res.status(500).json({ success: false, error: errMsg, message: errMsg });
  }
});

// Dedicated Server-Side BFF Proxy Gateway Endpoint (/api/ai/proxy)
app.post("/api/ai/proxy", async (req, res) => {
  try {
    const {
      action,
      messages,
      prompt,
      model,
      provider,
      baseUrl,
      apiKey,
      jsonMode,
      temperature,
      imageInput,
      userNotes,
      costPrice,
      language = "es"
    } = req.body;

    const currentAiConfig = getAIConfig();
    const activeProvider = provider || currentAiConfig.provider || "gemini";
    const providerConfig = (currentAiConfig as any)[activeProvider] || {};

    let targetApiKey = (apiKey || providerConfig.apiKey || process.env.GEMINI_API_KEY || "").trim();
    targetApiKey = targetApiKey.replace(/^Bearer\s+/i, "").trim();
    const targetBaseUrl = (baseUrl || providerConfig.baseUrl || "").trim();
    const targetModel = (model || providerConfig.model || "gpt-5.5").trim();

    const hostOrigin = req.protocol + "://" + req.get("host");
    const slimImage = imageInput ? ensureSlimImageInput(imageInput, hostOrigin) : undefined;

    // Special Action Branch: E-Commerce Product Content Generation Proxy
    if (action === "generate_content" || (!messages && (imageInput || userNotes || prompt))) {
      let generatedData: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          generatedData = await runGeminiContentStep({
            imageInput: req.body.visionAnalysis ? undefined : slimImage,
            visionAnalysis: req.body.visionAnalysis,
            userNotes: userNotes || prompt,
            costPrice: costPrice ? Number(costPrice) : undefined,
            language
          });
          break;
        } catch (err: any) {
          const is502or504 = err.message?.includes("502") || err.message?.includes("504") || err.message?.includes("timeout") || err.message?.includes("fetch failed");
          if (is502or504 && attempt < 2) {
            console.warn(`[/api/ai/proxy 生成文案 HTTP 502/504/超时] 正在等待 2 秒后自动进行第 ${attempt + 1} 次重试...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          throw err;
        }
      }
      return res.json({
        success: true,
        content: generatedData,
        product: generatedData,
        provider: activeProvider,
        model: targetModel
      });
    }

    // Generic Chat / Prompt Forwarding
    const formattedMessages = messages || [
      { role: "user", content: prompt || "Hello" }
    ];

    let replyText = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (activeProvider === "gemini" && !targetBaseUrl) {
          const ai = new GoogleGenAI({ apiKey: targetApiKey });
          const promptText = formattedMessages.map((m: any) => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join("\n");
          const response = await callGeminiWithRetry(() =>
            ai.models.generateContent({
              model: targetModel,
              contents: promptText
            })
          );
          replyText = response?.text || "";
        } else {
          replyText = await callOpenAICompatibleAPI({
            baseUrl: targetBaseUrl,
            apiKey: targetApiKey,
            model: targetModel,
            messages: formattedMessages,
            temperature: temperature ?? 0.3,
            jsonMode: jsonMode === true
          });
        }
        break;
      } catch (err: any) {
        const is502or504 = err.message?.includes("502") || err.message?.includes("504") || err.message?.includes("timeout") || err.message?.includes("fetch failed");
        if (is502or504 && attempt < 2) {
          console.warn(`[/api/ai/proxy 转发遇到 HTTP 502/504/超时] 正在等待 2 秒后自动进行第 ${attempt + 1} 次重试...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw err;
      }
    }

    let parsedJson = null;
    if (jsonMode) {
      try {
        parsedJson = extractAndParseJSON(replyText);
      } catch (e) {
        // non-fatal
      }
    }

    return res.json({
      success: true,
      content: replyText,
      json: parsedJson,
      provider: activeProvider,
      model: targetModel
    });
  } catch (err: any) {
    let errMsg = err.message || "BFF AI Gateway 代理转发请求失败";
    if (errMsg === "fetch failed" || errMsg.includes("fetch failed")) {
      errMsg = "[AI 节点连接失败 HTTP 502/504] 无法建立与 AI 中转 Endpoint 的通信，请检查 API Base URL 与 Key 配置";
    }
    console.error("[Server-Side BFF Proxy /api/ai/proxy Error]:", errMsg);
    return res.status(500).json({
      success: false,
      error: errMsg,
      message: errMsg
    });
  }
});

// Dedicated Backend AI BFF Gateway Proxy Endpoint (/api/ai/chat)
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { action, messages, prompt, model, provider, baseUrl, apiKey, jsonMode, temperature, imageInput, userNotes, costPrice, language = "es" } = req.body;

    const currentAiConfig = getAIConfig();
    const activeProvider = provider || currentAiConfig.provider || "gemini";
    const providerConfig = (currentAiConfig as any)[activeProvider] || {};

    let targetApiKey = (apiKey || providerConfig.apiKey || process.env.GEMINI_API_KEY || "").trim();
    targetApiKey = targetApiKey.replace(/^Bearer\s+/i, "").trim();
    const targetBaseUrl = (baseUrl || providerConfig.baseUrl || "").trim();
    const targetModel = (model || providerConfig.model || "gemini-2.0-flash").trim();

    const hostOrigin = req.protocol + "://" + req.get("host");
    const slimImage = imageInput ? ensureSlimImageInput(imageInput, hostOrigin) : undefined;

    // Special Action Branch: E-Commerce Product Content Generation Proxy
    if (action === "generate_content" || (!messages && (imageInput || userNotes || prompt))) {
      const generatedData = await runGeminiContentStep({
        imageInput: slimImage,
        userNotes: userNotes || prompt,
        costPrice: costPrice ? Number(costPrice) : undefined,
        language
      });
      return res.json({
        success: true,
        content: generatedData,
        product: generatedData,
        provider: activeProvider,
        model: targetModel
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "缺少有效的 messages 对话内容或内容生成参数" });
    }

    let replyText = "";
    if (activeProvider === "gemini" && !targetBaseUrl) {
      const ai = new GoogleGenAI({ apiKey: targetApiKey });
      const promptText = messages.map((m: any) => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join("\n");
      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: targetModel,
          contents: promptText
        })
      );
      replyText = response?.text || "";
    } else {
      replyText = await callOpenAICompatibleAPI({
        baseUrl: targetBaseUrl,
        apiKey: targetApiKey,
        model: targetModel,
        messages,
        temperature: temperature ?? 0.3,
        jsonMode: jsonMode === true
      });
    }

    let parsedJson = null;
    if (jsonMode) {
      try {
        parsedJson = extractAndParseJSON(replyText);
      } catch (e) {
        // non-fatal
      }
    }

    return res.json({
      success: true,
      content: replyText,
      json: parsedJson,
      provider: activeProvider,
      model: targetModel
    });
  } catch (err: any) {
    let errMsg = err.message || "AI Gateway 代理接口请求处理失败";
    if (errMsg === "fetch failed" || errMsg.includes("fetch failed")) {
      errMsg = "[AI 节点连接失败 HTTP 502/504] 无法建立与 AI 中转 Endpoint 的通信，请检查 API Base URL 与 Key 配置";
    }
    console.error("[BFF /api/ai/chat Proxy Error]:", errMsg);
    return res.status(500).json({
      success: false,
      error: errMsg,
      message: errMsg
    });
  }
});

// ----------------------------------------------------
// SKU System Management Routes
// ----------------------------------------------------

app.get("/api/sku/config", (req, res) => {
  res.json({ success: true, config: getSKUConfig() });
});

app.post("/api/sku/config", (req, res) => {
  const { prefix, codeLength, autoGenerate } = req.body;
  const updated = updateSKUConfig({
    prefix,
    codeLength: Number(codeLength) || 6,
    autoGenerate: Boolean(autoGenerate)
  });
  res.json({
    success: true,
    message: "SKU 编号生成规则已更新！",
    config: updated
  });
});

app.post("/api/sku/generate", async (req, res) => {
  const { prefix } = req.body;
  const sku = await generateNextSKU(prefix);
  res.json({ success: true, sku });
});

// ----------------------------------------------------
// WordPress WooCommerce Multi-Store Management Routes
// ----------------------------------------------------

// Get all WordPress stores
app.get("/api/stores", (req, res) => {
  const stores = getStores();
  res.json({ success: true, stores });
});

// Add a new WordPress store
app.post("/api/stores", (req, res) => {
  const { name, url, consumer_key, consumer_secret } = req.body;
  if (!name || !url || !consumer_key || !consumer_secret) {
    return res.status(400).json({ error: "请提供店铺名称、WordPress 网址、Consumer Key 及 Consumer Secret" });
  }
  const store = addStore({ name, url, consumer_key, consumer_secret });
  res.json({
    success: true,
    message: "WordPress WooCommerce 店铺添加成功！",
    store
  });
});

// Edit store
app.put("/api/stores/:id", (req, res) => {
  try {
    const store = updateStore(req.params.id, req.body);
    res.json({
      success: true,
      message: "店铺配置及 API 密钥已成功更新！",
      store
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete store
app.delete("/api/stores/:id", (req, res) => {
  const deleted = deleteStore(req.params.id);
  if (deleted) {
    res.json({ success: true, message: "店铺已成功移除！" });
  } else {
    res.status(404).json({ error: "未找到该店铺" });
  }
});

// Test store connection
app.post("/api/stores/:id/test", async (req, res) => {
  try {
    const result = await testStoreConnectionById(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Multi-Store Product Publications Routes
// ----------------------------------------------------

// Get all publication task records (for Publishing Center)
app.get("/api/publications", (req, res) => {
  const publications = getAllPublications();
  res.json({ success: true, publications });
});

// Get publications for a specific product
app.get("/api/products/:id/publications", (req, res) => {
  const publications = getPublicationsByProduct(req.params.id);
  res.json({ success: true, publications });
});

// Execute multi-store publication tasks
app.post("/api/publications/publish", async (req, res) => {
  const { productId, storeIds, productData } = req.body;

  if (!productId || !storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
    return res.status(400).json({ error: "请选择需要发布的目标商品及至少一个 WordPress 店铺" });
  }

  try {
    if (productData) {
      const existing = productsDb.get(productId) || {};
      const updated = { ...existing, ...productData, id: productId };
      productsDb.set(productId, updated);
    }
    const results = await createMultiStorePublicationTasks(productId, storeIds, productData || {});
    const lastSuccess = results.find(r => r.status === 'success');
    if (lastSuccess && lastSuccess.wordpress_id) {
      const p = productsDb.get(productId);
      if (p) {
        p.wordpress_id = lastSuccess.wordpress_id;
        p.publish_url = lastSuccess.url;
        p.wcProductId = lastSuccess.wordpress_id;
        p.wcPermalink = lastSuccess.url;
        p.publish_status = 'published';
        p.status = 'published';
        productsDb.set(productId, p);
      }
    }
    res.json({
      success: true,
      message: `商品已完成 ${results.length} 个多店铺同步发布任务`,
      results
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. WooCommerce Publisher Agent API Routes

// Masking helper
function maskSecret(str: string): string {
  if (!str) return "";
  if (str.length <= 8) return "****";
  return str.substring(0, 4) + "****" + str.substring(str.length - 4);
}

// 4a. Get WooCommerce Store Config
app.get("/api/woocommerce/config", (req, res) => {
  res.json({
    success: true,
    config: {
      siteUrl: storeWcConfig.siteUrl,
      consumerKey: storeWcConfig.consumerKey,
      consumerSecret: maskSecret(storeWcConfig.consumerSecret),
      publishMode: storeWcConfig.publishMode || "publish",
      status: storeWcConfig.status,
      lastTestedAt: storeWcConfig.lastTestedAt,
      storeName: storeWcConfig.storeName,
      currency: storeWcConfig.currency
    }
  });
});

// 4b. Save WooCommerce Store Config
app.post("/api/woocommerce/config", (req, res) => {
  const { siteUrl, consumerKey, consumerSecret, publishMode } = req.body;
  if (!siteUrl || !consumerKey) {
    return res.status(400).json({ error: "WordPress 网址和 Consumer Key 不能为空" });
  }

  storeWcConfig.siteUrl = siteUrl;
  storeWcConfig.consumerKey = consumerKey;
  if (consumerSecret && !consumerSecret.includes("****")) {
    storeWcConfig.consumerSecret = consumerSecret;
  }
  if (publishMode === "publish" || publishMode === "draft") {
    storeWcConfig.publishMode = publishMode;
  }

  res.json({
    success: true,
    message: "WooCommerce 配置信息已成功更新！",
    config: {
      siteUrl: storeWcConfig.siteUrl,
      consumerKey: storeWcConfig.consumerKey,
      consumerSecret: maskSecret(storeWcConfig.consumerSecret),
      publishMode: storeWcConfig.publishMode,
      status: storeWcConfig.status
    }
  });
});

// 4c. WooCommerce Connection Test
app.post("/api/woocommerce/test", async (req, res) => {
  const { siteUrl, consumerKey, consumerSecret } = req.body;
  
  const targetUrl = siteUrl || storeWcConfig.siteUrl;
  const targetKey = consumerKey || storeWcConfig.consumerKey;
  let targetSecret = consumerSecret || storeWcConfig.consumerSecret;

  if (targetSecret && targetSecret.includes("****")) {
    targetSecret = storeWcConfig.consumerSecret;
  }

  if (!targetUrl || !targetKey || !targetSecret) {
    return res.status(400).json({ error: "请填写完整的 WordPress 网址、Consumer Key 及 Consumer Secret" });
  }

  const testConfig: WcConfigType = {
    siteUrl: targetUrl,
    consumerKey: targetKey,
    consumerSecret: targetSecret
  };

  try {
    const testResult = await testConnection(testConfig);
    
    // Save verified config
    storeWcConfig = {
      ...storeWcConfig,
      siteUrl: targetUrl,
      consumerKey: targetKey,
      consumerSecret: targetSecret,
      status: "connected",
      lastTestedAt: new Date().toISOString(),
      storeName: testResult.storeName,
      currency: testResult.currency
    };

    // Also sync default store in storeService
    const defaultStore = getRawStoreById("store_default_wc");
    if (defaultStore) {
      updateStore(defaultStore.id, {
        url: targetUrl,
        consumer_key: targetKey,
        consumer_secret: targetSecret,
        status: "connected",
        name: testResult.storeName
      });
    }

    return res.json({
      success: true,
      message: "成功连通 WordPress WooCommerce REST API v3!",
      storeInfo: {
        name: testResult.storeName,
        url: targetUrl,
        wcVersion: testResult.version,
        currency: testResult.currency,
        status: "Active & Synced",
        testedAt: testResult.testedAt
      }
    });
  } catch (err: any) {
    storeWcConfig.status = "error";
    res.status(500).json({ error: "连接测试失败: " + err.message });
  }
});

// 4d. WooCommerce Publish Product Workflow (Publishing Center)
app.post("/api/woocommerce/publish", async (req, res) => {
  try {
    const { productId, product: productPayload, storeId, store_id, mode } = req.body;
    let targetProduct = productPayload || (productId ? productsDb.get(productId) : null);

    if (!targetProduct && productId) {
      targetProduct = productsDb.get(productId);
    }

    if (!targetProduct) {
      return res.status(400).json({ error: "必须提供有效商品对象或商品 ID" });
    }

    // Save/update product in DB
    productsDb.set(targetProduct.id, targetProduct);

    // Dynamic Store Resolution
    const reqStoreId = storeId || store_id || targetProduct.store_id || targetProduct.storeId;
    let targetStoreObj = reqStoreId ? getRawStoreById(reqStoreId) : undefined;

    if (!targetStoreObj) {
      const allStores = getStores();
      if (allStores.length > 0) {
        const found = allStores.find(s => s.status === "connected") || allStores[0];
        targetStoreObj = getRawStoreById(found.id);
      }
    }

    let activeWcConfig: WcConfigType;
    if (targetStoreObj && targetStoreObj.url && targetStoreObj.consumer_key) {
      activeWcConfig = {
        siteUrl: targetStoreObj.url || targetStoreObj.wordpress_url,
        consumerKey: targetStoreObj.consumer_key,
        consumerSecret: targetStoreObj.consumer_secret,
        storeName: targetStoreObj.name || targetStoreObj.store_name,
        publishMode: mode || storeWcConfig.publishMode || "publish"
      };
    } else {
      activeWcConfig = {
        siteUrl: storeWcConfig.siteUrl,
        consumerKey: storeWcConfig.consumerKey,
        consumerSecret: storeWcConfig.consumerSecret,
        storeName: storeWcConfig.storeName,
        publishMode: mode || storeWcConfig.publishMode || "publish"
      };
    }

    const publishMode = activeWcConfig.publishMode || "publish";
    const postId = "post-" + Date.now();

    // 1. Create Publication Log entry before calling WooCommerce REST API
    const logStoreId = targetStoreObj?.id || "store_default_wc";
    const logStoreName = targetStoreObj?.name || activeWcConfig.storeName || "WordPress WooCommerce 主站";
    const logStoreUrl = activeWcConfig.siteUrl;

    const pubLog = recordPublicationLog({
      productId: targetProduct.id,
      productTitle: targetProduct.title || targetProduct.ai_title || "WooCommerce 商品",
      storeId: logStoreId,
      storeName: logStoreName,
      storeUrl: logStoreUrl,
      status: "publishing"
    });

    targetProduct.publish_status = "publishing";
    productsDb.set(targetProduct.id, targetProduct);

    const postRecord: WordPressPostRecord = {
      id: postId,
      product_id: targetProduct.id,
      wordpress_product_id: targetProduct.wordpress_id || 0,
      status: "publishing",
      product_url: "",
      created_time: new Date().toISOString(),
      updated_time: new Date().toISOString(),
      error_log: ""
    };
    wordpressPostsDb.set(postId, postRecord);

    // Create product directly via WooCommerce REST API (POST /wp-json/wc/v3/products)
    let wcResult: { id: number; permalink: string; status: string; sku: string };
    try {
      const hostOrigin = `${req.headers['x-forwarded-proto'] || req.protocol || 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
      const payload = {
        ...targetProduct,
        _hostOrigin: hostOrigin,
        optimizedMainImage: targetProduct.optimizedMainImage || targetProduct.mainImage
      };
      wcResult = await createProduct(activeWcConfig, payload, publishMode);
    } catch (createErr: any) {
      const errorMsg = `[Product Creation Error] ${createErr.message}`;
      postRecord.status = "failed";
      postRecord.error_log = (postRecord.error_log ? postRecord.error_log + "\n" : "") + errorMsg;
      postRecord.updated_time = new Date().toISOString();
      wordpressPostsDb.set(postId, postRecord);

      // Update Publication Log to failed
      updatePublicationLogStatus(pubLog.id, {
        status: "failed",
        error_log: createErr.message || "Failed to publish to WooCommerce API"
      });

      targetProduct.publish_status = "failed";
      targetProduct.status = "failed";
      productsDb.set(targetProduct.id, targetProduct);

      return res.status(500).json({
        success: false,
        error: createErr.message,
        post: postRecord,
        product: targetProduct
      });
    }

    // Step 3: Success state update using real permalink returned by WooCommerce API
    const finalStatus = publishMode === "draft" ? "draft" : "published";
    postRecord.wordpress_product_id = wcResult.id;
    postRecord.product_url = wcResult.permalink;
    postRecord.status = finalStatus;
    postRecord.updated_time = new Date().toISOString();
    wordpressPostsDb.set(postId, postRecord);

    // Update Publication Log to success
    updatePublicationLogStatus(pubLog.id, {
      status: "success",
      wordpress_id: wcResult.id,
      url: wcResult.permalink
    });

    targetProduct.wordpress_id = wcResult.id;
    targetProduct.publish_status = finalStatus;
    targetProduct.publish_url = wcResult.permalink;
    targetProduct.wcProductId = wcResult.id;
    targetProduct.wcPermalink = wcResult.permalink;
    targetProduct.status = finalStatus;
    productsDb.set(targetProduct.id, targetProduct);

    // Record system task
    tasksList.unshift({
      id: "task-" + Date.now(),
      name: `WordPress WooCommerce Publish: ${targetProduct.title.substring(0, 25)}...`,
      type: "wc_publish",
      status: "completed",
      progress: 100,
      message: `成功发布到 WooCommerce 独立站 (${logStoreName})，ID #${wcResult.id} [${finalStatus.toUpperCase()}]`,
      productId: targetProduct.id,
      productTitle: targetProduct.title,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      logs: [
        `[REST API] POST ${activeWcConfig.siteUrl}/wp-json/wc/v3/products`,
        `[WooCommerce REST API] Product images attached in payload`,
        `[Payload] Synced SKU: ${targetProduct.sku}, Price: $${targetProduct.promoPrice || targetProduct.price}`,
        `[Result] HTTP 201 Created (ID #${wcResult.id}, Permalink: ${wcResult.permalink})`
      ]
    });

    return res.json({
      success: true,
      message: `商品已成功发布至 WooCommerce 独立站！(ID: #${wcResult.id}, 状态: ${finalStatus})`,
      post: postRecord,
      product: targetProduct,
      wcProductId: wcResult.id,
      wcPermalink: wcResult.permalink
    });

  } catch (err: any) {
    res.status(500).json({ error: "发布工作流错误: " + err.message });
  }
});

// 4e. WordPress Posts Table List (Publishing Management Center)
app.get("/api/woocommerce/posts", (req, res) => {
  const posts = Array.from(wordpressPostsDb.values()).map(post => {
    const product = productsDb.get(post.product_id);
    return {
      ...post,
      product_title: product?.title || "未知商品",
      product_sku: product?.sku || "N/A",
      product_image: product?.optimizedMainImage || product?.mainImage || post.media_url || "",
      product_price: product?.price || 0,
      product_promo_price: product?.promoPrice || 0
    };
  });

  res.json({ success: true, posts });
});

// 4f. Sync WordPress Product Status
app.post("/api/woocommerce/sync/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { storeId, store_id } = req.body || {};
    const product = productsDb.get(productId);
    if (!product || !product.wordpress_id) {
      return res.status(400).json({ error: "找不到对应商品或该商品尚未生成 WordPress ID" });
    }

    const reqStoreId = storeId || store_id || product.store_id || product.storeId;
    let targetStoreObj = reqStoreId ? getRawStoreById(reqStoreId) : undefined;
    if (!targetStoreObj) {
      const allStores = getStores();
      if (allStores.length > 0) {
        const found = allStores.find(s => s.status === "connected") || allStores[0];
        targetStoreObj = getRawStoreById(found.id);
      }
    }

    const activeWcConfig: WcConfigType = {
      siteUrl: targetStoreObj?.url || storeWcConfig.siteUrl,
      consumerKey: targetStoreObj?.consumer_key || storeWcConfig.consumerKey,
      consumerSecret: targetStoreObj?.consumer_secret || storeWcConfig.consumerSecret
    };

    const wcStatus = await syncProductStatus(activeWcConfig, product.wordpress_id);

    const mappedStatus = wcStatus.status === "publish" ? "published" : (wcStatus.status as any);
    product.publish_status = mappedStatus;
    product.status = mappedStatus;
    if (wcStatus.permalink) {
      product.publish_url = wcStatus.permalink;
      product.wcPermalink = wcStatus.permalink;
    }
    productsDb.set(product.id, product);

    // Sync in wordpressPostsDb
    for (const [pId, pRecord] of wordpressPostsDb.entries()) {
      if (pRecord.product_id === productId || pRecord.wordpress_product_id === product.wordpress_id) {
        pRecord.status = mappedStatus;
        if (wcStatus.permalink) pRecord.product_url = wcStatus.permalink;
        pRecord.updated_time = new Date().toISOString();
        wordpressPostsDb.set(pId, pRecord);
      }
    }

    res.json({
      success: true,
      wcStatus,
      product,
      message: `WordPress 商品 #${product.wordpress_id} 状态已更新为：[${mappedStatus.toUpperCase()}]`
    });

  } catch (err: any) {
    res.status(500).json({ error: "同步状态失败: " + err.message });
  }
});

// 4g. Retry Failed Publish Action
app.post("/api/woocommerce/retry/:productId", async (req, res) => {
  const { productId } = req.params;
  const product = productsDb.get(productId);
  if (!product) {
    return res.status(400).json({ error: "未找到需要重试的商品" });
  }

  // Re-trigger publish handler
  req.body.product = product;
  return app._router.handle(req, res, () => {});
});


// 6. AI Workflow Pipeline Management (Task 1 -> Task 2 -> Task 3 -> Task 4)
app.get("/api/workflow/tasks", (req, res) => {
  let tasks = getDbTasks();
  if (!tasks || tasks.length === 0) {
    tasks = pipelineTasksList;
    tasks.forEach((t: any) => saveDbTask(t));
  }
  res.json({ success: true, tasks });
});

const deleteTaskHandler = (req: Request, res: Response) => {
  const id = req.params.id;
  pipelineTasksList = pipelineTasksList.filter((t: any) => t.id !== id);
  deleteDbTask(id);
  res.json({ success: true, message: "AI 任务已成功从数据库删除" });
};

app.delete("/api/workflow/tasks/:id", deleteTaskHandler);
app.delete("/api/tasks/:id", deleteTaskHandler);

// Admin Account Management
app.post("/api/settings/admin-account", authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { currentUsername, newUsername, currentPassword, newPassword } = req.body;
    
    if (newPassword && newPassword.length < 6) {
      return res.status(400).json({ error: "新密码强度不足：密码长度不能少于 6 位字符！" });
    }

    const reqAny = req as any;
    const updatedAdmin = await updateAdminCredentials(reqAny.user?.id || "usr-admin-01", newUsername, newPassword);
    
    // Invalidate active session/token
    if (reqAny.token) {
      activeSessions.delete(reqAny.token);
    }
    
    res.json({
      success: true,
      user: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        avatar: updatedAdmin.avatar
      },
      message: "管理员账号与密码已成功更新并保存数据库！旧 Token 已失效，请重新登录。"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "更新管理员凭证失败" });
  }
});

// Custom Domain Management
app.get("/api/settings/custom-domain", (req, res) => {
  res.json({ success: true, customDomain: getSystemDomain() });
});

app.post("/api/settings/custom-domain", authenticateToken, (req, res) => {
  const { customDomain } = req.body;
  if (!customDomain || typeof customDomain !== "string") {
    return res.status(400).json({ error: "请输入有效的自定义域名" });
  }
  saveSystemDomain(customDomain.trim());
  res.json({ success: true, customDomain: customDomain.trim(), message: "自定义域名已成功绑定并保存数据库！" });
});

// Database Connectivity Test & Config Save
app.post("/api/db/test-connection", authenticateToken, async (req, res) => {
  try {
    const { host, port, database, user, password, dbType = "postgresql" } = req.body;
    const testResult = await testDatabaseConnection({ host, port, database, user, password, dbType });
    res.json(testResult);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "测试数据库连通性失败" });
  }
});

app.post("/api/db/save-config", authenticateToken, async (req, res) => {
  try {
    const { host, port, database, user, password, dbType = "postgresql" } = req.body;
    saveDbConfig({ host, port, database, user, password, dbType });
    await initDatabase();
    res.json({ success: true, message: "数据库连接配置已成功保存并重新初始化！" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "保存数据库配置失败" });
  }
});

// Environment Initialization & Database Migration Endpoint
const handleSystemInit = async (req: Request, res: Response) => {
  try {
    const { adminUsername = "admin", adminPassword = "admin123", adminEmail = "admin@ecom-ai.com", customDomain } = req.body || {};
    
    await initDatabase();
    await seedAdminUser();
    
    if (customDomain) {
      saveSystemDomain(customDomain);
    }
    
    res.json({
      success: true,
      message: "系统环境、数据库表结构 (Database Schema) 及管理员凭证已成功初始化！",
      initializedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "系统初始化失败" });
  }
};

app.post("/api/system/init", handleSystemInit);
app.get("/api/system/init", handleSystemInit);

// Full Pipeline Automation Runner (Real APIs: Gemini Vision -> Gemini Content -> WooCommerce)
app.post("/api/workflow/run-pipeline", async (req, res) => {
  const { imageUrl, imageBase64, userNotes, costPrice, language = "zh-CN", autoPublish = false, storeId } = req.body;
  const isAutoPublish = autoPublish === true || autoPublish === "true";

  const rawSourceImage = imageUrl || imageBase64;
  if (!rawSourceImage) {
    return res.status(400).json({ error: "请提供商品图片 URL 或图片 Base64 编码" });
  }

  const hostOrigin = req.protocol + "://" + req.get("host");
  const sourceImage = ensureSlimImageInput(rawSourceImage, hostOrigin);

  const taskId = "task-pipe-" + Date.now();
  const startTime = Date.now();
  const logs: string[] = [];
  const log = (msg: string) => {
    const timeStr = `[${new Date().toLocaleTimeString()}]`;
    logs.push(`${timeStr} ${msg}`);
  };

  log(`[Step 1] 初始化 AI 流水线任务 (${taskId})，原始图片已接收`);

  const autoSku = await generateNextSKU();

  const initialTask: any = {
    id: taskId,
    productId: "prod-" + Math.floor(100 + Math.random() * 900),
    originalImage: sourceImage,
    currentStep: "uploaded",
    status: "processing",
    progress: 10,
    elapsedSeconds: 0,
    message: "准备调用 AI 智能 Vision API 分析图片...",
    logs: [...logs],
    createdAt: new Date().toISOString()
  };

  pipelineTasksList.unshift(initialTask);

  try {
    // ----------------------------------------------------
    // Step 1: AI Multimodal Vision Analysis & Image Enhancement
    // ----------------------------------------------------
    log("[Step 1: AI 智能 Vision] 发起 AI 智能 Vision 图像特征识别与处理...");
    const visionAnalysis = await runGeminiVisionStep(sourceImage);
    log(`[Step 1: AI 智能 Vision 成功] 识别商品名称: ${visionAnalysis.name}, 材质: ${visionAnalysis.material}, 品牌: ${visionAnalysis.brand}`);

    const targetRatio = req.body.image_ratio || req.body.imageRatio || "1:1";
    log(`[Step 1: AI 图像美化] 真实调用 AI 图像 API 处理美化主图 (比例: ${targetRatio})...`);
    const processedImage = await processProductImageWithAI({
      imageInput: sourceImage,
      ratio: targetRatio,
      userNotes,
      visionAnalysis,
      hostOrigin
    });
    log(`[Step 1: AI 图像美化成功] 已绑定美化输出主图`);

    initialTask.geminiVision = visionAnalysis;
    initialTask.optimizedImage = processedImage;
    initialTask.currentStep = "image_completed";
    initialTask.progress = 40;
    initialTask.message = "AI 智能图像处理与美化完成，正在生成商品文案与 SEO...";

    // ----------------------------------------------------
    // Step 2: AI Content & SEO Generation
    // ----------------------------------------------------
    log("[Step 2: AI 智能] 结合结构化图像特征数据，调用 AI 智能生成商品文案与 SEO...");
    const generatedProductData = await runGeminiContentStep({
      visionAnalysis,
      imageInput: processedImage,
      userNotes,
      costPrice: costPrice ? Number(costPrice) : undefined,
      language
    });

    const finalSku = generatedProductData.sku || autoSku;
    log(`[Step 2: AI 智能 成功] 生成标题: "${generatedProductData.title}", SKU: ${finalSku}`);

    const createdProduct: any = {
      id: initialTask.productId,
      ...generatedProductData,
      sku: finalSku,
      mainImage: processedImage,
      optimizedMainImage: processedImage,
      galleryImages: [processedImage],
      status: "pending_review",
      source: { type: "upload" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    productsDb.set(initialTask.productId, createdProduct);

    initialTask.geminiContent = createdProduct;
    initialTask.productTitle = createdProduct.title;
    initialTask.currentStep = "content_completed";
    initialTask.progress = 75;

    // ----------------------------------------------------
    // Step 3: WooCommerce REST API Auto Publishing (if enabled or store requested)
    // ----------------------------------------------------
    if (isAutoPublish || storeId) {
      log("[Step 3: WooCommerce] 发起 WooCommerce REST API 一键发布请求...");
      
      let targetStoreConfig = storeWcConfig;
      if (storeId) {
        const customStore = getRawStoreById(storeId);
        if (customStore) {
          targetStoreConfig = {
            siteUrl: customStore.url || customStore.wordpress_url,
            consumerKey: customStore.consumer_key,
            consumerSecret: customStore.consumer_secret,
            storeName: customStore.name
          };
        }
      }
      if (!targetStoreConfig.siteUrl) {
        const allStores = getStores();
        if (allStores.length > 0) {
          const found = allStores.find(s => s.status === "connected") || allStores[0];
          const raw = getRawStoreById(found.id);
          if (raw && (raw.url || raw.wordpress_url)) {
            targetStoreConfig = {
              siteUrl: raw.url || raw.wordpress_url,
              consumerKey: raw.consumer_key,
              consumerSecret: raw.consumer_secret,
              storeName: raw.name
            };
          }
        }
      }

      // Upload Media
      log(`[Step 3: WP Media] 上传 AI 美化主图至站点媒体库: ${targetStoreConfig.siteUrl}`);
      let mediaResult: { media_id?: number; image_url: string } = { media_id: undefined, image_url: processedImage };
      try {
        mediaResult = await uploadMedia(targetStoreConfig, processedImage, `${finalSku}.jpg`);
      } catch (mediaErr: any) {
        log(`[Step 3: WP Media 警告] ${mediaErr.message}，将直接使用图片原链接发布`);
      }

      // Create Product
      log(`[Step 3: REST API] POST ${targetStoreConfig.siteUrl}/wp-json/wc/v3/products`);
      const wcResult = await createProduct(
        targetStoreConfig,
        { ...createdProduct, media_id: mediaResult.media_id },
        "publish"
      );

      createdProduct.wordpress_id = wcResult.id;
      createdProduct.publish_status = "published";
      createdProduct.publish_url = wcResult.permalink;
      createdProduct.status = "published";
      productsDb.set(initialTask.productId, createdProduct);

      initialTask.wcResult = {
        wcProductId: wcResult.id,
        wcPermalink: wcResult.permalink
      };
      initialTask.currentStep = "published";
      initialTask.status = "published";
      initialTask.progress = 100;
      initialTask.message = `AI 工作流自动化全流程执行成功！商品已发布至 WooCommerce Store (ID: #${wcResult.id})`;
      log(`[Step 3: 发布成功] WordPress 商品创建成功 (ID: #${wcResult.id}, URL: ${wcResult.permalink})`);
    } else {
      initialTask.currentStep = "review";
      initialTask.status = "review";
      initialTask.progress = 75;
      initialTask.message = "AI 商品生成成功，已保存在商品库，等待管理员确认发布。";
      log("[Step 3: 待审核] 商品信息已保存在数据库中。");
    }

    initialTask.elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
    initialTask.completedAt = new Date().toISOString();
    initialTask.logs = [...logs];

    return res.json({
      success: true,
      task: initialTask,
      product: createdProduct,
      geminiVision: visionAnalysis,
      geminiContent: generatedProductData
    });

  } catch (err: any) {
    initialTask.status = "failed";
    initialTask.currentStep = "failed";
    initialTask.errorLog = err.message || "流水线执行异常中断";
    log(`[ERROR 错误] 工作流终止: ${err.message}`);
    initialTask.logs = [...logs];

    return res.status(500).json({
      success: false,
      error: err.message,
      task: initialTask
    });
  }
});

// 7. System Logs Endpoint
app.get("/api/logs", (req, res) => {
  const { type, status, limit } = req.query;
  const logs = getSystemLogs({
    type: type as string,
    status: status as string,
    limit: limit ? Number(limit) : 100
  });
  res.json({ success: true, logs });
});

app.delete("/api/logs", (req, res) => {
  clearSystemLogs();
  res.json({ success: true, message: "所有日志记录已清空" });
});

// Single Step Failure Retry
app.post("/api/workflow/retry-step", async (req, res) => {
  const { taskId, step } = req.body;
  const task = pipelineTasksList.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: "找不到对应的流水线任务" });
  }

  const appendLog = (msg: string) => {
    task.logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  };

  appendLog(`[手动重试] 管理员触发重新执行步骤: [${step}]`);

  try {
    if (step === "gemini_vision" || step === "gemini" || step === "image") {
      appendLog("[AI 智能 Vision 重试] 正在调用 AI 智能 Vision API 识别商品图片...");
      const visionAnalysis = await runGeminiVisionStep(task.originalImage);
      task.geminiVision = visionAnalysis;
      task.currentStep = "image_completed";
      task.status = "processing";
      task.progress = 50;
      task.errorLog = undefined;
      task.message = `AI 智能 Vision 重试成功! 识别品类: ${visionAnalysis.category || visionAnalysis.name}`;
      appendLog(`[AI 智能 Vision 成功] 识别结果: ${visionAnalysis.name}`);
    } else if (step === "gemini_content" || step === "content") {
      appendLog("[AI 智能 文案重试] 正在结合 Vision 数据调用 AI 智能生成文案...");
      const generatedProductData = await runGeminiContentStep({
        visionAnalysis: task.geminiVision,
        imageInput: task.originalImage,
        language: "zh-CN"
      });

      const autoSku = task.geminiContent?.sku || await generateNextSKU();
      const createdProduct: any = {
        id: task.productId || ("prod-" + Math.floor(100 + Math.random() * 900)),
        ...generatedProductData,
        sku: autoSku,
        mainImage: task.originalImage,
        optimizedMainImage: task.originalImage,
        status: "pending_review",
        source: { type: "upload" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      productsDb.set(createdProduct.id, createdProduct);
      task.geminiContent = createdProduct;
      task.productTitle = createdProduct.title;
      task.currentStep = "content_completed";
      task.status = "review";
      task.progress = 75;
      task.errorLog = undefined;
      task.message = `AI 智能文案重新生成成功: "${createdProduct.title}"`;
      appendLog(`[AI 智能 文案成功] 生成标题: "${createdProduct.title}"`);
    } else if (step === "woocommerce" || step === "publish") {
      appendLog("[WooCommerce REST API 重试] 准备真实推送至 WordPress/WooCommerce 独立站...");
      let targetProd = task.productId ? productsDb.get(task.productId) : null;
      if (!targetProd && task.geminiContent) {
        targetProd = task.geminiContent;
      }

      if (!targetProd) {
        throw new Error("未能找到待发布的商品数据，请先成功执行 AI 智能文案生成步骤");
      }

      let activeWcConfig = storeWcConfig;
      if (task.storeId) {
        const customStore = getRawStoreById(task.storeId);
        if (customStore) {
          activeWcConfig = {
            siteUrl: customStore.url,
            consumerKey: customStore.consumer_key,
            consumerSecret: customStore.consumer_secret,
            storeName: customStore.name
          };
        }
      }

      appendLog(`[WP Media] 上传主图至 WP 站点: ${activeWcConfig.siteUrl}`);
      let mediaResult: { media_id?: number; image_url: string } = {
        media_id: undefined,
        image_url: task.originalImage
      };
      try {
        mediaResult = await uploadMedia(activeWcConfig, task.originalImage, `${targetProd.sku || 'sku'}.jpg`);
      } catch (mErr: any) {
        appendLog(`[WP Media 警告] ${mErr.message}，使用原图片链接发布`);
      }

      appendLog(`[WooCommerce REST API] POST ${activeWcConfig.siteUrl}/wp-json/wc/v3/products`);
      const wcResult = await createProduct(
        activeWcConfig,
        { ...targetProd, media_id: mediaResult.media_id },
        "publish"
      );

      targetProd.wordpress_id = wcResult.id;
      targetProd.publish_status = "published";
      targetProd.publish_url = wcResult.permalink;
      targetProd.status = "published";
      productsDb.set(targetProd.id, targetProd);

      task.wcResult = {
        wcProductId: wcResult.id,
        wcPermalink: wcResult.permalink
      };
      task.currentStep = "published";
      task.status = "published";
      task.progress = 100;
      task.errorLog = undefined;
      task.message = `WordPress API 重新推送成功 (商品 ID: #${wcResult.id})`;
      appendLog(`[WP 发布成功] 商品已成功发布到 WordPress: ID #${wcResult.id}, URL: ${wcResult.permalink}`);
    }

    return res.json({ success: true, task, tasks: pipelineTasksList });
  } catch (retryErr: any) {
    task.status = "failed";
    task.currentStep = "failed";
    task.errorLog = retryErr.message || "步骤重试异常中断";
    appendLog(`[ERROR 失败] 步骤 [${step}] 执行失败: ${retryErr.message}`);

    return res.status(500).json({
      success: false,
      error: retryErr.message,
      task,
      tasks: pipelineTasksList
    });
  }
});

// 7. System Settings
app.get("/api/settings/ai", (req, res) => {
  res.json({
    success: true,
    ai: getMaskedAIConfig()
  });
});

app.post("/api/settings/ai", (req, res) => {
  const aiData = req.body.ai || req.body;
  if (aiData) {
    updateAIConfig(aiData);
  }
  res.json({
    success: true,
    ai: getMaskedAIConfig(),
    message: "AI API 设置已成功持久化保存！"
  });
});

app.get("/api/settings", (req, res) => {
  res.json({
    woocommerce: storeWcConfig,
    ai: getMaskedAIConfig(),
    geminiConfigured: !!(process.env.GEMINI_API_KEY || getAIConfig().gemini?.apiKey || getAIConfig().custom?.apiKey)
  });
});

app.post("/api/settings", (req, res) => {
  if (req.body.woocommerce) {
    storeWcConfig = { ...storeWcConfig, ...req.body.woocommerce };
  }
  if (req.body.ai) {
    updateAIConfig(req.body.ai);
  }
  res.json({ success: true, woocommerce: storeWcConfig, ai: getMaskedAIConfig() });
});

// 8. Database Schema Endpoint
app.get("/api/db/schema", (req, res) => {
  res.json({
    engine: "SQLite / PostgreSQL Compatible",
    tables: ["users", "products", "product_images", "ai_tasks", "wordpress_connections", "api_settings"]
  });
});


// ----------------------------------------------------
// VITE MIDDLEWARE / STATIC SERVING
// ----------------------------------------------------

async function startServer() {
  await initDatabase();
  await seedAdminUser();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AI ECOM SERVER] Running on http://0.0.0.0:${PORT}`);
  });

  server.headersTimeout = 310000;
  server.requestTimeout = 300000;
  server.keepAliveTimeout = 300000;
}

startServer();
