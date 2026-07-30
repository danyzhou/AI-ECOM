import { GoogleGenAI } from '@google/genai';
import { GeminiSettingConfig, Product, GeminiVisionResult } from '../../src/types';
import { addSystemLog } from '../logging/logService';
import { saveBase64ImageToLocal } from '../woocommerce/publisherService';

/**
 * Ensures image input is converted to a lightweight HTTP/HTTPS URL if base64,
 * dramatically shrinking payload size from megabytes to bytes.
 */
export function ensureSlimImageInput(imageInput?: string, hostOrigin?: string): string {
  if (!imageInput || typeof imageInput !== 'string') return '';
  const trimmed = imageInput.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('data:image') || trimmed.length > 500) {
    const savedUrl = saveBase64ImageToLocal(trimmed, hostOrigin);
    if (savedUrl) return savedUrl;
  }
  return trimmed;
}

/**
 * Sanitizes messages array before sending to text-completion OpenAPI endpoints
 * Strips raw base64 data strings from text prompts and replaces image_url base64s with saved URLs or placeholders
 */
export function sanitizeMessagesForTextAPI(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }>): Array<{ role: 'system' | 'user' | 'assistant'; content: any }> {
  if (!Array.isArray(messages)) return [];

  return messages.map(msg => {
    let content = msg.content;
    if (typeof content === 'string') {
      if (content.includes('data:image') && content.length > 1000) {
        content = content.replace(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/g, (match) => {
          const saved = saveBase64ImageToLocal(match);
          return saved || '[Image Asset URL]';
        });
      }
    } else if (Array.isArray(content)) {
      content = content.map((part: any) => {
        if (part?.type === 'image_url' && part?.image_url?.url) {
          const urlStr = part.image_url.url;
          if (typeof urlStr === 'string' && (urlStr.startsWith('data:image') || urlStr.length > 500)) {
            const saved = saveBase64ImageToLocal(urlStr);
            if (saved) {
              return { type: 'image_url', image_url: { url: saved } };
            } else {
              return { type: 'text', text: '[Visual Product Image Features Analyzed]' };
            }
          }
        }
        if (part?.type === 'text' && typeof part?.text === 'string' && part.text.includes('data:image')) {
          const cleanedText = part.text.replace(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/g, '[Image Asset]');
          return { type: 'text', text: cleanedText };
        }
        return part;
      });
    }
    return { ...msg, content };
  });
}

