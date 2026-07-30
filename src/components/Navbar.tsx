import React from 'react';
import { 
  Search, 
  Sparkles, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  User, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { UserRole, AISettingConfig } from '../types';

interface NavbarProps {
  user: { name: string; username: string; role: UserRole; avatar: string };
  wcConnected: boolean;
  activeAiProvider: string;
  aiConfig?: AISettingConfig;
  onLogout: () => void;
  onNavigate: (tab: string) => void;
  onRoleChange: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  wcConnected,
  activeAiProvider,
  aiConfig,
  onLogout,
  onNavigate,
  onRoleChange,
}) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-white px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-semibold text-base tracking-tight text-slate-100">AI ECOM ASSISTANT</h1>
            <span className="px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded">
              PRO EDITION
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">AI 电商多店铺自动化处理管理系统</p>
        </div>
      </div>

      {/* Global Quick Search Bar */}
      <div className="hidden lg:flex items-center relative w-64 xl:w-80">
        <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="搜索商品、SKU、AI任务..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-800/80 text-slate-200 border border-slate-700/80 rounded-lg focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* AI Provider Status Bar & System Indicators */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
          <span className="text-slate-400 font-semibold text-[11px] mr-1 border-r border-slate-800 pr-2">
            AI Provider 状态:
          </span>

          {/* Dynamic Active AI Provider */}
          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 hover:border-indigo-500 transition text-[11px]"
            title="AI 驱动提供商设置"
          >
            <CheckCircle2 className="w-3 h-3 text-indigo-400" />
            <span>
              {activeAiProvider === 'custom'
                ? `自定义 API 中转 (${aiConfig?.custom?.model || 'AIClient2API'})`
                : activeAiProvider === 'groq'
                ? 'Groq Cloud'
                : activeAiProvider === 'siliconflow'
                ? 'SiliconFlow'
                : activeAiProvider === 'openrouter'
                ? 'OpenRouter'
                : 'AI 智能'}
            </span>
          </button>

          {/* WooCommerce */}
          <button
            onClick={() => onNavigate('stores')}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 hover:border-emerald-500 transition text-[11px]"
            title="WooCommerce 多店铺已链接"
          >
            <Globe className="w-3 h-3 text-emerald-400" />
            <span>WooCommerce</span>
          </button>
        </div>

        {/* User Role Selector & Avatar */}
        <div className="relative group flex items-center space-x-3 pl-2 border-l border-slate-800">
          <div className="flex items-center space-x-2">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-8 h-8 rounded-full ring-2 ring-indigo-500/30 object-cover"
            />
            <div className="hidden xl:block text-left">
              <div className="text-xs font-medium text-slate-200">{user.name}</div>
              <div className="text-[10px] text-slate-400 capitalize flex items-center space-x-1">
                <span>{user.role}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </div>
            </div>
          </div>

          {/* Quick Role Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all py-1 z-50">
            <div className="px-3 py-2 border-b border-slate-800">
              <p className="text-xs font-semibold text-slate-200">{user.username}</p>
              <p className="text-[11px] text-slate-400">切换管理权限</p>
            </div>
            <button
              onClick={() => onRoleChange('admin')}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 ${user.role === 'admin' ? 'text-indigo-400 font-medium' : 'text-slate-300'}`}
            >
              <span>管理员 (Admin)</span>
              {user.role === 'admin' && <CheckCircle2 className="w-3 h-3" />}
            </button>
            <button
              onClick={() => onRoleChange('operations')}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 ${user.role === 'operations' ? 'text-indigo-400 font-medium' : 'text-slate-300'}`}
            >
              <span>运营主管 (Operations)</span>
              {user.role === 'operations' && <CheckCircle2 className="w-3 h-3" />}
            </button>
            <div className="border-t border-slate-800 mt-1 pt-1">
              <button
                onClick={onLogout}
                className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 flex items-center space-x-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
