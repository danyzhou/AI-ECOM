export type UserRole = 'admin' | 'operations' | 'editor';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export type ProductStatus = 'draft' | 'pending_review' | 'ready' | 'published' | 'failed';

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface ProductParam {
  name: string;
  value: string;
}

export interface ProductSEO {
  title: string;
  keywords: string[];
  metaDescription: string;
  slug: string;
}

export interface ProductSource {
  type: 'upload' | 'url' | 'crawler';
  originalUrl?: string;
  rawText?: string;
}

export interface MultilingualTitles {
  zh: string;
  en: string;
  es: string;
}

export interface Product {
  id: string;
  title: string;
  multilingualTitles?: MultilingualTitles;
  subtitle: string;
  sku: string;
  brand?: string;
  categories: string[];
  tags: string[];
  status: ProductStatus;
  
  // Images
  mainImage: string;
  galleryImages: string[];
  optimizedMainImage?: string;
  whiteBgImage?: string;
  
  // Pricing & Economics
  price: number;
  promoPrice: number;
  costPrice: number;
  estimatedMargin: number; // percentage e.g. 65.5
  
  // Logistics & Stock
  stock: number;
  weight: number; // kg
  dimensions: ProductDimensions;
  
  // Content
  sellingPoints: string[];
  shortDescription: string;
  longDescription: string; // Rich HTML/Markdown
  parameters: ProductParam[];
  usageInstructions: string;
  cautions: string;
  
  // SEO
  seo: ProductSEO;
  
  // AI Generated & WooCommerce Payload
  ai_title?: string;
  ai_description?: string;
  ai_short_description?: string;
  seo_title?: string;
  seo_keywords?: string[];
  attributesList?: Array<{ name: string; options: string[] }>;
  woocommerceJson?: Record<string, any>;
  
  // Metadata & Source
  source: ProductSource;
  image_ratio?: '1:1' | '4:3' | '16:9' | '3:4';
  imageRatio?: '1:1' | '4:3' | '16:9' | '3:4';
  wcProductId?: number;
  wcPermalink?: string;
  wordpress_id?: number;
  publish_status?: 'pending' | 'publishing' | 'published' | 'draft' | 'failed';
  publish_url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageProcessOptions {
  removeWatermark: boolean;
  removeBg: boolean;
  enhanceClarity: boolean;
  autoCrop: boolean;
  generateLifestyle: boolean;
  aspectRatio: '1:1' | '4:3' | '16:9' | '3:4';
  outputQuality: 'standard' | 'hd' | '4k';
}

export interface AIGenerationConfig {
  language: 'zh-CN' | 'en' | 'es' | 'de';
  tone: 'professional' | 'persuasive' | 'concise' | 'luxury';
  targetAudience: string;
  categoryHint: string;
  includeSEO: boolean;
  priceStrategy: 'competitive' | 'premium' | 'cost_plus' | 'penetration';
}

export interface WooCommerceStore {
  id: string;
  store_id?: string;
  name: string;
  store_name?: string;
  type: string; // 'wordpress_woocommerce'
  platform?: string;
  url: string;
  wordpress_url?: string;
  consumer_key: string;
  consumer_secret: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  api_status?: 'connected' | 'disconnected' | 'testing' | 'error';
  created_time: string;
  updated_time?: string;
  lastTestedAt?: string;
}

export interface ProductPublication {
  id: string;
  product_id: string;
  product_title?: string;
  store_id: string;
  store_name?: string;
  store_url?: string;
  wordpress_id?: number;
  status: 'pending' | 'publishing' | 'success' | 'failed';
  url?: string;
  error_log?: string;
  created_time: string;
  publish_time?: string;
}

export interface WooCommerceConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  publishMode?: 'publish' | 'draft';
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  lastTestedAt?: string;
  storeName?: string;
  currency?: string;
}

export interface ChatGPTSettingConfig {
  apiKey: string;
  model: string; // e.g. 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'
  purpose: 'image_optimization_and_vision';
  status?: 'connected' | 'disconnected' | 'error';
  lastTestedAt?: string;
}

export interface GeminiSettingConfig {
  apiKey: string;
  model: string; // e.g. 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'
  purpose: 'product_content_and_seo';
  status?: 'connected' | 'disconnected' | 'error';
  lastTestedAt?: string;
}

export interface AISettingConfig {
  provider: 'openai' | 'gemini';
  chatgpt: ChatGPTSettingConfig;
  gemini: GeminiSettingConfig;
  autoApproveReviewToggle: boolean; // Admin choice: Auto-publish vs Manual Review
  defaultLanguage: 'zh-CN' | 'en' | 'es';
}

export interface SKUConfig {
  prefix: string;
  codeLength: number;
  autoGenerate: boolean;
  currentSequence: number;
}

export type PipelineStep = 'uploaded' | 'image_completed' | 'content_completed' | 'published' | 'review' | 'failed';
export type TaskStatus = 'pending' | 'processing' | 'review' | 'completed' | 'published' | 'failed';

export interface ChatGPTVisionResult {
  productType: string;
  productNameGuess: string;
  brand: string;
  color: string;
  materials: string;
  keyFeatures: string[];
  visualHighlights: string;
}

export interface AITask {
  id: string;
  productId?: string;
  productTitle?: string;
  originalImage: string;
  optimizedImage?: string;
  currentStep: PipelineStep;
  status: TaskStatus;
  progress: number; // 0 to 100
  elapsedSeconds: number;
  message: string;
  errorLog?: string;
  
  // Pipeline AI payloads
  chatgptVision?: ChatGPTVisionResult;
  geminiContent?: Partial<Product>;
  wcResult?: {
    wcProductId: number;
    wcPermalink: string;
  };
  
  logs: string[];
  createdAt: string;
  completedAt?: string;
}

export interface DashboardMetrics {
  totalProducts: number;
  aiGeneratedCount: number;
  pendingAuditCount: number;
  publishedCount: number;
  failedTasksCount: number;
  wcConnectionStatus: 'connected' | 'disconnected' | 'error';
  totalValue: number;
  avgMargin: number;
}

