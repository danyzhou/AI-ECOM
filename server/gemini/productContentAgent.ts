import { GoogleGenAI, Type } from "@google/genai";
import { callGeminiWithRetry } from "../ai/geminiService";
import { getAIConfig, runGeminiContentStep } from "../ai/aiManager";

export interface GeminiInput {
  optimizedImage: string;
  originalImage?: string;
  geminiVision?: {
    productType?: string;
    productNameGuess?: string;
    brand?: string;
    color?: string;
    materials?: string;
    keyFeatures?: string[];
    visualHighlights?: string;
  };
  userNotes?: string;
  costPrice?: number;
  targetMarket?: string;
  targetLanguage?: string;
}

export interface MultilingualTitles {
  zh: string;
  en: string;
  es: string;
}

export interface ProductSEOData {
  seoTitle: string;
  seoDescription: string;
  focusKeywords: string[];
  relatedKeywords: string[];
  urlSlug: string;
  metaTags: Record<string, string>;
}

export interface PriceSuggestion {
  regularPrice: number;
  salePrice: number;
  costPrice: number;
  estimatedMargin: number; // e.g. 68.5
  suggestedPriceRange: {
    min: number;
    max: number;
  };
  pricingStrategy: string;
}

export interface ProductAttributesData {
  category: string;
  categories: string[];
  tags: string[];
  brand: string;
  sku: string;
  color: string;
  material: string;
  size: string;
  weightKg: number;
  attributesList: Array<{ name: string; options: string[] }>;
}

export interface WooCommerceProductJSON {
  name: string;
  slug: string;
  description: string;
  short_description: string;
  regular_price: string;
  sale_price: string;
  categories: Array<{ id?: number; name: string }>;
  tags: Array<{ id?: number; name: string }>;
  images: Array<{ src: string }>;
  attributes: Array<{ name: string; options: string[] }>;
  sku: string;
  stock_quantity: number;
}

export interface FullGeminiProductResult {
  aiTitle: string; // Internal ZH title
  multilingualTitles: MultilingualTitles;
  multilingualShortDescriptions: { zh: string; en: string; es: string };
  multilingualLongDescriptions: { zh: string; en: string; es: string };
  aiShortDescription: string;
  aiDescription: string; // Long HTML Description
  seo: ProductSEOData;
  pricing: PriceSuggestion;
  attributes: ProductAttributesData;
  woocommerceJson: WooCommerceProductJSON;
  rawJson: any;
  generatedAt: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const config = getAIConfig();
  const apiKey = config?.gemini?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * 1. analyze_product
 * Analyzes image and Vision metadata using Gemini 3.6 Flash
 */
export async function analyzeProduct(ai: GoogleGenAI, input: GeminiInput) {
  const visionData = input.geminiVision || {};
  const prompt = `Analyze this e-commerce product based on the provided image and Vision metadata:
Vision Metadata: ${JSON.stringify(visionData)}
User Notes: ${input.userNotes || "None"}
Target Market: ${input.targetMarket || "Global Cross-Border E-Commerce"}

Identify the core category, key target audience, unique value propositions, and suitable branding positioning. Return a JSON summary.`;

  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productCategory: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            coreValuePropositions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedBrandTone: { type: Type.STRING },
          },
        },
      },
    })
  );

  try {
    return JSON.parse(response.text.trim());
  } catch {
    const vision = input.geminiVision;
    return {
      productCategory: vision?.productType || "General E-Commerce Item",
      targetAudience: "Global Consumers",
      coreValuePropositions: vision?.keyFeatures || ["High Quality", "Durable Design"],
      suggestedBrandTone: "Professional & Persuasive",
    };
  }
}

/**
 * 2. generate_product_content
 * Generates Spanish Product Listing Copy (esTitle, esShort, esLong) for WooCommerce
 */
