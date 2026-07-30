import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  RefreshCw, 
  Globe, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  ExternalLink,
  X,
  Check
} from 'lucide-react';
import { WooCommerceStore } from '../types';
import { 
  fetchStores, 
  addStoreApi, 
  updateStoreApi, 
  deleteStoreApi, 
  testStoreApi 
} from '../services/api';

export const WordPressStoresView: React.FC = () => {
  const [stores, setStores] = useState<WooCommerceStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<WooCommerceStore | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    consumer_key: '',
    consumer_secret: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const res = await fetchStores();
      if (res.success && res.stores) {
        setStores(res.stores);
      }
    } catch (err: any) {
      setError(err.message || '加载店铺数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingStore(null);
    setFormData({
      name: '',
      url: '',
      consumer_key: '',
      consumer_secret: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (store: WooCommerceStore) => {
    setEditingStore(store);
    setFormData({
      name: store.name || store.store_name || '',
      url: store.url || store.wordpress_url || '',
      consumer_key: store.consumer_key || '',
      consumer_secret: store.consumer_secret || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.url || !formData.consumer_key || !formData.consumer_secret) {
      alert('请完整填写店铺名称、网址、Consumer Key 及 Consumer Secret');
      return;
    }

    setSubmitting(true);
    try {
      if (editingStore) {
        const res = await updateStoreApi(editingStore.id, {
          name: formData.name,
          url: formData.url,
          consumer_key: formData.consumer_key,
          consumer_secret: formData.consumer_secret
        });
        if (res.success) {
          setIsModalOpen(false);
          loadStores();
        }
      } else {
        const res = await addStoreApi(formData);
        if (res.success) {
          setIsModalOpen(false);
          loadStores();
        }
      }
    } catch (err: any) {
      alert('保存店铺失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStore = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除店铺 "${name}" 吗？此操作无法撤销。`)) return;

    try {
      const res = await deleteStoreApi(id);
      if (res.success) {
        loadStores();
      }
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await testStoreApi(id);
      if (res.success) {
        setTestResult({
          id,
          success: true,
          message: `连接成功! 站名: ${res.storeName || 'WooCommerce'} (${res.version || 'REST API OK'})`
        });
      } else {
        setTestResult({
          id,
          success: false,
          message: res.error || '连接失败，请检查 API Key 权限或 URL'
        });
      }
      loadStores();
    } catch (err: any) {
      setTestResult({
        id,
        success: false,
        message: '连接测试发生错误: ' + err.message
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
            <Store className="w-4 h-4" />
            <span>WORDPRESS WOOCOMMERCE MULTI-STORE MANAGER</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">WordPress 店铺管理 (WordPress Stores)</h2>
          <p className="text-xs text-slate-400 mt-1">
            统一管理多个独立站 WooCommerce 接入点，配置独立 API 密钥，实现商品一键多站同步刊登。
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>添加 WordPress 店铺</span>
        </button>
      </div>

      {/* Stores Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>已知 WooCommerce 店铺列表 ({stores.length})</span>
          </h3>
          <button
            onClick={loadStores}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="刷新店铺列表"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && stores.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span>正在加载 WordPress 店铺配置...</span>
          </div>
        ) : stores.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-3">
            <Store className="w-10 h-10 text-slate-600 mx-auto stroke-1" />
            <p className="font-medium text-slate-300">暂无连接的 WordPress WooCommerce 店铺</p>
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-indigo-600 text-white font-medium text-xs rounded-xl hover:bg-indigo-500 transition"
            >
              立即添加第一个店铺
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-medium uppercase border-b border-slate-800 text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">店铺名称 (Store Name)</th>
                  <th className="py-3.5 px-4">WordPress 网址 (Site URL)</th>
                  <th className="py-3.5 px-4">平台类型</th>
                  <th className="py-3.5 px-4">API 密钥 (Consumer Key/Secret)</th>
                  <th className="py-3.5 px-4">连接状态</th>
                  <th className="py-3.5 px-4">最后测试时间</th>
                  <th className="py-3.5 px-4 text-right">操作 (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {stores.map((store) => {
                  const isTestingThis = testingId === store.id;
                  const testResThis = testResult?.id === store.id ? testResult : null;

                  return (
                    <tr key={store.id} className="hover:bg-slate-800/40 transition group">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center space-x-2">
                          <Store className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>{store.name || store.store_name}</span>
                        </div>
                      </td>

                      {/* URL */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <a
                          href={store.url || store.wordpress_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-indigo-400 inline-flex items-center space-x-1 transition"
                        >
                          <span>{store.url || store.wordpress_url}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </a>
                      </td>

                      {/* Platform */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 text-[10px] bg-slate-950 border border-slate-800 text-slate-300 rounded-md font-mono">
                          WooCommerce
                        </span>
                      </td>

                      {/* Masked Keys */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="space-y-0.5">
                          <div className="text-slate-400 flex items-center space-x-1">
                            <Key className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{store.consumer_key || 'ck_xxxx...'}</span>
                          </div>
                          <div className="text-slate-500 text-[10px]">
                            {store.consumer_secret || 'cs_xxxx...'}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {store.status === 'connected' ? (
                          <span className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded-full inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>连接正常</span>
                          </span>
                        ) : store.status === 'error' ? (
                          <span className="px-2.5 py-1 text-[10px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/80 rounded-full inline-flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>连接失败</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 text-slate-400 rounded-full">
                            未测试
                          </span>
                        )}

                        {testResThis && (
                          <div className={`text-[10px] mt-1 font-sans font-normal ${testResThis.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {testResThis.message}
                          </div>
                        )}
                      </td>

                      {/* Last Sync/Tested */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {store.lastTestedAt ? new Date(store.lastTestedAt).toLocaleString('zh-CN', { hour12: false }) : store.created_time ? new Date(store.created_time).toLocaleDateString() : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleTestConnection(store.id)}
                            disabled={isTestingThis}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium text-[11px] rounded-lg border border-slate-700 flex items-center space-x-1 transition disabled:opacity-50"
                            title="测试 API 连接"
                          >
                            <ShieldCheck className={`w-3.5 h-3.5 ${isTestingThis ? 'animate-spin' : ''}`} />
                            <span>{isTestingThis ? '测试中' : '测试'}</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(store)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                            title="编辑店铺"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteStore(store.id, store.name)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 rounded-lg border border-slate-700 transition"
                            title="删除店铺"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Store Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingStore ? '编辑 WordPress WooCommerce 店铺' : '添加新的 WordPress WooCommerce 店铺'}
                </h3>
                <p className="text-xs text-slate-400">配置独立的 WooCommerce REST API 凭据</p>
              </div>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Store Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">店铺显示名称 (Store Name)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 美国主站 / 墨西哥跨境站"
                  className="w-full px-3.5 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Site URL */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">WordPress 独立站网址 (Site URL)</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://yourwoocommerce.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Consumer Key */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">WooCommerce Consumer Key</label>
                <input
                  type="text"
                  required
                  value={formData.consumer_key}
                  onChange={(e) => setFormData({ ...formData, consumer_key: e.target.value })}
                  placeholder="ck_1234567890abcdef..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Consumer Secret */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">WooCommerce Consumer Secret</label>
                <input
                  type="password"
                  required
                  value={formData.consumer_secret}
                  onChange={(e) => setFormData({ ...formData, consumer_secret: e.target.value })}
                  placeholder="cs_1234567890abcdef..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>保存中...</span>
                    </>
                  ) : (
                    <span>保存店铺配置</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