export function maskGeminiApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****' + key.slice(-2);
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}****${suffix}`;
}

export interface GeminiProductVisionAnalysis {
  name: string;
  brand: string;
  category: string;
  color: string;
  material: string;
  dimensions: string;
  features: string[];
  usage: string;
  targetAudience: string;
  keywords: string[];
  visualHighlights: string;
}

/**
 * Convert Image URL or Base64 string to InlineData for Gemini Multimodal API
 */
async function urlOrBase64ToInlineData(imageInput: string): Promise<{ mimeType: string; data: string }> {
  if (imageInput.startsWith('data:')) {
    const matches = imageInput.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches) {
      return { mimeType: matches[1], data: matches[2] };
    }
  } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
    try {
      const res = await fetch(imageInput);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return {
        mimeType: contentType.split(';')[0],
        data: buffer.toString('base64')
      };
    } catch (err) {
      console.warn('Unable to fetch remote image URL for Gemini inlineData:', err);
    }
  }

  // Fallback: strip potential data header if present or pass as jpeg base64
  const cleanBase64 = imageInput.replace(/^data:image\/[a-z]+;base64,/, '');
  return { mimeType: 'image/jpeg', data: cleanBase64 };
}

/**
 * Request throttle lock for Gemini Free Tier to ensure inter-request intervals
 * stay above 1.2s to prevent concurrency rate limit spikes (RPM/TPM protection).
 */
let lastGeminiCallTimestamp = 0;
const MIN_FREE_TIER_INTERVAL_MS = 1200; // 1.2 seconds between consecutive calls

async function applyFreeTierThrottle(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastGeminiCallTimestamp;
  if (timeSinceLast < MIN_FREE_TIER_INTERVAL_MS) {
    const delayNeeded = MIN_FREE_TIER_INTERVAL_MS - timeSinceLast;
    await new Promise(resolve => setTimeout(resolve, delayNeeded));
  }
  lastGeminiCallTimestamp = Date.now();
}

/**
 * Helper to call Gemini API with exponential backoff retry & Free Tier throttle on 429 / RESOURCE_EXHAUSTED errors
 */
export async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 5000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      await applyFreeTierThrottle();
      return await fn();
    } catch (err: any) {
      const errStr = String(err?.message || err?.stack || err || '');
      const is429 = errStr.includes('429') ||
                    errStr.includes('RESOURCE_EXHAUSTED') ||
                    errStr.includes('ResourceExhausted') ||
                    errStr.includes('Quota exceeded') ||
                    err?.status === 429 ||
                    err?.statusCode === 429;

      if (is429 && attempt < maxRetries) {
        attempt++;
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini Free Tier 限流保护] 触发 429 速率限制，等待 ${delay / 1000} 秒后尝试第 ${attempt}/${maxRetries} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Resolve AI Relay Endpoint cleanly
 */
export function resolveAIEndpoint(rawBaseUrl?: string): string {
  let url = (rawBaseUrl || '').trim().replace(/\/+$/, '');
  if (!url) {
    return 'https://api.groq.com/openai/v1/chat/completions';
  }
  if (url.endsWith('/chat/completions')) {
    return url;
  }
  if (url.endsWith('/v1')) {
    return `${url}/chat/completions`;
  }
  return `${url}/chat/completions`;
}

/**
 * Format detailed network fetch diagnostics from Node.js fetch errors
 */
export function formatNetworkFetchError(fetchErr: any, endpoint: string): string {
  const cause = fetchErr?.cause || {};
  const code = cause.code || cause.errno || fetchErr?.code || '';
  const causeMsg = cause.message || (typeof cause === 'string' ? cause : '');
  const sysCall = cause.syscall ? `[syscall: ${cause.syscall}] ` : '';

  let detailedStr = '';
  if (causeMsg && causeMsg !== 'fetch failed') {
    detailedStr = causeMsg;
  } else if (cause.cause && cause.cause.message && cause.cause.message !== 'fetch failed') {
    detailedStr = cause.cause.message;
  } else if (cause.stack) {
    detailedStr = String(cause.stack).split('\n')[0];
  } else if (fetchErr?.stack) {
    detailedStr = String(fetchErr.stack).split('\n')[0];
  }

  let humanReason = '';
  if (code === 'ECONNREFUSED' || detailedStr.includes('ECONNREFUSED')) {
    humanReason = `目标 HTTP 中转服务器拒绝连接 (ECONNREFUSED) - 请检查 VPS IP、端口状态或防火墙设置`;
  } else if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT' || detailedStr.includes('ETIMEDOUT') || fetchErr?.name === 'TimeoutError' || fetchErr?.name === 'AbortError') {
    humanReason = `连接中转 Endpoint 超时 (ETIMEDOUT / 60s无响应) - 请检查 VPS 网络通畅性与可达性`;
  } else if (code === 'ENOTFOUND' || detailedStr.includes('ENOTFOUND')) {
    humanReason = `域名/IP 无法解析 (ENOTFOUND) - 请检查 Base URL 地址配置`;
  } else if (code === 'CERT_HAS_EXPIRED' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    humanReason = `HTTPS/SSL 证书校验拦截 (${code})`;
  } else if (detailedStr && detailedStr !== 'fetch failed' && !detailedStr.startsWith('TypeError')) {
    humanReason = detailedStr;
  } else {
    humanReason = `HTTP 中转 Endpoint 连接失败 (网络无法连通/DNS无法解析/中转服务未启动)`;
  }

  return `Server Proxy Error [HTTP Network Error]: 无法连通云端 AI 节点 Endpoint (${endpoint}) | 诊断信息: ${humanReason} ${sysCall}`;
}

/**
 * Robust JSON Extractor & Parser for AI Response Content
 */
export function extractAndParseJSON<T = any>(text: string, fallback?: T): T {
  if (!text || typeof text !== 'string') {
    if (fallback) return fallback;
    throw new Error('AI 返回内容为空文本或非字符串数据');
  }

  const trimmed = text.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // continue
  }

  // 2. Code fence regex match ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (e) {
      // continue
    }
  }

  // 3. Object regex match { ... }
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch (e) {
      // continue
    }
  }

  if (fallback) {
    return fallback;
  }

  throw new Error(`AI 中转站返回的内容无法解析为有效 JSON 结构: ${trimmed.substring(0, 150)}`);
}

/**
 * Helper to call OpenAI-compatible API (Groq, SiliconFlow, OpenRouter, Custom Relay) with 90s timeout and 1-time auto-retry
 */
export async function callOpenAICompatibleAPI(input: {
  baseUrl?: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }>;
  temperature?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const endpoint = resolveAIEndpoint(input.baseUrl);

  // Clean & strictly format API Key and Bearer token header
  let rawKey = (input.apiKey || '').trim();
  rawKey = rawKey.replace(/^Bearer\s+/i, '').trim();

  if (!rawKey) {
    throw new Error('未检测到有效的 AI Key，请在系统设置中配置 API Key');
  }

  const authHeaderValue = `Bearer ${rawKey}`;

  // Sanitize messages to eliminate raw megabyte base64 strings from text payload
  const slimMessages = sanitizeMessagesForTextAPI(input.messages);

  const payload: any = {
    model: input.model || 'gpt-5.5',
    messages: slimMessages,
    temperature: input.temperature ?? 0.3
  };

  if (input.jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const maxAttempts = 2; // Attempt 1 + 1 Retry on 502/504/Network
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[AI Proxy Output] Attempt ${attempt}/${maxAttempts} -> ${endpoint} (Model: ${payload.model}, Auth Header: Bearer ${rawKey.substring(0, 6)}***)`);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeaderValue
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(90000) // 90 Seconds Timeout
      });

      if (!res.ok) {
        let errText = '';
        try {
          errText = await res.text();
        } catch (e) {
          errText = '无法读取 HTTP 响应体';
        }

        let errorDetail = errText;
        try {
          const parsedJson = JSON.parse(errText);
          if (parsedJson.error?.message) {
            errorDetail = parsedJson.error.message;
          } else if (parsedJson.message) {
            errorDetail = parsedJson.message;
          } else if (parsedJson.error) {
            errorDetail = typeof parsedJson.error === 'string' ? parsedJson.error : JSON.stringify(parsedJson.error);
          }
        } catch (e) {
          // text
        }

        const isRetryableStatus = res.status === 502 || res.status === 503 || res.status === 504 || res.status === 520 || res.status === 524;

        if (isRetryableStatus && attempt < maxAttempts) {
          console.warn(`[AI Proxy Server HTTP ${res.status}] 遇到中转站 502/504 响应，将在 3 秒后携带完整 Auth Header 自动重试...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        const truncatedDetail = errorDetail.length > 250 ? errorDetail.substring(0, 250) + '...' : errorDetail;

        let hint = '';
        if (res.status === 401) hint = ' - API Key 无效或未获授权 (HTTP 401 Unauthorized)，请检查中转站与 API Key';
        else if (res.status === 403) hint = ' - 拒绝访问 / 权限不足';
        else if (res.status === 404) hint = ' - 404 Endpoint 路径或模型不存在';
        else if (res.status === 429) hint = ' - 429 请求频率超限';
        else if (res.status >= 500) hint = ` - 中转站服务器内部错误 (HTTP ${res.status})`;

        const detailedErrorMsg = `[AI 节点响应错误 HTTP ${res.status}${hint}] Endpoint: ${endpoint} | 明细: ${truncatedDetail}`;
        console.error(detailedErrorMsg);

        addSystemLog({
          type: 'custom_ai_proxy',
          action: 'chat_completions',
          target: endpoint,
          status: 'error',
          httpCode: res.status,
          latencyMs: 0,
          errorMessage: detailedErrorMsg
        });

        throw new Error(detailedErrorMsg);
      }

      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
      if (!reply || typeof reply !== 'string') {
        throw new Error(`[AI 节点响应异常] Endpoint (${endpoint}) 返回内容为空或缺少 choices[0].message.content 字段`);
      }

      addSystemLog({
        type: 'custom_ai_proxy',
        action: 'chat_completions',
        target: endpoint,
        status: 'success',
        httpCode: 200,
        latencyMs: 0,
        responsePayload: { replySnippet: reply.substring(0, 100) }
      });

      return reply;
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || err);
      const isNetworkOrTimeout = err.name === 'AbortError' || err.name === 'TimeoutError' || errStr.includes('fetch failed') || errStr.includes('ETIMEDOUT') || errStr.includes('ECONNREFUSED');

      if (isNetworkOrTimeout && attempt < maxAttempts) {
        console.warn(`[AI Proxy Network/Timeout Error] ${errStr}，将在 3 秒后携带完整 Auth Header 自动重试 (Attempt ${attempt}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error(`调用 AI Endpoint 失败 (${endpoint})`);
}

/**
 * Unified AI Provider Connection Tester
 */
export async function testAIConnection(
  provider: string,
  config: any
): Promise<{ success: boolean; latencyMs: number; model: string; message: string }> {
  if (provider === 'gemini') {
    return await testGeminiConnection(config);
  }

  const apiKey = (config?.apiKey || '').trim();
  const baseUrl = (config?.baseUrl || '').trim();
  const model = (config?.model || '').trim();

  const providerLabel = provider === 'custom' ? '自定义 API 中转 (AIClient2API)' : provider.toUpperCase();

  if (!apiKey) {
    throw new Error(`未配置 ${providerLabel} API Key，请先在系统设置中填入有效密钥`);
  }

  const startTime = Date.now();
  try {
    const reply = await callOpenAICompatibleAPI({
      baseUrl,
      apiKey,
      model,
      messages: [{ role: 'user', content: 'Hello! Respond with OK if you receive this connection test message.' }]
    });

    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      latencyMs,
      model,
      message: `${providerLabel} 云端 API 节点连通测试成功，延迟 ${latencyMs}ms (模型: ${model})`
    };
  } catch (err: any) {
    throw new Error(`${providerLabel} 连接失败: ${err.message || String(err)}`);
  }
}

/**
 * Multi-Provider Vision Analysis & Text-Mode Fallback Strategy
 */
export async function analyzeProductImageWithAI(
  imageInput: string,
  provider: string,
  config: any
): Promise<GeminiProductVisionAnalysis> {
  if (provider === 'gemini') {
    return await analyzeProductImageWithGemini(imageInput, config);
  }

  const apiKey = (config?.apiKey || '').trim();
  const baseUrl = (config?.baseUrl || '').trim();
  const model = (config?.model || '').trim();

  if (!apiKey) {
    throw new Error(`未配置 ${provider.toUpperCase()} API Key，无法执行视觉与属性分析`);
  }

  const startTime = Date.now();
  const promptText = `You are an expert e-commerce product inspector and visual analyst.
Analyze the product image or e-commerce context provided (Asset: ${imageInput.startsWith('data:') ? 'Base64 image asset' : imageInput}) and extract structured attributes.
Return ONLY a raw valid JSON object without markdown formatting or code blocks:

{
  "name": "Probable product name (e.g. Smart Wireless Earbuds Pro)",
  "brand": "Identified brand or Generic",
  "category": "Main e-commerce category",
  "color": "Dominant product colors",
  "material": "Estimated surface materials",
  "dimensions": "Estimated size or compact form factor",
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "usage": "Primary user scenario",
  "targetAudience": "Target customer demographic",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "visualHighlights": "Key visual aesthetic points"
}`;

  // Check if provider/model is strictly text-only
  const isKnownTextOnly =
    provider === 'groq' ||
    provider === 'siliconflow' ||
    model.includes('llama') ||
    model.includes('deepseek') ||
    model.includes('qwen') ||
    model.includes('mistral');

  let messages: any[];

  const slimImage = ensureSlimImageInput(imageInput);

  if (!isKnownTextOnly && (slimImage.startsWith('data:') || slimImage.startsWith('http'))) {
    messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: slimImage } }
        ]
      }
    ];
  } else {
    messages = [{ role: 'user', content: promptText }];
  }

  try {
    let reply: string;
    try {
      reply = await callOpenAICompatibleAPI({
        baseUrl,
        apiKey,
        model,
        messages,
        jsonMode: true
      });
    } catch (apiErr: any) {
      const errStr = String(apiErr.message || apiErr);
      const isVisionUnsupportedError =
        errStr.includes('400') &&
        (errStr.includes('type') ||
         errStr.includes('image') ||
         errStr.includes('vision') ||
         errStr.includes('multimodal') ||
         errStr.includes('unknown parameter') ||
         errStr.includes('invalid') ||
         errStr.includes('unexpected'));

      if (isVisionUnsupportedError && messages.length > 0 && Array.isArray(messages[0].content)) {
        console.warn(`[${provider.toUpperCase()} Multi-modal Fallback] 模型 [${model}] 不支持 image_url 多模态参数，自动切换为纯文本上下文推导...`);
        reply = await callOpenAICompatibleAPI({
          baseUrl,
          apiKey,
          model,
          messages: [{ role: 'user', content: promptText }],
          jsonMode: true
        });
      } else {
        // Re-throw 404, 429, 401 or network errors directly to halt the pipeline and prevent false success
        throw apiErr;
      }
    }

    const parsed = extractAndParseJSON(reply, {
      name: '智能品质商品',
      brand: 'Generic',
      category: '3C数码 / 生活良品',
      color: '经典色',
      material: '复合材质',
      dimensions: '标准尺寸',
      features: ['品质可靠', '便携设计'],
      usage: '日常通勤与居家',
      targetAudience: '追求品质生活的消费者',
      keywords: ['爆款新品', '热销好物'],
      visualHighlights: '设计精美，细节饱满'
    });
    const latencyMs = Date.now() - startTime;

    const analysis: GeminiProductVisionAnalysis = {
      name: parsed.name || '智能品质商品',
      brand: parsed.brand || 'Generic',
      category: parsed.category || '3C数码 / 生活良品',
      color: parsed.color || '经典色',
      material: parsed.material || '复合材质',
      dimensions: parsed.dimensions || '标准尺寸',
      features: Array.isArray(parsed.features) && parsed.features.length > 0 ? parsed.features : ['品质可靠', '便携设计'],
      usage: parsed.usage || '日常通勤与居家',
      targetAudience: parsed.targetAudience || '追求品质生活的消费者',
      keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords : ['爆款新品', '热销好物'],
      visualHighlights: parsed.visualHighlights || '设计精美，细节饱满'
    };

    addSystemLog({
      type: provider,
      action: 'vision_analysis',
      target: model,
      status: 'success',
      httpCode: 200,
      latencyMs,
      responsePayload: { name: analysis.name, category: analysis.category }
    });

    return analysis;
  } catch (err: any) {
    console.error(`[${provider.toUpperCase()} Vision Analysis Failed]:`, err.message);
    throw err;
  }
}

