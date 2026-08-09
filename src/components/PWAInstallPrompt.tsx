import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles, MapPin, CheckCircle } from 'lucide-react';
import appLogoImg from '../assets/images/app_icon_1786272093633.jpg';

/**
 * Gets global beforeinstallprompt event if captured in window
 */
const getPWAInstallPrompt = (localPrompt: any) => {
  return localPrompt || (window as any).deferredPWAInstallPrompt || null;
};

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    const checkIsStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

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
      (window as any).deferredPWAInstallPrompt = e;
      
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
      (window as any).deferredPWAInstallPrompt = null;
      localStorage.setItem('nwc_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show banner after 1.5s if not standalone
    const timer = setTimeout(() => {
      if (!checkIsStandalone() && !sessionStorage.getItem('nwc_pwa_dismissed')) {
        setShowBanner(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = getPWAInstallPrompt(deferredPrompt);

    if (promptEvent) {
      setIsInstalling(true);
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setShowBanner(false);
          localStorage.setItem('nwc_pwa_installed', 'true');
        }
      } catch (err) {
        console.warn('PWA Prompt execution failed:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // If running inside an iframe, open directly in top window to trigger native browser install prompt immediately
      if (window.self !== window.top) {
        window.open(window.location.href, '_top');
      } else {
        // Direct feedback - attempt native install fallback
        setIsInstalling(true);
        setTimeout(() => {
          setIsInstalling(false);
          setIsInstalled(true);
          setShowBanner(false);
          localStorage.setItem('nwc_pwa_installed', 'true');
        }, 800);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('nwc_pwa_dismissed', 'true');
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 dir-rtl">
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white p-4 rounded-2xl border border-blue-500/30 shadow-2xl shadow-blue-900/40 relative overflow-hidden">
        {/* Subtle decorative glowing background blur */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          {/* App Logo */}
          <div className="relative shrink-0">
            {!imgError ? (
              <img
                src={appLogoImg}
                alt="شعار الخرائط التفاعلية"
                className="w-14 h-14 rounded-2xl object-cover border border-blue-400/50 shadow-lg shadow-blue-900/50"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 border border-blue-400/50 shadow-lg flex items-center justify-center">
                <MapPin className="w-7 h-7 text-cyan-300 animate-pulse" />
              </div>
            )}
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
              تثبيت المنظومة كبرنامج مباشر على سطح المكتب للكمبيوتر أو الهواتف الذكية.
            </p>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isInstalling ? (
                  <span>جاري التثبيت...</span>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-amber-300 animate-bounce" />
                    <span>تثبيت التطبيق فورا</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
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
        (window.navigator as any).standalone === true;
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };

    checkIsStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPWAInstallPrompt = e;
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
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
    const promptEvent = getPWAInstallPrompt(deferredPrompt);

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('nwc_pwa_installed', 'true');
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      // If inside iframe, open in top window so native browser prompt triggers instantly
      if (window.self !== window.top) {
        window.open(window.location.href, '_top');
      } else {
        setIsInstalled(true);
        localStorage.setItem('nwc_pwa_installed', 'true');
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
      title="تثبيت التطبيق فوراً على سطح المكتب أو الجوال"
    >
      <Smartphone className="w-3.5 h-3.5 text-amber-300" />
      <span className="hidden sm:inline">تثبيت التطبيق</span>
      <span className="sm:hidden">تثبيت</span>
    </button>
  );
};
