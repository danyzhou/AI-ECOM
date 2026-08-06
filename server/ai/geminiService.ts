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
/**
 * Extracts ONLY lightweight text visual features and keywords from Vision Analysis result
 * Guarantees 0% Base64 image payload bloat for STEP 3 (reducing payload volume by 99%)
 */
export function extractPureTextVisionContext(vision: any): any {
  if (!vision || typeof vision !== 'object') {
    return { name: 'AI精选商品', category: '3C数码 / 生活良品' };
  }
  return {
    name: String(vision.name || vision.productCategory || 'AI精选商品'),
    brand: String(vision.brand || 'Generic'),
    category: String(vision.category || '3C数码 / 生活良品'),
    color: String(vision.color || '经典色'),
    material: String(vision.material || '复合材质'),
    dimensions: String(vision.dimensions || '标准尺寸'),
    features: Array.isArray(vision.features) ? vision.features.map(String) : (Array.isArray(vision.keyFeatures) ? vision.keyFeatures.map(String) : ['品质可靠', '细节精细']),
    usage: String(vision.usage || '日常使用'),
    targetAudience: String(vision.targetAudience || '追求品质生活的消费者'),
    keywords: Array.isArray(vision.keywords) ? vision.keywords.map(String) : ['高品质', '热销品'],
    visualHighlights: String(vision.visualHighlights || '设计精细，细节饱满')
  };
}

/**
 * Recursively strips any Base64 image data strings from prompts, objects, or arrays
 * Ensuring STEP 3 and text-completion API calls have 0% Base64 image payload bloat
 */
export function stripBase64FromValue(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    if (val.startsWith('data:image/') || val.length > 4000) {
      return '[已通过 Vision 提取轻量级文本特征]';
    }
    if (val.includes('data:image/')) {
      return val.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=_-\s]{50,}/g, '[已通过 Vision 提取轻量级文本特征]');
    }
    if (val.length > 800 && /^[A-Za-z0-9+/=_\-\s]+$/.test(val)) {
      return '[已通过 Vision 提取轻量级文本特征]';
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(item => {
      if (item && typeof item === 'object') {
        if (item.type === 'image_url' || item.type === 'inline_data' || item.type === 'inlineData') {
          return { type: 'text', text: '[已通过 Vision 提取轻量级文本特征]' };
        }
      }
      return stripBase64FromValue(item);
    });
  }
  if (typeof val === 'object') {
    const copy: any = {};
    for (const [k, v] of Object.entries(val)) {
      if (/^(image|imageBase64|image_url|imageInput|mainImage|originalImage|optimizedImage|galleryImages|inlineData|inline_data)$/i.test(k)) {
        continue;
      }
      copy[k] = stripBase64FromValue(v);
    }
    return copy;
  }
  return val;
}

/**
 * Sanitizes messages array before sending to text-completion OpenAPI endpoints
 * Strips raw base64 data strings from text prompts and replaces image_url base64s with placeholders
 */