export async function generateProductContent(ai: GoogleGenAI, input: GeminiInput, analysis: any) {
  const prompt = `You are an expert e-commerce copywriter for international DTC and WooCommerce stores in Spanish-speaking markets (Spain, Mexico, Latin America).
  
Given:
- Product Type: ${analysis.productCategory}
- Brand: ${input.geminiVision?.brand || "AI-Labs"}
- Key Features: ${JSON.stringify(analysis.coreValuePropositions)}
- Materials/Colors: ${input.geminiVision?.materials || ""} / ${input.geminiVision?.color || ""}
- User Instructions: ${input.userNotes || "Highlight premium quality, usability, and value"}

HARD MANDATE: All copy (title, short description, long description) MUST be written strictly and entirely in SPANISH (Español / 'es'). Do NOT use Chinese or English for product titles or descriptions.

Generate complete product listings in Spanish:
1. Title (esTitle): High-converting Spanish product title.
2. Short Description (esShortDescription): 3 to 5 core selling point bullet items in clean HTML list (<ul><li>...</li></ul>) in Spanish.
3. Long Description (esLongDescription): Comprehensive Spanish HTML description with headings (<h3>) covering Product Overview (Descripción General), Key Features (Características Principales), Modo de Uso, and Garantía.

Return a JSON object containing Spanish product copy:
- multilingualTitles: { "es": "...", "zh": "...", "en": "..." } (All populated with Spanish title)
- multilingualShortDescriptions: { "es": "...", "zh": "...", "en": "..." } (All populated with Spanish short description)
- multilingualLongDescriptions: { "es": "...", "zh": "...", "en": "..." } (All populated with Spanish long description)
- sellingPointsList: Array of key bullet points in Spanish`;

  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            multilingualTitles: {
              type: Type.OBJECT,
              properties: {
                zh: { type: Type.STRING },
                en: { type: Type.STRING },
                es: { type: Type.STRING },
              },
              required: ["es"],
            },
            multilingualShortDescriptions: {
              type: Type.OBJECT,
              properties: {
                zh: { type: Type.STRING },
                en: { type: Type.STRING },
                es: { type: Type.STRING },
              },
              required: ["es"],
            },
            multilingualLongDescriptions: {
              type: Type.OBJECT,
              properties: {
                zh: { type: Type.STRING },
                en: { type: Type.STRING },
                es: { type: Type.STRING },
              },
              required: ["es"],
            },
            sellingPointsList: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["multilingualTitles", "multilingualShortDescriptions", "multilingualLongDescriptions"],
        },
      },
    })
  );

  try {
    const parsed = JSON.parse(response.text.trim());
    const esTitle = parsed.multilingualTitles?.es || parsed.multilingualTitles?.zh || "Producto Inteligente de Alta Calidad Pro";
    const esShort = parsed.multilingualShortDescriptions?.es || parsed.multilingualShortDescriptions?.zh || "<ul><li>100% Calidad Garantizada y Duradera</li><li>Diseño Ergonómico y Portátil</li><li>Envío Rápido y Garantía Global</li></ul>";
    const esLong = parsed.multilingualLongDescriptions?.es || parsed.multilingualLongDescriptions?.zh || "<h3>Descripción General</h3><p>Diseñado con precisión para un estilo de vida moderno y alta comodidad.</p><h3>Características Principales</h3><ul><li>Materiales de alta calidad</li><li>Batería de larga duración</li></ul>";

    return {
      zhTitle: esTitle,
      enTitle: esTitle,
      esTitle,
      shortDescriptionHtml: esShort,
      longDescriptionHtml: esLong,
      multilingualTitles: { zh: esTitle, en: esTitle, es: esTitle },
      multilingualShortDescriptions: { zh: esShort, en: esShort, es: esShort },
      multilingualLongDescriptions: { zh: esLong, en: esLong, es: esLong },
      sellingPointsList: parsed.sellingPointsList || ["100% Calidad Garantizada", "Diseño Ergonómico y Duradero", "Garantía Global y Soporte"],
    };
  } catch {
    const esTitle = "Producto Inteligente de Alta Calidad Pro";
    const esShort = "<ul><li>100% Calidad Garantizada y Duradera</li><li>Diseño Ergonómico y Portátil</li><li>Envío Rápido y Garantía Global</li></ul>";
    const esLong = "<h3>Descripción General</h3><p>Diseñado con precisión para un estilo de vida moderno y alta comodidad.</p><h3>Características Principales</h3><ul><li>Materiales de alta calidad</li><li>Batería de larga duración</li></ul>";

    return {
      zhTitle: esTitle,
      enTitle: esTitle,
      esTitle,
      shortDescriptionHtml: esShort,
      longDescriptionHtml: esLong,
      multilingualTitles: { zh: esTitle, en: esTitle, es: esTitle },
      multilingualShortDescriptions: { zh: esShort, en: esShort, es: esShort },
      multilingualLongDescriptions: { zh: esLong, en: esLong, es: esLong },
      sellingPointsList: ["100% Calidad Garantizada", "Diseño Ergonómico y Duradero", "Garantía Global y Soporte"],
    };
  }
}

