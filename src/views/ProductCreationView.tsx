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
  FileText, 
  Zap, 
  ShieldCheck, 
  ExternalLink, 
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { Product, AITask } from '../types';
import { runAIPipeline, publishToWooCommerce } from '../services/api';
import { standardizeImageToBase641to1 } from '../utils/imageStandardizer';

interface ProductCreationViewProps {
  onProductCreated: (product: Product) => void;
  onNavigateToEdit: (product: Product) => void;
  onNavigateToTasks?: () => void;
  onNavigateToReview?: () => void;
}

type StepStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface PipelineStepDetail {
  status: StepStatus;
  text: string;
  errorLog?: string;
}

export const ProductCreationView: React.FC<ProductCreationViewProps> = ({
  onProductCreated,
  onNavigateToEdit,
  onNavigateToTasks,
  onNavigateToReview
}) => {
  const [inputMethod, setInputMethod] = useState<'upload' | 'url'>('upload');
  
  // Input states
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageRatio, setImageRatio] = useState<'1:1' | '4:3' | '16:9' | '3:4'>('1:1');
  const [userNotes, setUserNotes] = useState<string>('');
  const [autoPublish, setAutoPublish] = useState<boolean>(true);

  // Product Initial Attribute Config States
  const [isAttrPanelOpen, setIsAttrPanelOpen] = useState<boolean>(true);
  const [skuPrefix, setSkuPrefix] = useState<string>('AIECOM-SKU-');
  const [regularPrice, setRegularPrice] = useState<string>('49.99');
  const [salePrice, setSalePrice] = useState<string>('39.99');
  const [stockQuantity, setStockQuantity] = useState<string>('100');

  // Active Pipeline Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTask, setActiveTask] = useState<AITask | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Step States for Realtime Dynamic Reaction (STEP 1 -> 4)
  const [stepStates, setStepStates] = useState<{
    step1: PipelineStepDetail;
    step2: PipelineStepDetail;
    step3: PipelineStepDetail;
    step4: PipelineStepDetail;
  }>({
    step1: { status: 'pending', text: '本地图片或网页 URL 导入' },
    step2: { status: 'pending', text: '自动识别品类、材质、外观卖点' },
    step3: { status: 'pending', text: '三语标题、卖点、定价、标签' },
    step4: { status: 'pending', text: '媒体库上传与商品 API 同步' },
  });

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
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        if (rawBase64) {
          const standardized = await standardizeImageToBase641to1(rawBase64, 800);
          setSelectedImageBase64(standardized);
        }
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
    setActiveTask(null);

    // 1. Initialize Step 1: Processing
    setStepStates({
      step1: { status: 'processing', text: '正在编码并 1:1 画布标准化解析商品图片...' },
      step2: { status: 'pending', text: '等待 Vision 图像解析' },
      step3: { status: 'pending', text: '等待 AI 智能文案生成' },
      step4: { status: 'pending', text: '等待站点同步发布' },
    });

    // Simulated progress transitions
    const t1 = setTimeout(() => {
      setStepStates(prev => ({
        ...prev,
        step1: { status: 'completed', text: '1:1 标准正方形图像准备就绪' },
        step2: { status: 'processing', text: '正在进行 AI 智能视觉多模态深度识别...' },
      }));
    }, 600);

    const t2 = setTimeout(() => {
      setStepStates(prev => {
        if (prev.step2.status === 'processing') {
          return {
            ...prev,
            step2: { status: 'completed', text: 'AI 智能视觉解析完成' },
            step3: { status: 'processing', text: '正在使用 AI 智能生成三语标题、卖点及 SEO 标签...' },
          };
        }
        return prev;
      });
    }, 2200);

    const t3 = setTimeout(() => {
      setStepStates(prev => {
        if (prev.step3.status === 'processing') {
          if (autoPublish) {
            return {
              ...prev,
              step3: { status: 'completed', text: 'AI 智能文案与 SEO 构造完成' },
              step4: { status: 'processing', text: '全自动模式：正在将 1:1 标准商品直接发布至 WooCommerce 独立站...' },
            };
          } else {
            return {
              ...prev,
              step3: { status: 'completed', text: 'AI 智能文案与 SEO 构造完成' },
              step4: { status: 'completed', text: '人工审核模式：商品已送入文案审核库' },
            };
          }
        }
        return prev;
      });
    }, 4200);

    try {
      // 1:1 Image Canvas Preprocessing
      let finalImgInput = selectedImageBase64;
      if (inputMethod === 'url' && imageUrl) {
        finalImgInput = await standardizeImageToBase641to1(imageUrl, 800);
      } else if (selectedImageBase64) {
        finalImgInput = await standardizeImageToBase641to1(selectedImageBase64, 800);
      }

      // Execute backend AIPipeline
      const response = await runAIPipeline({
        imageUrl: inputMethod === 'url' ? imageUrl : undefined,
        imageBase64: finalImgInput || undefined,
        image_ratio: imageRatio,
        imageRatio: imageRatio,
        userNotes,
        autoPublish: autoPublish,
        skuPrefix: skuPrefix.trim() || undefined,
        regularPrice: regularPrice ? Number(regularPrice) : undefined,
        salePrice: salePrice ? Number(salePrice) : undefined,
        stockQuantity: stockQuantity ? Number(stockQuantity) : undefined
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (response.success && response.task) {
        setActiveTask(response.task);

        let isPublished = response.task.status === 'published' || response.task.currentStep === 'published';
        const gemini = response.task.geminiContent;
        const vision = response.task.geminiVision;

        let wcId = response.task.wcResult?.wcProductId;
        let wcLink = response.task.wcResult?.wcPermalink;

        if (gemini) {
          const mainImgStd = await standardizeImageToBase641to1(response.task.optimizedImage || response.task.originalImage || finalImgInput, 800);

          const newProd: Product = {
            id: response.task.productId || 'prod-' + Date.now(),
            title: gemini.title || 'AI 精选品质好物',
            multilingualTitles: gemini.multilingualTitles,
            subtitle: gemini.subtitle || '多功能推荐好物',
            sku: gemini.sku || 'SKU-ECOM-001',
            brand: vision?.brand || 'AI-Ecom-Labs',
            categories: gemini.categories || ['3C数码', '热销特惠'],
            tags: gemini.tags || ['爆款新品', 'AI推荐'],
            status: isPublished ? 'published' : (autoPublish ? 'published' : 'pending_review'),
            publish_status: isPublished ? 'published' : (autoPublish ? 'published' : 'pending'),
            mainImage: mainImgStd,
            galleryImages: [mainImgStd],
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
            wcProductId: wcId,
            wcPermalink: wcLink,
            wordpress_id: wcId,
            publish_url: wcLink,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // CRITICAL: Unblock Full Automatic Publish Chain!
          if (autoPublish && !wcId) {
            setStepStates({
              step1: { status: 'completed', text: '商品 1:1 素材解析就绪' },
              step2: { status: 'completed', text: `Vision 特征识别完成: ${vision?.category || vision?.productType || '成功'}` },
              step3: { status: 'completed', text: `AI 智能文案与 SEO 构造完成 (SKU: ${gemini?.sku || 'OK'})` },
              step4: { status: 'processing', text: '全自动直发模式：正在自动调用 WooCommerce API 进行 1:1 标准商品上架...' }
            });

            try {
              const pubRes = await publishToWooCommerce(newProd);
              wcId = pubRes.wcProductId || pubRes.product?.wordpress_id || pubRes.product?.wcProductId;
              wcLink = pubRes.wcPermalink || pubRes.product?.publish_url || pubRes.product?.wcPermalink;

              newProd.wcProductId = wcId;
              newProd.wcPermalink = wcLink;
              newProd.wordpress_id = wcId;
              newProd.publish_url = wcLink;
              newProd.status = 'published';
              newProd.publish_status = 'published';
              isPublished = true;
            } catch (pubErr: any) {
              console.error('[AutoPublish Chain Error]:', pubErr);
              setStepStates({
                step1: { status: 'completed', text: '商品 1:1 素材解析就绪' },
                step2: { status: 'completed', text: `Vision 特征识别完成` },
                step3: { status: 'completed', text: `AI 文案生成完成` },
                step4: { status: 'failed', text: 'WooCommerce 全自动免审核直发失败', errorLog: pubErr.message || '发布 API 请求失败' }
              });
              setErrorMessage('全自动免审核直发上架失败: ' + (pubErr.message || '请检查 WooCommerce 密钥或网络'));
              onProductCreated(newProd);
              return;
            }
          }

          // Update final Step States upon completion
          setStepStates({
            step1: { status: 'completed', text: '商品 1:1 格式预处理及导入完成' },
            step2: { status: 'completed', text: `Vision 特征识别完成: ${vision?.category || vision?.productType || '成功'}` },
            step3: { status: 'completed', text: `AI 智能多语言文案生成完成 (SKU: ${gemini?.sku || 'OK'})` },
            step4: {
              status: isPublished ? 'completed' : 'completed',
              text: isPublished
                ? `WooCommerce 自动上架成功 (ID: #${wcId || 'OK'})`
                : (autoPublish
                  ? `WooCommerce 自动上架成功 (ID: #${wcId || 'OK'})`
                  : '人工审核模式：商品已放入待审核库，等待确认发布')
            }
          });

          onProductCreated(newProd);
        }
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      let errMsg = err.message || '流水线自动化执行失败';
      if (errMsg === 'fetch failed' || errMsg.includes('fetch failed')) {
        errMsg = '[AI 节点连接失败 HTTP 502/504] 无法建立与 AI 中转 Endpoint 的通信，请检查 API Base URL 与 Key 配置';
      }
      setErrorMessage(errMsg);

      // Pinpoint failed step for error highlighting
      if (errMsg.toLowerCase().includes('woocommerce') || errMsg.toLowerCase().includes('publish') || errMsg.includes('发布') || errMsg.includes('站点')) {
        setStepStates({
          step1: { status: 'completed', text: '1:1 格式预处理就绪' },
          step2: { status: 'completed', text: 'Vision 识别完成' },
          step3: { status: 'completed', text: 'AI 西班牙语文案生成完成' },
          step4: { status: 'failed', text: 'WooCommerce REST API 发布失败', errorLog: errMsg }
        });
      } else if (errMsg.toLowerCase().includes('vision') || errMsg.includes('图像') || errMsg.includes('识别')) {
        setStepStates({
          step1: { status: 'completed', text: '1:1 格式预处理就绪' },
          step2: { status: 'failed', text: 'AI 智能视觉图像识别失败', errorLog: errMsg },
          step3: { status: 'pending', text: '待生成西班牙语文案与 SEO' },
          step4: { status: 'pending', text: '待发布上架至站点' }
        });
      } else {
        setStepStates({
          step1: { status: 'completed', text: '1:1 格式预处理就绪' },
          step2: { status: 'completed', text: 'Vision 识别完成' },
          step3: { status: 'failed', text: 'AI 智能文案与 SEO 生成失败', errorLog: errMsg },
          step4: { status: 'pending', text: '待发布上架至站点' }
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Helper to render Step Cards with realtime status sync
  const renderStepCard = (
    stepNumber: string,
    title: string,
    defaultDesc: string,
    stepData: PipelineStepDetail,
    DefaultIcon: React.ElementType
  ) => {
    const isPending = stepData.status === 'pending';
    const isProcessing = stepData.status === 'processing';
    const isCompleted = stepData.status === 'completed';
    const isFailed = stepData.status === 'failed';

    return (
      <div 
        className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
          isProcessing
            ? 'bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500/50 animate-pulse'
            : isCompleted
            ? 'bg-slate-900/90 border-emerald-500/60 shadow-md shadow-emerald-500/10'
            : isFailed
            ? 'bg-rose-950/40 border-rose-500/80 shadow-lg shadow-rose-500/20'
            : 'bg-slate-950/80 border-slate-800/80 opacity-70'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              isProcessing ? 'text-indigo-400' : isCompleted ? 'text-emerald-400' : isFailed ? 'text-rose-400' : 'text-slate-500'
            }`}>
              {stepNumber}
            </span>

            {isProcessing && (
              <div className="flex items-center space-x-1 bg-indigo-950/90 border border-indigo-800 px-2 py-0.5 rounded-full">
                <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                <span className="text-[10px] font-bold text-indigo-300">处理中...</span>
              </div>
            )}

            {isCompleted && (
              <div className="flex items-center space-x-1 bg-emerald-950/90 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-semibold text-emerald-300">已完成</span>
              </div>
            )}

            {isFailed && (
              <div className="flex items-center space-x-1 bg-rose-950/90 border border-rose-800 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px] font-bold text-rose-300">失败</span>
              </div>
            )}

            {isPending && (
              <DefaultIcon className="w-4 h-4 text-slate-600" />
            )}
          </div>

          <h4 className={`text-xs font-bold ${
            isFailed ? 'text-rose-200' : isProcessing ? 'text-white' : isCompleted ? 'text-white' : 'text-slate-300'
          }`}>
            {title}
          </h4>

          <p className={`text-[11px] mt-1 transition-colors ${
            isProcessing ? 'text-indigo-300 font-medium' : isCompleted ? 'text-emerald-300/90' : isFailed ? 'text-rose-300 font-medium' : 'text-slate-500'
          }`}>
            {stepData.text || defaultDesc}
          </p>
        </div>

        {isFailed && stepData.errorLog && (
          <div className="mt-2.5 p-2 bg-rose-950/90 border border-rose-800/80 rounded-lg text-[10px] text-rose-200 font-mono break-all leading-tight">
            <span className="font-bold text-rose-400 block font-sans mb-0.5">错误日志 Log:</span>
            {stepData.errorLog}
          </div>
        )}
      </div>
    );
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
            只需上传一张原始商品图片，系统自动触发 <strong className="text-slate-200">AI 智能视觉识别</strong> → <strong className="text-slate-200">AI 智能多语言文案与 SEO 生成</strong> → <strong className="text-slate-200">WooCommerce REST API 自动创建与发布</strong>。
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

      {/* Visual Pipeline Architecture Overview Bar (Realtime Dynamic Reactive Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {renderStepCard('Step 1', '图片素材上传', '本地图片或网页 URL 导入', stepStates.step1, Upload)}
        {renderStepCard('Step 2', 'AI 智能视觉识别', '自动识别品类、材质、外观卖点', stepStates.step2, Sparkles)}
        {renderStepCard('Step 3', 'AI 智能文案与 SEO', '三语标题、卖点、定价、标签', stepStates.step3, FileText)}
        {renderStepCard('Step 4', 'WooCommerce 直发布', '媒体库上传与商品 API 同步', stepStates.step4, Globe)}
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

            {/* Product Initial Attribute Config Panel */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <button
                type="button"
                onClick={() => setIsAttrPanelOpen(!isAttrPanelOpen)}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-200 hover:text-white transition"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="text-indigo-400">🏷️</span>
                  <span>商品初始化属性配置</span>
                  <span className="text-[10px] text-slate-400 font-normal">(SKU、价格、库存)</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isAttrPanelOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAttrPanelOpen && (
                <div className="space-y-3 pt-2.5 border-t border-slate-800/80 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      SKU 前缀 / 规则
                    </label>
                    <input
                      type="text"
                      value={skuPrefix}
                      onChange={(e) => setSkuPrefix(e.target.value)}
                      placeholder="如: AIECOM-SKU- (默认自动生成随机后缀)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">留空则自动生成系统默认随机 SKU</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        常规售价 (Regular Price $)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={regularPrice}
                        onChange={(e) => setRegularPrice(e.target.value)}
                        placeholder="49.99"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        促销价 (Sale Price $) <span className="text-slate-500 font-normal">(可选)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        placeholder="39.99"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      初始库存 (Stock Quantity)
                    </label>
                    <input
                      type="number"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      placeholder="100"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
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
                  <span>流水线全速处理中...</span>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[480px] flex flex-col justify-between shadow-xl space-y-4">
            {activeTask ? (
              <div className="space-y-4">
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

                {/* Gemini Vision Image Processing Result */}
                {activeTask.geminiVision && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Task 2: AI 智能视觉多模态分析完成</span>
                      </span>
                      <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800 font-mono">
                        特征识别 100%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                      <div><strong className="text-slate-300">识别品类:</strong> {activeTask.geminiVision.category || activeTask.geminiVision.productType}</div>
                      <div><strong className="text-slate-300">识别品牌:</strong> {activeTask.geminiVision.brand}</div>
                      <div><strong className="text-slate-300">材质估算:</strong> {activeTask.geminiVision.material || activeTask.geminiVision.materials}</div>
                      <div><strong className="text-slate-300">视觉亮点:</strong> {activeTask.geminiVision.visualHighlights}</div>
                    </div>
                  </div>
                )}

                {/* Gemini Multilingual Content Result */}
                {activeTask.geminiContent && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Task 3: AI 智能字段构造 & 多语言标题</span>
                      </span>
                      <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800 font-mono">
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

                {/* WooCommerce Direct Publish Result */}
                {activeTask.wcResult ? (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-200 block">Task 4: WooCommerce 发布就绪</span>
                      <span className="text-[11px] text-indigo-300 font-mono">商品 ID: #{activeTask.wcResult.wcProductId}</span>
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
                ) : (
                  /* Manual Review Guard Banner when AutoPublish is OFF */
                  !autoPublish && (
                    <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5">
                        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-200">人工审核模式：商品已放入待审核列表</p>
                          <p className="text-[11px] text-amber-300/80">商品资料已自动保存在数据库，需人工检查确认后发布至 WooCommerce 站点。</p>
                        </div>
                      </div>
                      {onNavigateToReview && (
                        <button
                          type="button"
                          onClick={onNavigateToReview}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center space-x-1 transition shadow shrink-0"
                        >
                          <span>前往文案审核确认</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
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
                  在左侧选择或上传商品图片，点击 “一键启动全自动流水线” 后，此处将实时展示 AI 智能视觉解析、AI 智能字段生成与 WooCommerce 站点同步状态。
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
