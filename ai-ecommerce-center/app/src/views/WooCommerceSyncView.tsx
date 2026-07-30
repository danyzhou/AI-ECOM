import React, { useState } from 'react';
import { 
  Share2, 
  Globe, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Code, 
  Terminal, 
  ExternalLink,
  Layers
} from 'lucide-react';
import { WooCommerceConfig } from '../types';
import { testWooCommerceConnection } from '../services/api';

interface WooCommerceSyncViewProps {
  wcConfig: WooCommerceConfig;
  onUpdateConfig: (config: WooCommerceConfig) => void;
}

export const WooCommerceSyncView: React.FC<WooCommerceSyncViewProps> = ({
  wcConfig,
  onUpdateConfig,
}) => {
  const [siteUrl, setSiteUrl] = useState(wcConfig.siteUrl);
  const [consumerKey, setConsumerKey] = useState(wcConfig.consumerKey);
  const [consumerSecret, setConsumerSecret] = useState(wcConfig.consumerSecret);
  
  const [testing, setTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setErrorMsg(null);
    setTestResponse(null);

    try {
      const res = await testWooCommerceConnection({
        siteUrl,
        consumerKey,
        consumerSecret
      });

      if (res.success) {
        setTestResponse(res.storeInfo);
        onUpdateConfig({
          siteUrl,
          consumerKey,
          consumerSecret,
          status: 'connected',
          lastTestedAt: new Date().toISOString(),
          storeName: res.storeInfo.name
        });
      }
    } catch (err: any) {
      setErrorMsg('连接测试失败: ' + err.message);
      onUpdateConfig({
        siteUrl,
        consumerKey,
        consumerSecret,
        status: 'error',
      });
    } finally {
      setTesting(false);
    }
  };

  const samplePayload = {
    name: "智能声学高保真降噪无线蓝牙耳机",
    type: "simple",
    regular_price: "189.99",
    sale_price: "149.99",
    sku: "AUDIO-ANC-PRO-01",
    manage_stock: true,
    stock_quantity: 120,
    short_description: "企业级高保真降噪无线耳机，支持40小时超强续航。",
    description: "<h3>专业级音质与深度降噪体验</h3><p>采用最新一代 45dB 混合主动降噪算法...</p>",
    categories: [{ name: "Audio" }, { name: "Electronics" }],
    images: [
      { src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e" }
    ],
    meta_data: [
      { key: "_yoast_wpseo_title", value: "Smart Noise-Canceling Wireless Headphones" },
      { key: "_yoast_wpseo_metadesc", value: "Shop Smart Noise-Canceling Headphones Pro..." }
    ]
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
            <Share2 className="w-4 h-4" />
            <span>WORDPRESS WOOCOMMERCE REST API v3</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">WordPress 独立站发布中心</h2>
          <p className="text-xs text-slate-400 mt-1">
            输入 WooCommerce REST API 的 Key 和 Secret，实现商品标题、高清主图、变体、库存及 SEO 字段秒级直发布。
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl text-xs shrink-0">
          <span className="text-slate-400">当前连接状态:</span>
          {wcConfig.status === 'connected' ? (
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>已成功连接</span>
            </span>
          ) : (
            <span className="text-amber-400 font-semibold flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>未连接</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Credentials Form */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>1. 配置 WooCommerce API 访问凭据</span>
          </h3>

          <form onSubmit={handleTestConnection} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                WordPress 网址 (Site URL)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  required
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://your-store.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Consumer Key (ck_...)
              </label>
              <input
                type="text"
                required
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Consumer Secret (cs_...)
              </label>
              <input
                type="password"
                required
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={testing}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>测试通信连接中...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-cyan-300" />
                  <span>测试 REST API 通信连接</span>
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {testResponse && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs space-y-2 text-emerald-200">
              <div className="font-semibold text-emerald-300 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>连接测试成功！系统受信任</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>店铺名称: {testResponse.name}</div>
                <div>WC 版本: {testResponse.wcVersion}</div>
                <div>WP 版本: {testResponse.wordpressVersion}</div>
                <div>店铺货币: {testResponse.currency}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right 6 Cols: API Payload & Log Inspector */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>REST API JSON Payload 检查器</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">/wp-json/wc/v3/products</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            AI 自动生成的商品字段将以标准 WooCommerce REST API 规范进行转换打包：
          </p>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 h-80 overflow-y-auto">
            <pre>{JSON.stringify(samplePayload, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
