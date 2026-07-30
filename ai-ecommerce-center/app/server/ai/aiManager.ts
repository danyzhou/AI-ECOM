import { AISettingConfig, ChatGPTSettingConfig, GeminiSettingConfig, Product } from '../../src/types';
import { testOpenAIConnection, analyzeProductImageWithOpenAI, maskApiKey } from './openaiService';
import { testGeminiConnection, generateProductContentWithGemini, maskGeminiApiKey } from './geminiService';

// Default global AI state stored in memory
let systemAiConfig: AISettingConfig = {
  provider: 'gemini',
  chatgpt: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4o',
    purpose: 'image_optimization_and_vision',
    status: 'connected',
    lastTestedAt: new Date().toISOString()
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-3.6-flash',
    purpose: 'product_content_and_seo',
    status: 'connected',
    lastTestedAt: new Date().toISOString()
  },
  autoApproveReviewToggle: false,
  defaultLanguage: 'zh-CN'
};

export function getAIConfig(): AISettingConfig {
  return systemAiConfig;
}

export function updateAIConfig(newConfig: Partial<AISettingConfig>): AISettingConfig {
  systemAiConfig = {
    ...systemAiConfig,
    ...newConfig,
    chatgpt: {
      ...systemAiConfig.chatgpt,
      ...(newConfig.chatgpt || {})
    },
    gemini: {
      ...systemAiConfig.gemini,
      ...(newConfig.gemini || {})
    }
  };
  return systemAiConfig;
}

/**
 * Test specific provider connection
 */
export async function testProviderConnection(provider: 'openai' | 'gemini', customConfig?: any) {
  if (provider === 'openai') {
    const configToTest: ChatGPTSettingConfig = {
      ...systemAiConfig.chatgpt,
      ...(customConfig || {}),
      purpose: 'image_optimization_and_vision'
    };
    const res = await testOpenAIConnection(configToTest);
    systemAiConfig.chatgpt.status = res.success ? 'connected' : 'error';
    systemAiConfig.chatgpt.lastTestedAt = new Date().toISOString();
    return res;
  } else if (provider === 'gemini') {
    const configToTest: GeminiSettingConfig = {
      ...systemAiConfig.gemini,
      ...(customConfig || {}),
      purpose: 'product_content_and_seo'
    };
    const res = await testGeminiConnection(configToTest);
    systemAiConfig.gemini.status = res.success ? 'connected' : 'error';
    systemAiConfig.gemini.lastTestedAt = new Date().toISOString();
    return res;
  } else {
    throw new Error(`不支持的 AI Provider: ${provider}`);
  }
}

/**
 * Execute Product Image Analysis & Optimization instruction generation (OpenAI GPT Vision / Multi-modal)
 */
export async function executeImageVisionAnalysis(
  imageUrl: string,
  imageRatio: '1:1' | '4:3' | '16:9' | '3:4' = '1:1'
) {
  // Use OpenAI ChatGPT Vision for image analysis
  return await analyzeProductImageWithOpenAI(
    imageUrl,
    systemAiConfig.chatgpt,
    imageRatio
  );
}

/**
 * Execute Product Content, SEO & Pricing generation (Gemini API)
 */
export async function executeProductContentGeneration(input: {
  productTitle?: string;
  visionInfo?: any;
  categoryHint?: string;
  language?: string;
  sku?: string;
  imageRatio?: string;
}): Promise<Partial<Product>> {
  // Use Gemini API for content generation
  return await generateProductContentWithGemini(
    input,
    systemAiConfig.gemini
  );
}

/**
 * Helper to get masked version of keys for UI safety
 */
export function getMaskedAIConfig(): AISettingConfig {
  return {
    ...systemAiConfig,
    chatgpt: {
      ...systemAiConfig.chatgpt,
      apiKey: maskApiKey(systemAiConfig.chatgpt.apiKey)
    },
    gemini: {
      ...systemAiConfig.gemini,
      apiKey: maskGeminiApiKey(systemAiConfig.gemini.apiKey)
    }
  };
}
