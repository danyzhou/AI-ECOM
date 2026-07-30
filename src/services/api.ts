import { Product, WooCommerceConfig, AISettingConfig, SKUConfig, AITask, WooCommerceStore, ProductPublication } from '../types';

// Helper to get stored auth token
export function getAuthToken(): string | null {
  return localStorage.getItem('ecom_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('ecom_auth_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('ecom_auth_token');
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }
  return headers;
}

export async function loginUser(username: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '登录失败，请检查用户名与密码');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function registerUser(payload: {
  username: string;
  password: string;
  email: string;
  name?: string;
  role?: 'admin' | 'operations';
}) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '注册失败，请检查填写内容');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getSessionMe() {
  const token = getAuthToken();
  const res = await fetch('/api/auth/me', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    removeAuthToken();
    return { authenticated: false };
  }
  return await res.json();
}

export async function logoutUser() {
  const token = getAuthToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    console.warn('Logout endpoint call failed:', e);
  } finally {
    removeAuthToken();
  }
  return { success: true };
}

export async function fetchUsersList() {
  const res = await fetch('/api/auth/users', {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '无法获取用户列表');
  }
  return data;
}

export async function analyzeProductWithAI(payload: {
  imageBase64?: string;
  imageMimeType?: string;
  productUrl?: string;
  userPrompt?: string;
  language?: string;
}) {
  const res = await fetch('/api/gemini/analyze-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'AI analysis request failed');
  }
  return await res.json();
}

export async function regenerateProductField(payload: {
  field: string;
  currentTitle: string;
  currentDescription?: string;
  language?: string;
}) {
  const res = await fetch('/api/gemini/regenerate-field', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

import { standardizeImageToBase641to1, standardizeImageArray1to1 } from '../utils/imageStandardizer';

export async function publishToWooCommerce(product: Product) {
  // 1:1 Image Canvas Standardize Pre-processor
  const copyProduct = { ...product };
  if (copyProduct.mainImage) {
    copyProduct.mainImage = await standardizeImageToBase641to1(copyProduct.mainImage, 800);
  }
  if (copyProduct.optimizedMainImage) {
    copyProduct.optimizedMainImage = await standardizeImageToBase641to1(copyProduct.optimizedMainImage, 800);
  }
  if (copyProduct.galleryImages && Array.isArray(copyProduct.galleryImages)) {
    copyProduct.galleryImages = await standardizeImageArray1to1(copyProduct.galleryImages, 800);
  }

  const res = await fetch('/api/woocommerce/publish', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ product: copyProduct }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to publish to WooCommerce');
  }
  return data;
}

export async function fetchAITasks(): Promise<{ tasks: AITask[] }> {
  const res = await fetch('/api/workflow/tasks');
  return await res.json();
}

export async function runAIPipeline(payload: {
  imageUrl?: string;
  imageBase64?: string;
  userNotes?: string;
  image_ratio?: '1:1' | '4:3' | '16:9' | '3:4';
  imageRatio?: '1:1' | '4:3' | '16:9' | '3:4';
  autoPublish?: boolean;
  storeId?: string;
}) {
  const sanitizedPayload = { ...payload };
  const rawImage = sanitizedPayload.imageBase64 || sanitizedPayload.imageUrl;
  if (rawImage) {
    const stdImage = await standardizeImageToBase641to1(rawImage, 800);
    sanitizedPayload.imageBase64 = stdImage;
  }

  const res = await fetch('/api/workflow/run-pipeline', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(sanitizedPayload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '流水线自动化执行失败');
  }
  return data;
}

export async function fetchAISettings(): Promise<{ success: boolean; ai: AISettingConfig }> {
  const res = await fetch('/api/settings/ai', {
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function saveAISettings(ai: AISettingConfig): Promise<{ success: boolean; ai: AISettingConfig; message: string }> {
  const res = await fetch('/api/settings/ai', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ai }),
  });
  return await res.json();
}

export async function testGeminiConnection(config: { apiKey?: string; model?: string }) {
  const res = await fetch('/api/ai/test/gemini', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });
  return await res.json();
}

export async function testAIProviderConnection(provider: string, config: { apiKey?: string; baseUrl?: string; model?: string }) {
  const res = await fetch(`/api/ai/test/${provider}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });
  return await res.json();
}

export async function callAIProxy(payload: {
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: any }>;
  prompt?: string;
  model?: string;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  jsonMode?: boolean;
  temperature?: number;
  imageInput?: string;
  userNotes?: string;
  costPrice?: number;
  language?: string;
  action?: string;
}) {
  const res = await fetch('/api/ai/proxy', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || 'AI 代理服务请求处理失败');
  }
  return data;
}

export async function fetchSKUConfig(): Promise<{ success: boolean; config: SKUConfig }> {
  const res = await fetch('/api/sku/config', {
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function saveSKUConfig(config: SKUConfig): Promise<{ success: boolean; config: SKUConfig; message: string }> {
  const res = await fetch('/api/sku/config', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });
  return await res.json();
}

export async function generateSKU(prefix?: string): Promise<{ success: boolean; sku: string }> {
  const res = await fetch('/api/sku/generate', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prefix }),
  });
  return await res.json();
}

// Stores Management API
export async function fetchStores(): Promise<{ success: boolean; stores: WooCommerceStore[] }> {
  const res = await fetch('/api/stores', {
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function addStoreApi(store: { name: string; url: string; consumer_key: string; consumer_secret: string }): Promise<{ success: boolean; store: WooCommerceStore; message: string }> {
  const res = await fetch('/api/stores', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(store),
  });
  return await res.json();
}

export async function updateStoreApi(id: string, store: Partial<WooCommerceStore>): Promise<{ success: boolean; store: WooCommerceStore; message: string }> {
  const res = await fetch(`/api/stores/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(store),
  });
  return await res.json();
}