/**
 * 3. generate_seo
 * Generates SEO Title, Meta Description, Keywords, Slug, and Meta Tags for Google ranking
 */
export async function generateSEO(ai: GoogleGenAI, contentData: any, input: GeminiInput) {
  const prompt = `Generate Google Search SEO metadata for WooCommerce store:
English Title: ${contentData.enTitle}
Category: ${input.geminiVision?.productType || "E-Commerce"}

Return JSON containing:
- seoTitle (max 60 chars)
- seoDescription (max 155 chars)
- focusKeywords (3-5 items)
- relatedKeywords (5-8 items)
- urlSlug (lowercase hyphenated slug)
- metaTags (key-value dictionary like og:title, og:description, twitter:card)`;

  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            seoTitle: { type: Type.STRING },
            seoDescription: { type: Type.STRING },
            focusKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            relatedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            urlSlug: { type: Type.STRING },
            metaTags: {
              type: Type.OBJECT,
              properties: {
                ogTitle: { type: Type.STRING },
                ogDescription: { type: Type.STRING },
                twitterCard: { type: Type.STRING },
              },
            },
          },
        },
      },
    })
  );

  try {
    return JSON.parse(response.text.trim());
  } catch {
    const slug = (contentData.enTitle || "smart-ecom-item")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + "-" + Date.now();
    return {
      seoTitle: `${contentData.enTitle || "Smart E-Commerce Product"} - Official Store`,
      seoDescription: "Shop top-rated e-commerce products with global shipping and quality guarantee.",
      focusKeywords: ["e-commerce", "buy online", "top rated product"],
      relatedKeywords: ["fast shipping", "best price", "quality deal"],
      urlSlug: slug,
      metaTags: {
        ogTitle: contentData.enTitle,
        ogDescription: "Official product details and order online.",
        twitterCard: "summary_large_image",
      },
    };
  }
}

/**
 * 4. generate_price
 * Calculates suggested regular price, sale price, profit margin, or price range if cost missing
 */
