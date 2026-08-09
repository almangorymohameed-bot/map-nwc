import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle, Sparkles } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    const checkIsStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem('nwc_pwa_installed') === 'true';

      if (isStandaloneMode) {
        setIsInstalled(true);
        setShowBanner(false);
        return true;
      }
      return false;
    };

    if (checkIsStandalone()) return;

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user dismissed it in this session
      const dismissedSession = sessionStorage.getItem('nwc_pwa_dismissed');
      if (!dismissedSession) {
        setShowBanner(true);
      }
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      localStorage.setItem('nwc_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show prompt after a short delay even if beforeinstallprompt is handled or on supported mobile browsers
    const timer = setTimeout(() => {
      if (!checkIsStandalone() && !sessionStorage.getItem('nwc_pwa_dismissed')) {
        setShowBanner(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setShowBanner(false);
          localStorage.setItem('nwc_pwa_installed', 'true');
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
      }
    } else {
      // Clear multi-platform installation instructions
      alert(
        '💻 لتثبيت التطبيق على الكمبيوتر (Chrome / Edge):\n' +
        '• انقر على أيقونة التثبيت ⊕ في شريط العنوان أعلى المتصفح، أو انقر القائمة (⋮) ثم اختر "تثبيت تطبيق الخرائط التفاعلية".\n\n' +
        '📱 لتثبيت التطبيق على الجوال:\n' +
        '• خيارات المتصفح -> "إضافة إلى الشاشة الرئيسية" / "تثبيت التطبيق".'
      );
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('nwc_pwa_dismissed', 'true');
  };

  // If already installed or banner hidden, do not render
  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white p-4 rounded-2xl border border-blue-500/30 shadow-2xl shadow-blue-900/40 relative overflow-hidden">
        {/* Subtle decorative glowing background blur */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          {/* App Logo */}
          <div className="relative shrink-0">
            <img
              src="/app-logo.png"
              alt="شعار الخرائط التفاعلية"
              className="w-14 h-14 rounded-xl object-cover border border-blue-400/40 shadow-md"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback icon if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow">
              <Sparkles className="w-3 h-3" />
            </div>
          </div>

          {/* Banner Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>تثبيت تطبيق الخرائط التفاعلية</span>
              </h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="إغلاق الإشعار"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              يمكنكم الآن تثبيت الموقع كتطبيق على أجهزة الكمبيوتر (Windows/Mac) أو الهواتف للوصول السريع والعمل بسلاسة بدون انقطاع.
            </p>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-blue-500/2 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isInstalling ? (
                  <span>جاري التثبيت...</span>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                    <span>تثبيت التطبيق الآن</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PWAInstallHeaderButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const checkIsStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        localStorage.getItem('nwc_pwa_installed') === 'true';
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };

    checkIsStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem('nwc_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
        <span>التطبيق مثبت</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('nwc_pwa_installed', 'true');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      alert(
        '💻 لتثبيت التطبيق على الكمبيوتر (Chrome / Edge):\n' +
        '• انقر على أيقونة التثبيت ⊕ في شريط العنوان أعلى المتصفح، أو اختر من القائمة (⋮) "تثبيت تطبيق الخرائط التفاعلية".\n\n' +
        '📱 لتثبيت التطبيق على الجوال:\n' +
        '• من قائمة المتصفح اختر "إضافة إلى الشاشة الرئيسية".'
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
      title="تثبيت التطبيق على جهازك"
    >
      <Smartphone className="w-3.5 h-3.5 text-amber-300" />
      <span className="hidden sm:inline">تثبيت التطبيق</span>
      <span className="sm:hidden">تثبيت</span>
    </button>
  );
};
