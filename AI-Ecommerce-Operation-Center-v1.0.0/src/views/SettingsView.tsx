import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sparkles, 
  Database, 
  Globe, 
  Save, 
  CheckCircle2, 
  ShieldCheck,
  Bot,
  Key,
  RefreshCw,
  Hash,
  Sliders,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  Check,
  X
} from 'lucide-react';
import { AISettingConfig, WooCommerceConfig, SKUConfig } from '../types';
import { DATABASE_SCHEMA_SQL } from '../data/schema';
import { 
  fetchAISettings, 
  saveAISettings, 
  testOpenAIConnection, 
  testGeminiConnection,
  fetchSKUConfig,
  saveSKUConfig
} from '../services/api';

interface SettingsViewProps {
  aiConfig: AISettingConfig;
  wcConfig: WooCommerceConfig;
  geminiConfigured: boolean;
  onUpdateSettings: (newAi: AISettingConfig, newWc: WooCommerceConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  aiConfig: initialAi,
  wcConfig: initialWc,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'sku' | 'db' | 'roadmap'>('ai');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('设置已成功更新');

  // Show/Hide Key toggles
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // AI State
  const [aiState, setAiState] = useState<AISettingConfig>({
    provider: 'gemini',
    chatgpt: {
      apiKey: '',
      model: 'gpt-4o',
      purpose: 'image_optimization_and_vision',
      status: 'connected'
    },
    gemini: {
      apiKey: '',
      model: 'gemini-3.6-flash',
      purpose: 'product_content_and_seo',
      status: 'connected'
    },
    autoApproveReviewToggle: false,
    defaultLanguage: 'zh-CN'
  });

  // SKU State
  const [skuState, setSkuState] = useState<SKUConfig>({
    prefix: 'PERF',
    codeLength: 6,
    autoGenerate: true,
    currentSequence: 10001
  });

  // Test Connection States
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [openAITestResult, setOpenAITestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const aiRes = await fetchAISettings();
      if (aiRes.success && aiRes.ai) {
        setAiState(aiRes.ai);
      }
      const skuRes = await fetchSKUConfig();
      if (skuRes.success && skuRes.config) {
        setSkuState(skuRes.config);
      }
    } catch (e) {
      console.warn('加载 API 设置失败:', e);
    }
  };