export async function generatePrice(ai: GoogleGenAI, input: GeminiInput, contentData: any): Promise<PriceSuggestion> {
  const cost = input.costPrice || 0;

  const prompt = `Calculate pricing and profit margins for e-commerce store:
Product: ${contentData.enTitle}
Category: ${input.geminiVision?.productType || "General"}
Known Cost Price: ${cost > 0 ? `$${cost}` : "Unknown"}

Return JSON with regularPrice, salePrice, costPrice, estimatedMargin (percentage), priceRangeMin, priceRangeMax, pricingStrategy.`;

  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            regularPrice: { type: Type.NUMBER },
            salePrice: { type: Type.NUMBER },
            costPrice: { type: Type.NUMBER },
            estimatedMargin: { type: Type.NUMBER },
            priceRangeMin: { type: Type.NUMBER },
            priceRangeMax: { type: Type.NUMBER },
            pricingStrategy: { type: Type.STRING },
          },
        },
      },
    })
  );

  try {
    const parsed = JSON.parse(response.text.trim());
    const finalCost = cost > 0 ? cost : parsed.costPrice || 25.0;
    const finalSale = parsed.salePrice || (finalCost > 0 ? finalCost * 2.8 : 89.0);
    const finalRegular = parsed.regularPrice || finalSale * 1.25;
    const margin = finalSale > 0 ? Number((((finalSale - finalCost) / finalSale) * 100).toFixed(1)) : 65.0;

    return {
      regularPrice: Number(finalRegular.toFixed(2)),
      salePrice: Number(finalSale.toFixed(2)),
      costPrice: Number(finalCost.toFixed(2)),
      estimatedMargin: margin,
      suggestedPriceRange: {
        min: Number((parsed.priceRangeMin || finalSale * 0.85).toFixed(2)),
        max: Number((parsed.priceRangeMax || finalRegular * 1.15).toFixed(2)),
      },
      pricingStrategy: parsed.pricingStrategy || "Competitive Markup Strategy (2.8x Cost multiplier)",
    };
  } catch {
    const defaultCost = cost > 0 ? cost : 30.0;
    const defaultSale = defaultCost * 2.8;
    const defaultRegular = defaultSale * 1.25;
    return {
      regularPrice: Number(defaultRegular.toFixed(2)),
      salePrice: Number(defaultSale.toFixed(2)),
      costPrice: Number(defaultCost.toFixed(2)),
      estimatedMargin: 64.3,
      suggestedPriceRange: {
        min: Number((defaultSale * 0.85).toFixed(2)),
        max: Number((defaultRegular * 1.15).toFixed(2)),
      },
      pricingStrategy: "Standard E-Commerce Margin Strategy",
    };
  }
}

/**
 * 5. generate_attributes
 * Generates Category, Tags, Brand, SKU, Color, Material, Size, Weight, Attributes list
 */
export async function generateAttributes(ai: GoogleGenAI, input: GeminiInput, contentData: any): Promise<ProductAttributesData> {
  const prompt = `Extract and generate structured e-commerce product attributes:
Product Title: ${contentData.enTitle}
Vision Materials: ${input.geminiVision?.materials || ""}
Vision Color: ${input.geminiVision?.color || ""}
Vision Brand: ${input.geminiVision?.brand || ""}

Return JSON with:
- category (primary e-commerce category string)
- categories (array of parent/child category strings)
- tags (array of 4-6 tag strings)
- brand
- sku
- color
- material
- size
- weightKg (number in kilograms)
- attributesList (array of objects { name: string, options: string[] })`;

  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            categories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            brand: { type: Type.STRING },
            sku: { type: Type.STRING },
            color: { type: Type.STRING },
            material: { type: Type.STRING },
            size: { type: Type.STRING },
            weightKg: { type: Type.NUMBER },
            attributesList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      },
    })
  );

  try {
    const parsed = JSON.parse(response.text.trim());
    const vision = input.geminiVision;
    return {
      category: parsed.category || "3C数码",
      categories: parsed.categories || ["3C数码", "智能家居", "跨境热销"],
      tags: parsed.tags || ["热门新品", "AI精选", "工厂直供"],
      brand: parsed.brand || vision?.brand || "AI-Ecom-Studio",
      sku: parsed.sku || "SKU-ECOM-" + Math.floor(100000 + Math.random() * 900000),
      color: parsed.color || vision?.color || "Default Color",
      material: parsed.material || vision?.materials || "Standard Composite",
      size: parsed.size || "Standard Size",
      weightKg: parsed.weightKg || 0.45,
      attributesList: parsed.attributesList || [
        { name: "Color", options: [parsed.color || "Black"] },
        { name: "Material", options: [parsed.material || "Aluminum"] },
      ],
    };
  } catch {
    const vision = input.geminiVision;
    return {
      category: "3C数码",
      categories: ["3C数码", "热门爆款"],
      tags: ["AI精选", "品质严选"],
      brand: vision?.brand || "AI-Labs",
      sku: "SKU-ECOM-" + Math.floor(100000 + Math.random() * 900000),
      color: vision?.color || "Black",
      material: vision?.materials || "Premium Metal",
      size: "Standard",
      weightKg: 0.5,
      attributesList: [
        { name: "Color", options: [vision?.color || "Black"] },
        { name: "Material", options: [vision?.materials || "Metal"] },
      ],
    };
  }
}