/**
 * Multi-Provider Product Content & SEO Generation
 */
export async function generateProductContentWithAI(
  input: {
    imageInput?: string;
    visionAnalysis?: GeminiProductVisionAnalysis;
    userNotes?: string;
    costPrice?: number;
    language?: string;
    targetMarket?: string;
  },
  provider: string,
  config: any
): Promise<Partial<Product>> {
  if (provider === 'gemini') {
    return await generateProductContentWithGemini(input, config);
  }

  const apiKey = (config?.apiKey || '').trim();
  const baseUrl = (config?.baseUrl || '').trim();
  const model = (config?.model || '').trim();

  if (!apiKey) {
    throw new Error(`未配置 ${provider.toUpperCase()} API Key，无法生成文案`);
  }

  let visionContext = input.visionAnalysis;
  if (!visionContext && input.imageInput) {
    const slimImg = ensureSlimImageInput(input.imageInput);
    visionContext = await analyzeProductImageWithAI(slimImg, provider, config);
  }

  const prompt = `You are a world-class e-commerce copywriter and SEO ranking specialist for Spanish-speaking markets.
Given the product analysis below, generate a comprehensive product listing.

Product Vision Analysis:
${JSON.stringify(visionContext || {}, null, 2)}

User Custom Requirements: ${input.userNotes || 'None'}
Cost Price (USD): ${input.costPrice || 'Auto Estimate'}

HARD MANDATE: All copy (title, shortDescription, longDescription, sellingPoints, subtitles) MUST be written strictly and entirely in SPANISH (Español / 'es'). Do NOT output Chinese or English text for product content.

Respond ONLY with a valid JSON object matching this schema:

{
  "title": "SEO product title in Spanish (max 70 chars, catchy)",
  "shortDescription": "Compelling 3-5 bullet items in Spanish HTML (<ul><li>...</li></ul>)",
  "longDescription": "<h3>Descripción General</h3><p>Detailed Spanish description...</p><h3>Características Principales</h3><ul><li>Point 1 in Spanish</li></ul>",
  "subtitle": "Short benefit-driven subtitle or slogan in Spanish",
  "brand": "${visionContext?.brand || 'Generic'}",
  "categories": ["Categoría Principal", "Categoría Secundaria"],
  "tags": ["Tag1", "Tag2", "Tag3"],
  "price": 129.00,
  "promoPrice": 99.00,
  "costPrice": ${input.costPrice || 30.00},
  "estimatedMargin": 69.8,
  "sellingPoints": ["Point 1 in Spanish", "Point 2 in Spanish"],
  "parameters": [
    {"name": "Material", "value": "${visionContext?.material || 'Material de alta calidad'}"},
    {"name": "Color", "value": "${visionContext?.color || 'Estándar'}"}
  ],
  "usageInstructions": "Guía de uso en español",
  "cautions": "Instrucciones de cuidado en español",
  "seo": {
    "title": "SEO Optimized Meta Title in Spanish",
    "keywords": ["keyword1", "keyword2"],
    "metaDescription": "SEO Meta Description in Spanish under 160 characters",
    "slug": "url-friendly-kebab-case-slug"
  }
}`;

  const reply = await callOpenAICompatibleAPI({
    baseUrl,
    apiKey,
    model,
    messages: [
      { role: 'system', content: 'You are a professional e-commerce product copywriter for Spanish markets. Output valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    jsonMode: true
  });

  const parsed: any = extractAndParseJSON(reply, {});
  const esTitle = parsed.title || visionContext?.name || 'Producto Inteligente de Alta Calidad Pro';
  const esShort = parsed.shortDescription || '<ul><li>100% Calidad Garantizada</li><li>Diseño Ergonómico</li></ul>';
  const esLong = parsed.longDescription || '<h3>Descripción General</h3><p>Diseñado con precisión para un gran rendimiento.</p>';

  return {
    title: esTitle,
    multilingualTitles: {
      zh: esTitle,
      en: esTitle,
      es: esTitle
    },
    multilingualShortDescriptions: {
      zh: esShort,
      en: esShort,
      es: esShort
    },
    multilingualLongDescriptions: {
      zh: esLong,
      en: esLong,
      es: esLong
    },
    subtitle: parsed.subtitle || visionContext?.usage || '精选优品',
    brand: parsed.brand || visionContext?.brand || 'Generic',
    categories: parsed.categories || [visionContext?.category || '3C数码', '爆款新品'],
    tags: parsed.tags || visionContext?.keywords || ['AI推荐', '热销新品'],
    price: parsed.price || 129.00,
    promoPrice: parsed.promoPrice || 89.00,
    costPrice: parsed.costPrice || input.costPrice || 30.00,
    estimatedMargin: parsed.estimatedMargin || 68.5,
    sellingPoints: parsed.sellingPoints || visionContext?.features || ['品质上乘', '设计典雅'],
    shortDescription: parsed.shortDescription || `<p>${visionContext?.usage || '实用便捷'}</p>`,
    longDescription: parsed.longDescription || `<p>${visionContext?.usage || '实用便捷'}</p>`,
    parameters: parsed.parameters || [
      { name: '材质', value: visionContext?.material || '精选材质' },
      { name: '颜色', value: visionContext?.color || '经典色' }
    ],
    usageInstructions: parsed.usageInstructions || '请按产品指南使用。',
    cautions: parsed.cautions || '请置于干燥常温处。',
    seo: parsed.seo || {
      title: parsed.title,
      keywords: visionContext?.keywords || ['爆款新品'],
      metaDescription: parsed.subtitle || '优质爆款商品',
      slug: 'prod-' + Date.now()
    },
    ai_title: parsed.title,
    ai_description: parsed.longDescription,
    ai_short_description: parsed.shortDescription,
    seo_title: parsed.seo?.title,
    seo_keywords: parsed.seo?.keywords
  };
}

export async function testGeminiConnection(config: GeminiSettingConfig) {
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
  const model = config.model || 'gemini-2.0-flash';
  const startTime = Date.now();

  if (!apiKey || apiKey.trim() === '') {
    const latencyMs = Date.now() - startTime;
    addSystemLog({
      type: 'gemini',
      action: 'test_connection',
      target: model,
      status: 'error',
      latencyMs,
      errorMessage: '未配置 Gemini API Key'
    });
    throw new Error('未配置 Gemini API Key，请在系统设置中填入有效的 API Key');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: model,
        contents: "Hello! Respond with OK if you receive this connection test message."
      })
    );

    const latencyMs = Date.now() - startTime;

    if (response && response.text) {
      addSystemLog({
        type: 'gemini',
        action: 'test_connection',
        target: model,
        status: 'success',
        httpCode: 200,
        latencyMs,
        responsePayload: { reply: response.text.substring(0, 100) }
      });

      return {
        success: true,
        latencyMs,
        model,
        message: `Gemini API 连通测试成功 (耗时 ${latencyMs}ms)，模型 [${model}] 正常响应`
      };
    }

    addSystemLog({
      type: 'gemini',
      action: 'test_connection',
      target: model,
      status: 'error',
      latencyMs,
      errorMessage: 'Gemini API 未返回预测的响应文本'
    });
    throw new Error('Gemini API 未能返回预期的响应内容');
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    addSystemLog({
      type: 'gemini',
      action: 'test_connection',
      target: model,
      status: 'error',
      latencyMs,
      errorMessage: err.message
    });
    throw new Error(`Gemini API 连接失败: ${err.message}`);
  }
}