  const handleSaveAISettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await saveAISettings(aiState);
      if (res.success) {
        setSaveSuccess(true);
        setSaveMessage('AI API 密钥与模型参数已安全完成加密保存！');
        if (res.ai) setAiState(res.ai);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: any) {
      alert('保存 AI 设置失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSKUSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await saveSKUConfig(skuState);
      if (res.success) {
        setSaveSuccess(true);
        setSaveMessage('SKU 编号规则与格式配置已成功保存！');
        if (res.config) setSkuState(res.config);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: any) {
      alert('保存 SKU 设置失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestOpenAI = async () => {
    setTestingOpenAI(true);
    setOpenAITestResult(null);
    try {
      const res = await testOpenAIConnection({
        apiKey: aiState.chatgpt.apiKey,
        model: aiState.chatgpt.model
      });
      setOpenAITestResult(res);
    } catch (err: any) {
      setOpenAITestResult({
        success: false,
        message: 'OpenAI 测试发生错误: ' + err.message
      });
    } finally {
      setTestingOpenAI(false);
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await testGeminiConnection({
        apiKey: aiState.gemini.apiKey,
        model: aiState.gemini.model
      });
      setGeminiTestResult(res);
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        message: 'Gemini 测试发生错误: ' + err.message
      });
    } finally {
      setTestingGemini(false);
    }
  };

  // Generate SKU preview string
  const skuPreview = `${skuState.prefix || 'PERF'}-${String(skuState.currentSequence || 10001).padStart(skuState.codeLength || 6, '0')}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
            <Settings className="w-4 h-4" />
            <span>AI SERVICES & SYSTEM CONFIGURATION</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">AI API 设置与系统参数</h2>
          <p className="text-xs text-slate-400 mt-1">
            统一云端 API 引擎架构：托管控制 OpenAI ChatGPT (Vision 视觉) 与 Google Gemini (文案与 SEO) 连接规则。
          </p>
        </div>

        {activeTab === 'ai' && (
          <button
            onClick={handleSaveAISettings}
            disabled={saving}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition shrink-0 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? '保存中...' : '保存 AI API 设置'}</span>
          </button>
        )}

        {activeTab === 'sku' && (
          <button
            onClick={handleSaveSKUSettings}
            disabled={saving}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition shrink-0 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? '保存中...' : '保存 SKU 设置'}</span>
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{saveMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'ai' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI API Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('sku')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'sku' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>SKU 设置</span>
        </button>

        <button
          onClick={() => setActiveTab('db')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'db' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>数据库 Schema 设计</span>
        </button>

        <button
          onClick={() => setActiveTab('roadmap')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'roadmap' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>多店铺矩阵 Roadmap</span>
        </button>
      </div>

      {/* Tab 1: AI API Settings */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OpenAI ChatGPT Module */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">ChatGPT API (OpenAI)</h3>
                  <p className="text-[10px] text-slate-400">图像视觉理解 / 抠图需求分析 / 处理指令</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-full">
                Vision API
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Purpose Banner */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-400 font-medium block text-[11px]">系统应用用途:</span>
                <p className="text-slate-200 leading-relaxed text-[11px]">
                  1. 商品图片视觉特征分析<br />
                  2. 图像优化与去水印需求识别<br />
                  3. 自动生成图片算法处理指令
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                  <span>OpenAI API Key</span>
                  <span className="text-[10px] text-slate-500">加密储存 · 不明文显示</span>
                </label>
                <div className="relative">
                  <input
                    type={showOpenAIKey ? "text" : "password"}
                    value={aiState.chatgpt.apiKey}
                    onChange={(e) => setAiState({
                      ...aiState,
                      chatgpt: { ...aiState.chatgpt, apiKey: e.target.value }
                    })}
                    placeholder="sk-..."
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Choice */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">GPT Vision 模型选择</label>
                <select
                  value={aiState.chatgpt.model}
                  onChange={(e) => setAiState({
                    ...aiState,
                    chatgpt: { ...aiState.chatgpt, model: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="gpt-4o">gpt-4o (推荐: 极速多模态高清视觉理解)</option>
                  <option value="gpt-4o-mini">gpt-4o-mini (经济型轻量视觉解析)</option>
                  <option value="gpt-4-vision-preview">gpt-4-vision-preview (专业图像处理)</option>
                </select>
              </div>

              {/* Test Connection Button */}
              <button
                type="button"
                onClick={handleTestOpenAI}
                disabled={testingOpenAI}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {testingOpenAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>正在连接测试 OpenAI API...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>测试 OpenAI API 连接</span>
                  </>
                )}
              </button>

              {/* Test Result Box */}
              {openAITestResult && (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                  openAITestResult.success 
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
                    : 'bg-rose-950/80 border-rose-800 text-rose-300'
                }`}>
                  <div className="flex items-center space-x-1.5 font-bold">
                    {openAITestResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>{openAITestResult.message}</span>
                  </div>
                  {openAITestResult.details && (
                    <div className="text-[10px] opacity-80 font-mono mt-1 pt-1 border-t border-slate-800">
                      模型: {openAITestResult.details.model} | 响应: {openAITestResult.details.sampleReply}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Google Gemini Module */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Gemini API (Google AI)</h3>
                  <p className="text-[10px] text-slate-400">多语言文案生成 / SEO优化 / 格式化 JSON</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full">
                Content Engine
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Purpose Banner */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-400 font-medium block text-[11px]">系统应用用途:</span>
                <p className="text-slate-200 leading-relaxed text-[11px]">
                  1. 多语言高转化率商品标题生成<br />
                  2. WooCommerce HTML 详情与营销卖点<br />
                  3. 多国语言 SEO Keywords 与 Slug 构造
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                  <span>Gemini API Key</span>
                  <span className="text-[10px] text-slate-500">加密储存 · 不明文显示</span>
                </label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={aiState.gemini.apiKey}
                    onChange={(e) => setAiState({
                      ...aiState,
                      gemini: { ...aiState.gemini, apiKey: e.target.value }
                    })}
                    placeholder="AIzaSy..."
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Choice */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Gemini 模型选择</label>
                <select
                  value={aiState.gemini.model}
                  onChange={(e) => setAiState({
                    ...aiState,
                    gemini: { ...aiState.gemini, model: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="gemini-3.6-flash">gemini-3.6-flash (推荐: 最新版极速电商生成)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (标准低延迟文本处理)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (深度多语种商品创作)</option>
                </select>
              </div>

              {/* Test Connection Button */}
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={testingGemini}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {testingGemini ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>正在连接测试 Gemini API...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>测试 Gemini API 连接</span>
                  </>
                )}
              </button>

              {/* Test Result Box */}
              {geminiTestResult && (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                  geminiTestResult.success 
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
                    : 'bg-rose-950/80 border-rose-800 text-rose-300'
                }`}>
                  <div className="flex items-center space-x-1.5 font-bold">
                    {geminiTestResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>{geminiTestResult.message}</span>
                  </div>
                  {geminiTestResult.details && (
                    <div className="text-[10px] opacity-80 font-mono mt-1 pt-1 border-t border-slate-800">
                      模型: {geminiTestResult.details.model} | 响应: {geminiTestResult.details.sampleReply}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SKU Settings */}
      {activeTab === 'sku' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Hash className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-white text-sm">SKU 编号生成规则配置 (SKU Settings)</h3>
                <p className="text-[10px] text-slate-400">管理电商流水线生成商品时的 SKU 前缀、自增位数与手动修改控制</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 text-xs">
              {/* SKU Prefix */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">SKU 编号前缀 (SKU Prefix)</label>
                <input
                  type="text"
                  value={skuState.prefix}
                  onChange={(e) => setSkuState({ ...skuState, prefix: e.target.value.toUpperCase() })}
                  placeholder="e.g. PERF, ECOM, ITEM"
                  className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 uppercase"
                />
                <p className="text-[10px] text-slate-500 mt-1">前缀用于标识店铺或品牌分类，默认例如 "PERF"</p>
              </div>

              {/* Code Length */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">自增数字位数 (Code Length)</label>
                <select
                  value={skuState.codeLength}
                  onChange={(e) => setSkuState({ ...skuState, codeLength: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value={4}>4 位数 (如 PERF-0001)</option>
                  <option value={6}>6 位数 (如 PERF-010001 - 推荐)</option>
                  <option value={8}>8 位数 (如 PERF-00010001)</option>
                </select>
              </div>

              {/* Auto Generate Toggle Switch */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">自动生成 SKU 编号</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">开启后 AI 流水线创建新商品时将依照规则自动分配</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSkuState({ ...skuState, autoGenerate: !skuState.autoGenerate })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                    skuState.autoGenerate ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                </button>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs mb-2">
                  <Sliders className="w-4 h-4" />
                  <span>实时 SKU 编号预览 (Live Preview)</span>
                </div>
                <div className="p-4 bg-slate-900 border border-indigo-500/30 rounded-xl text-center space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-sans">示例生成的下一个 SKU</span>
                  <p className="text-xl font-mono font-bold text-indigo-300 tracking-wider">{skuPreview}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="text-slate-300 font-semibold flex items-center space-x-1">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>支持手动修改规则说明</span>
                </p>
                <p className="leading-relaxed">
                  除流水线自动生成外，管理员可在<strong className="text-slate-200">商品编辑页面</strong>随时对任意商品的 SKU 进行手动自定义覆盖与唯一性校验。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Database Schema */}
      {activeTab === 'db' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-white text-sm">SQLite / PostgreSQL DDL 数据库表结构设计</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">7 核心数据表</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 h-96 overflow-y-auto">
            <pre>{DATABASE_SCHEMA_SQL}</pre>
          </div>
        </div>
      )}

      {/* Tab 4: Multi-Store Roadmap */}
      {activeTab === 'roadmap' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="pb-2 border-b border-slate-800">
            <h3 className="font-semibold text-white text-sm">WordPress WooCommerce 多店铺扩展架构</h3>
            <p className="text-xs text-slate-400 mt-0.5">多独立站全向刊登中心架构指南：</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[
              { name: '多 WooCommerce 店铺矩阵', desc: '支持配置无限个独立站 Consumer Key & Secret，独立密钥安全加密存储', status: '已实现 (Active)' },
              { name: '一键多站同步刊登', desc: 'Gemini 生成商品与 SKU 校验后，支持同时勾选多个 WordPress 店铺分发发布', status: '已实现 (Active)' },
              { name: 'Publishing Center 状态监控', desc: '实时记录各店铺商品上传状态、WordPress 商品 ID 与错误诊察日志', status: '已实现 (Active)' },
              { name: '多国站点独立加密配置', desc: '美洲站、欧洲站、拉美站等不同 URL 对应独立的加密 REST API 凭据', status: '已实现 (Active)' },
            ].map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{item.name}</h4>
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded font-semibold">{item.status}</span>
                </div>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
