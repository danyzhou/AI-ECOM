import React, { useState } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  Globe, 
  Sparkles, 
  Wand2, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  DollarSign, 
  Layers,
  Image as ImageIcon,
  Tag,
  FileText,
  Zap,
  ShieldCheck,
  ExternalLink,
  Bot,
  AlertCircle
} from 'lucide-react';
import { Product, AITask } from '../types';
import { runAIPipeline } from '../services/api';

interface ProductCreationViewProps {
  onProductCreated: (product: Product) => void;
  onNavigateToEdit: (product: Product) => void;
  onNavigateToTasks?: () => void;
}

export const ProductCreationView: React.FC<ProductCreationViewProps> = ({
  onProductCreated,
  onNavigateToEdit,
  onNavigateToTasks
}) => {
  const [inputMethod, setInputMethod] = useState<'upload' | 'url'>('upload');
  
  // Input states
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageRatio, setImageRatio] = useState<'1:1' | '4:3' | '16:9' | '3:4'>('1:1');
  const [userNotes, setUserNotes] = useState<string>('');
  const [autoPublish, setAutoPublish] = useState<boolean>(true);

  // Active Pipeline Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [activeTask, setActiveTask] = useState<AITask | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Drag & drop file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setErrorMessage('图片文件过大！单张图片最大不能超过 20MB。');
        alert('图片文件过大！单张图片最大不能超过 20MB。');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImageBase64(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartPipeline = async () => {
    if (!selectedImageBase64 && !imageUrl) {
      setErrorMessage('请先选择本地商品图片或输入图片 URL');
      return;
    }

    setErrorMessage('');
    setIsRunning(true);
    setCurrentStepIndex(1); // Task 1: Uploading & Initializing

    try {
      // Animated step feedback
      setTimeout(() => setCurrentStepIndex(2), 1200); // Task 2: ChatGPT Vision
      setTimeout(() => setCurrentStepIndex(3), 2800); // Task 3: Gemini Content
      setTimeout(() => setCurrentStepIndex(4), 4500); // Task 4: WooCommerce Sync

      const response = await runAIPipeline({
        imageUrl: inputMethod === 'url' ? imageUrl : undefined,
        imageBase64: inputMethod === 'upload' ? (selectedImageBase64 || undefined) : undefined,
        image_ratio: imageRatio,
        imageRatio: imageRatio,
        userNotes
      });

      if (response.success && response.task) {
        setActiveTask(response.task);
        setCurrentStepIndex(4);

        if (response.task.geminiContent) {
          const gemini = response.task.geminiContent;
          const newProd: Product = {
            id: response.task.productId || 'prod-' + Date.now(),
            title: gemini.title || 'AI 声学降噪无线耳机',
            multilingualTitles: gemini.multilingualTitles,
            subtitle: gemini.subtitle || '多功能推荐好物',
            sku: gemini.sku || 'SKU-ECOM-001',
            brand: response.task.chatgptVision?.brand || 'AI-Labs',
            categories: gemini.categories || ['3C数码', '热销特惠'],
            tags: gemini.tags || ['爆款新品', 'AI推荐'],
            status: response.task.status === 'published' ? 'published' : 'pending_review',
            mainImage: response.task.optimizedImage || response.task.originalImage,
            galleryImages: [response.task.optimizedImage || response.task.originalImage],
            price: gemini.price || 149.00,
            promoPrice: gemini.promoPrice || 119.00,
            costPrice: gemini.costPrice || 35.00,
            estimatedMargin: gemini.estimatedMargin || 70.0,
            stock: gemini.stock || 500,
            weight: gemini.weight || 0.3,
            dimensions: gemini.dimensions || { length: 15, width: 10, height: 5, unit: 'cm' },
            sellingPoints: gemini.sellingPoints || ['智能AI对标海外爆款', '高性能长续航设计'],
            shortDescription: gemini.shortDescription || '高转换率短描述...',
            longDescription: gemini.longDescription || '<p>精彩详情描述...</p>',
            parameters: gemini.parameters || [{ name: '材质', value: '铝合金' }],
            usageInstructions: gemini.usageInstructions || '开箱即用',
            cautions: gemini.cautions || '请妥善保管',
            seo: gemini.seo || {
              title: gemini.title + ' - 独立站好物',
              keywords: ['爆款好物', '独立站一键代发'],
              metaDescription: '选购AI深度优化高转化商品',
              slug: 'smart-product-' + Date.now()
            },
            source: { type: inputMethod, originalUrl: imageUrl },
            wcProductId: response.task.wcResult?.wcProductId,
            wcPermalink: response.task.wcResult?.wcPermalink,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          onProductCreated(newProd);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || '流水线自动化执行失败');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
            <Zap className="w-4 h-4 fill-indigo-400" />
            <span>AUTOMATED ECOM PIPELINE ENGINE</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">AI 商品全自动生产线</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            只需上传一张原始商品图片，系统自动触发 <strong className="text-slate-200">ChatGPT 图像抠图优化</strong> → <strong className="text-slate-200">Gemini 多语言文案与 SEO 生成</strong> → <strong className="text-slate-200">WooCommerce REST API 自动创建与发布</strong>。
          </p>
        </div>

        {/* Review Guard Toggle */}
        <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-200">发布审核模式</p>
            <p className="text-[10px] text-slate-400">{autoPublish ? '已开启: AI全自动直接发布站点' : '人工确认: 停留在待审核状态'}</p>
          </div>
          <button
            type="button"
            onClick={() => setAutoPublish(!autoPublish)}
            className={`w-10 h-5 flex items-center rounded-full p-1 transition duration-300 ${
              autoPublish ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md"></div>
          </button>
        </div>
      </div>

      {/* Visual Pipeline Architecture Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border transition ${currentStepIndex >= 1 ? 'bg-slate-900 border-indigo-500/80 shadow-md' : 'bg-slate-950 border-slate-800/80 opacity-60'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Step 1</span>
            {currentStepIndex >= 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Upload className="w-4 h-4 text-slate-500" />}
          </div>
          <h4 className="text-xs font-bold text-white">图片素材上传</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">本地图片或网页 URL 导入</p>
        </div>

        <div className={`p-4 rounded-xl border transition ${currentStepIndex >= 2 ? 'bg-slate-900 border-indigo-500/80 shadow-md' : 'bg-slate-950 border-slate-800/80 opacity-60'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Step 2</span>
            {currentStepIndex >= 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Bot className="w-4 h-4 text-slate-500" />}
          </div>
          <h4 className="text-xs font-bold text-white">ChatGPT 视觉 AI 优化</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">去水印、去LOGO、白底图生成</p>
        </div>

        <div className={`p-4 rounded-xl border transition ${currentStepIndex >= 3 ? 'bg-slate-900 border-indigo-500/80 shadow-md' : 'bg-slate-950 border-slate-800/80 opacity-60'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Step 3</span>
            {currentStepIndex >= 3 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4 text-slate-500" />}
          </div>
          <h4 className="text-xs font-bold text-white">Gemini 文案与 SEO</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">三语标题、卖点、定价、标签</p>
        </div>

        <div className={`p-4 rounded-xl border transition ${currentStepIndex >= 4 ? 'bg-slate-900 border-indigo-500/80 shadow-md' : 'bg-slate-950 border-slate-800/80 opacity-60'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Step 4</span>
            {currentStepIndex >= 4 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Globe className="w-4 h-4 text-slate-500" />}
          </div>
          <h4 className="text-xs font-bold text-white">WooCommerce 直发布</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">媒体库上传与商品 API 同步</p>
        </div>
      </div>

      {/* Main Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Run Trigger */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-xs flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>输入商品图片素材</span>
              </h3>

              {/* Method Switcher */}
              <div className="flex p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInputMethod('upload')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition ${inputMethod === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  本地图片
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('url')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition ${inputMethod === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  图片 URL
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Local Upload */}
            {inputMethod === 'upload' ? (
              <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-950/80 cursor-pointer transition group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {selectedImageBase64 ? (
                  <div className="space-y-2">
                    <img
                      src={selectedImageBase64}
                      alt="Uploaded preview"
                      className="w-36 h-36 object-cover rounded-xl mx-auto border border-slate-700 shadow-lg"
                    />
                    <p className="text-xs text-indigo-400 font-medium">点击可重新替换商品图</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400 group-hover:text-indigo-400 transition">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-200">选择或拖拽商品原图</p>
                    <p className="text-[10px] text-slate-500">支持 JPG, PNG, WEBP 高清格式</p>
                  </div>
                )}
              </div>
            ) : (
              /* URL Upload */
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">商品图片公开 URL 链接</label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-1505740420928..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="URL Preview"
                    className="w-32 h-32 object-cover rounded-xl border border-slate-800 mt-2"
                  />
                )}
              </div>
            )}

            {/* Image Ratio Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">图片处理尺寸比例 (Image Ratio)</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: '1:1', label: '1:1', desc: '标准正方形' },
                  { id: '4:3', label: '4:3', desc: '4:3 横向' },
                  { id: '16:9', label: '16:9', desc: '16:9 宽屏' },
                  { id: '3:4', label: '3:4', desc: '3:4 竖屏' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setImageRatio(item.id as any)}
                    className={`py-2 px-1 rounded-xl text-center border transition ${
                      imageRatio === item.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-mono">{item.label}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* User Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">补充生产指令 (可选)</label>
              <textarea
                rows={2}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="指定目标国家、人群定位或特定品牌名..."
                className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Run Pipeline Button */}
            <button
              type="button"
              onClick={handleStartPipeline}
              disabled={isRunning}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50 active:scale-[0.99]"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                  <span>流水线处理中 (Task Step {currentStepIndex}/4)...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-cyan-200" />
                  <span>一键启动全自动流水线</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Pipeline Monitor & Results */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[480px] flex flex-col justify-between shadow-xl">
            {activeTask ? (
              <div className="space-y-5">
                {/* Status Bar Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>流水线运行日志 (ID: {activeTask.id})</span>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 border border-indigo-800/80 rounded-full">
                    耗时: {activeTask.elapsedSeconds || 12.5}s
                  </span>
                </div>

                {/* ChatGPT Image Processing Result */}
                {activeTask.chatgptVision && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                        <Bot className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Task 2: ChatGPT 视觉理解 & 白底图渲染完成</span>
                      </span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
                        去水印 100%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                      <div><strong className="text-slate-300">猜测品类:</strong> {activeTask.chatgptVision.productType}</div>
                      <div><strong className="text-slate-300">推定品牌:</strong> {activeTask.chatgptVision.brand}</div>
                      <div><strong className="text-slate-300">使用材质:</strong> {activeTask.chatgptVision.materials}</div>
                      <div><strong className="text-slate-300">抠图优化:</strong> {activeTask.chatgptVision.visualHighlights}</div>
                    </div>
                  </div>
                )}

                {/* Gemini Multilingual Content Result */}
                {activeTask.geminiContent && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Task 3: Gemini 字段构造 & 多语言标题</span>
                      </span>
                      <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                        SKU: {activeTask.geminiContent.sku}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 pt-1">
                      <p className="text-white font-bold">{activeTask.geminiContent.title}</p>
                      {activeTask.geminiContent.multilingualTitles && (
                        <div className="text-[11px] text-indigo-300 space-y-0.5 pt-1">
                          <p><strong>EN:</strong> {activeTask.geminiContent.multilingualTitles.en}</p>
                          <p><strong>ES:</strong> {activeTask.geminiContent.multilingualTitles.es}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* WooCommerce Result */}
                {activeTask.wcResult && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-200 block">Task 4: WooCommerce 发布就绪</span>
                      <span className="text-[11px] text-indigo-300">商品 ID: #{activeTask.wcResult.wcProductId}</span>
                    </div>
                    <a
                      href={activeTask.wcResult.wcPermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-md"
                    >
                      <span>在线预览独立站</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Task Execution Logs Box */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-slate-500 font-sans text-[10px] font-semibold uppercase mb-1">完整系统流水线日志:</p>
                  {activeTask.logs?.map((l, idx) => (
                    <div key={idx} className="leading-relaxed">{l}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="my-auto text-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
                  <Wand2 className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">等待启动 AI 商品生产线</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  在左侧选择或上传商品图片，点击 “一键启动全自动流水线” 后，此处将实时展示 ChatGPT 视觉处理、Gemini 字段生成与 WooCommerce 站点同步状态。
                </p>
              </div>
            )}

            {/* Bottom Actions */}
            {activeTask && onNavigateToTasks && (
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={onNavigateToTasks}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <span>前往 AI 任务监控控制台</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