/**
 * Gemini Vision Step: Analyze Product Image Multimodally
 */
export async function analyzeProductImageWithGemini(
  imageInput: string,
  config?: Partial<GeminiSettingConfig>
): Promise<GeminiProductVisionAnalysis> {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  const model = config?.model || 'gemini-2.0-flash';
  const startTime = Date.now();

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('未配置 Gemini API Key，无法执行 Gemini Vision 图片分析');
  }

  try {
    const inlineData = await urlOrBase64ToInlineData(imageInput);
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    const prompt = `You are an expert e-commerce product inspector and visual analyst.
Analyze the provided product image and extract structured attributes.
Return ONLY a raw valid JSON object without markdown syntax:

{
  "name": "Probable product name (e.g. Smart Wireless Earbuds Pro)",
  "brand": "Identified brand or Generic",
  "category": "Main e-commerce category",
  "color": "Dominant product colors",
  "material": "Estimated surface materials (e.g. Aluminum alloy, Silky silicone)",
  "dimensions": "Estimated size or compact form factor",
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "usage": "Primary user scenario",
  "targetAudience": "Target customer demographic",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "visualHighlights": "Key visual aesthetic points"
}`;

    const res = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData },
              { text: prompt }
            ]
          }
        ]
      })
    );

    const latencyMs = Date.now() - startTime;
    const text = res.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Gemini Vision 返回内容未匹配到标准的 JSON 数据');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const analysis: GeminiProductVisionAnalysis = {
      name: parsed.name || '精选商品',
      brand: parsed.brand || 'Generic',
      category: parsed.category || '通用商品',
      color: parsed.color || '常规色',
      material: parsed.material || '复合材质',
      dimensions: parsed.dimensions || '标准尺寸',
      features: Array.isArray(parsed.features) ? parsed.features : ['品质甄选', '时尚实用'],
      usage: parsed.usage || '日常使用',
      targetAudience: parsed.targetAudience || '大众群体',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : ['爆款新品', '热销商品'],
      visualHighlights: parsed.visualHighlights || '外观精美，做工细致'
    };

    addSystemLog({
      type: 'gemini',
      action: 'vision_analysis',
      target: model,
      status: 'success',
      httpCode: 200,
      latencyMs,
      responsePayload: { name: analysis.name, category: analysis.category }
    });

    return analysis;
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    addSystemLog({
      type: 'gemini',
      action: 'vision_analysis',
      target: model,
      status: 'error',
      latencyMs,
      errorMessage: err.message
    });
    throw err;
  }
}

