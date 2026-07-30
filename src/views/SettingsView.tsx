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
  X,
  FileText
} from 'lucide-react';
import { AISettingConfig, WooCommerceConfig, SKUConfig } from '../types';
import { DATABASE_SCHEMA_SQL } from '../data/schema';
import { 
  fetchAISettings, 
  saveAISettings, 
  testGeminiConnection,
  testAIProviderConnection,
  fetchSKUConfig,
  saveSKUConfig,
  fetchSystemLogs,
  clearSystemLogs
} from '../services/api';

const CUSTOM_PRESET_MODELS = [
  'gpt-5.3-codex-spark',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.5',
  'gpt-5.6-luna',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-image-2'
];

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
  const [activeTab, setActiveTab] = useState<'ai' | 'sku' | 'logs' | 'db' | 'roadmap'>('ai');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterType, setLogFilterType] = useState<string>('');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('设置已成功更新');

  // Show/Hide Key toggles
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // AI State
  const [aiState, setAiState] = useState<AISettingConfig>({
    provider: 'gemini',
    gemini: {
      apiKey: '',
      model: 'gemini-2.0-flash',
      purpose: 'vision_analysis_and_content_generation',
      status: 'connected'
    },
    groq: {
      apiKey: '',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      status: 'disconnected'
    },
    siliconflow: {
      apiKey: '',
      baseUrl: 'https://api.siliconflow.cn/v1',
      model: 'deepseek-ai/DeepSeek-V3',
      status: 'disconnected'
    },
    openrouter: {
      apiKey: '',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'google/gemma-2-9b-it:free',
      status: 'disconnected'
    },
    custom: {
      apiKey: '',
      baseUrl: 'http://localhost:8000/v1',
      model: 'gemini-2.0-flash',
      status: 'disconnected'
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
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetchSystemLogs({
        type: logFilterType || undefined,
        status: logFilterStatus || undefined,
        limit: 100
      });
      if (res.success && res.logs) {
        setLogs(res.logs);
      }
    } catch (e) {
      console.warn('加载系统日志失败:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('确定要清空所有系统日志吗？')) {
      try {
        await clearSystemLogs();
        setLogs([]);
      } catch (e: any) {
        alert('清空日志失败: ' + e.message);
      }
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, logFilterType, logFilterStatus]);

  useEffect(() => {
    if (initialAi && initialAi.provider) {
      setAiState(prev => ({
        ...prev,
        ...initialAi,
        custom: {
          ...(prev.custom || { apiKey: '', baseUrl: 'http://localhost:8000/v1', model: 'gemini-2.0-flash' }),
          ...(initialAi.custom || {})
        }
      }));
    }
  }, [initialAi]);

  const loadSettings = async () => {
    try {
      const aiRes = await fetchAISettings();
      if (aiRes.success && aiRes.ai) {
        setAiState(prev => ({
          ...prev,
          ...aiRes.ai,
          custom: {
            ...(prev.custom || { apiKey: '', baseUrl: 'http://localhost:8000/v1', model: 'gemini-2.0-flash' }),
            ...(aiRes.ai.custom || {})
          }
        }));
        onUpdateSettings(aiRes.ai, initialWc);
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
        setSaveMessage('AI API 密钥、中转参数与模型设置已成功持久化保存！');
        const updatedAi = res.ai || aiState;
        setAiState(updatedAi);
        onUpdateSettings(updatedAi, initialWc);
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

  const formatApiError = (rawErr: any): string => {
    if (!rawErr) return 'AI API 节点通信异常';

    let str = '';
    if (typeof rawErr === 'string') {
      str = rawErr;
    } else if (rawErr?.error) {
      str = typeof rawErr.error === 'string' ? rawErr.error : JSON.stringify(rawErr.error);
    } else if (rawErr?.message) {
      str = typeof rawErr.message === 'string' ? rawErr.message : JSON.stringify(rawErr.message);
    } else {
      try {
        str = JSON.stringify(rawErr);
      } catch {
        str = String(rawErr);
      }
    }

    if (
      str.includes('404') ||
      str.includes('unavailable for free') ||
      str.includes('No model') ||
      str.includes('not found') ||
      str.includes('not_found') ||
      str.includes('No endpoint') ||
      str.includes('失效或转为付费版') ||
      rawErr?.status === 404 ||
      rawErr?.code === 404
    ) {
      return '⚠️ 该免费模型已失效或转为付费版，请在下拉菜单中切换为其他最新的 :free 免费模型。';
    }

    if (
      str.includes('429') ||
      str.includes('RESOURCE_EXHAUSTED') ||
      str.includes('ResourceExhausted') ||
      str.includes('Quota exceeded') ||
      rawErr?.status === 429 ||
      rawErr?.code === 429 ||
      rawErr?.statusCode === 429
    ) {
      return '⚠️ API 触发速率或配额限制 (429 Resource Exhausted)。免费账户请求过于频繁，请等待约 1 分钟后重试，或检查 Google Cloud 计费设置。';
    }

    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      if (typeof rawErr === 'object' && rawErr !== null) {
        try {
          return JSON.stringify(rawErr, null, 2);
        } catch {
          return str;
        }
      }
      return str;
    }
  };

  const handleTestAI = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    const provider = aiState.provider || 'gemini';
    const configToTest = (aiState as any)[provider] || aiState.gemini;

    try {
      const res = await testAIProviderConnection(provider, {
        apiKey: configToTest.apiKey,
        baseUrl: configToTest.baseUrl,
        model: configToTest.model
      });
      if (res && res.success) {
        setGeminiTestResult({
          success: true,
          message: res.message || `${provider.toUpperCase()} 云端 API 节点连通测试成功`
        });

        // Automatically persist and synchronize AI config on successful test
        try {
          const saveRes = await saveAISettings(aiState);
          if (saveRes && saveRes.success) {
            const updatedAi = saveRes.ai || aiState;
            setAiState(updatedAi);
            onUpdateSettings(updatedAi, initialWc);
          } else {
            onUpdateSettings(aiState, initialWc);
          }
        } catch (saveErr) {
          console.warn('测试成功后自动保存配置提示:', saveErr);
        }
      } else {
        const errorDetail = res?.error || res?.message || res || `${provider.toUpperCase()} API 通信失败`;
        setGeminiTestResult({
          success: false,
          message: formatApiError(errorDetail)
        });
      }
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        message: formatApiError(err?.message || err)
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
            统一云端 API 引擎架构：托管控制 AI 智能引擎 (视觉解析、商品文案生成与 SEO 优化) 连接规则。
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
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'logs' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>系统日志 & 诊察 (System Logs)</span>
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
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">云端 AI 驱动提供商选择 (API Providers)</h3>
                  <p className="text-xs text-slate-400">选择并配置云端免费 AI API 服务商，全自动驱动视觉识别与商品生成</p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full">
                当前: {aiState.provider.toUpperCase()}
              </span>
            </div>

            {/* Provider Selector Cards Grid */}
            <div>
              <label className="block text-slate-300 font-medium mb-3 text-xs">请选择 AI 驱动引擎服务商:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Gemini */}
                <button
                  type="button"
                  onClick={() => setAiState({ ...aiState, provider: 'gemini' })}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                    aiState.provider === 'gemini'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-indigo-300">Google Gemini</span>
                    {aiState.provider === 'gemini' && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">官方免费极速多模态, 每日高额 API 调配</span>
                </button>

                {/* Groq */}
                <button
                  type="button"
                  onClick={() => setAiState({ ...aiState, provider: 'groq' })}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                    aiState.provider === 'groq'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-cyan-300">Groq Cloud</span>
                    {aiState.provider === 'groq' && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">云端 LPU 极速推理, 支持 Llama-3.3-70B</span>
                </button>

                {/* SiliconFlow */}
                <button
                  type="button"
                  onClick={() => setAiState({ ...aiState, provider: 'siliconflow' })}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                    aiState.provider === 'siliconflow'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-purple-300">SiliconFlow</span>
                    {aiState.provider === 'siliconflow' && <Check className="w-4 h-4 text-purple-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">硅基流动免费额度, DeepSeek-V3 / Qwen2.5</span>
                </button>

                {/* OpenRouter */}
                <button
                  type="button"
                  onClick={() => setAiState({ ...aiState, provider: 'openrouter' })}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                    aiState.provider === 'openrouter'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-emerald-300">OpenRouter</span>
                    {aiState.provider === 'openrouter' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">免费通道聚合 (:free), 覆盖 Llama / R1</span>
                </button>

                {/* Custom API Proxy (AIClient2API) */}
                <button
                  type="button"
                  onClick={() => setAiState({ ...aiState, provider: 'custom' })}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                    aiState.provider === 'custom'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-amber-300">自定义 API 中转</span>
                    {aiState.provider === 'custom' && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">AIClient2API / OpenAI 兼容接口</span>
                </button>
              </div>
            </div>

            {/* Provider Dynamic Config Fields */}
            <div className="space-y-5 text-xs">
              {/* Gemini Config */}
              {aiState.provider === 'gemini' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                      <span>Gemini API Key (Google AI Studio 免费层)</span>
                      <span className="text-[10px] text-slate-500">免 Google Cloud Project / 免绑定信用卡</span>
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
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
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

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Gemini 免费模型选择</label>
                    <select
                      value={aiState.gemini.model}
                      onChange={(e) => setAiState({
                        ...aiState,
                        gemini: { ...aiState.gemini, model: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      <option value="gemini-2.0-flash">gemini-2.0-flash (官方推荐: 最新极速多模态)</option>
                      <option value="gemini-1.5-flash">gemini-1.5-flash (免费层高效: 标准多模态)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro (高级推理: 深度多语种)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Groq Config */}
              {aiState.provider === 'groq' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Groq Base URL</label>
                    <input
                      type="text"
                      value={aiState.groq?.baseUrl || 'https://api.groq.com/openai/v1'}
                      onChange={(e) => setAiState({
                        ...aiState,
                        groq: { ...(aiState.groq || { apiKey: '', model: 'llama-3.3-70b-versatile' }), baseUrl: e.target.value }
                      })}
                      placeholder="https://api.groq.com/openai/v1"
                      className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                      <span>Groq API Key (极速云端)</span>
                      <span className="text-[10px] text-slate-500">Groq Console 免费申请</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showGeminiKey ? "text" : "password"}
                        value={aiState.groq?.apiKey || ''}
                        onChange={(e) => setAiState({
                          ...aiState,
                          groq: { ...(aiState.groq || { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' }), apiKey: e.target.value }
                        })}
                        placeholder="gsk_..."
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
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

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Groq 模型选择</label>
                    <select
                      value={aiState.groq?.model || 'llama-3.3-70b-versatile'}
                      onChange={(e) => setAiState({
                        ...aiState,
                        groq: { ...(aiState.groq || { apiKey: '', baseUrl: 'https://api.groq.com/openai/v1' }), model: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (推荐: 极速 70B 开源旗帜)</option>
                      <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Mixtral 8x7B 混合专家)</option>
                    </select>
                  </div>
                </>
              )}

              {/* SiliconFlow Config */}
              {aiState.provider === 'siliconflow' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">SiliconFlow Base URL</label>
                    <input
                      type="text"
                      value={aiState.siliconflow?.baseUrl || 'https://api.siliconflow.cn/v1'}
                      onChange={(e) => setAiState({
                        ...aiState,
                        siliconflow: { ...(aiState.siliconflow || { apiKey: '', model: 'deepseek-ai/DeepSeek-V3' }), baseUrl: e.target.value }
                      })}
                      placeholder="https://api.siliconflow.cn/v1"
                      className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                      <span>SiliconFlow (硅基流动) API Key</span>
                      <span className="text-[10px] text-slate-500">注册赠送免费额度</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showGeminiKey ? "text" : "password"}
                        value={aiState.siliconflow?.apiKey || ''}
                        onChange={(e) => setAiState({
                          ...aiState,
                          siliconflow: { ...(aiState.siliconflow || { baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' }), apiKey: e.target.value }
                        })}
                        placeholder="sk-..."
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
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

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">SiliconFlow 模型选择</label>
                    <select
                      value={aiState.siliconflow?.model || 'deepseek-ai/DeepSeek-V3'}
                      onChange={(e) => setAiState({
                        ...aiState,
                        siliconflow: { ...(aiState.siliconflow || { apiKey: '', baseUrl: 'https://api.siliconflow.cn/v1' }), model: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      <option value="deepseek-ai/DeepSeek-V3">deepseek-ai/DeepSeek-V3 (推荐: 云端 DeepSeek-V3)</option>
                      <option value="Qwen/Qwen2.5-72B-Instruct">Qwen/Qwen2.5-72B-Instruct (通义千问 72B 旗舰)</option>
                    </select>
                  </div>
                </>
              )}

              {/* OpenRouter Config */}
              {aiState.provider === 'openrouter' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">OpenRouter Base URL</label>
                    <input
                      type="text"
                      value={aiState.openrouter?.baseUrl || 'https://openrouter.ai/api/v1'}
                      onChange={(e) => setAiState({
                        ...aiState,
                        openrouter: { ...(aiState.openrouter || { apiKey: '', model: 'google/gemma-2-9b-it:free' }), baseUrl: e.target.value }
                      })}
                      placeholder="https://openrouter.ai/api/v1"
                      className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                      <span>OpenRouter API Key</span>
                      <span className="text-[10px] text-slate-500">OpenRouter 免费 API 密钥</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showGeminiKey ? "text" : "password"}
                        value={aiState.openrouter?.apiKey || ''}
                        onChange={(e) => setAiState({
                          ...aiState,
                          openrouter: { ...(aiState.openrouter || { baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemma-2-9b-it:free' }), apiKey: e.target.value }
                        })}
                        placeholder="sk-or-v1-..."
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
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

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">OpenRouter 免费通道模型选择</label>
                    <select
                      value={aiState.openrouter?.model || 'google/gemma-2-9b-it:free'}
                      onChange={(e) => setAiState({
                        ...aiState,
                        openrouter: { ...(aiState.openrouter || { apiKey: '', baseUrl: 'https://openrouter.ai/api/v1' }), model: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      <option value="google/gemma-2-9b-it:free">google/gemma-2-9b-it:free (Google Gemma 9B 免费版)</option>
                      <option value="qwen/qwen-2.5-72b-instruct:free">qwen/qwen-2.5-72b-instruct:free (通义千问 72B 免费版)</option>
                      <option value="deepseek/deepseek-r1:free">deepseek/deepseek-r1:free (DeepSeek R1 思考免费版)</option>
                      <option value="mistralai/mistral-7b-instruct:free">mistralai/mistral-7b-instruct:free (Mistral 7B 免费版)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Custom API Proxy (AIClient2API) Config */}
              {aiState.provider === 'custom' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                      <span>中转站 Base URL</span>
                      <span className="text-[10px] text-slate-500">示例: http://your-vps-ip:8000/v1 或 https://api.yourdomain.com/v1</span>
                    </label>
                    <input
                      type="text"
                      value={aiState.custom?.baseUrl || 'http://localhost:8000/v1'}
                      onChange={(e) => setAiState({
                        ...aiState,
                        custom: { ...(aiState.custom || { apiKey: '', model: 'gemini-2.0-flash' }), baseUrl: e.target.value }
                      })}
                      placeholder="http://your-vps-ip:8000/v1"
                      className="w-full px-3 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                      <span>API Key (Auth Token / Bearer Key)</span>
                      <span className="text-[10px] text-slate-500">在中转服务侧设置的 Auth Token</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showGeminiKey ? "text" : "password"}
                        value={aiState.custom?.apiKey || ''}
                        onChange={(e) => setAiState({
                          ...aiState,
                          custom: { ...(aiState.custom || { baseUrl: 'http://localhost:8000/v1', model: 'gemini-2.0-flash' }), apiKey: e.target.value }
                        })}
                        placeholder="sk-..."
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs"
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

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
                      <span>模型选择 (Model Name / Slug)</span>
                      <span className="text-[10px] text-slate-500">直接在输入框中编辑或点击下方快捷标签填充</span>
                    </label>
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={aiState.custom?.model || 'gpt-5.5'}
                        onChange={(e) => setAiState({
                          ...aiState,
                          custom: { ...(aiState.custom || { apiKey: '', baseUrl: 'http://localhost:8000/v1' }), model: e.target.value }
                        })}
                        placeholder="手动输入模型名称如 gpt-5.5"
                        className="w-full px-3.5 py-2.5 bg-slate-950 text-white border border-slate-800 rounded-xl font-mono focus:outline-none focus:border-indigo-500 text-xs shadow-inner"
                      />
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1.5 font-medium">快捷模型标签栏 (Model Tags):</div>
                        <div className="flex flex-wrap gap-1.5">
                          {CUSTOM_PRESET_MODELS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setAiState({
                                ...aiState,
                                custom: { ...(aiState.custom || { apiKey: '', baseUrl: 'http://localhost:8000/v1' }), model: m }
                              })}
                              className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition cursor-pointer ${
                                aiState.custom?.model === m
                                  ? 'bg-amber-950 text-amber-300 border-amber-700 font-semibold shadow-sm'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons: Save & Test Connection */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAISettings}
                  disabled={saving}
                  className="flex-1 w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition disabled:opacity-50 text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? '正在保存 API 配置...' : '保存 API 配置'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestAI}
                  disabled={testingGemini}
                  className="flex-1 w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition disabled:opacity-50 text-xs"
                >
                  {testingGemini ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>正在测试 {aiState.provider.toUpperCase()} 连通性...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>测试 {aiState.provider.toUpperCase()} 节点连通性</span>
                    </>
                  )}
                </button>
              </div>

              {/* Test Result Box */}
              {geminiTestResult && (
                <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  geminiTestResult.success 
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
                    : 'bg-rose-950/80 border-rose-800 text-rose-300'
                }`}>
                  <div className="flex items-start space-x-2 font-medium">
                    {geminiTestResult.success ? (
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    ) : (
                      <X className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                    )}
                    <pre className="whitespace-pre-wrap font-mono break-all leading-relaxed text-[11px] overflow-x-auto max-h-60 font-medium">
                      {geminiTestResult.message || (geminiTestResult.success ? 'API 节点通信正常' : 'API 节点通信异常')}
                    </pre>
                  </div>
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

      {/* Tab: System Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-white text-sm">系统 API 与调用诊察日志 (System Logs)</h3>
                <p className="text-[10px] text-slate-400">记录 AI 智能和 WooCommerce REST API 真实交互与耗时分析</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={loadLogs}
                disabled={loadingLogs}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center space-x-1 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>刷新日志</span>
              </button>

              <button
                type="button"
                onClick={handleClearLogs}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/80 transition"
              >
                <span>清空日志</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">日志类型</label>
              <select
                value={logFilterType}
                onChange={(e) => setLogFilterType(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg focus:outline-none"
              >
                <option value="">全部类型 (All Types)</option>
                <option value="gemini_vision">AI 智能 Vision</option>
                <option value="gemini_content">AI 智能 Content</option>
                <option value="woocommerce_publish">WooCommerce Publish</option>
                <option value="store_sync">Store Sync</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 text-[10px] block mb-1">执行状态</label>
              <select
                value={logFilterStatus}
                onChange={(e) => setLogFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg focus:outline-none"
              >
                <option value="">全部状态 (All Status)</option>
                <option value="success">成功 (Success)</option>
                <option value="failed">失败 (Failed)</option>
              </select>
            </div>
          </div>

          {/* Logs List */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[300px]">
            {logs.length > 0 ? (
              <div className="divide-y divide-slate-800/60 max-h-[450px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-slate-900/50 transition space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          log.status === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {log.status}
                        </span>
                        <span className="font-mono font-bold text-slate-200">{log.type}</span>
                        {log.elapsed_ms && (
                          <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-900">
                            {log.elapsed_ms}ms
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-sans leading-relaxed">{log.message}</p>

                    {log.error_details && (
                      <div className="p-2 bg-rose-950/40 border border-rose-900/50 rounded text-[11px] font-mono text-rose-300 mt-1">
                        错误追踪: {log.error_details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                {loadingLogs ? '正在加载系统诊察日志...' : '暂无符合条件的诊察日志'}
              </div>
            )}
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
              { name: '一键多站同步刊登', desc: 'AI 智能生成商品与 SKU 校验后，支持同时勾选多个 WordPress 店铺分发发布', status: '已实现 (Active)' },
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
