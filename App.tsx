import React, { useState, useEffect } from 'react';
import { Layout, POS, Inventory, Dashboard, Customers, Settings, Suppliers, Login, SearchHub } from './components';
import { Product, Sale, Customer, AppSettings, Language, Supplier, User, CartItem } from './types';
import { translations } from './i18n';

const INITIAL_SETTINGS: AppSettings = {
  storeName: 'MATJARI | متجري',
  storeSubtitle: 'نظام إدارة المبيعات الذكي',
  taxRate: 0,
  currency: 'MAD',
  language: Language.AR,
  receiptLanguage: Language.AR,
  theme: 'dark',
  receiptSize: 'thermal',
  printerConfig: {
    fontSize: 12,
    density: 'medium',
    autoCut: true
  },
  enableCamera: true,
  enableHIDScanner: true,
  pointsSystemEnabled: true,
  loyaltyRate: 1,
  minPointsForVoucher: 100,
  security: {
    confirmDeleteInventory: true,
    confirmDeleteCustomers: true,
    confirmDeleteSuppliers: true,
    confirmDeleteUsers: true,
    adminPasswordRequiredForReset: true,
    autoBackupBeforeReset: true,
    maxBackupFiles: 5
  },
  autoDetectLanguage: false,
  interfaceLanguage: Language.AR
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('users');
      return saved ? JSON.parse(saved) : [
        { id: 'admin_1', username: 'admin', role: 'admin', password: 'admin', language: Language.AR },
        { id: 'seller_1', username: 'seller', role: 'seller', password: 'seller', language: Language.AR }
      ];
    } catch {
      return [
        { id: 'admin_1', username: 'admin', role: 'admin', password: 'admin', language: Language.AR },
        { id: 'seller_1', username: 'seller', role: 'seller', password: 'seller', language: Language.AR }
      ];
    }
  });

  const [activeTab, setActiveTab] = useState('pos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('products');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('suppliers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem('sales');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('customers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.autoDetectLanguage) {
          parsed.autoDetectLanguage = false;
        }
        if (!parsed.interfaceLanguage) {
          parsed.interfaceLanguage = parsed.language || Language.AR;
        }
        return { ...INITIAL_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return INITIAL_SETTINGS;
  });

  const [isSavingSale, setIsSavingSale] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  // تأثير تغيير اللغة والاتجاه
  useEffect(() => {
    // اكتشاف اللغة تلقائياً إذا كان مفعلاً
    if (settings.autoDetectLanguage && !localStorage.getItem('languageDetected')) {
      const browserLang = navigator.language.split('-')[0];
      let detectedLang = Language.AR;

      if (browserLang === 'en' || browserLang === 'EN') {
        detectedLang = Language.EN;
      } else if (browserLang === 'fr' || browserLang === 'FR') {
        detectedLang = Language.FR;
      }

      setSettings(prev => ({
        ...prev,
        language: detectedLang,
        interfaceLanguage: detectedLang
      }));
      localStorage.setItem('languageDetected', 'true');
    }

    // تغيير اتجاه الصفحة بناءً على اللغة
    if (settings.interfaceLanguage === Language.AR) {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = settings.interfaceLanguage;
    }

    // تغيير فونت الخط بناءً على اللغة
    const style = document.createElement('style');
    if (settings.interfaceLanguage === Language.AR) {
      style.innerHTML = `
      * { font-family: 'Cairo', sans-serif; }
      `;
    } else if (settings.interfaceLanguage === Language.FR) {
      style.innerHTML = `
      * { font-family: 'Inter', 'Segoe UI', sans-serif; }
      `;
    } else {
      style.innerHTML = `
      * { font-family: 'Inter', 'Segoe UI', sans-serif; }
      `;
    }

    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [settings.interfaceLanguage, settings.autoDetectLanguage]);

  // تأثير تغيير السمة
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = "#0a0f1a";
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = "#f8fafc";
    }
  }, [settings.theme]);

  // تأثير تحميل لغة المستخدم عند الدخول
  useEffect(() => {
    if (currentUser?.language) {
      setSettings(prev => ({
        ...prev,
        language: currentUser.language!,
        interfaceLanguage: currentUser.language!
      }));
    }
  }, [currentUser]);

  const saveDataToStorage = (data: {
    products?: Product[];
    sales?: Sale[];
    customers?: Customer[];
    suppliers?: Supplier[];
    users?: User[];
    currentUser?: User | null;
  }): boolean => {
    try {
      if (data.products) {
        const productsStr = JSON.stringify(data.products);
        localStorage.setItem('products', productsStr);
      }

      if (data.sales) {
        const salesStr = JSON.stringify(data.sales);
        localStorage.setItem('sales', salesStr);
      }

      if (data.customers) {
        const customersStr = JSON.stringify(data.customers);
        localStorage.setItem('customers', customersStr);
      }

      if (data.suppliers) {
        localStorage.setItem('suppliers', JSON.stringify(data.suppliers));
      }

      if (data.users) {
        localStorage.setItem('users', JSON.stringify(data.users));
      }

      if (data.currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(data.currentUser));
      }

      return true;
    } catch (error: any) {
      console.error('❌ خطأ في حفظ البيانات:', error);
      setSaveError(`${translations[settings.interfaceLanguage].connection_error || 'خطأ تقني'}: ${error.message || translations[settings.interfaceLanguage].data_save_failed || 'فشل الوصول إلى التخزين'}`);
      return false;
    }
  };

  // حفظ الإعدادات عند تغييرها
  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!isSavingSale && !saleComplete && currentUser) {
      saveDataToStorage({ products, sales, customers, suppliers, users });
    }
  }, [products, sales, customers, suppliers, users, isSavingSale, saleComplete, currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setActiveTab('pos');
  };

  const handleToggleTheme = () => {
    setSettings(s => ({...s, theme: s.theme === 'dark' ? 'light' : 'dark'}));
  };

  const handleLogin = (user: User, selectedLanguage: Language) => {
    const updatedUser = { ...user, language: selectedLanguage };
    setCurrentUser(updatedUser);

    // تحديث إعدادات اللغة
    setSettings(prev => ({
      ...prev,
      language: selectedLanguage,
      interfaceLanguage: selectedLanguage
    }));

    saveDataToStorage({ currentUser: updatedUser });
  };

  const handleCompleteSale = async (sale: Sale): Promise<boolean> => {
    console.log('🚀 بدء حفظ عملية البيع رقم:', sale.id);
    setIsSavingSale(true);
    setSaveError('');

    try {
      const updatedSales = [...sales, sale];

      const updatedProducts = products.map(p => {
        const soldItem = sale.items.find(item => item.id === p.id);
        if (soldItem) {
          const newStock = Math.max(0, p.stock - soldItem.quantity);
          return { ...p, stock: newStock };
        }
        return p;
      });

      let updatedCustomers = customers;
      if (sale.customerId && settings.pointsSystemEnabled && sale.pointsInfo) {
        updatedCustomers = customers.map(c => {
          if (c.id === sale.customerId) {
            return {
              ...c,
              totalSpent: c.totalSpent + sale.total,
              points: sale.pointsInfo!.newTotal
            };
          }
          return c;
        });
      }

      const saveSuccess = saveDataToStorage({
        products: updatedProducts,
        sales: updatedSales,
        customers: updatedCustomers
      });

      if (!saveSuccess) {
        throw new Error(translations[settings.interfaceLanguage].data_save_failed || 'فشل حفظ البيانات في التخزين المحلي');
      }

      setSales(updatedSales);
      setProducts(updatedProducts);
      if (sale.customerId && settings.pointsSystemEnabled && sale.pointsInfo) {
        setCustomers(updatedCustomers);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const finalCheck = saveDataToStorage({
        products: updatedProducts,
        sales: updatedSales,
        customers: updatedCustomers
      });

      if (!finalCheck) {
        throw new Error(translations[settings.interfaceLanguage].data_verification_failed || 'فشل التحقق النهائي للحفظ');
      }

      console.log('✅ تم حفظ عملية البيع رقم', sale.id);

      setLastSaleId(sale.id);
      setIsSavingSale(false);
      setSaleComplete(true);
      return true;

    } catch (error: any) {
      console.error('❌ خطأ في حفظ عملية البيع:', error);
      setSaveError(`${translations[settings.interfaceLanguage].data_save_failed || 'فشل حفظ البيانات'}: ${error.message}`);
      setIsSavingSale(false);

      try {
        const savedProducts = localStorage.getItem('products');
        const savedSales = localStorage.getItem('sales');
        const savedCustomers = localStorage.getItem('customers');

        if (savedProducts) setProducts(JSON.parse(savedProducts));
        if (savedSales) setSales(JSON.parse(savedSales));
        if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
      } catch (restoreError) {
        console.error('❌ فشل استعادة البيانات:', restoreError);
      }

      return false;
    }
  };

  const startNewSale = () => {
    setCart([]);
    setSaleComplete(false);
    setLastSaleId('');
    setSaveError('');
  };

  const handleResetSystem = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (currentUser?.role !== 'admin') {
        alert(`${translations[settings.interfaceLanguage].operation_failed || 'فشلت العملية'}: ${translations[settings.interfaceLanguage].admin_only || 'هذه العملية مسموحة فقط لمدير النظام'}`);
        resolve(false);
        return;
      }

      const confirmation = window.confirm(
        '⚠️ ' + translations[settings.interfaceLanguage].important_warning + ':\n' +
        translations[settings.interfaceLanguage].reset_warning + '\n' +
      translations[settings.interfaceLanguage].continue_confirmation
      );

      if (!confirmation) {
        resolve(false);
        return;
      }

      const adminPassword = prompt(
        '🔒 ' + translations[settings.interfaceLanguage].security_prompt
      );

      const adminUser = users.find(user => user.role === 'admin');
      if (!adminUser || adminPassword !== adminUser.password) {
        alert('❌ ' + translations[settings.interfaceLanguage].wrong_password + '. ' + translations[settings.interfaceLanguage].operation_cancelled);
        resolve(false);
        return;
      }

      try {
        const backupData = {
          timestamp: new Date().toISOString(),
                       products,
                       sales,
                       customers,
                       suppliers,
                       users,
                       settings,
                       createdBy: currentUser.username
        };

        const backupStr = JSON.stringify(backupData, null, 2);
        const backupBlob = new Blob([backupStr], { type: 'application/json' });
        const backupUrl = URL.createObjectURL(backupBlob);

        const downloadLink = document.createElement('a');
        downloadLink.href = backupUrl;
        downloadLink.download = `matjari-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setTimeout(() => {
          const finalConfirmation = window.confirm(
            '✅ ' + translations[settings.interfaceLanguage].backup_saved + '.\n' +
            translations[settings.interfaceLanguage].system_reset_warning + '\n' +
          translations[settings.interfaceLanguage].final_confirmation
          );

          if (finalConfirmation) {
            localStorage.clear();
            alert('🔄 ' + translations[settings.interfaceLanguage].system_reset_success);
            window.location.reload();
            resolve(true);
          } else {
            alert('✅ ' + translations[settings.interfaceLanguage].operation_cancelled + '. ' + translations[settings.interfaceLanguage].data_preserved);
            resolve(false);
          }
        }, 1000);

      } catch (error) {
        console.error('❌ ' + translations[settings.interfaceLanguage].backup_error + ':', error);
        alert('❌ ' + translations[settings.interfaceLanguage].backup_failed + '. ' + translations[settings.interfaceLanguage].operation_cancelled);
        resolve(false);
      }
    });
  };

  const handleDataImport = (d: any) => {
    if(d.products) {
      setProducts(d.products);
      saveDataToStorage({ products: d.products });
    }
    if(d.customers) {
      setCustomers(d.customers);
      saveDataToStorage({ customers: d.customers });
    }
    if(d.suppliers) {
      setSuppliers(d.suppliers);
      saveDataToStorage({ suppliers: d.suppliers });
    }
    if(d.settings) {
      setSettings(d.settings);
      localStorage.setItem('settings', JSON.stringify(d.settings));
    }
    if(d.sales) {
      setSales(d.sales);
      saveDataToStorage({ sales: d.sales });
    }
    if(d.users) {
      setUsers(d.users);
      saveDataToStorage({ users: d.users });
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleNavigateToTab = (tab: string, itemId?: string) => {
    setActiveTab(tab);
    if (itemId) {
      // تخزين العنصر المحدد للانتقال إليه في المكون الهدف
      setTimeout(() => {
        localStorage.setItem('selectedItem', itemId);
        // إشعار للمكون الهدف أن هناك عنصر محدد
        window.dispatchEvent(new CustomEvent('itemSelected', { detail: { itemId } }));
      }, 100);
    }
  };

  // دالة لجلب الزبائن الأكثر شراءً
  const getTopCustomers = () => {
    return [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);
  };

  // دالة لجلب المنتجات الأكثر مبيعاً
  const getTopProducts = () => {
    const productSales: Record<string, { product: Product, quantity: number, revenue: number }> = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.id]) {
          const product = products.find(p => p.id === item.id);
          if (product) {
            productSales[item.id] = {
              product,
              quantity: 0,
              revenue: 0
            };
          }
        }
        if (productSales[item.id]) {
          productSales[item.id].quantity += item.quantity;
          productSales[item.id].revenue += item.price * item.quantity;
        }
      });
    });

    return Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  };

  // دالة لجلب المنتجات التي يشتريها زبون معين
  const getCustomerProducts = (customerId: string) => {
    const customerSales = sales.filter(s => s.customerId === customerId);
    const productMap: Record<string, { product: Product, quantity: number }> = {};

    customerSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productMap[item.id]) {
          const product = products.find(p => p.id === item.id);
          if (product) {
            productMap[item.id] = {
              product,
              quantity: 0
            };
          }
        }
        if (productMap[item.id]) {
          productMap[item.id].quantity += item.quantity;
        }
      });
    });

    return Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity);
  };

  if (!currentUser) return <Login users={users} onLogin={handleLogin} initialLanguage={settings.interfaceLanguage} />;

  const t = translations[settings.interfaceLanguage];

  return (
    <Layout
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    settings={settings}
    currentUser={currentUser}
    t={t}
    >
    {activeTab === 'pos' && (
      <>
      {isSavingSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 max-w-md w-full mx-4 text-center shadow-2xl">
        <div className="mb-6">
        <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
        {t.saving}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
        {t.processing}
        </p>
        </div>
        <div className="space-y-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-primary w-3/4 animate-pulse"></div>
        </div>
        <p className="text-xs text-gray-500">{t.loading}</p>
        </div>
        </div>
        </div>
      )}

      {(saleComplete || saveError) && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        style={{backgroundColor: saveError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)'}}>
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="mb-6">
        {saveError ? (
          <>
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-2">
          ❌ {t.error}
          </h3>
          <p className="text-gray-600 mb-2">{saveError}</p>
          </>
        ) : (
          <>
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-2">
          ✅ {t.success}
          </h3>
          <p className="text-gray-600 mb-2">{t.data_saved}</p>
          <p className="text-sm text-gray-500 mb-4">
          {t.invoice_number}: #{lastSaleId}
          </p>
          </>
        )}
        </div>

        <button
        onClick={startNewSale}
        className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-xl"
        >
        {saveError ? t.retry : t.start_new_sale}
        </button>
        </div>
        </div>
      )}

      <POS
      products={products}
      cart={cart}
      setCart={setCart}
      onCompleteSale={handleCompleteSale}
      settings={settings}
      customers={customers}
      currentUser={currentUser}
      onNavigateToSale={() => setActiveTab('search')}
      isSaving={isSavingSale}
      saleComplete={saleComplete}
      onStartNewSale={startNewSale}
      saveError={saveError}
      t={t}
      />
      </>
    )}

    {activeTab === 'inventory' && (
      <Inventory
      products={products}
      setProducts={setProducts}
      suppliers={suppliers}
      settings={settings}
      currentUser={currentUser}
      t={t}
      />
    )}

    {activeTab === 'suppliers' && (
      <Suppliers
      suppliers={suppliers}
      setSuppliers={setSuppliers}
      settings={settings}
      currentUser={currentUser}
      t={t}
      onNavigateToInventory={() => handleNavigateToTab('inventory')}
      />
    )}

    {activeTab === 'dashboard' && (
      <Dashboard
      sales={sales}
      products={products}
      customers={customers}
      suppliers={suppliers}
      settings={settings}
      currentUser={currentUser}
      onDataImport={handleDataImport}
      users={users}
      onNavigateToTab={handleNavigateToTab}
      t={t}
      // تمرير الدوال الجديدة للإحصائيات
      getTopCustomers={getTopCustomers}
      getTopProducts={getTopProducts}
      getCustomerProducts={getCustomerProducts}
      />
    )}

    {activeTab === 'customers' && (
      <Customers
      customers={customers}
      setCustomers={setCustomers}
      settings={settings}
      currentUser={currentUser}
      t={t}
      />
    )}

    {activeTab === 'search' && (
      <SearchHub
      products={products}
      customers={customers}
      sales={sales}
      suppliers={suppliers}
      settings={settings}
      onAddToCart={addToCart}
      onNavigateToTab={handleNavigateToTab}
      t={t}
      />
    )}

    {activeTab === 'settings' && (
      <Settings
      settings={settings}
      setSettings={setSettings}
      users={users}
      setUsers={setUsers}
      currentUser={currentUser}
      onUpdateCurrentUser={setCurrentUser}
      onLogout={handleLogout}
      onResetSystem={handleResetSystem}
      products={products}
      sales={sales}
      customers={customers}
      suppliers={suppliers}
      t={t}
      />
    )}
    </Layout>
  );
};

export default App;