/**
 * Gemini Content & SEO Generation Step
 */
export async function generateProductContentWithGemini(
  input: {
    imageInput?: string;
    visionAnalysis?: GeminiProductVisionAnalysis;
    userNotes?: string;
    costPrice?: number;
    language?: string;
    targetMarket?: string;
  },
  config?: Partial<GeminiSettingConfig>
): Promise<Partial<Product> & { rawGeminiJson?: any }> {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  const model = config?.model || 'gemini-2.0-flash';
  const lang = input.language || 'zh-CN';
  const startTime = Date.now();

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('未配置 Gemini API Key，无法生成商品文案与 SEO 资料');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    
    // Prepare vision context
    let visionContext = input.visionAnalysis;
    if (!visionContext && input.imageInput) {
      const slimImg = ensureSlimImageInput(input.imageInput);
      visionContext = await analyzeProductImageWithGemini(slimImg, config);
    }

    const prompt = `You are a world-class e-commerce copywriter and SEO ranking specialist for Spanish-speaking markets (Spain, Mexico, Latin America).
Given the product analysis below, generate a comprehensive product listing.

Product Vision Analysis:
${JSON.stringify(visionContext || {}, null, 2)}

User Custom Requirements: ${input.userNotes || 'None'}
Cost Price (USD): ${input.costPrice || 'Auto Estimate'}

HARD MANDATE: All product copy (title, shortDescription, longDescription, sellingPoints, subtitles) MUST be written strictly and entirely in SPANISH (Español / 'es'). Do NOT output Chinese or English for product content.

Respond ONLY with a valid JSON object matching this schema:

{
  "title": "SEO product title in Spanish (max 70 chars, catchy)",
  "shortDescription": "Compelling 3-5 bullet items in Spanish HTML (<ul><li>...</li></ul>)",
  "longDescription": "<h3>Descripción General</h3><p>Detailed Spanish description...</p><h3>Características Principales</h3><ul><li>Point 1 in Spanish</li></ul>",
  "subtitle": "Short benefit-driven subtitle or slogan in Spanish",
  "brand": "${visionContext?.brand || 'Generic'}",
  "categories": ["Categoría Principal", "Categoría Secundaria"],
  "tags": ["Tag1", "Tag2", "Tag3"],
  "price": 129.00,
  "promoPrice": 99.00,
  "costPrice": ${input.costPrice || 30.00},
  "estimatedMargin": 69.8,
  "sellingPoints": ["Point 1 in Spanish", "Point 2 in Spanish"],
  "parameters": [
    {"name": "Material", "value": "${visionContext?.material || 'Material de alta calidad'}"},
    {"name": "Color", "value": "${visionContext?.color || 'Estándar'}"}
  ],
  "usageInstructions": "Guía de uso en español",
  "cautions": "Instrucciones de cuidado en español",
  "seo": {
    "title": "SEO Optimized Meta Title in Spanish",
    "keywords": ["keyword1", "keyword2"],
    "metaDescription": "SEO Meta Description in Spanish under 160 characters",
    "slug": "url-friendly-kebab-case-slug"
  },
  "socialContent": {
    "googleShopping": "Optimized text for Google Shopping feed in Spanish",
    "facebook": "Engaging Facebook ad text in Spanish with emojis",
    "tiktok": "Trendy short-form script for TikTok in Spanish"
  },
  "faq": [
    {"question": "FAQ Question 1?", "answer": "Answer 1"},
    {"question": "FAQ Question 2?", "answer": "Answer 2"}
  ],
  "attributesList": [
    {"name": "Color", "options": ["${visionContext?.color || 'Estándar'}"]},
    {"name": "Size", "options": ["Estándar"]}
  ]
}`;

    const contentsParts: any[] = [{ text: prompt }];

    // If image is supplied directly, pass as multimodal inlineData too for maximum quality
    if (input.imageInput) {
      try {
        const inlineData = await urlOrBase64ToInlineData(input.imageInput);
        contentsParts.unshift({ inlineData });
      } catch (e) {
        console.warn('Multimodal image append skipped:', e);
      }
    }

    const res = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: contentsParts }]
      })
    );

    const latencyMs = Date.now() - startTime;
    const text = res.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Gemini 文案生成返回内容解析 JSON 失败');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const esTitle = parsed.title || visionContext?.name || 'Producto Inteligente de Alta Calidad Pro';
    const esShort = parsed.shortDescription || '<ul><li>100% Calidad Garantizada</li><li>Diseño Ergonómico y Portátil</li></ul>';
    const esLong = parsed.longDescription || '<h3>Descripción General</h3><p>Diseñado con precisión para un estilo de vida moderno.</p>';

    const result: Partial<Product> & { rawGeminiJson?: any } = {
      title: esTitle,
      multilingualTitles: {
        zh: esTitle,
        en: esTitle,
        es: esTitle
      },
      multilingualShortDescriptions: {
        zh: esShort,
        en: esShort,
        es: esShort
      },
      multilingualLongDescriptions: {
        zh: esLong,
        en: esLong,
        es: esLong
      },
      subtitle: parsed.subtitle || visionContext?.usage || '精选优品',
      brand: parsed.brand || visionContext?.brand || 'Generic',
      categories: parsed.categories || [visionContext?.category || '3C数码', '爆款新品'],
      tags: parsed.tags || visionContext?.keywords || ['AI推荐', '热销新品'],
      price: parsed.price || 129.00,
      promoPrice: parsed.promoPrice || 89.00,
      costPrice: parsed.costPrice || input.costPrice || 30.00,
      estimatedMargin: parsed.estimatedMargin || 68.5,
      sellingPoints: parsed.sellingPoints || visionContext?.features || ['品质上乘', '设计典雅'],
      shortDescription: parsed.shortDescription || `<p>${visionContext?.usage || '实用便捷'}</p>`,
      longDescription: parsed.longDescription || `<p>${visionContext?.usage || '实用便捷'}</p>`,
      parameters: parsed.parameters || [
        { name: '材质', value: visionContext?.material || '精选材质' },
        { name: '颜色', value: visionContext?.color || '经典色' }
      ],
      usageInstructions: parsed.usageInstructions || '请按产品指南使用。',
      cautions: parsed.cautions || '请置于干燥常温处。',
      seo: parsed.seo || {
        title: parsed.title,
        keywords: visionContext?.keywords || ['爆款新品'],
        metaDescription: parsed.subtitle || '优质爆款商品',
        slug: 'prod-' + Date.now()
      },
      attributesList: parsed.attributesList || [],
      ai_title: parsed.title,
      ai_description: parsed.longDescription,
      ai_short_description: parsed.shortDescription,
      seo_title: parsed.seo?.title,
      seo_keywords: parsed.seo?.keywords,
      rawGeminiJson: parsed
    };

    addSystemLog({
      type: 'gemini',
      action: 'generate_content',
      target: model,
      status: 'success',
      httpCode: 200,
      latencyMs,
      responsePayload: { title: result.title }
    });

    return result;
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    addSystemLog({
      type: 'gemini',
      action: 'generate_content',
      target: model,
      status: 'error',
      latencyMs,
      errorMessage: err.message
    });
    throw err;
  }
}