export async function deleteStoreApi(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/stores/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function testStoreApi(id: string): Promise<{ success: boolean; storeName?: string; version?: string; error?: string }> {
  const res = await fetch(`/api/stores/${id}/test`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return await res.json();
}

// Multi-Store Publications API
export async function fetchPublications(): Promise<{ success: boolean; publications: ProductPublication[] }> {
  const res = await fetch('/api/publications', {
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function publishToStoresApi(productId: string, storeIds: string[], productData?: any): Promise<{ success: boolean; results: ProductPublication[]; message: string }> {
  let copyData = productData ? { ...productData } : undefined;
  if (copyData) {
    if (copyData.mainImage) {
      copyData.mainImage = await standardizeImageToBase641to1(copyData.mainImage, 800);
    }
    if (copyData.optimizedMainImage) {
      copyData.optimizedMainImage = await standardizeImageToBase641to1(copyData.optimizedMainImage, 800);
    }
    if (copyData.galleryImages && Array.isArray(copyData.galleryImages)) {
      copyData.galleryImages = await standardizeImageArray1to1(copyData.galleryImages, 800);
    }
  }

  const res = await fetch('/api/publications/publish', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ productId, storeIds, productData: copyData }),
  });
  return await res.json();
}

export async function retryWorkflowStep(taskId: string, step: 'gemini_vision' | 'gemini_content' | 'gemini' | 'woocommerce') {
  const res = await fetch('/api/workflow/retry-step', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ taskId, step }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '步骤重试请求失败');
  }
  return data;
}

export async function retryAITask(taskId: string) {
  const res = await fetch('/api/tasks/retry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId }),
  });
  return await res.json();
}

export async function fetchSystemSettings() {
  const res = await fetch('/api/settings');
  return await res.json();
}

export async function saveSystemSettings(settings: {
  woocommerce?: Partial<WooCommerceConfig>;
  ai?: Partial<AISettingConfig>;
}) {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return await res.json();
}

export async function fetchProducts(): Promise<{ success: boolean; products: Product[] }> {
  const res = await fetch('/api/products', {
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function fetchProductById(id: string): Promise<{ success: boolean; product: Product }> {
  const res = await fetch(`/api/products/${id}`, {
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function saveProduct(product: Product): Promise<{ success: boolean; product: Product; message: string }> {
  const res = await fetch('/api/products/save', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ product }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '保存商品失败');
  }
  return data;
}

export async function deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function generateGeminiProductContent(payload: {
  taskId?: string;
  productId?: string;
  optimizedImage?: string;
  originalImage?: string;
  geminiVision?: any;
  userNotes?: string;
  costPrice?: number;
  targetMarket?: string;
  language?: string;
}) {
  const res = await fetch('/api/gemini/generate-product-content', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gemini 商品资料生成失败');
  }
  return data;
}

export async function fetchWooCommerceConfig() {
  const res = await fetch('/api/woocommerce/config', {
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function saveWooCommerceConfig(config: any) {
  const res = await fetch('/api/woocommerce/config', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });
  return await res.json();
}

export async function testWooCommerceConnection(config: { siteUrl: string; consumerKey: string; consumerSecret: string }) {
  const res = await fetch('/api/woocommerce/test', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '连接测试失败');
  }
  return data;
}

export async function publishProductToWooCommerce(productId: string, mode?: 'publish' | 'draft') {
  const res = await fetch('/api/woocommerce/publish', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ productId, mode }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '发布商品到 WooCommerce 失败');
  }
  return data;
}

export async function fetchWordPressPosts() {
  const res = await fetch('/api/woocommerce/posts', {
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function syncWooCommerceProductStatus(productId: string) {
  const res = await fetch(`/api/woocommerce/sync/${productId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '同步 WooCommerce 商品状态失败');
  }
  return data;
}

export async function fetchSystemLogs(filters?: { type?: string; status?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (filters?.type) query.set('type', filters.type);
  if (filters?.status) query.set('status', filters.status);
  if (filters?.limit) query.set('limit', String(filters.limit));

  const res = await fetch(`/api/logs?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function clearSystemLogs() {
  const res = await fetch('/api/logs', {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return await res.json();
}

export async function sendAIChatProxy(payload: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }>;
  model?: string;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  jsonMode?: boolean;
  temperature?: number;
}) {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'AI BFF 网关代理调用失败');
  }
  return data;
}



