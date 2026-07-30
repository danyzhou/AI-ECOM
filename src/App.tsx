import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ProductCreationView } from './views/ProductCreationView';
import { ProductsListView } from './views/ProductsListView';
import { ProductEditView } from './views/ProductEditView';
import { WooCommerceSyncView } from './views/WooCommerceSyncView';
import { TaskQueueView } from './views/TaskQueueView';
import { SettingsView } from './views/SettingsView';
import { AIContentReviewView } from './views/AIContentReviewView';
import { PublishingCenterView } from './views/PublishingCenterView';
import { WordPressStoresView } from './views/WordPressStoresView';

import { Product, WooCommerceConfig, AISettingConfig, AITask, UserRole } from './types';
import { INITIAL_MOCK_PRODUCTS } from './data/mockProducts';
import { fetchAITasks, fetchSystemSettings, getSessionMe, logoutUser } from './services/api';

export default function App() {
  // Authentication State (defaults to checking session)
  const [user, setUser] = useState<{
    id: string;
    username: string;
    name: string;
    email: string;
    role: UserRole;
    avatar: string;
  } | null>(null);

  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Products Catalog State
  const [products, setProducts] = useState<Product[]>(INITIAL_MOCK_PRODUCTS);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // WooCommerce Configuration State
  const [wcConfig, setWcConfig] = useState<WooCommerceConfig>({
    siteUrl: 'https://mx-fashion-trend.com',
    consumerKey: 'ck_7d92837f6a5b4c3e2109817234567890abcdef12',
    consumerSecret: 'cs_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    status: 'connected',
    storeName: 'Global Direct WooCommerce Store',
    currency: 'USD',
  });

  // AI Configuration State
  const [aiConfig, setAiConfig] = useState<AISettingConfig>({
    provider: 'gemini',
    geminiModel: 'gemini-2.0-flash',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'llama3:8b',
    sdEndpoint: 'http://localhost:8188',
    autoApproveHighConfidence: true,
    defaultLanguage: 'zh-CN',
  });

  // AI Task Queue State
  const [tasks, setTasks] = useState<AITask[]>([]);

  // Check Session Authentication on Mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionData = await getSessionMe();
        if (sessionData && sessionData.authenticated && sessionData.user) {
          setUser(sessionData.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('Session check failed, requiring login:', err);
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // Load backend task queue & settings when user is authenticated
  const loadBackendData = async () => {
    try {
      const taskData = await fetchAITasks();
      if (taskData?.tasks) {
        setTasks(taskData.tasks);
      }
      const settingsData = await fetchSystemSettings();
      if (settingsData?.woocommerce) {
        setWcConfig(prev => ({ ...prev, ...settingsData.woocommerce }));
      }
      if (settingsData?.ai) {
        setAiConfig(prev => ({ ...prev, ...settingsData.ai }));
      }
    } catch (e) {
      console.warn("Using offline memory state:", e);
    }
  };

  useEffect(() => {
    if (user) {
      loadBackendData();
    }
  }, [user]);

  // Handlers
  const handleLoginSuccess = (userObj: any) => {
    setUser(userObj);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handleRoleChange = (role: UserRole) => {
    if (user) {
      setUser({ ...user, role });
    }
  };

  const handleProductCreated = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
  };

  const handleSaveProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('确定要删除该商品吗？')) {
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

  const handleUpdateProductImage = (productId: string, mainImage: string, whiteBgImage: string) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, mainImage, whiteBgImage } : p));
  };

  const handleBulkPublish = (productIds: string[]) => {
    setProducts(prev => prev.map(p => productIds.includes(p.id) ? { ...p, status: 'published' } : p));
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setActiveTab('edit-product');
  };

  // Loading state while checking active auth session
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-medium tracking-wide text-slate-400">系统正在验证安全凭证 Session...</p>
      </div>
    );
  }

  // If user is not logged in, render Enterprise Login Page
  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const pendingAuditCount = products.filter(p => p.status === 'pending_review' || p.status === 'ready').length;
  const runningTasksCount = tasks.filter(t => t.status === 'processing').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        user={user}
        wcConnected={wcConfig.status === 'connected'}
        activeAiProvider={aiConfig.provider}
        aiConfig={aiConfig}
        onLogout={handleLogout}
        onNavigate={(tab) => setActiveTab(tab)}
        onRoleChange={handleRoleChange}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          pendingAuditCount={pendingAuditCount}
          runningTasksCount={runningTasksCount}
          aiConfig={aiConfig}
        />

        {/* Dynamic Content View Container */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-950">
          {activeTab === 'dashboard' && (
            <DashboardView
              products={products}
              wcConfig={wcConfig}
              tasks={tasks}
              onNavigate={(tab) => setActiveTab(tab)}
              onEditProduct={handleEditProductClick}
            />
          )}

          {activeTab === 'create' && (
            <ProductCreationView
              onProductCreated={handleProductCreated}
              onNavigateToEdit={handleEditProductClick}
              onNavigateToTasks={() => setActiveTab('tasks')}
              onNavigateToReview={() => setActiveTab('ai-review')}
            />
          )}

          {activeTab === 'ai-review' && (
            <AIContentReviewView
              products={products}
              currentProductId={editingProduct?.id}
              onSaveProduct={handleSaveProduct}
              onNavigateToWooCommerce={() => setActiveTab('woocommerce')}
            />
          )}

          {activeTab === 'products' && (
            <ProductsListView
              products={products}
              onSelectProduct={handleEditProductClick}
              onNavigateToCreate={() => setActiveTab('create')}
              onDeleteProduct={handleDeleteProduct}
              onBulkPublish={handleBulkPublish}
            />
          )}

          {activeTab === 'edit-product' && editingProduct && (
            <ProductEditView
              product={editingProduct}
              onSaveProduct={handleSaveProduct}
              onBackToList={() => setActiveTab('products')}
            />
          )}

          {activeTab === 'stores' && (
            <WordPressStoresView />
          )}

          {activeTab === 'woocommerce' && (
            <PublishingCenterView
              products={products}
              onRefreshProducts={loadBackendData}
            />
          )}


          {activeTab === 'tasks' && (
            <TaskQueueView
              tasks={tasks}
              onTasksUpdated={loadBackendData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              aiConfig={aiConfig}
              wcConfig={wcConfig}
              geminiConfigured={true}
              onUpdateSettings={(newAi, newWc) => {
                setAiConfig(newAi);
                setWcConfig(newWc);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
