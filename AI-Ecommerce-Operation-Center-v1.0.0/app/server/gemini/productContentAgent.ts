import { GoogleGenAI, Type } from "@google/genai";

export interface GeminiInput {
  optimizedImage: string;
  originalImage?: string;
  chatgptVision?: {
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
  const apiKey = process.env.GEMINI_API_KEY;
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
  const prompt = `Analyze this e-commerce product based on the provided image and Vision metadata:
Vision Metadata: ${JSON.stringify(input.chatgptVision || {})}
User Notes: ${input.userNotes || "None"}
Target Market: ${input.targetMarket || "Global Cross-Border E-Commerce"}

Identify the core category, key target audience, unique value propositions, and suitable branding positioning. Return a JSON summary.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
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
  });

  try {
    return JSON.parse(response.text.trim());
  } catch {
    return {
      productCategory: input.chatgptVision?.productType || "General E-Commerce Item",
      targetAudience: "Global Consumers",
      coreValuePropositions: input.chatgptVision?.keyFeatures || ["High Quality", "Durable Design"],
      suggestedBrandTone: "Professional & Persuasive",
    };
  }
}

/**
 * 2. generate_product_content
 * Generates Multilingual Titles (ZH, EN, ES) and Short/Long HTML descriptions
 */
export async function generateProductContent(ai: GoogleGenAI, input: GeminiInput, analysis: any) {
  const prompt = `You are an expert e-commerce copywriter for international DTC and WooCommerce stores.
  
Given:
- Product Type: ${analysis.productCategory}
- Brand: ${input.chatgptVision?.brand || "AI-Labs"}
- Key Features: ${JSON.stringify(analysis.coreValuePropositions)}
- Materials/Colors: ${input.chatgptVision?.materials || ""} / ${input.chatgptVision?.color || ""}
- User Instructions: ${input.userNotes || "Highlight premium quality, usability, and value"}

Generate:
1. Chinese Title (中文标题 - 内部使用): Clear, concise, SEO-friendly Chinese title.
2. English Title: Natural, high-converting English title without keyword stuffing.
3. Spanish Title: Natural, professional Spanish title (for LATAM/Spain markets).
4. Short Description: 3 to 5 core selling point bullet items in clean HTML list or structured text.
5. Long Description: Comprehensive HTML description with headings (<h3>):
   - 产品介绍 (Product Overview)
   - 主要特点 (Key Features)
   - 使用方法 (How to Use)
   - 适用场景 (Scenarios / Use Cases)
   - 购买理由 (Why Choose Us)
   - 注意事项 (Cautions & Care Instructions)`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          zhTitle: { type: Type.STRING },
          enTitle: { type: Type.STRING },
          esTitle: { type: Type.STRING },
          shortDescriptionHtml: { type: Type.STRING },
          longDescriptionHtml: { type: Type.STRING },
          sellingPointsList: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["zhTitle", "enTitle", "esTitle", "shortDescriptionHtml", "longDescriptionHtml"],
      },
    },
  });

  try {
    return JSON.parse(response.text.trim());
  } catch {
    return {
      zhTitle: input.chatgptVision?.productNameGuess || "精选高品质爆款商品",
      enTitle: "Premium High-Performance Smart Product",
      esTitle: "Producto Inteligente de Alta Calidad Pro",
      shortDescriptionHtml: "<ul><li>100% Guaranteed High Quality</li><li>Ergonomic & Portable Design</li><li>Fast Dispatch & Warranty</li></ul>",
      longDescriptionHtml: "<h3>Product Overview</h3><p>Engineered with precision for modern lifestyle and high convenience.</p>",
      sellingPointsList: ["100% Quality Guaranteed", "Ergonomic & Durable Build", "Global Warranty & Support"],
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
Category: ${input.chatgptVision?.productType || "E-Commerce"}

Return JSON containing:
- seoTitle (max 60 chars)
- seoDescription (max 155 chars)
- focusKeywords (3-5 items)
- relatedKeywords (5-8 items)
- urlSlug (lowercase hyphenated slug)
- metaTags (key-value dictionary like og:title, og:description, twitter:card)`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
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
  });

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
Category: ${input.chatgptVision?.productType || "General"}
Known Cost Price: ${cost > 0 ? `$${cost}` : "Unknown"}