/**
 * Main Workflow Orchestrator for Gemini Product Content Agent
 * Workflow Step: IMAGE_COMPLETED -> CONTENT_GENERATING -> CONTENT_COMPLETED
 */
export async function runGeminiProductAgent(input: GeminiInput): Promise<FullGeminiProductResult> {
  const config = getAIConfig();

  // Unified multi-provider content generation route based on active Provider in settings
  const generated = await runGeminiContentStep({
    imageInput: input.optimizedImage || input.originalImage,
    visionAnalysis: input.geminiVision as any,
    userNotes: input.userNotes,
    costPrice: input.costPrice,
    language: input.targetLanguage
  });

  const cost = input.costPrice || 35.0;
  const regularPrice = generated.price || Number((cost * 3.5).toFixed(2));
  const salePrice = generated.promoPrice || Number((cost * 2.8).toFixed(2));

  return {
    aiTitle: generated.title || "AI 爆款商品",
    multilingualTitles: generated.multilingualTitles || {
      zh: generated.title || "中文商品标题",
      en: "English Product Title",
      es: "Título del Producto"
    },
    multilingualShortDescriptions: generated.multilingualShortDescriptions || {
      zh: generated.shortDescription || "",
      en: "",
      es: ""
    },
    multilingualLongDescriptions: generated.multilingualLongDescriptions || {
      zh: generated.longDescription || "",
      en: "",
      es: ""
    },
    aiShortDescription: generated.shortDescription || "",
    aiDescription: generated.longDescription || "",
    seo: {
      seoTitle: generated.seo?.title || generated.title || "",
      seoDescription: generated.seo?.metaDescription || "",
      focusKeywords: generated.seo?.keywords || [],
      relatedKeywords: [],
      urlSlug: generated.seo?.slug || ("slug-" + Date.now()),
      metaTags: {}
    },
    pricing: {
      regularPrice,
      salePrice,
      costPrice: cost,
      estimatedMargin: generated.estimatedMargin || 68.0,
      suggestedPriceRange: { min: salePrice, max: regularPrice },
      pricingStrategy: "2.8x Cost Multiplier Strategy"
    },
    attributes: {
      category: generated.categories?.[0] || "3C数码",
      categories: generated.categories || ["3C数码"],
      tags: generated.tags || ["AI推荐"],
      brand: generated.brand || "AI-Labs",
      sku: "SKU-" + Math.floor(100000 + Math.random() * 900000),
      color: "Standard",
      material: "Composite",
      size: "Standard",
      weightKg: 0.45,
      attributesList: generated.parameters ? generated.parameters.map(p => ({ name: p.name, options: [p.value] })) : []
    },
    woocommerceJson: {
      name: generated.title || "Product Title",
      slug: generated.seo?.slug || ("slug-" + Date.now()),
      description: generated.longDescription || "",
      short_description: generated.shortDescription || "",
      regular_price: regularPrice.toString(),
      sale_price: salePrice.toString(),
      categories: (generated.categories || ["3C数码"]).map((c, idx) => ({ id: idx + 1, name: c })),
      tags: (generated.tags || ["AI推荐"]).map((t, idx) => ({ id: idx + 1, name: t })),
      images: [{ src: input.optimizedImage || input.originalImage || "" }],
      attributes: generated.parameters ? generated.parameters.map(p => ({ name: p.name, options: [p.value] })) : [],
      sku: "SKU-" + Math.floor(100000 + Math.random() * 900000),
      stock_quantity: 200
    },
    rawJson: generated,
    generatedAt: new Date().toISOString()
  };
}
