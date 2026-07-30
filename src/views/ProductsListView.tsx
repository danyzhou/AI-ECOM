import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Plus, 
  Share2, 
  Wand2, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Layers
} from 'lucide-react';
import { Product, ProductStatus } from '../types';

interface ProductsListViewProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onNavigateToCreate: () => void;
  onDeleteProduct: (productId: string) => void;
  onBulkPublish: (productIds: string[]) => void;
}

export const ProductsListView: React.FC<ProductsListViewProps> = ({
  products,
  onSelectProduct,
  onNavigateToCreate,
  onDeleteProduct,
  onBulkPublish,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkPublishTrigger = () => {
    if (selectedIds.length === 0) return;
    onBulkPublish(selectedIds);
    alert(`已批量将 ${selectedIds.length} 个商品加入 WooCommerce 同步队列！`);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>PRODUCT CATALOG & INVENTORY</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">商品管理中心</h2>
          <p className="text-xs text-slate-400 mt-1">
            实时统一管理 AI 生成商品库、价格套利计算、SEO 字段与 WordPress 独立站上线状态。
          </p>
        </div>

        <button
          onClick={onNavigateToCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>创建 AI 商品</span>
        </button>
      </div>

      {/* Filter Bar & Bulk Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: '全部商品' },
            { id: 'ready', label: '生成完毕' },
            { id: 'pending_review', label: '待审核' },
            { id: 'published', label: '已发布' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Bulk Button */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索商品名称或 SKU..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkPublishTrigger}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition shrink-0 shadow-md"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>批量同步 WooCommerce ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                </th>
                <th className="p-4">主图与商品详情</th>
                <th className="p-4">SKU / 分类</th>
                <th className="p-4">售价 / 成本</th>
                <th className="p-4">预估利润率</th>
                <th className="p-4">库存</th>
                <th className="p-4">上线状态</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(p.id)}
                        className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={p.mainImage}
                          alt={p.title}
                          className="w-12 h-12 object-cover rounded-xl border border-slate-800 bg-slate-950 shrink-0"
                        />
                        <div className="min-w-0 max-w-xs">
                          <p className="font-semibold text-slate-100 truncate hover:text-indigo-300 cursor-pointer" onClick={() => onSelectProduct(p)}>
                            {p.title}
                          </p>
                          <p className="text-[11px] text-indigo-400 truncate mt-0.5">{p.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-mono text-slate-300 font-medium">{p.sku}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{p.categories.join(', ')}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-100">${p.price}</p>
                      <p className="text-[11px] text-slate-500">成本: ${p.costPrice}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-emerald-400">{p.estimatedMargin}%</span>
                    </td>
                    <td className="p-4 font-mono">
                      {p.stock} 件
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        p.status === 'published'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      }`}>
                        {p.status === 'published' ? '已发布' : '生成完毕'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectProduct(p)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
                      >
                        编辑
                      </button>

                      <button
                        onClick={() => onDeleteProduct(p.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="删除商品"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