Return JSON with regularPrice, salePrice, costPrice, estimatedMargin (percentage), priceRangeMin, priceRangeMax, pricingStrategy.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
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
  });

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
Vision Materials: ${input.chatgptVision?.materials || ""}
Vision Color: ${input.chatgptVision?.color || ""}
Vision Brand: ${input.chatgptVision?.brand || ""}

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

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
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
  });

  try {
    const parsed = JSON.parse(response.text.trim());
    return {
      category: parsed.category || "3C数码",
      categories: parsed.categories || ["3C数码", "智能家居", "跨境热销"],
      tags: parsed.tags || ["热门新品", "AI精选", "工厂直供"],
      brand: parsed.brand || input.chatgptVision?.brand || "AI-Ecom-Studio",
      sku: parsed.sku || "SKU-ECOM-" + Math.floor(100000 + Math.random() * 900000),
      color: parsed.color || input.chatgptVision?.color || "Default Color",
      material: parsed.material || input.chatgptVision?.materials || "Standard Composite",
      size: parsed.size || "Standard Size",
      weightKg: parsed.weightKg || 0.45,
      attributesList: parsed.attributesList || [
        { name: "Color", options: [parsed.color || "Black"] },
        { name: "Material", options: [parsed.material || "Aluminum"] },
      ],
    };
  } catch {
    return {
      category: "3C数码",
      categories: ["3C数码", "热门爆款"],
      tags: ["AI精选", "品质严选"],
      brand: input.chatgptVision?.brand || "AI-Labs",
      sku: "SKU-ECOM-" + Math.floor(100000 + Math.random() * 900000),
      color: input.chatgptVision?.color || "Black",
      material: input.chatgptVision?.materials || "Premium Metal",
      size: "Standard",
      weightKg: 0.5,
      attributesList: [
        { name: "Color", options: [input.chatgptVision?.color || "Black"] },
        { name: "Material", options: [input.chatgptVision?.materials || "Metal"] },
      ],
    };
  }
}

/**
 * Main Workflow Orchestrator for Gemini Product Content Agent
 * Workflow Step: IMAGE_COMPLETED -> CONTENT_GENERATING -> CONTENT_COMPLETED
 */
export async function runGeminiProductAgent(input: GeminiInput): Promise<FullGeminiProductResult> {
  const ai = getGeminiClient();

  // If no Gemini key is set, raise an error or use structured fallback execution
  if (!ai) {
    throw new Error("Gemini API key is not configured in process.env.GEMINI_API_KEY");
  }

  // 1. Analyze Product
  const analysis = await analyzeProduct(ai, input);

  // 2. Generate Multilingual Content
  const content = await generateProductContent(ai, input, analysis);

  // 3. Generate SEO Metadata
  const seoData = await generateSEO(ai, content, input);

  // 4. Generate Pricing Strategy
  const pricingData = await generatePrice(ai, input, content);

  // 5. Generate Product Attributes
  const attributesData = await generateAttributes(ai, input, content);

  // 6. Format standard WooCommerce REST API JSON
  const woocommerceJson: WooCommerceProductJSON = {
    name: content.enTitle || content.zhTitle,
    slug: seoData.urlSlug,
    description: content.longDescriptionHtml,
    short_description: content.shortDescriptionHtml,
    regular_price: pricingData.regularPrice.toString(),
    sale_price: pricingData.salePrice.toString(),
    categories: attributesData.categories.map((c, idx) => ({ id: idx + 1, name: c })),
    tags: attributesData.tags.map((t, idx) => ({ id: idx + 1, name: t })),
    images: [
      { src: input.optimizedImage || input.originalImage || "" },
    ],
    attributes: attributesData.attributesList,
    sku: attributesData.sku,
    stock_quantity: 200,
  };

  return {
    aiTitle: content.zhTitle,
    multilingualTitles: {
      zh: content.zhTitle,
      en: content.enTitle,
      es: content.esTitle,
    },
    aiShortDescription: content.shortDescriptionHtml,
    aiDescription: content.longDescriptionHtml,
    seo: {
      seoTitle: seoData.seoTitle,
      seoDescription: seoData.seoDescription,
      focusKeywords: seoData.focusKeywords || [],
      relatedKeywords: seoData.relatedKeywords || [],
      urlSlug: seoData.urlSlug,
      metaTags: seoData.metaTags || {},
    },
    pricing: pricingData,
    attributes: attributesData,
    woocommerceJson,
    rawJson: {
      analysis,
      content,
      seoData,
      pricingData,
      attributesData,
    },
    generatedAt: new Date().toISOString(),
  };
}