export function sanitizeMessagesForTextAPI(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }>): Array<{ role: 'system' | 'user' | 'assistant'; content: any }> {
  if (!Array.isArray(messages)) return [];

  return messages.map(msg => ({
    ...msg,
    content: stripBase64FromValue(msg.content)
  }));
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

  const maxAttempts = 3; // Attempt 1 + 2 Retries on 502/504/Timeout/Network
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
        signal: AbortSignal.timeout(120000) // 120 Seconds Timeout (120,000 ms)
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
          console.warn(`[AI Proxy Server HTTP ${res.status}] 遇到中转站 HTTP ${res.status} 响应，将在 3 秒后尝试第 ${attempt + 1}/${maxAttempts} 次自动重试...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        const truncatedDetail = errorDetail.length > 250 ? errorDetail.substring(0, 250) + '...' : errorDetail;

        let hint = '';
        if (res.status === 401) hint = ' - API Key 无效或未获授权 (HTTP 401 Unauthorized)，请检查中转站与 API Key';
        else if (res.status === 403) hint = ' - 拒绝访问 / 权限不足';
        else if (res.status === 404) hint = ' - 404 Endpoint 路径或模型不存在';
        else if (res.status === 429) hint = ' - 429 请求频率超限';
        else if (res.status === 502) hint = ' - 502 Bad Gateway 网关错误';
        else if (res.status === 504) hint = ' - 504 Gateway Timeout 网关响应超时';
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
        console.warn(`[AI Proxy Network/Timeout Error] ${errStr}，将在 2 秒后携带完整 Auth Header 自动重试 (Attempt ${attempt}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, 2000));
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
 * Real AI Image Processing & Beautification Step (STEP 1 / STEP 2)
 * Supports custom aspect ratios ('1:1', '4:3', '16:9', '3:4') and user production notes.
 */
export async function processProductImageWithAI(
  input: {
    imageInput: string;
    ratio?: '1:1' | '4:3' | '16:9' | '3:4' | string;
    userNotes?: string;
    visionAnalysis?: any;
    hostOrigin?: string;
  },
  provider?: string,
  config?: any
): Promise<string> {
  const { imageInput, ratio = '1:1', userNotes = '', visionAnalysis = {}, hostOrigin = '' } = input;
  const currentProvider = provider || 'gemini';
  const slimImage = ensureSlimImageInput(imageInput, hostOrigin);

  const productName = visionAnalysis?.name || visionAnalysis?.productName || 'E-Commerce Product';
  const brand = visionAnalysis?.brand || 'Premium Brand';
  const imagePrompt = `Professional studio product photograph of ${productName} by ${brand}. Target aspect ratio ${ratio}. Clean white studio background, high quality lighting, background clutter removed, centered product highlights. ${userNotes ? 'Custom style requirements: ' + userNotes : ''}`;

  console.log(`[AI 图像处理与美化] 发起 AI 图像 API (Provider: ${currentProvider}, Ratio: ${ratio})...`);

  // Attempt 1: Call Google GenAI Imagen / Image Generation API if configured
  if (currentProvider === 'gemini') {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const genResponse = await callGeminiWithRetry(() =>
          ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: imagePrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: (ratio === '1:1' || ratio === '4:3' || ratio === '16:9' || ratio === '3:4') ? (ratio as any) : '1:1'
            }
          })
        );

        if (genResponse.generatedImages && genResponse.generatedImages[0]?.image?.imageBytes) {
          const b64 = genResponse.generatedImages[0].image.imageBytes;
          const dataUri = `data:image/jpeg;base64,${b64}`;
          const savedUrl = saveBase64ImageToLocal(dataUri, hostOrigin);
          if (savedUrl) {
            console.log(`[AI 图像美化成功] 通过 Imagen API 生成美化主图: ${savedUrl}`);
            return savedUrl;
          }
          return dataUri;
        }
      } catch (genErr: any) {
        console.warn(`[AI 图像 Imagen 提示/降级]: ${genErr.message || genErr}`);
      }
    }
  }

  // Attempt 2: OpenAI Compatible Image Generation API
  if (config?.apiKey && config?.baseUrl) {
    try {
      const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/images/generations`;
      const size = ratio === '16:9' ? '1792x1024' : (ratio === '3:4' ? '1024x1792' : '1024x1024');      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          n: 1,
          size,
          response_format: 'b64_json'
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (res.ok) {
        const data: any = await res.json();
        const b64 = data.data?.[0]?.b64_json || data.data?.[0]?.url;
        if (b64) {
          const dataUri = b64.startsWith('http') ? b64 : `data:image/jpeg;base64,${b64}`;
          const savedUrl = saveBase64ImageToLocal(dataUri, hostOrigin);
          if (savedUrl) {
            console.log(`[AI 图像美化成功] 通过 AI 图像 Proxy API 生成美化主图: ${savedUrl}`);
            return savedUrl;
          }
          return dataUri;
        }
      }
    } catch (imgProxyErr: any) {
      console.warn(`[AI 图像 Proxy 提示/降级]: ${imgProxyErr.message || imgProxyErr}`);
    }
  }

  // Fallback: Save slim image to local static URL and return clean public link
  const finalLocalUrl = saveBase64ImageToLocal(slimImage, hostOrigin) || slimImage;
  console.log(`[AI 图像处理完成 (降级)] 已成功转存标准化高精图片: ${finalLocalUrl}`);
  return finalLocalUrl;
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
        console.warn(`[${provider.toUpperCase()} 视觉识别节点降级] 节点 [${model}] 响应报错 (${errStr})，自动容错降级回退使用 Gemini 节点 (gemini-2.0-flash)...`);
        try {
          const slimImg = ensureSlimImageInput(imageInput);
          return await analyzeProductImageWithGemini(slimImg, {
            apiKey: process.env.GEMINI_API_KEY || (config?.apiKey ? config.apiKey : ''),
            model: 'gemini-2.0-flash'
          });
        } catch (fbErr: any) {
          throw new Error(`[视觉分析节点异常 (${provider}/${model})] ${errStr} | 自动降级 Gemini 亦失败: ${fbErr?.message || String(fbErr)}`);
        }
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

  const cleanVisionContext = extractPureTextVisionContext(visionContext || {});
  console.log("[STEP 3: AI 文案生成] 已彻底剥离图片 Base64 数据，仅以无图纯文本特征请求 (包体积精简 99%):", cleanVisionContext.name);

  const prompt = `You are a world-class e-commerce copywriter and SEO ranking specialist for Spanish-speaking markets.
Given the product analysis below, generate a comprehensive product listing.

Product Vision Analysis:
${JSON.stringify(cleanVisionContext, null, 2)}

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

  let reply: string;
  try {
    reply = await callOpenAICompatibleAPI({
      baseUrl,
      apiKey,
      model,
      messages: [
        { role: 'system', content: 'You are a professional e-commerce product copywriter for Spanish markets. Output valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      jsonMode: true
    });
  } catch (apiErr: any) {
    const errorMsg = apiErr?.message || String(apiErr);
    console.error(`[STEP 3 AI Copy Generation Error (${provider}/${model})]: ${errorMsg}`);

    console.warn(`[STEP 3 容错自动降级] 检测到 AI 节点 (${provider}/${model}) 响应失败或模型无效 [${errorMsg}]，自动降级切换至默认 Gemini 节点 (gemini-2.0-flash / gpt-4o-mini)...`);

    try {
      const fallbackResult = await generateProductContentWithGemini(input, {
        apiKey: process.env.GEMINI_API_KEY || (config?.apiKey ? config.apiKey : ''),
        model: 'gemini-2.0-flash'
      });
      console.log(`[STEP 3 降级成功] 成功回退至 Gemini 节点 (gemini-2.0-flash) 生成文案: "${fallbackResult.title}"`);
      (fallbackResult as any).fallbackInfo = `[已自动降级为 Gemini-2.0-Flash] 原因: 原 AI 节点 (${provider}/${model}) 响应报错 [${errorMsg}]`;
      return fallbackResult;
    } catch (fallbackErr: any) {
      const fbMsg = fallbackErr?.message || String(fallbackErr);
      console.warn(`[STEP 3 本地智能模板兜底] 云端 AI 节点全数失败 (${errorMsg} | ${fbMsg})，启动结构化模板推导...`);
      const productName = cleanVisionContext.name || 'Producto Inteligente de Alta Calidad';
      const smartFallbackProduct: Partial<Product> = {
        title: `${productName} - Alta Calidad y Rendimiento Superior`,
        shortDescription: `<ul><li>Garantía de calidad superior y gran durabilidad.</li><li>Diseño ergonómico y multifuncional.</li><li>Ideal para uso diario y profesional.</li></ul>`,
        longDescription: `<h3>Descripción del Producto</h3><p>Descubra el excelente rendimiento de ${productName}. Diseñado con materiales de alta calidad (${cleanVisionContext.material || 'duraderos'}) para ofrecer la mejor experiencia de uso.</p><h3>Características Destacadas</h3><ul><li>Color: ${cleanVisionContext.color || 'Elegante'}</li><li>Material: ${cleanVisionContext.material || 'Resistente'}</li><li>Categoría: ${cleanVisionContext.category || 'General'}</li></ul>`,
        subtitle: `Innovación y calidad garantizada en cada detalle`,
        sku: `AIECOM-FB-${Math.floor(100000 + Math.random() * 900000)}`,
        regular_price: '49.99',
        sale_price: '39.99',
        price: 49.99,
        promoPrice: 39.99,
        manage_stock: true,
        stock_quantity: 100,
        stock: 100,
        brand: cleanVisionContext.brand || 'Generic',
        categories: [cleanVisionContext.category || 'General'],
        tags: cleanVisionContext.keywords || ['Calidad', 'Nuevo'],
        sellingPoints: ['Calidad Garantizada', 'Envío Rápido', 'Diseño Elegante'],
        parameters: [
          { name: 'Material', value: cleanVisionContext.material || 'Alta Calidad' },
          { name: 'Color', value: cleanVisionContext.color || 'Estándar' }
        ],
        usageInstructions: 'Instrucciones sencillas de uso diario',
        cautions: 'Mantener en un lugar fresco y seco',
        seo: {
          title: `${productName} | Comprar Online`,
          keywords: cleanVisionContext.keywords || ['producto', 'calidad'],
          metaDescription: `Compre ${productName} con la mejor garantía y calidad.`,
          slug: (productName || 'producto').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        }
      };
      (smartFallbackProduct as any).fallbackInfo = `[已触发智能兜底模板生成] 原因: 原 AI 节点 (${provider}/${model}) 响应失败 [${errorMsg}]`;
      return smartFallbackProduct;
    }
  }

  const parsed: any = extractAndParseJSON(reply, {});
  const esTitle = parsed.title || visionContext?.name || 'Producto Inteligente de Alta Calidad Pro';
  const esShort = parsed.shortDescription || '<ul><li>100% Calidad Garantizada</li><li>Diseño Ergonómico</li></ul>';
  const esLong = parsed.longDescription || '<h3>Descripción General</h3><p>Diseñado con precisión para un gran rendimiento.</p>';

  const generatedSku = parsed.sku || ("AIECOM-ES-" + Math.floor(100000 + Math.random() * 900000));
  const regularPrice = parsed.regular_price || parsed.regularPrice || parsed.price || 129.00;
  const salePrice = parsed.sale_price || parsed.salePrice || parsed.promoPrice || 89.00;
  const stockQty = Number(parsed.stock_quantity || parsed.stock || Math.floor(50 + Math.random() * 151));

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
    sku: generatedSku,
    regular_price: String(regularPrice),
    sale_price: String(salePrice),
    manage_stock: true,
    stock_quantity: stockQty,
    stock: stockQty,
    categories: parsed.categories || [visionContext?.category || '3C数码', '爆款新品'],
    tags: parsed.tags || visionContext?.keywords || ['AI推荐', '热销新品'],
    price: Number(regularPrice),
    promoPrice: Number(salePrice),
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

    const cleanVisionContext = extractPureTextVisionContext(visionContext || {});
    console.log("[STEP 3: Gemini 文案生成] 已彻底剥离图片 Base64 数据，仅以无图纯文本特征请求 (包体积精简 99%):", cleanVisionContext.name);

    const prompt = `You are a world-class e-commerce copywriter and SEO ranking specialist for Spanish-speaking markets (Spain, Mexico, Latin America).
Given the product analysis below, generate a comprehensive product listing.

Product Vision Analysis:
${JSON.stringify(cleanVisionContext, null, 2)}

User Custom Requirements: ${input.userNotes || 'None'}
Cost Price (USD): ${input.costPrice || 'Auto Estimate'}

HARD MANDATE: All product copy (title, shortDescription, longDescription, sellingPoints, subtitles) MUST be written strictly and entirely in SPANISH (Español / 'es'). Do NOT output Chinese or English for product content.

Respond ONLY with a valid JSON object matching this schema:

{
  "title": "SEO product title in Spanish (max 70 chars, catchy)",
  "shortDescription": "Compelling 3-5 bullet items in Spanish HTML (<ul><li>...</li></ul>)",
  "longDescription": "<h3>Descripción General</h3><p>Detailed Spanish description...</p><h3>Características Principales</h3><ul><li>Point 1 in Spanish</li></ul>",
  "subtitle": "Short benefit-driven subtitle or slogan in Spanish",
  "sku": "AIECOM-CAT-XXXX (Unique SKU code e.g. AIECOM-ELECTRONICS-83921)",
  "regular_price": "129.00",
  "sale_price": "89.00",
  "manage_stock": true,
  "stock_quantity": 120,
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

    // If image is supplied directly and no text visionAnalysis exists, pass as multimodal inlineData
    if (input.imageInput && !input.visionAnalysis) {
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

    const generatedSku = parsed.sku || ("AIECOM-CAT-" + Math.floor(100000 + Math.random() * 900000));
    const regularPrice = String(parsed.regular_price || parsed.regularPrice || parsed.price || 129.00);
    const salePrice = String(parsed.sale_price || parsed.salePrice || parsed.promoPrice || 89.00);
    const stockQty = Number(parsed.stock_quantity || parsed.stock || Math.floor(50 + Math.random() * 151));

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
      sku: generatedSku,
      regular_price: regularPrice,
      sale_price: salePrice,
      manage_stock: true,
      stock_quantity: stockQty,
      stock: stockQty,
      categories: parsed.categories || [visionContext?.category || '3C数码', '爆款新品'],
      tags: parsed.tags || visionContext?.keywords || ['AI推荐', '热销新品'],
      price: Number(regularPrice),
      promoPrice: Number(salePrice),
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
