import React, { useState } from 'react';
import { 
  Sparkles, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Globe,
  Mail,
  UserPlus,
  LogIn,
  AlertCircle
} from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<'admin' | 'operations'>('operations');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const data = await loginUser(loginUsername, loginPassword);
      if (data.success) {
        if (rememberMe) {
          localStorage.setItem('ecom_remember_user', loginUsername);
        }
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.error || '登录失败：用户名或密码无效');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '登录异常，请检查后端网络');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regUsername || !regEmail || !regPassword) {
      setErrorMsg('请完整填写所有必填字段');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('密码长度不能小于 6 位字符');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('两次输入的密码不一致，请核对');
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser({
        username: regUsername,
        name: regName || regUsername.toUpperCase(),
        email: regEmail,
        password: regPassword,
        role: regRole,
      });

      if (data.success) {
        setSuccessMsg('账号注册成功！正在为您自动登录系统...');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 800);
      } else {
        setErrorMsg(data.error || '注册失败');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '注册过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Side: Brand & Value Highlights */}
        <div className="md:col-span-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-lg text-white tracking-tight">AI ECOM ASSISTANT</h2>
                <p className="text-xs text-indigo-300 font-medium">AI电商自动运营后台系统</p>
              </div>
            </div>

            <div className="space-y-5 my-6">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">一键商品视觉 & 文案自动生成</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    多模态 AI 驱动，自动去除水印、生成高清白底图与多语言 SEO 标题描述。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">WordPress WooCommerce 自动同步</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    调取 REST API，实时将商品、变体、多图与库存无缝直发布到独立站。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">密码加密 & JWT Session 安全鉴权</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    支持加密口令存储、角色权限隔离（Admin / Operator）与接口拦截防护。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Enterprise Auth Engine v2.5</span>
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>安全鉴权中心就绪</span>
            </span>
          </div>
        </div>

        {/* Right Side: Tab Switch & Forms */}
        <div className="md:col-span-7 p-8 lg:p-10 flex flex-col justify-center">
          {/* Tabs header */}
          <div className="flex items-center space-x-2 p-1 bg-slate-950/80 border border-slate-800/80 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>用户登录</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>注册新账号</span>
            </button>
          </div>

          {/* Feedback banners */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  用户名 / 账号
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="请输入用户名 (如: admin)"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  登录密码
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>记住登录 Session 状态</span>
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-indigo-400 hover:underline text-[11px]"
                >
                  没有账号？点击注册
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <span>正在验证身份凭证...</span>
                ) : (
                  <>
                    <span>登录后台系统</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    用户名 <span className="text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="设置登录用户名"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    用户昵称/姓名
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="例: 张经理"
                    className="w-full px-3 py-2 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  电子邮箱 <span className="text-indigo-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@ecom-ai.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    设置密码 <span className="text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="至少 6 位字符"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    确认密码 <span className="text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="再次输入密码"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  选择账号权限角色
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('operations')}
                    className={`p-2 border rounded-xl text-left transition ${
                      regRole === 'operations'
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">运营专员 (Operator)</div>
                    <div className="text-[10px] text-slate-400">日常商品上架 & AI处理</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('admin')}
                    className={`p-2 border rounded-xl text-left transition ${
                      regRole === 'admin'
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">超级管理员 (Admin)</div>
                    <div className="text-[10px] text-slate-400">完全权限 & 系统设置</div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <span>密码加密与注册处理中...</span>
                ) : (
                  <>
                    <span>创建新用户并登录</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

