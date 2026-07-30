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
  Cpu,
  Store,
  ChevronDown,
  X
} from 'lucide-react';
import { Product, WooCommerceStore } from '../types';
import { generateGeminiProductContent, saveProduct, publishToWooCommerce, fetchStores, publishToStoresApi } from '../services/api';

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
  const selectedLang = 'es';

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Target Store Selection & Multi-Store Matrix Publishing States
  const [stores, setStores] = useState<WooCommerceStore[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [isMatrixAllSelected, setIsMatrixAllSelected] = useState<boolean>(false);
  const [isStoreSelectorOpen, setIsStoreSelectorOpen] = useState<boolean>(false);

  const [publishingProgressModal, setPublishingProgressModal] = useState<{
    isOpen: boolean;
    isCompleted: boolean;
    storeResults: Array<{
      storeId: string;
      storeName: string;
      storeUrl: string;
      status: 'publishing' | 'success' | 'failed';
      wordpressId?: number;
      url?: string;
      errorLog?: string;
    }>;
  } | null>(null);

  // Load available WordPress stores
  React.useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetchStores();
        if (res.success && res.stores && res.stores.length > 0) {
          setStores(res.stores);
          setSelectedStoreIds([res.stores[0].id]);
        }
      } catch (err) {
        console.warn('加载 WooCommerce 店铺失败:', err);
      }
    };
    loadStores();
  }, []);

  const handleToggleStoreId = (storeId: string) => {
    setIsMatrixAllSelected(false);
    if (selectedStoreIds.includes(storeId)) {
      const updated = selectedStoreIds.filter(id => id !== storeId);
      setSelectedStoreIds(updated.length > 0 ? updated : [storeId]);
    } else {
      setSelectedStoreIds([...selectedStoreIds, storeId]);
    }
  };

  const handleSelectAllStoresToggle = (checked: boolean) => {
    setIsMatrixAllSelected(checked);
    if (checked) {
      setSelectedStoreIds(stores.map(s => s.id));
    } else {
      if (stores.length > 0) setSelectedStoreIds([stores[0].id]);
    }
  };

  // When selected product changes, reset local state with Spanish copy defaults
  React.useEffect(() => {
    if (activeProduct) {
      const esTitle = activeProduct.multilingualTitles?.es || activeProduct.title || activeProduct.ai_title || '';
      const esShort = activeProduct.multilingualShortDescriptions?.es || activeProduct.shortDescription || activeProduct.ai_short_description || '';
      const esLong = activeProduct.multilingualLongDescriptions?.es || activeProduct.longDescription || activeProduct.ai_description || '';

      setEditedProduct({
        ...activeProduct,
        title: esTitle,
        ai_title: esTitle,
        shortDescription: esShort,
        ai_short_description: esShort,
        longDescription: esLong,
        ai_description: esLong,
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
        }
      });
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
    setStatusMessage({ type: 'info', text: 'AI 智能引擎正在分析视觉特征并生成多语言电商资料...' });
    try {
      const result = await generateGeminiProductContent({
        productId: editedProduct.id,
        optimizedImage: editedProduct.optimizedMainImage || editedProduct.mainImage,
        originalImage: editedProduct.mainImage,
        geminiVision: {
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
        setStatusMessage({ type: 'success', text: 'AI 智能文案与 WooCommerce 数据重构成功！' });
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

  // Submit and Publish (Supports Single Store and Multi-Store Matrix Dispatch)
  const handleSubmitPublish = async () => {
    if (stores.length === 0) {
      setStatusMessage({ type: 'error', text: '暂无已绑定的 WooCommerce 店铺，请先前往“WordPress 店铺管理”添加或启用站点。' });
      return;
    }

    const targetIds = isMatrixAllSelected
      ? stores.map(s => s.id)
      : (selectedStoreIds.length > 0 ? selectedStoreIds : [stores[0].id]);

    const targetStoresList = stores.filter(s => targetIds.includes(s.id));
    if (targetStoresList.length === 0 && stores.length > 0) {
      targetStoresList.push(stores[0]);
    }

    setIsPublishing(true);
    setStatusMessage({
      type: 'info',
      text: `正在同步保存商品资料，并发布上架至 ${targetStoresList.length} 个目标 WooCommerce 独立站...`
    });

    // Open Realtime Progress Modal
    setPublishingProgressModal({
      isOpen: true,
      isCompleted: false,
      storeResults: targetStoresList.map(s => ({
        storeId: s.id,
        storeName: s.name || s.store_name || 'WooCommerce 独立站',
        storeUrl: s.url || s.wordpress_url || '',
        status: 'publishing'
      }))
    });

    try {
      // 1. Save current edits first
      const savedRes = await saveProduct(editedProduct);
      const currentProduct = savedRes.product || editedProduct;

      // 2. Dispatch multi-store publication API
      const targetStoreIdsArray = targetStoresList.map(s => s.id);
      const pubRes = await publishToStoresApi(currentProduct.id, targetStoreIdsArray, currentProduct);

      if (pubRes && pubRes.success && pubRes.results) {
        const resultsMap = new Map(pubRes.results.map(r => [r.store_id, r]));

        const updatedProgressResults = targetStoresList.map(s => {
          const pubLog = resultsMap.get(s.id);
          if (pubLog && pubLog.status === 'success') {
            return {
              storeId: s.id,
              storeName: s.name || s.store_name || 'WooCommerce 独立站',
              storeUrl: s.url || s.wordpress_url || '',
              status: 'success' as const,
              wordpressId: pubLog.wordpress_id,
              url: pubLog.url
            };
          } else {
            return {
              storeId: s.id,
              storeName: s.name || s.store_name || 'WooCommerce 独立站',
              storeUrl: s.url || s.wordpress_url || '',
              status: 'failed' as const,
              errorLog: pubLog?.error_log || '发布至该店铺失败，请检查 REST API 凭证或网络状态'
            };
          }
        });

        const successCount = updatedProgressResults.filter(r => r.status === 'success').length;
        const totalCount = updatedProgressResults.length;

        setPublishingProgressModal({
          isOpen: true,
          isCompleted: true,
          storeResults: updatedProgressResults
        });

        const firstSuccess = updatedProgressResults.find(r => r.status === 'success');
        const finalProduct: Product = {
          ...currentProduct,
          status: successCount > 0 ? ('published' as const) : currentProduct.status,
          publish_status: successCount > 0 ? ('published' as const) : currentProduct.publish_status,
          wcProductId: firstSuccess?.wordpressId || currentProduct.wcProductId,
          wcPermalink: firstSuccess?.url || currentProduct.wcPermalink,
          wordpress_id: firstSuccess?.wordpressId || currentProduct.wordpress_id,
          publish_url: firstSuccess?.url || currentProduct.publish_url
        };

        setEditedProduct(finalProduct);
        if (onSaveProduct) onSaveProduct(finalProduct);

        if (successCount === totalCount) {
          setStatusMessage({
            type: 'success',
            text: `商品已成功同步发布至全部 ${totalCount} 个目标独立站店铺！`
          });
        } else if (successCount > 0) {
          setStatusMessage({
            type: 'info',
            text: `矩阵发布完成：${successCount}/${totalCount} 个店铺上架成功，部分店铺失败详情请查阅日志。`
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: `矩阵发布失败：所有 ${totalCount} 个目标店铺均未成功上架，请检查店铺 REST API 权限。`
          });
        }
      } else {
        throw new Error(pubRes?.message || '多店铺矩阵发布未成功完成');
      }
    } catch (err: any) {
      setPublishingProgressModal(prev => prev ? {
        ...prev,
        isCompleted: true,
        storeResults: prev.storeResults.map(r => ({
          ...r,
          status: 'failed',
          errorLog: err.message || '系统发布 Dispatcher 异常'
        }))
      } : null);

      setStatusMessage({
        type: 'error',
        text: '矩阵发布失败：' + (err.message || '远程 WooCommerce REST API 连接或权限异常')
      });
    } finally {
      setIsPublishing(false);
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
                <Sparkles className="w-3 h-3" /> AI 智能 Product Agent
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

          {/* Target Stores Selector Component */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStoreSelectorOpen(!isStoreSelectorOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center space-x-2 transition"
            >
              <Store className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[140px] truncate">
                {isMatrixAllSelected
                  ? `矩阵全选 (${stores.length} 店)`
                  : selectedStoreIds.length > 1
                  ? `同步发布 (${selectedStoreIds.length} 店)`
                  : (stores.find(s => s.id === selectedStoreIds[0])?.name || '选择目标店铺')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isStoreSelectorOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Selector Popover */}
            {isStoreSelectorOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-30 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-indigo-400" /> 发布目标店铺选择
                  </span>
                  <button 
                    type="button"
                    onClick={() => setIsStoreSelectorOpen(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Matrix All Toggle */}
                <label className="flex items-center justify-between p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 cursor-pointer hover:bg-indigo-900/40 transition">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isMatrixAllSelected}
                      onChange={(e) => handleSelectAllStoresToggle(e.target.checked)}
                      className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-indigo-300">全部店铺同步发布 (矩阵模式)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-mono">
                    {stores.length} 站
                  </span>
                </label>

                {/* Individual Stores List */}
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {stores.length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-500">
                      暂无关联店铺，请先添加店铺
                    </div>
                  ) : (
                    stores.map(store => {
                      const isChecked = isMatrixAllSelected || selectedStoreIds.includes(store.id);
                      return (
                        <label
                          key={store.id}
                          onClick={() => {
                            if (isMatrixAllSelected) {
                              setIsMatrixAllSelected(false);
                              setSelectedStoreIds([store.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition ${
                            isChecked
                              ? 'bg-slate-800/90 border-indigo-500/40 text-slate-100'
                              : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStoreId(store.id)}
                              className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                            />
                            <div className="truncate">
                              <div className="font-semibold truncate">{store.name || store.store_name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{store.url}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                            store.status === 'connected' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {store.status === 'connected' ? '已连通' : '在线'}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmitPublish}
            disabled={isPublishing || isSaving}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            {isPublishing ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>同步发布中...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>提交并一键发布</span>
              </>
            )}
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
              <span className="text-[11px] text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                AI 智能视觉特征识别
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

          {/* TAB 1: Content & Spanish Title / Description */}
          {activeTab === 'content' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" /> 西班牙语商品标题与详细文案
                </h2>

                {/* Single Language Lock Badge (Spanish ES) */}
                <div className="flex items-center space-x-2 bg-indigo-950/80 px-3 py-1.5 rounded-lg border border-indigo-500/30 text-xs font-bold text-indigo-300">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>🇪🇸 西班牙语 (Spanish / ES) - 系统全流程锁定</span>
                </div>
              </div>

              {/* Title Input (Spanish) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>商品标题 (ES Title):</span>
                  <span className="text-[11px] text-indigo-400">AI 智能自动高转换率生成</span>
                </label>
                <input
                  type="text"
                  value={
                    editedProduct.multilingualTitles?.es ||
                    editedProduct.title ||
                    editedProduct.ai_title ||
                    ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const updatedTitles = {
                      ...(editedProduct.multilingualTitles || { zh: val, en: val, es: val }),
                      es: val,
                      zh: val,
                      en: val
                    };
                    setEditedProduct({
                      ...editedProduct,
                      title: val,
                      ai_title: val,
                      multilingualTitles: updatedTitles
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 p-3 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Short Description (Spanish) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">简短描述 (ES Short Description):</label>
                <textarea
                  rows={3}
                  value={
                    editedProduct.multilingualShortDescriptions?.es ||
                    editedProduct.shortDescription ||
                    editedProduct.ai_short_description ||
                    ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const updatedShorts = {
                      ...(editedProduct.multilingualShortDescriptions || { zh: val, en: val, es: val }),
                      es: val,
                      zh: val,
                      en: val
                    };
                    setEditedProduct({ 
                      ...editedProduct, 
                      shortDescription: val,
                      ai_short_description: val,
                      multilingualShortDescriptions: updatedShorts
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 p-3 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  placeholder="适用于 WooCommerce 简短摘要展示 (ES)..."
                />
              </div>

              {/* HTML Detailed Description (Spanish) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">HTML 详细排版描述 (ES Long Description):</label>
                  <span className="text-[11px] text-slate-500">支持 HTML 标签渲染与样式导入</span>
                </div>
                <textarea
                  rows={8}
                  value={
                    editedProduct.multilingualLongDescriptions?.es ||
                    editedProduct.longDescription ||
                    editedProduct.ai_description ||
                    ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const updatedLongs = {
                      ...(editedProduct.multilingualLongDescriptions || { zh: val, en: val, es: val }),
                      es: val,
                      zh: val,
                      en: val
                    };
                    setEditedProduct({ 
                      ...editedProduct, 
                      longDescription: val,
                      ai_description: val,
                      multilingualLongDescriptions: updatedLongs
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 p-3 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                />
              </div>

              {/* HTML Preview Box (Spanish) */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-400">实时 HTML 样式渲染预览 (ES Preview):</p>
                <div 
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: (
                      editedProduct.multilingualLongDescriptions?.es ||
                      editedProduct.longDescription ||
                      editedProduct.ai_description
                    ) || '<p>暂无描述内容</p>' 
                  }}
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
                  AI 智能自动匹配的 SEO 关键词矩阵与自定义 Slug URL 链接
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
                    name: editedProduct.multilingualTitles?.es || editedProduct.title,
                    slug: editedProduct.seo?.slug || 'smart-product',
                    description: editedProduct.multilingualLongDescriptions?.es || editedProduct.longDescription || editedProduct.ai_description,
                    short_description: editedProduct.multilingualShortDescriptions?.es || editedProduct.shortDescription || editedProduct.ai_short_description,
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

      {/* Matrix Publishing Progress Modal */}
      {publishingProgressModal && publishingProgressModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                  <Globe className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    WooCommerce 多店铺矩阵上架
                  </h3>
                  <p className="text-xs text-slate-400">
                    {publishingProgressModal.isCompleted
                      ? `矩阵同步完成！成功发布至 ${publishingProgressModal.storeResults.filter(r => r.status === 'success').length} / ${publishingProgressModal.storeResults.length} 个独立站`
                      : `正在同步并发推送至 ${publishingProgressModal.storeResults.length} 个独立站店铺...`}
                  </p>
                </div>
              </div>
              
              {publishingProgressModal.isCompleted && (
                <button
                  type="button"
                  onClick={() => setPublishingProgressModal(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Stores Progress List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {publishingProgressModal.storeResults.map((item, idx) => (
                <div 
                  key={item.storeId || idx}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                    item.status === 'success' ? 'bg-emerald-950/30 border-emerald-500/30' :
                    item.status === 'failed' ? 'bg-rose-950/30 border-rose-500/30' :
                    'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 truncate">
                      <Store className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-slate-200 block truncate">{item.storeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">{item.storeUrl}</span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {item.status === 'publishing' && (
                        <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center gap-1 font-semibold text-[11px]">
                          <RotateCw className="w-3 h-3 animate-spin text-indigo-400" />
                          <span>同步上架中...</span>
                        </span>
                      )}
                      {item.status === 'success' && (
                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>成功 (ID: #{item.wordpressId || 'OK'})</span>
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full flex items-center gap-1 font-semibold text-[11px]">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>上架失败</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Additional details row */}
                  {item.status === 'success' && item.url && (
                    <div className="pt-1.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400/80">Permalink:</span>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1 font-mono truncate max-w-[260px]"
                      >
                        <span className="truncate">{item.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}

                  {item.status === 'failed' && item.errorLog && (
                    <div className="pt-1.5 border-t border-rose-500/20 text-[11px] text-rose-300 font-mono bg-rose-950/40 p-2 rounded-lg">
                      <span className="font-bold block mb-0.5 text-rose-400">Trace Log:</span>
                      {item.errorLog}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            {publishingProgressModal.isCompleted && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setPublishingProgressModal(null);
                    if (onNavigateToWooCommerce) onNavigateToWooCommerce();
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <span>前往发布中心管理日志</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setPublishingProgressModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                >
                  完成并关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
