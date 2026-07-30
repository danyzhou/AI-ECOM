import { AISettingConfig, AIProviderType, GeminiSettingConfig, ProviderConfig, Product } from '../../src/types';
import { 
  testAIConnection, 
  analyzeProductImageWithAI, 
  generateProductContentWithAI, 
  maskGeminiApiKey,
  GeminiProductVisionAnalysis
} from './geminiService';
import { readJSONFile, writeJSONFile } from '../db/databaseService.js';

const AI_SETTINGS_FILE = 'ai_settings.json';

// System global AI settings state
let systemAiConfig: AISettingConfig = {
  provider: 'gemini',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.0-flash',
    purpose: 'vision_analysis_and_content_generation',
    status: 'connected',
    lastTestedAt: new Date().toISOString()
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    status: 'disconnected'
  },
  siliconflow: {
    apiKey: process.env.SILICONFLOW_API_KEY || '',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
    status: 'disconnected'
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-2-9b-it:free',
    status: 'disconnected'
  },
  custom: {
    apiKey: process.env.CUSTOM_AI_API_KEY || '',
    baseUrl: process.env.CUSTOM_AI_BASE_URL || 'http://localhost:8000/v1',
    model: 'gemini-2.0-flash',
    status: 'disconnected'
  },
  autoApproveReviewToggle: false,
  defaultLanguage: 'zh-CN'
};

// Initialize from persistent file storage if available
try {
  const stored = readJSONFile<Partial<AISettingConfig>>(AI_SETTINGS_FILE, {});
  if (stored && Object.keys(stored).length > 0) {
    systemAiConfig = {
      ...systemAiConfig,
      ...stored,
      gemini: { ...systemAiConfig.gemini, ...(stored.gemini || {}) },
      groq: { ...systemAiConfig.groq, ...(stored.groq || {}) },
      siliconflow: { ...systemAiConfig.siliconflow, ...(stored.siliconflow || {}) },
      openrouter: { ...systemAiConfig.openrouter, ...(stored.openrouter || {}) },
      custom: { ...systemAiConfig.custom, ...(stored.custom || {}) }
    };
  }
} catch (e) {
  console.warn('[AIService] Unable to load saved AI settings on startup:', e);
}

export function getAIConfig(): AISettingConfig {
  return systemAiConfig;
}

export function updateAIConfig(newConfig: Partial<AISettingConfig>): AISettingConfig {
  const mergeProvider = (oldP?: ProviderConfig, newP?: ProviderConfig) => {
    if (!newP) return oldP;
    const apiKey = (newP.apiKey && newP.apiKey.includes('****'))
      ? (oldP?.apiKey || '')
      : (newP.apiKey !== undefined ? newP.apiKey : (oldP?.apiKey || ''));
    return {
      ...(oldP || {}),
      ...newP,
      apiKey
    };
  };

  systemAiConfig = {
    ...systemAiConfig,
    ...newConfig,
    gemini: mergeProvider(systemAiConfig.gemini, newConfig.gemini as any) as any,
    groq: mergeProvider(systemAiConfig.groq, newConfig.groq),
    siliconflow: mergeProvider(systemAiConfig.siliconflow, newConfig.siliconflow),
    openrouter: mergeProvider(systemAiConfig.openrouter, newConfig.openrouter),
    custom: mergeProvider(systemAiConfig.custom, newConfig.custom)
  };

  // Persist updated configuration to data_db/ai_settings.json
  try {
    writeJSONFile(AI_SETTINGS_FILE, systemAiConfig);
  } catch (err) {
    console.error('[AIService] Failed to write ai_settings.json:', err);
  }

  return systemAiConfig;
}

/**
 * Test AI Provider API Connection
 */
export async function testProviderConnection(provider: AIProviderType, customConfig?: any) {
  const targetProvider = provider || systemAiConfig.provider || 'gemini';
  const currentProviderConfig = (systemAiConfig as any)[targetProvider] || {};
  const mergedConfig = { ...currentProviderConfig, ...(customConfig || {}) };

  const res = await testAIConnection(targetProvider, mergedConfig);
  if ((systemAiConfig as any)[targetProvider]) {
    (systemAiConfig as any)[targetProvider].status = res.success ? 'connected' : 'error';
    (systemAiConfig as any)[targetProvider].lastTestedAt = new Date().toISOString();
  }
  return res;
}

/**
 * Step 1: Vision Analysis
 */
export async function runGeminiVisionStep(imageUrl: string): Promise<GeminiProductVisionAnalysis> {
  const provider = systemAiConfig.provider || 'gemini';
  const providerConfig = (systemAiConfig as any)[provider] || systemAiConfig.gemini;
  return await analyzeProductImageWithAI(imageUrl, provider, providerConfig);
}

export const executeImageVisionAnalysis = runGeminiVisionStep;

/**
 * Step 2: Content & SEO Generation
 */
export async function runGeminiContentStep(input: {
  imageInput?: string;
  visionAnalysis?: GeminiProductVisionAnalysis;
  userNotes?: string;
  costPrice?: number;
  language?: string;
  targetMarket?: string;
}): Promise<Partial<Product>> {
  const provider = systemAiConfig.provider || 'gemini';
  const providerConfig = (systemAiConfig as any)[provider] || systemAiConfig.gemini;
  return await generateProductContentWithAI(input, provider, providerConfig);
}

export const executeProductContentGeneration = runGeminiContentStep;

/**
 * Unified AIService Adapter Architecture
 */
export const AIService = {
  getAIConfig,
  updateAIConfig,
  testProviderConnection,
  analyzeImage: runGeminiVisionStep,
  generateContent: runGeminiContentStep,
  generateProductData: async (input: {
    imageUrl: string;
    userNotes?: string;
    costPrice?: number;
    language?: string;
    targetMarket?: string;
  }) => {
    const visionAnalysis = await runGeminiVisionStep(input.imageUrl);
    const content = await runGeminiContentStep({
      imageInput: input.imageUrl,
      visionAnalysis,
      userNotes: input.userNotes,
      costPrice: input.costPrice,
      language: input.language,
      targetMarket: input.targetMarket
    });
    return {
      visionAnalysis,
      content
    };
  }
};

/**
 * Get masked configuration for UI safety
 */
export function getMaskedAIConfig(): AISettingConfig {
  return {
    ...systemAiConfig,
    gemini: {
      ...systemAiConfig.gemini,
      apiKey: maskGeminiApiKey(systemAiConfig.gemini?.apiKey || '')
    },
    groq: systemAiConfig.groq ? {
      ...systemAiConfig.groq,
      apiKey: maskGeminiApiKey(systemAiConfig.groq.apiKey || '')
    } : undefined,
    siliconflow: systemAiConfig.siliconflow ? {
      ...systemAiConfig.siliconflow,
      apiKey: maskGeminiApiKey(systemAiConfig.siliconflow.apiKey || '')
    } : undefined,
    openrouter: systemAiConfig.openrouter ? {
      ...systemAiConfig.openrouter,
      apiKey: maskGeminiApiKey(systemAiConfig.openrouter.apiKey || '')
    } : undefined,
    custom: systemAiConfig.custom ? {
      ...systemAiConfig.custom,
      apiKey: maskGeminiApiKey(systemAiConfig.custom.apiKey || '')
    } : undefined
  };
}
