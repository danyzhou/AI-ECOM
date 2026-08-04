import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Wand2, 
  ShoppingBag, 
  Share2, 
  ListOrdered, 
  Settings, 
  Sparkles,
  Layers,
  ArrowUpRight,
  FileCheck,
  Store
} from 'lucide-react';
import { AISettingConfig } from '../types';
import { fetchAISettings } from '../services/api';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingAuditCount: number;
  runningTasksCount: number;
  aiConfig?: AISettingConfig;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingAuditCount,
  runningTasksCount,
  aiConfig,
}) => {
  const [liveAiConfig, setLiveAiConfig] = useState<AISettingConfig | null>(aiConfig || null);

  useEffect(() => {
    if (aiConfig) {
      setLiveAiConfig(aiConfig);
    }
  }, [aiConfig]);

  useEffect(() => {
    let isMounted = true;
    const loadAi = async () => {
      try {
        const res = await fetchAISettings();
        if (isMounted && res && res.success && res.ai) {
          setLiveAiConfig(res.ai);
        }
      } catch (e) {
        // fallback to props
      }
    };
    loadAi();
    return () => { isMounted = false; };
  }, []);

  const getAiDriverInfo = () => {
    const config = liveAiConfig || aiConfig;
    const provider = config?.provider || 'gemini';
    
    let providerName = 'Google AI智能';
    let model = config?.gemini?.model || config?.geminiModel || 'gemini-2.0-flash';

    if (provider === 'groq') {
      providerName = 'Groq Cloud (极速)';
      model = config?.groq?.model || 'llama-3.3-70b-versatile';
    } else if (provider === 'siliconflow') {
      providerName = 'SiliconFlow (硅基流动)';
      model = config?.siliconflow?.model || 'deepseek-ai/DeepSeek-V3';
    } else if (provider === 'openrouter') {
      providerName = 'OpenRouter (免费通道)';
      model = config?.openrouter?.model || 'meta-llama/llama-3.3-70b-instruct:free';
    } else if (provider === 'custom') {
      model = config?.custom?.model || 'gemini-2.0-flash';
      return {
        title: '当前 AI 驱动引擎',
        displayText: `当前驱动：自定义 API 中转 (${model})`
      };
    }

    return {
      title: '当前 AI 驱动引擎',
      displayText: `当前驱动：${providerName} (${model})`
    };
  };

  const aiInfo = getAiDriverInfo();
  const menuGroup = [
    {
      title: '核心控制台',
      items: [
        { id: 'dashboard', label: '控制中心 Dashboard', icon: LayoutDashboard },
        { id: 'create', label: 'AI 商品创建流水线', icon: PlusCircle, badge: 'HOT', badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
      ]
    },
    {
      title: '商品与发布中心',
      items: [
        { id: 'ai-review', label: 'AI 文案审核确认', icon: FileCheck, badge: 'AI 智能', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
        { id: 'products', label: '商品管理中心', icon: ShoppingBag, badge: pendingAuditCount > 0 ? `${pendingAuditCount}待审` : undefined, badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
        { id: 'stores', label: 'WordPress 店铺管理', icon: Store, badge: 'Stores', badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
        { id: 'woocommerce', label: '发布记录中心', icon: Share2 },
        { id: 'tasks', label: 'AI 任务队列', icon: ListOrdered, badge: runningTasksCount > 0 ? `${runningTasksCount}进行` : undefined, badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
      ]
    },
    {
      title: '系统与拓展',
      items: [
        { id: 'settings', label: '系统与 API 设置', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div className="py-4 px-3 space-y-6">
        {menuGroup.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {group.title}
            </p>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer System Info Widget */}
      <div className="p-4 m-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
        <div className="flex items-center space-x-2 text-slate-200 font-medium mb-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{aiInfo.title}</span>
        </div>
        <p className="text-[11px] text-indigo-300 font-semibold leading-relaxed mt-1">
          {aiInfo.displayText}
        </p>
        <button
          onClick={() => onSelectTab('settings')}
          className="mt-3 w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] flex items-center justify-center space-x-1 transition"
        >
          <span>查看架构配置</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
};
