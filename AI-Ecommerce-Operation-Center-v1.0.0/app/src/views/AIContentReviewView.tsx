import React, { useState } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  Save, 
  Send, 
  Globe, 
  CheckCircle2, 
  Tag, 
  DollarSign, 
  Layers, 
  FileText, 
  Search, 
  Box, 
  Code2, 
  Image as ImageIcon,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { Product } from '../types';
import { generateGeminiProductContent, saveProduct } from '../services/api';

interface AIContentReviewViewProps {
  products: Product[];
  currentProductId?: string;
  onSaveProduct?: (product: Product) => void;
  onNavigateToWooCommerce?: () => void;
}

export const AIContentReviewView: React.FC<AIContentReviewViewProps> = ({
  products,
  currentProductId,
  onSaveProduct,
  onNavigateToWooCommerce,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    currentProductId || (products.length > 0 ? products[0].id : 'prod-001')
  );

  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];

  const [editedProduct, setEditedProduct] = useState<Product>(activeProduct);
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'pricing' | 'attributes' | 'json'>('content');
  const [selectedLang, setSelectedLang] = useState<'zh' | 'en' | 'es'>('zh');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // When selected product changes, reset local state
  React.useEffect(() => {
    if (activeProduct) {
      setEditedProduct(activeProduct);
    }
  }, [selectedProductId, activeProduct]);

  // Recalculate profit margin when prices change
  const handlePriceChange = (field: 'price' | 'promoPrice' | 'costPrice', val: number) => {
    const updated = { ...editedProduct, [field]: val };
    const effectivePrice = updated.promoPrice || updated.price || 0;
    const cost = updated.costPrice || 0;
    
    if (effectivePrice > 0 && cost > 0) {
      const margin = Number((((effectivePrice - cost) / effectivePrice) * 100).toFixed(1));
      updated.estimatedMargin = margin;
    }
    setEditedProduct(updated);
  };

  // AI Content Regeneration Trigger
  const handleRegenerate = async () => {
    setIsGenerating(true);
    setStatusMessage({ type: 'info', text: 'Gemini Product Content Agent 正在分析视觉特征并生成多语言电商资料...' });
    try {
      const result = await generateGeminiProductContent({
        productId: editedProduct.id,
        optimizedImage: editedProduct.optimizedMainImage || editedProduct.mainImage,
        originalImage: editedProduct.mainImage,
        chatgptVision: {
          productType: editedProduct.categories?.[0] || '电子数码',
          brand: editedProduct.brand || 'AI-Ecom-Labs',
          color: editedProduct.parameters?.find(p => p.name === 'Color')?.value || 'Black',
          materials: editedProduct.parameters?.find(p => p.name === 'Material')?.value || 'Aluminum',
          keyFeatures: editedProduct.sellingPoints || ['智能好物', '高性价比']
        },
        costPrice: editedProduct.costPrice,
        language: 'zh-CN'
      });

      if (result && result.product) {
        setEditedProduct(result.product);
        if (onSaveProduct) onSaveProduct(result.product);
        setStatusMessage({ type: 'success', text: 'Gemini AI 文案与 WooCommerce 数据重构成功！' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'AI 内容重新生成失败：' + (err.message || '网络问题') });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save product changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await saveProduct(editedProduct);
      if (res && res.product) {
        setEditedProduct(res.product);
        if (onSaveProduct) onSaveProduct(res.product);
        setStatusMessage({ type: 'success', text: '商品修改已成功保存至后端数据库！' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: '保存失败：' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Next step: Queue for WooCommerce Publish
  const handleNextPublish = async () => {
    const updated = { ...editedProduct, status: 'ready' as const };
    setEditedProduct(updated);
    await saveProduct(updated);
    if (onSaveProduct) onSaveProduct(updated);
    if (onNavigateToWooCommerce) {
      onNavigateToWooCommerce();
    } else {
      setStatusMessage({ type: 'success', text: '已将商品标记为 [待发布]，可以直接在 WordPress API 模块进行一键上架！' });
    }
  };

  const copyJsonToClipboard = () => {
    const jsonStr = JSON.stringify(editedProduct.woocommerceJson || editedProduct, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  if (!editedProduct) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-500" />
        <p>暂无待审核的 AI 商品数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Page Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">
            <Cpu className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-tight">AI Content Review</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gemini Product Agent
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              人工确认 AI 自动生成的标题、描述、SEO、价格与 WooCommerce REST API 标准 Payload
            </p>
          </div>
        </div>

        {/* Product Dropdown Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-medium text-slate-400 whitespace-nowrap">选择待审商品:</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-indigo-500 max-w-xs"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                [{p.sku || p.id}] {p.title.substring(0, 25)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Status Message Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all ${
          statusMessage.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' :
          statusMessage.type === 'error' ? 'bg-rose-950/60 border-rose-500/30 text-rose-300' :
          'bg-indigo-950/60 border-indigo-500/30 text-indigo-300'
        }`}>
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {statusMessage.type === 'info' && <RotateCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === 'content'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>文案与多语言标题</span>
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === 'seo'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>SEO 搜索引擎优化</span>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === 'pricing'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>价格与利润率</span>
          </button>
          <button
            onClick={() => setActiveTab('attributes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === 'attributes'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>分类/标签与属性</span>
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === 'json'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>WooCommerce REST JSON</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'AI 重新生成中...' : '重新生成 (AI)'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? '保存中...' : '保存更改'}</span>
          </button>

          <button
            onClick={handleNextPublish}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition"
          >
            <span>下一步：提交发布</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Image & Quick Specs (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Images Section */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" /> 商品图片对比
              </span>
              <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ChatGPT Vision 优化
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-400 font-medium">1. 原始长图 / URL</p>
                <div className="aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative group">
                  <img
                    src={editedProduct.mainImage}
                    alt="Original Product"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2">
                    <span className="text-[10px] text-slate-300 text-center">原始输入图</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] text-emerald-400 font-medium">2. AI 优化电商白底图</p>
                <div className="aspect-square bg-white/95 rounded-xl overflow-hidden border-2 border-emerald-500/40 relative group shadow-md">
                  <img
                    src={editedProduct.optimizedMainImage || editedProduct.mainImage}
                    alt="Optimized Product"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                    白底图
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[11px] font-medium text-slate-400">更新优化后图片 URL:</label>
              <input
                type="text"
                value={editedProduct.optimizedMainImage || editedProduct.mainImage}
                onChange={(e) => setEditedProduct({ ...editedProduct, optimizedMainImage: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 p-2 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Key Product Metadata Quick Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-cyan-400" /> 商品基础定义
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">SKU 编号:</label>
                <input
                  type="text"
                  value={editedProduct.sku || ''}
                  onChange={(e) => setEditedProduct({ ...editedProduct, sku: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-2 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">品牌 (Brand):</label>
                <input
                  type="text"
                  value={editedProduct.brand || ''}
                  onChange={(e) => setEditedProduct({ ...editedProduct, brand: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-2 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">库存 (Stock):</label>
                  <input
                    type="number"
                    value={editedProduct.stock ?? 500}
                    onChange={(e) => setEditedProduct({ ...editedProduct, stock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">重量 (kg):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedProduct.weight ?? 0.35}
                    onChange={(e) => setEditedProduct({ ...editedProduct, weight: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Main Tabbed Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* TAB 1: Content & Multilingual Titles */}
          {activeTab === 'content' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" /> AI 多语言标题与详细文案
                </h2>

                {/* Language Switcher Pills */}
                <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setSelectedLang('zh')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                      selectedLang === 'zh' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🇨🇳 中文内部
                  </button>
                  <button
                    onClick={() => setSelectedLang('en')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                      selectedLang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🇺🇸 英语 (US)
                  </button>
                  <button
                    onClick={() => setSelectedLang('es')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                      selectedLang === 'es' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🇪🇸 西班牙语
                  </button>
                </div>
              </div>

              {/* Title Input according to selected language */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>商品标题 ({selectedLang.toUpperCase()} Title):</span>
                  <span className="text-[11px] text-indigo-400">Gemini 自动高转换率生成</span>
                </label>
                <input
                  type="text"
                  value={
                    selectedLang === 'zh'
                      ? (editedProduct.multilingualTitles?.zh || editedProduct.title)
                      : selectedLang === 'en'
                      ? (editedProduct.multilingualTitles?.en || editedProduct.title)
                      : (editedProduct.multilingualTitles?.es || editedProduct.title)
                  }
                  onChange={(e) => {
                    const newTitles = { ...editedProduct.multilingualTitles, [selectedLang]: e.target.value };
                    setEditedProduct({
                      ...editedProduct,
                      title: selectedLang === 'zh' ? e.target.value : editedProduct.title,
                      multilingualTitles: newTitles
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 p-3 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Short Description */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">简短描述 (Short Description):</label>
                <textarea
                  rows={3}
                  value={editedProduct.shortDescription || editedProduct.ai_short_description || ''}
                  onChange={(e) => setEditedProduct({ 
                    ...editedProduct, 
                    shortDescription: e.target.value,
                    ai_short_description: e.target.value 
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 p-3 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  placeholder="适用于 WooCommerce 简短摘要展示..."
                />
              </div>

              {/* HTML Detailed Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">HTML 详细排版描述 (Long Description):</label>
                  <span className="text-[11px] text-slate-500">支持 HTML 标签渲染与样式导入</span>
                </div>
                <textarea
                  rows={8}
                  value={editedProduct.longDescription || editedProduct.ai_description || ''}
                  onChange={(e) => setEditedProduct({ 
                    ...editedProduct, 
                    longDescription: e.target.value,
                    ai_description: e.target.value
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 p-3 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                />
              </div>

              {/* HTML Preview Box */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-400">实时 HTML 样式渲染预览:</p>
                <div 
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: editedProduct.longDescription || editedProduct.ai_description || '<p>暂无描述内容</p>' }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: SEO Engine */}
          {activeTab === 'seo' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
              <div className="pb-4 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-400" /> SEO 搜索引擎与 Google Meta 策略
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Gemini 自动匹配的 SEO 关键词矩阵与自定义 Slug URL 链接
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">SEO 标题 (Meta Title):</label>
                  <input
                    type="text"
                    value={editedProduct.seo?.title || editedProduct.seo_title || ''}
                    onChange={(e) => setEditedProduct({
                      ...editedProduct,
                      seo: { ...editedProduct.seo, title: e.target.value },
                      seo_title: e.target.value
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">SEO 核心关键词 (Focus Keywords):</label>
                  <input
                    type="text"
                    value={(editedProduct.seo?.keywords || editedProduct.seo_keywords || []).join(', ')}
                    onChange={(e) => {
                      const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setEditedProduct({
                        ...editedProduct,
                        seo: { ...editedProduct.seo, keywords: arr },
                        seo_keywords: arr
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    placeholder="用逗号隔开，例如: 降噪耳机, 蓝牙耳机, 科技好物"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Meta Description (搜索结果摘要):</label>
                  <textarea
                    rows={3}
                    value={editedProduct.seo?.metaDescription || ''}
                    onChange={(e) => setEditedProduct({
                      ...editedProduct,
                      seo: { ...editedProduct.seo, metaDescription: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">自定义 URL Slug:</label>
                  <input
                    type="text"
                    value={editedProduct.seo?.slug || ''}
                    onChange={(e) => setEditedProduct({
                      ...editedProduct,
                      seo: { ...editedProduct.seo, slug: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Pricing & Profit Margin */}
          {activeTab === 'pricing' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
              <div className="pb-4 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> 跨境定价与成本利润率引擎
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  基于 2.8x - 3.5x 成本系数推算的合理零售价与促销售价策略
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-slate-400 block">常规售价 (Regular Price):</label>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400 text-sm font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editedProduct.price || 0}
                      onChange={(e) => handlePriceChange('price', Number(e.target.value))}
                      className="w-full bg-transparent text-lg font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-emerald-400 block">促销售价 (Sale Price):</label>
                  <div className="flex items-center space-x-1">
                    <span className="text-emerald-400 text-sm font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editedProduct.promoPrice || 0}
                      onChange={(e) => handlePriceChange('promoPrice', Number(e.target.value))}
                      className="w-full bg-transparent text-lg font-bold text-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-rose-400 block">供货成本价 (Cost Price):</label>
                  <div className="flex items-center space-x-1">
                    <span className="text-rose-400 text-sm font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editedProduct.costPrice || 0}
                      onChange={(e) => handlePriceChange('costPrice', Number(e.target.value))}
                      className="w-full bg-transparent text-lg font-bold text-rose-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Profit Margin Indicator */}
              <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/40 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> 预估毛利率 (Estimated Profit Margin)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    扣除供货成本后的估算净利比例 (根据促销价计算)
                  </p>
                </div>
                <div className="text-2xl font-black text-emerald-300">
                  {editedProduct.estimatedMargin || 70}%
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Categories, Tags, and Attributes */}
          {activeTab === 'attributes' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
              <div className="pb-4 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Box className="w-4 h-4 text-purple-400" /> 分类、标签与变体属性定义
                </h2>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">商品分类 (Categories):</label>
                  <input
                    type="text"
                    value={(editedProduct.categories || []).join(', ')}
                    onChange={(e) => {
                      const cats = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setEditedProduct({ ...editedProduct, categories: cats });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                    placeholder="逗号分割，例如: 3C数码, 影音娱乐"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">商品标签 (Tags):</label>
                  <input
                    type="text"
                    value={(editedProduct.tags || []).join(', ')}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setEditedProduct({ ...editedProduct, tags });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                    placeholder="例如: 爆款推荐, 主动降噪, 智能选品"
                  />
                </div>

                {/* Attributes List */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <p className="font-semibold text-slate-300">WooCommerce 变体属性 (Attributes):</p>
                  {(editedProduct.attributesList || [
                    { name: "Color", options: ["Matte Black", "Pure White"] },
                    { name: "Material", options: ["Aluminum Alloy"] }
                  ]).map((attr, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                      <input
                        type="text"
                        value={attr.name}
                        onChange={(e) => {
                          const newList = [...(editedProduct.attributesList || [])];
                          newList[idx] = { ...newList[idx], name: e.target.value };
                          setEditedProduct({ ...editedProduct, attributesList: newList });
                        }}
                        className="bg-slate-900 border border-slate-700 rounded text-xs text-white p-1.5 w-1/3 focus:outline-none"
                        placeholder="属性名"
                      />
                      <input
                        type="text"
                        value={attr.options.join(', ')}
                        onChange={(e) => {
                          const newList = [...(editedProduct.attributesList || [])];
                          newList[idx] = { ...newList[idx], options: e.target.value.split(',').map(s => s.trim()) };
                          setEditedProduct({ ...editedProduct, attributesList: newList });
                        }}
                        className="bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 p-1.5 flex-1 focus:outline-none"
                        placeholder="属性值 (逗号分割)"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WooCommerce JSON Payload */}
          {activeTab === 'json' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-400" /> WooCommerce REST API 标准 Payload
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    格式符合 /wp-json/wc/v3/products 接入规范的最终 JSON 文本
                  </p>
                </div>

                <button
                  onClick={copyJsonToClipboard}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{copiedJson ? '已复制 JSON!' : '复制完整 JSON'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-[480px]">
                <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                  {JSON.stringify(editedProduct.woocommerceJson || {
                    name: editedProduct.title,
                    slug: editedProduct.seo?.slug || 'smart-product',
                    description: editedProduct.longDescription || editedProduct.ai_description,
                    short_description: editedProduct.shortDescription || editedProduct.ai_short_description,
                    regular_price: String(editedProduct.price || 189),
                    sale_price: String(editedProduct.promoPrice || 149),
                    sku: editedProduct.sku,
                    stock_quantity: editedProduct.stock || 500,
                    categories: editedProduct.categories?.map((c, i) => ({ id: i + 1, name: c })),
                    tags: editedProduct.tags?.map((t, i) => ({ id: i + 1, name: t })),
                    images: [{ src: editedProduct.optimizedMainImage || editedProduct.mainImage }],
                    attributes: editedProduct.attributesList
                  }, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
