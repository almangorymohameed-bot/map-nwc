import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle, Sparkles, MapPin, ExternalLink, Monitor, HelpCircle } from 'lucide-react';
import appLogoImg from '../assets/images/app_icon_1786272093633.jpg';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

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
      
      // Check if user dismissed it in this session
      const dismissedSession = sessionStorage.getItem('nwc_pwa_dismissed');
      if (!dismissedSession) {
        setShowBanner(true);
      }
    };

    // Listen for appinstalled event (real browser installation confirmation)
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setShowGuideModal(false);
      setDeferredPrompt(null);
      localStorage.setItem('nwc_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show banner after a short delay if not standalone
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
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setShowBanner(false);
          localStorage.setItem('nwc_pwa_installed', 'true');
        } else {
          // User canceled native prompt
          setIsInstalling(false);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
        setShowGuideModal(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // If deferredPrompt is not captured (e.g. inside an iframe or browser requires top-level tab)
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('nwc_pwa_dismissed', 'true');
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <>
      {/* Floating Bottom Installation Banner */}
      {!isInstalled && showBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
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
                    <span>تثبيت التطبيق على سطح المكتب والجوال</span>
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
                  يمكنكم تثبيت المنظومة كبرنامج يعمل على سطح المكتب (Windows / Mac) أو الجوال لسهولة الوصول.
                </p>

                {/* Action Buttons */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isInstalling ? (
                      <span>جاري المعالجة...</span>
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
      )}

      {/* Guide Modal when direct iframe trigger is blocked or needs top-level browser tab */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-blue-500/30 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden dir-rtl">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />
            
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">طريقة تثبيت التطبيق على سطح المكتب (Desktop)</h3>
                <p className="text-xs text-slate-400">خطوات بسيطة لإضافة أيقونة التطبيق مباشرة على جهاز الكمبيوتر</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700 text-xs leading-relaxed text-slate-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <strong>الفتح في تبويب مستقل:</strong> يتطلب متصفح Chrome أو Edge فتح الموقع خارج الإطار المدمج لتفعيل زر التثبيت المباشر.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <strong>أيقونة التثبيت في شريط العنوان:</strong> ابحث عن أيقونة الكمبيوتر أو ⊕ في شريط عنوان المتصفح أعلى الشاشة واضغط <strong>"تثبيت / Install"</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <strong>أو من قائمة المتصفح (⋮):</strong> انقر القائمة الخيارات بمتصفحك ثم اختر <strong>"تثبيت تطبيق الخرائط التفاعلية"</strong> أو <strong>"حفظ ومشاركة -&gt; إنشاء اختصار على سطح المكتب"</strong>.
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <ExternalLink className="w-4 h-4 text-cyan-300" />
                <span>فتح الموقع بتبويب جديد للتثبيت المباشر</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const PWAInstallHeaderButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

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
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('nwc_pwa_installed', 'true');
        }
      } catch (err) {
        console.warn(err);
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
        title="تثبيت التطبيق على سطح المكتب أو الجوال"
      >
        <Smartphone className="w-3.5 h-3.5 text-amber-300" />
        <span className="hidden sm:inline">تثبيت التطبيق</span>
        <span className="sm:hidden">تثبيت</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-blue-500/30 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden dir-rtl">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />
            
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">تثبيت التطبيق على جهاز الكمبيوتر</h3>
                <p className="text-xs text-slate-400">خطوات إضافة التطبيق لسطح المكتب في Windows / Mac</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700 text-xs leading-relaxed text-slate-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <strong>انقر على زر الفتح بتبويب جديد:</strong> لنظام Chrome/Edge حتى تتمكن الحزمة من التشغيل خارج نافذة العرض المدمجة.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <strong>زر التثبيت المباشر ⊕:</strong> ستشاهد أيقونة التثبيت أعلى المتصفح في شريط الرابط.
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => window.open(window.location.href, '_blank')}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <ExternalLink className="w-4 h-4 text-cyan-300" />
                <span>فتح الموقع بتبويب جديد للتثبيت المباشر</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

