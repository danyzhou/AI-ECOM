import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Sparkles, 
  Share2, 
  CheckCircle2, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Globe, 
  DollarSign, 
  Box, 
  Tag, 
  Search, 
  Layers,
  FileText,
  Store,
  X,
  Check
} from 'lucide-react';
import { Product, ProductParam, WooCommerceStore } from '../types';
import { regenerateProductField, publishToWooCommerce, fetchStores, publishToStoresApi } from '../services/api';

interface ProductEditViewProps {
  product: Product;
  onSaveProduct: (updated: Product) => void;
  onBackToList: () => void;
}

export const ProductEditView: React.FC<ProductEditViewProps> = ({
  product: initialProduct,
  onSaveProduct,
  onBackToList,
}) => {
  const [formData, setFormData] = useState<Product>({ ...initialProduct });
  const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'inventory' | 'description' | 'seo'>('general');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);

  // Stores Modal States
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [availableStores, setAvailableStores] = useState<WooCommerceStore[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  useEffect(() => {
    loadStoresList();
  }, []);

  const loadStoresList = async () => {
    setLoadingStores(true);
    try {
      const res = await fetchStores();
      if (res.success && res.stores) {
        setAvailableStores(res.stores);
        const connected = res.stores.filter(s => s.status !== 'error').map(s => s.id);
        setSelectedStoreIds(connected.length > 0 ? connected : res.stores.map(s => s.id));
      }
    } catch (e) {
      console.warn("加载店铺列表失败:", e);
    } finally {
      setLoadingStores(false);
    }
  };

  const toggleStoreSelect = (storeId: string) => {
    if (selectedStoreIds.includes(storeId)) {
      setSelectedStoreIds(selectedStoreIds.filter(id => id !== storeId));
    } else {
      setSelectedStoreIds([...selectedStoreIds, storeId]);
    }
  };

  // Field updates helper
  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSEOChange = (key: keyof Product['seo'], value: any) => {
    setFormData(prev => ({
      ...prev,
      seo: { ...prev.seo, [key]: value }
    }));
  };

  const handleDimensionsChange = (key: keyof Product['dimensions'], value: any) => {
    setFormData(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [key]: value }
    }));
  };

  // Single field AI regenerate
  const handleAIRegenerate = async (field: string) => {
    setRegeneratingField(field);
    try {
      const res = await regenerateProductField({
        field,
        currentTitle: formData.title,
        currentDescription: formData.shortDescription
      });

      if (field === 'title') {
        setFormData(prev => ({ ...prev, title: res.value }));
      } else if (field === 'shortDescription') {
        setFormData(prev => ({ ...prev, shortDescription: res.value }));
      } else if (field === 'seoTitle') {
        handleSEOChange('title', res.value);
      } else if (field === 'metaDescription') {
        handleSEOChange('metaDescription', res.value);
      }
    } catch (err: any) {
      alert('AI 重新生成失败: ' + err.message);
    } finally {
      setRegeneratingField(null);
    }
  };

  const handleSaveDraft = () => {
    onSaveProduct(formData);
    alert('商品草稿保存成功！');
  };

  // Multi-Store Publish Action
  const handlePublishWooCommerce = async () => {
    if (selectedStoreIds.length === 0) {
      alert("请至少选择一个发布的 WordPress WooCommerce 店铺");
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const res = await publishToStoresApi(formData.id, selectedStoreIds, formData);
      if (res.success && res.results) {
        setIsStoreModalOpen(false);
        const successes = res.results.filter(r => r.status === 'success');
        const fails = res.results.filter(r => r.status === 'failed');

        let msg = `发布完成: ${successes.length} 个店铺成功`;
        if (fails.length > 0) msg += `, ${fails.length} 个店铺失败`;

        setPublishResult(msg);

        const firstSuccess = successes[0];
        const updatedProd: Product = {
          ...formData,
          status: 'published',
          wcProductId: firstSuccess?.wordpress_id || formData.wcProductId,
          wcPermalink: firstSuccess?.url || formData.wcPermalink
        };

        setFormData(updatedProd);
        onSaveProduct(updatedProd);
      }
    } catch (err: any) {
      alert('多店铺发布失败: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToList}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="返回商品列表"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-white text-base">WooCommerce 商品编辑器</h2>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                formData.status === 'published' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {formData.status === 'published' ? '已在 WooCommerce 上线' : '未发布草稿'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">SKU: {formData.sku}</p>
          </div>
        </div>

        {/* Action Group */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center space-x-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>保存更新</span>
          </button>

          <button
            onClick={() => setIsStoreModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition"
          >
            <Share2 className="w-4 h-4" />
            <span>选择店铺发布 (WooCommerce)</span>
          </button>
        </div>
      </div>

      {publishResult && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-2xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{publishResult}</span>
          </div>
          {formData.wcPermalink && (
            <a
              href={formData.wcPermalink}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded-lg text-[11px] font-medium transition"
            >
              预览线上商品页面 →
            </a>
          )}
        </div>
      )}

      {/* WooCommerce Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'general' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>通用基本信息</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'pricing' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>价格与利润计算</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'inventory' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>库存与物流尺寸</span>
        </button>

        <button
          onClick={() => setActiveTab('description')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'description' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>商品详情与卖点 (HTML)</span>
        </button>

        <button
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'seo' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>SEO 搜索引擎优化</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* Tab 1: General */}
        {activeTab === 'general' && (
          <div className="space-y-5">
            {/* Title with AI Refine Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">商品名称 (Product Title)</label>
                <button
                  type="button"
                  onClick={() => handleAIRegenerate('title')}
                  disabled={regeneratingField === 'title'}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{regeneratingField === 'title' ? 'AI 润色中...' : 'AI 优化标题'}</span>
                </button>
              </div>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">商品副标题 (Subtitle)</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* SKU & Image Ratio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">SKU 唯一编码</label>
                <input
                  type="text"
                  value={formData.sku || ''}
                  onChange={(e) => handleChange('sku', e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">图片显示比例 (Image Ratio)</label>
                <select
                  value={formData.image_ratio || formData.imageRatio || '1:1'}
                  onChange={(e) => {
                    const r = e.target.value as any;
                    setFormData(prev => ({ ...prev, image_ratio: r, imageRatio: r }));
                  }}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="1:1">1:1 (正方形 - 默认)</option>
                  <option value="4:3">4:3 (横向比例)</option>
                  <option value="16:9">16:9 (宽屏)</option>
                  <option value="3:4">3:4 (竖屏)</option>
                </select>
              </div>
            </div>

            {/* Main Image & Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">商品主图 URL</label>
                <input
                  type="text"
                  value={formData.mainImage}
                  onChange={(e) => handleChange('mainImage', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
                <img src={formData.mainImage} alt="" className="mt-2 w-28 h-28 object-cover rounded-xl border border-slate-800 bg-slate-950" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">电商白底图 (Studio White)</label>
                <input
                  type="text"
                  value={formData.whiteBgImage || formData.mainImage}
                  onChange={(e) => handleChange('whiteBgImage', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
                <img src={formData.whiteBgImage || formData.mainImage} alt="" className="mt-2 w-28 h-28 object-contain rounded-xl border border-slate-800 bg-white" />
              </div>
            </div>

            {/* Categories & Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">商品分类 (以逗号隔开)</label>
                <input
                  type="text"
                  value={formData.categories.join(', ')}
                  onChange={(e) => handleChange('categories', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full px-3 py-2 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">标签 (以逗号隔开)</label>
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleChange('tags', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full px-3 py-2 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Pricing */}
        {activeTab === 'pricing' && (
          <div className="space-y-5">
            <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-indigo-300 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>AI 价格与利润计算器</span>
              </div>
              <p className="text-slate-400">
                根据设定成本和零售价自动估算利润率：((销售价格 - 成本价格) / 销售价格) × 100%
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">建议售价 ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    const margin = price > 0 ? (((price - formData.costPrice) / price) * 100).toFixed(1) : 0;
                    setFormData(prev => ({ ...prev, price, estimatedMargin: Number(margin) }));
                  }}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">划线促销价 ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.promoPrice}
                  onChange={(e) => handleChange('promoPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-cyan-400 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">进货成本 ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => {
                    const costPrice = parseFloat(e.target.value) || 0;
                    const margin = formData.price > 0 ? (((formData.price - costPrice) / formData.price) * 100).toFixed(1) : 0;
                    setFormData(prev => ({ ...prev, costPrice, estimatedMargin: Number(margin) }));
                  }}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-slate-300 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">预计销售利润率:</span>
              <span className="text-xl font-bold text-emerald-400">{formData.estimatedMargin}%</span>
            </div>
          </div>
        )}

        {/* Tab 3: Inventory & Shipping */}
        {activeTab === 'inventory' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">SKU 编码</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">库存数量 (Stock)</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">重量 (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">长 (cm)</label>
                <input
                  type="number"
                  value={formData.dimensions?.length || 0}
                  onChange={(e) => handleDimensionsChange('length', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">宽 (cm)</label>
                <input
                  type="number"
                  value={formData.dimensions?.width || 0}
                  onChange={(e) => handleDimensionsChange('width', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">高 (cm)</label>
                <input
                  type="number"
                  value={formData.dimensions?.height || 0}
                  onChange={(e) => handleDimensionsChange('height', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Descriptions */}
        {activeTab === 'description' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">简短描述 (Short Description)</label>
                <button
                  type="button"
                  onClick={() => handleAIRegenerate('shortDescription')}
                  disabled={regeneratingField === 'shortDescription'}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>AI 重新润色短描述</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={formData.shortDescription}
                onChange={(e) => handleChange('shortDescription', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">详细富文本描述 (HTML Description)</label>
              <textarea
                rows={8}
                value={formData.longDescription}
                onChange={(e) => handleChange('longDescription', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-950 text-emerald-300 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Tab 5: SEO */}
        {activeTab === 'seo' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">SEO 标题 (SEO Title)</label>
                <button
                  type="button"
                  onClick={() => handleAIRegenerate('seoTitle')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>AI 重新生成 SEO 标题</span>
                </button>
              </div>
              <input
                type="text"
                value={formData.seo?.title}
                onChange={(e) => handleSEOChange('title', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">SEO 关键词 (用逗号隔开)</label>
              <input
                type="text"
                value={formData.seo?.keywords.join(', ')}
                onChange={(e) => handleSEOChange('keywords', e.target.value.split(',').map(s => s.trim()))}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Meta Description 描述</label>
              <textarea
                rows={3}
                value={formData.seo?.metaDescription}
                onChange={(e) => handleSEOChange('metaDescription', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">URL Slug (网址别名)</label>
              <input
                type="text"
                value={formData.seo?.slug}
                onChange={(e) => handleSEOChange('slug', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-950 text-indigo-400 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Select Target Stores Modal */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsStoreModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">选择目标发布店铺 (Publication Target)</h3>
                <p className="text-xs text-slate-400">支持多选：商品将同步发布至所选的各个独立站</p>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableStores.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  暂无可用的 WordPress 店铺配置，请先在“店铺管理”新增店铺。
                </div>
              ) : (
                availableStores.map((store) => {
                  const isSelected = selectedStoreIds.includes(store.id);
                  return (
                    <div
                      key={store.id}
                      onClick={() => toggleStoreSelect(store.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Store className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <div>
                          <p className="font-bold text-xs">{store.name || store.store_name}</p>
                          <p className="text-[10px] font-mono opacity-70">{store.url || store.wordpress_url}</p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsStoreModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handlePublishWooCommerce}
                disabled={isPublishing || selectedStoreIds.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 flex items-center space-x-2"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>自动刊登分发中...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>确认一键发布 ({selectedStoreIds.length} 个店铺)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
