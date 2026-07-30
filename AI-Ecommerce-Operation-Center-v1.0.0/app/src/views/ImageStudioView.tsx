import React, { useState } from 'react';
import { 
  Wand2, 
  Eraser, 
  Sparkles, 
  Crop, 
  SlidersHorizontal, 
  Image as ImageIcon, 
  Check, 
  Download, 
  RefreshCcw, 
  Layers, 
  Split,
  Eye,
  Sliders
} from 'lucide-react';
import { Product, ImageProcessOptions } from '../types';

interface ImageStudioViewProps {
  products: Product[];
  onUpdateProductImage: (productId: string, mainImage: string, whiteBgImage: string) => void;
}

export const ImageStudioView: React.FC<ImageStudioViewProps> = ({
  products,
  onUpdateProductImage,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[0] || null);
  
  // Options
  const [options, setOptions] = useState<ImageProcessOptions>({
    removeWatermark: true,
    removeBg: true,
    enhanceClarity: true,
    autoCrop: true,
    generateLifestyle: false,
    aspectRatio: '1:1',
    outputQuality: 'hd'
  });

  // Split Comparison Slider (0 to 100)
  const [splitPos, setSplitPos] = useState(50);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);

  // Active AI Engine choice (Stable Diffusion / ComfyUI / Gemini Vision)
  const [aiEngine, setAiEngine] = useState<'sd' | 'comfyui' | 'gemini'>('gemini');

  const handleProcessImage = () => {
    setProcessing(true);
    setProcessed(false);
    
    setTimeout(() => {
      setProcessing(false);
      setProcessed(true);
    }, 1500);
  };

  const handleApplyToProduct = () => {
    if (selectedProduct) {
      onUpdateProductImage(
        selectedProduct.id,
        selectedProduct.mainImage,
        selectedProduct.whiteBgImage || selectedProduct.mainImage
      );
      alert('已成功将 AI 处理后的白底图与高清主图同步至商品数据！');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs mb-1">
            <Wand2 className="w-4 h-4" />
            <span>AI IMAGE STUDIO & BG REMOVAL</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">图片 AI 深度处理中心</h2>
          <p className="text-xs text-slate-400 mt-1">
            自动识别主视觉、智能擦除水印/LOGO、生成 1K 电商白底图与生活场景图，输出标准比例套图。
          </p>
        </div>

        {/* Engine Selector */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 border border-slate-800 rounded-xl shrink-0">
          <span className="text-xs text-slate-400 pl-2">免费 AI 引擎:</span>
          <button
            onClick={() => setAiEngine('gemini')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              aiEngine === 'gemini' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gemini Vision
          </button>
          <button
            onClick={() => setAiEngine('sd')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              aiEngine === 'sd' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stable Diffusion
          </button>
          <button
            onClick={() => setAiEngine('comfyui')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              aiEngine === 'comfyui' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ComfyUI 本地
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Product Selector & Options Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Select Product */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <label className="block text-xs font-medium text-slate-300">选择需处理的商品素材:</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const p = products.find(prod => prod.id === e.target.value);
                if (p) setSelectedProduct(p);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-950 text-slate-200 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            {selectedProduct && (
              <div className="flex items-center space-x-3 p-2 bg-slate-950 rounded-xl border border-slate-800">
                <img src={selectedProduct.mainImage} alt="" className="w-12 h-12 object-cover rounded-lg" />
                <div className="text-xs min-w-0">
                  <div className="font-semibold text-slate-200 truncate">{selectedProduct.title}</div>
                  <div className="text-[11px] text-slate-400">{selectedProduct.sku}</div>
                </div>
              </div>
            )}
          </div>

          {/* AI Processing Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>智能处理功能勾选</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <span className="text-slate-300 flex items-center space-x-2">
                  <Eraser className="w-4 h-4 text-rose-400" />
                  <span>自动擦除水印 & 品牌 LOGO</span>
                </span>
                <input
                  type="checkbox"
                  checked={options.removeWatermark}
                  onChange={(e) => setOptions({ ...options, removeWatermark: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <span className="text-slate-300 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>抠图并生成 1K 纯白底图</span>
                </span>
                <input
                  type="checkbox"
                  checked={options.removeBg}
                  onChange={(e) => setOptions({ ...options, removeBg: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <span className="text-slate-300 flex items-center space-x-2">
                  <Wand2 className="w-4 h-4 text-emerald-400" />
                  <span>超分辨率清晰度修复与锐化</span>
                </span>
                <input
                  type="checkbox"
                  checked={options.enhanceClarity}
                  onChange={(e) => setOptions({ ...options, enhanceClarity: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <span className="text-slate-300 flex items-center space-x-2">
                  <Crop className="w-4 h-4 text-indigo-400" />
                  <span>主体中心自动对齐与裁剪</span>
                </span>
                <input
                  type="checkbox"
                  checked={options.autoCrop}
                  onChange={(e) => setOptions({ ...options, autoCrop: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 w-4 h-4"
                />
              </label>
            </div>

            {/* Target Aspect Ratio */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">输出目标比例:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1:1', '4:3', '16:9'] as const).map(ratio => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setOptions({ ...options, aspectRatio: ratio })}
                    className={`py-1.5 text-xs rounded-lg border font-medium transition ${
                      options.aspectRatio === ratio
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {ratio} {ratio === '1:1' ? '(电商主图)' : ratio === '4:3' ? '(详情图)' : '(横幅)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleProcessImage}
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {processing ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  <span>AI 图像处理与抠图中...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>渲染处理图片</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 8 Cols: Interactive Split Image Viewer */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Split className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-white text-sm">前后效果对比 (Before / After Split)</h3>
              </div>
              <span className="text-xs text-slate-400">拖拽中央分割线实时对比</span>
            </div>

            {/* Interactive Split Viewer Container */}
            <div className="relative w-full h-[400px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 select-none group">
              {/* After Image (Clean White Background) */}
              <img
                src={selectedProduct?.whiteBgImage || selectedProduct?.mainImage}
                alt="After"
                className="absolute inset-0 w-full h-full object-contain p-6 bg-white"
              />

              {/* Before Image (Original with watermark or ambient bg) */}
              <div
                className="absolute inset-y-0 left-0 overflow-hidden bg-slate-950"
                style={{ width: `${splitPos}%` }}
              >
                <img
                  src={selectedProduct?.mainImage}
                  alt="Before"
                  className="absolute inset-0 w-full h-full object-contain p-6 max-w-none"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Split Slider Handle */}
              <div
                className="absolute inset-y-0 w-1 bg-cyan-400 cursor-ew-resize flex items-center justify-center shadow-2xl"
                style={{ left: `${splitPos}%` }}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPos}
                  onChange={(e) => setSplitPos(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                />
                <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center shadow-lg">
                  <Split className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Labels overlay */}
              <span className="absolute top-3 left-3 px-2 py-1 text-[10px] font-bold bg-slate-900/80 text-rose-300 rounded border border-rose-800">
                处理前 原图 (Original)
              </span>
              <span className="absolute top-3 right-3 px-2 py-1 text-[10px] font-bold bg-emerald-950/90 text-emerald-300 rounded border border-emerald-800">
                处理后 电商 1K 白底图 (AI Cleaned)
              </span>
            </div>

            {/* Output Images Suite Cards */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[11px] font-semibold text-slate-300">1. 电商主图 (800x800)</p>
                <img src={selectedProduct?.mainImage} alt="" className="w-full h-24 object-cover rounded-lg bg-slate-900" />
                <button className="w-full py-1 text-[11px] bg-slate-800 text-slate-300 hover:text-white rounded flex items-center justify-center space-x-1">
                  <Download className="w-3 h-3" />
                  <span>下载主图</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[11px] font-semibold text-slate-300">2. 纯白背景图 (Studio White)</p>
                <img src={selectedProduct?.whiteBgImage || selectedProduct?.mainImage} alt="" className="w-full h-24 object-contain rounded-lg bg-white" />
                <button className="w-full py-1 text-[11px] bg-slate-800 text-slate-300 hover:text-white rounded flex items-center justify-center space-x-1">
                  <Download className="w-3 h-3" />
                  <span>下载白底图</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[11px] font-semibold text-slate-300">3. 详情缩略图 (Thumbnail)</p>
                <img src={selectedProduct?.mainImage} alt="" className="w-full h-24 object-cover rounded-lg bg-slate-900" />
                <button className="w-full py-1 text-[11px] bg-slate-800 text-slate-300 hover:text-white rounded flex items-center justify-center space-x-1">
                  <Download className="w-3 h-3" />
                  <span>下载缩略图</span>
                </button>
              </div>
            </div>

            {/* Sync to product button */}
            <button
              onClick={handleApplyToProduct}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition"
            >
              <Check className="w-4 h-4" />
              <span>同步套图至【{selectedProduct?.title}】商品档案</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
