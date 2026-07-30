import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  RotateCw,
  Search,
  Send,
  Store,
  X,
  Check,
  FileCheck
} from 'lucide-react';
import { ProductPublication, WooCommerceStore, Product } from '../types';
import { 
  fetchPublications, 
  fetchStores, 
  publishToStoresApi 
} from '../services/api';

interface PublishingCenterViewProps {
  products: Product[];
  onRefreshProducts?: () => void;
}

export const PublishingCenterView: React.FC<PublishingCenterViewProps> = ({
  products,
  onRefreshProducts
}) => {
  const [publications, setPublications] = useState<ProductPublication[]>([]);
  const [stores, setStores] = useState<WooCommerceStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [showErrorModal, setShowErrorModal] = useState<{ title: string; log: string } | null>(null);

  // Multi-store publish dialog state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [publishingStoreIds, setPublishingStoreIds] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pubRes, storesRes] = await Promise.all([
        fetchPublications(),
        fetchStores()
      ]);

      if (pubRes.success && pubRes.publications) {
        setPublications(pubRes.publications);
      }
      if (storesRes.success && storesRes.stores) {
        setStores(storesRes.stores);
      }
    } catch (err: any) {
      console.warn("加载 Publishing Center 数据失败:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPublishModal = (product: Product) => {
    setSelectedProduct(product);
    // Preselect all connected stores by default
    const connectedIds = stores.filter(s => s.status !== 'error').map(s => s.id);
    setPublishingStoreIds(connectedIds.length > 0 ? connectedIds : stores.map(s => s.id));
  };

  const toggleStoreSelection = (storeId: string) => {
    if (publishingStoreIds.includes(storeId)) {
      setPublishingStoreIds(publishingStoreIds.filter(id => id !== storeId));
    } else {
      setPublishingStoreIds([...publishingStoreIds, storeId]);
    }
  };

  const handleExecutePublish = async () => {
    if (!selectedProduct || publishingStoreIds.length === 0) {
      alert("请至少选择一个目标 WordPress 店铺");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await publishToStoresApi(selectedProduct.id, publishingStoreIds, selectedProduct);
      if (res.success) {
        setSelectedProduct(null);
        await loadData();
        if (onRefreshProducts) onRefreshProducts();
      }
    } catch (err: any) {
      alert("发布过程发生错误: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredPublications = publications.filter((pub) => {
    const title = pub.product_title || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pub.product_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pub.status === statusFilter;
    const matchesStore = selectedStoreFilter === 'all' || pub.store_id === selectedStoreFilter;
    return matchesSearch && matchesStatus && matchesStore;
  });

  const getStatusBadge = (status: string, storeName?: string) => {
    switch (status) {
      case 'success':
      case 'published':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded-full text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>✔ {storeName || '已同步发布'}</span>
          </span>
        );
      case 'publishing':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 rounded-full text-[11px] font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>发布中 ({storeName})</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-950/80 text-rose-300 border border-rose-800/80 rounded-full text-[11px] font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>✘ {storeName || '发布失败'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-[11px] font-medium">
            <RotateCw className="w-3.5 h-3.5" />
            <span>等待发布</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
            <Share2 className="w-4 h-4" />
            <span>MULTI-STORE PUBLISHING CENTER (商品发布中心)</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">发布中心与商品同步记录 (Publishing Center)</h2>
          <p className="text-xs text-slate-400 mt-1">
            实时追溯商品分发到各个 WordPress WooCommerce 站点的发布状态与错误日志。
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>刷新发布同步记录</span>
        </button>
      </div>

      {/* Publications Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Send className="w-4 h-4 text-indigo-400" />
              <span>多店铺商品同步刊登总览 ({filteredPublications.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">例如：Luxury Perfume 尊贵香水 → ✔ 墨西哥站 | ✔ 美国站 | ✘ 欧洲站</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索商品名称..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 w-48"
              />
            </div>

            <select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 text-slate-300 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              <option value="all">全部目标店铺</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 text-slate-300 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              <option value="all">全部分布状态</option>
              <option value="success">成功 (Success)</option>
              <option value="publishing">发布中 (Publishing)</option>
              <option value="pending">等待发布 (Pending)</option>
              <option value="failed">失败 (Failed)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-[10px] font-semibold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <th className="py-3 px-4">商品名称 (Product Name)</th>
                <th className="py-3 px-4">目标店铺 (Target Store)</th>
                <th className="py-3 px-4">发布状态 (Publish Status)</th>
                <th className="py-3 px-4">WordPress 详情链接</th>
                <th className="py-3 px-4">同步发布时间</th>
                <th className="py-3 px-4 text-right">操作 (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
              {filteredPublications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    暂无多店铺发布同步记录
                  </td>
                </tr>
              ) : (
                filteredPublications.map((pub) => {
                  return (
                    <tr key={pub.id} className="hover:bg-slate-800/40 transition">
                      {/* Product Name */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="line-clamp-1">{pub.product_title || 'Ecommerce Item'}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {pub.product_id}</div>
                      </td>

                      {/* Target Store */}
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        <div className="flex items-center space-x-1.5">
                          <Store className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{pub.store_name || pub.store_id}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(pub.status, pub.store_name)}
                      </td>

                      {/* WordPress Link */}
                      <td className="py-3.5 px-4 font-mono">
                        {pub.url ? (
                          <a
                            href={pub.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 inline-flex items-center space-x-1 transition text-[11px]"
                          >
                            <span>#{pub.wordpress_id || 'View'}</span>
                            <ExternalLink className="w-3 h-3 text-indigo-400" />
                          </a>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Publish Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {pub.publish_time ? new Date(pub.publish_time).toLocaleString('zh-CN', { hour12: false }) : pub.created_time ? new Date(pub.created_time).toLocaleString('zh-CN', { hour12: false }) : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {pub.status === 'failed' && (
                          <button
                            onClick={() => setShowErrorModal({ title: `${pub.product_title} (${pub.store_name})`, log: pub.error_log || '网络超时或 API Key 凭据失效' })}
                            className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 rounded-lg text-[11px] transition"
                          >
                            查看失败日志
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Products Quick Launch Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-sm">快捷选择商品发起多店铺一键发布</h3>
            <p className="text-xs text-slate-400 mt-0.5">直接选择已生成的商品一键分发至全线 WordPress WooCommerce 独立站</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.slice(0, 6).map((prod) => (
            <div key={prod.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <img
                  src={prod.optimizedMainImage || prod.mainImage}
                  alt={prod.title}
                  className="w-10 h-10 object-cover rounded-lg border border-slate-800 shrink-0"
                />
                <div className="truncate">
                  <h4 className="font-bold text-xs text-white truncate">{prod.title}</h4>
                  <p className="text-[10px] font-mono text-slate-400">{prod.sku} • ${prod.price}</p>
                </div>
              </div>

              <button
                onClick={() => handleOpenPublishModal(prod)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition shrink-0"
              >
                分发店铺
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Store Publishing Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <img
                src={selectedProduct.optimizedMainImage || selectedProduct.mainImage}
                alt={selectedProduct.title}
                className="w-12 h-12 object-cover rounded-xl border border-slate-800 shrink-0"
              />
              <div>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">选择目标分发店铺</span>
                <h3 className="text-sm font-bold text-white line-clamp-1">{selectedProduct.title}</h3>
                <p className="text-[11px] text-slate-400 font-mono">SKU: {selectedProduct.sku}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                支持多选：同时发布多个 WordPress WooCommerce 店铺
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {stores.map((store) => {
                  const isSelected = publishingStoreIds.includes(store.id);
                  return (
                    <div
                      key={store.id}
                      onClick={() => toggleStoreSelection(store.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Store className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <div>
                          <p className="font-bold text-xs">{store.name}</p>
                          <p className="text-[10px] font-mono opacity-70">{store.url}</p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecutePublish}
                disabled={isPublishing || publishingStoreIds.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 flex items-center space-x-2"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>分发中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>创建发布任务 ({publishingStoreIds.length} 个店铺)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Log Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>店铺发布错误诊察日志</span>
              </h3>
              <button
                onClick={() => setShowErrorModal(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                关闭
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-300 mb-1">{showErrorModal.title}</p>
              <div className="p-4 bg-slate-950 border border-slate-800 font-mono text-xs text-rose-300 rounded-xl max-h-60 overflow-y-auto whitespace-pre-wrap">
                {showErrorModal.log}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowErrorModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                已知晓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
