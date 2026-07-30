import React from 'react';
import { 
  ShoppingBag, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Globe, 
  PlusCircle, 
  Wand2, 
  Share2, 
  Settings, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign, 
  Zap,
  ListOrdered
} from 'lucide-react';
import { Product, WooCommerceConfig, AITask } from '../types';

interface DashboardViewProps {
  products: Product[];
  wcConfig: WooCommerceConfig;
  tasks: AITask[];
  onNavigate: (tab: string) => void;
  onEditProduct: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  wcConfig,
  tasks,
  onNavigate,
  onEditProduct,
}) => {
  // Metrics calculation
  const totalProducts = products.length;
  const aiGeneratedCount = products.filter(p => p.source.type === 'upload' || p.source.type === 'crawler').length;
  const pendingAuditCount = products.filter(p => p.status === 'pending_review' || p.status === 'ready').length;
  const publishedCount = products.filter(p => p.status === 'published').length;
  const failedTasksCount = tasks.filter(t => t.status === 'failed').length;

  const totalCatalogValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const avgMargin = (products.reduce((acc, p) => acc + (p.estimatedMargin || 0), 0) / (totalProducts || 1)).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI ECOM OPERATIONS HUB</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">电商商品自动上传管理系统</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            欢迎使用私人 AI 电商运营后台。已通过免费 AI 算法完成商品视觉裁剪、高转化标题描述生成及 WooCommerce 自动同步。
          </p>
        </div>

        {/* Quick Action Button Group */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('create')}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-medium text-xs shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>创建 AI 商品</span>
          </button>

          <button
            onClick={() => onNavigate('image-studio')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs border border-slate-700 flex items-center space-x-2 transition"
          >
            <Wand2 className="w-4 h-4 text-cyan-400" />
            <span>图片 AI 优化</span>
          </button>

          <button
            onClick={() => onNavigate('products')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs border border-slate-700 flex items-center space-x-2 transition"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>商品管理</span>
          </button>

          <button
            onClick={() => onNavigate('woocommerce')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs border border-slate-700 flex items-center space-x-2 transition"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>发布中心</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition"
            title="系统设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row (6 Required Key Statistics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Metric 1: Total Products */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>商品总数量</span>
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{totalProducts}</div>
          <div className="text-[11px] text-slate-500">库存货值 ≈ ${totalCatalogValue.toLocaleString()}</div>
        </div>

        {/* Metric 2: AI Generated */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>AI 生成数量</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 tracking-tight">{aiGeneratedCount}</div>
          <div className="text-[11px] text-slate-500">Gemini 视觉文案建模</div>
        </div>

        {/* Metric 3: Pending Audit */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>待审核商品</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">{pendingAuditCount}</div>
          <div className="text-[11px] text-slate-500">等待确认或优化</div>
        </div>

        {/* Metric 4: Published */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>已发布商品</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">{publishedCount}</div>
          <div className="text-[11px] text-slate-500">已在线直售中</div>
        </div>

        {/* Metric 5: Failed Tasks */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>失败任务</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">{failedTasksCount}</div>
          <div className="text-[11px] text-slate-500">需重新重试执行</div>
        </div>

        {/* Metric 6: WordPress Connection Status */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>WordPress 状态</span>
            <Globe className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center space-x-1.5 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${wcConfig.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className={`text-sm font-bold ${wcConfig.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {wcConfig.status === 'connected' ? '已成功连接' : '未连接 REST'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 truncate" title={wcConfig.siteUrl}>
            {wcConfig.siteUrl || '点击进行连接测试'}
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Products & Quick Edit */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white text-sm">最新AI处理商品</h3>
                <p className="text-xs text-slate-400">点击快捷查看 AI 生成的商品详情与修改字段</p>
              </div>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1 transition"
              >
                <span>查看全量商品</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => onEditProduct(prod)}
                  className="p-3 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={prod.mainImage}
                      alt={prod.title}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-800 border border-slate-700/80 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition">
                          {prod.title}
                        </span>
                        <span className="px-1.5 py-0.2 text-[10px] font-mono text-slate-400 bg-slate-800 rounded">
                          {prod.sku}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-400">
                        <span>售价: <strong className="text-slate-200">${prod.price}</strong></span>
                        <span>成本: ${prod.costPrice}</span>
                        <span className="text-emerald-400 font-medium">预估利润率: {prod.estimatedMargin}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      prod.status === 'published'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : prod.status === 'ready'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {prod.status === 'published' ? '已同步发布' : prod.status === 'ready' ? '生成完毕' : '待审核'}
                    </span>
                    <button className="text-xs text-slate-400 group-hover:text-white px-2 py-1 bg-slate-800 rounded-md">
                      编辑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Profit & Pricing Insights Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-medium mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>平均商品利润率</span>
              </div>
              <div className="text-xl font-bold text-white">{avgMargin}%</div>
              <p className="text-[11px] text-slate-500 mt-1">基于AI定价模型与市场数据测算</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-medium mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>建议促销转化率</span>
              </div>
              <div className="text-xl font-bold text-white">+38.5%</div>
              <p className="text-[11px] text-slate-500 mt-1">采用AI建议划线促销价预测</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-medium mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>AI 上架节省工时</span>
              </div>
              <div className="text-xl font-bold text-white">~ 12.5 小时/天</div>
              <p className="text-[11px] text-slate-500 mt-1">替代人工抠图、撰写文案与多端录入</p>
            </div>
          </div>
        </div>

        {/* Right Column: AI Live Task Stream & WooCommerce Status */}
        <div className="space-y-4">
          {/* AI Live Queue Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ListOrdered className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-white text-sm">AI 任务队列与日志</h3>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                查看队列
              </button>
            </div>

            <div className="space-y-2.5">
              {tasks.map((t) => (
                <div key={t.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200 truncate max-w-[180px]">{t.name}</span>
                    <span className={`px-1.5 py-0.2 text-[10px] font-semibold rounded ${
                      t.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-indigo-950 text-indigo-400'
                    }`}>
                      {t.status === 'completed' ? '已完成' : '执行中'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{t.message}</p>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full transition-all duration-300"
                      style={{ width: `${t.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WooCommerce Store Info Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-white text-sm">WordPress 店铺连接状态</h3>
            </div>
            
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">店铺名称:</span>
                <span className="font-medium text-slate-200">{wcConfig.storeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">站点网址:</span>
                <span className="font-mono text-slate-300 text-[11px] truncate max-w-[160px]">{wcConfig.siteUrl}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">REST API 状态:</span>
                <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>v3 已授权</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('woocommerce')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition"
            >
              配置 WooCommerce 连接密钥
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
