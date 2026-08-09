import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles, MapPin, CheckCircle, Share, PlusSquare, Monitor, HelpCircle, ArrowUpRight, Laptop } from 'lucide-react';
import appLogoImg from '../assets/images/app_icon_1786272093633.jpg';

/**
 * Retrieves the deferred PWA installation prompt event from window scope or local state
 */
const getPWAInstallPrompt = (localPrompt: any) => {
  return localPrompt || (window as any).deferredPWAInstallPrompt || null;
};

// Device & Browser environment helpers
const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const isAndroid = () => {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

const isInIframe = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'desktop' | 'android' | 'ios'>('desktop');
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    // Set default guide tab based on device
    if (isIOS()) setActiveTab('ios');
    else if (isAndroid()) setActiveTab('android');
    else setActiveTab('desktop');

    // Check if app is running in standalone mode (already installed PWA)
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

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPWAInstallPrompt = e;
      
      if (!sessionStorage.getItem('nwc_pwa_dismissed')) {
        setShowBanner(true);
      }
    };

    // Listen for actual OS installation event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setShowGuideModal(false);
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
      localStorage.setItem('nwc_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Auto show installation banner after 1s if not standalone
    const timer = setTimeout(() => {
      if (!checkIsStandalone() && !sessionStorage.getItem('nwc_pwa_dismissed')) {
        setShowBanner(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    // 1. If running inside an iframe (like AI Studio preview), browser BLOCKS native install prompts.
    if (isInIframe()) {
      setStatusMessage('تنبيه: لتثبيت التطبيق على جهازك، يجب فتح الموقع بتبويب مستقل خارج المعاينة.');
      setShowGuideModal(true);
      return;
    }

    // 2. iOS Safari handling (Safari doesn't support beforeinstallprompt)
    if (isIOS()) {
      setActiveTab('ios');
      setShowGuideModal(true);
      return;
    }

    // 3. Android / Desktop Chrome & Edge native prompt
    const promptEvent = getPWAInstallPrompt(deferredPrompt);

    if (promptEvent) {
      setIsInstalling(true);
      setStatusMessage('جاري تشغيل نافذة تثبيت النظام المباشرة...');
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setShowBanner(false);
          localStorage.setItem('nwc_pwa_installed', 'true');
          setStatusMessage('');
        } else {
          setStatusMessage('تم إلغاء التثبيت من قبل المستخدم');
          setTimeout(() => setStatusMessage(''), 3000);
        }
      } catch (err) {
        console.warn('PWA Prompt execution failed:', err);
        setShowGuideModal(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Browser native prompt event not triggered yet -> Show precise interactive installation guide
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('nwc_pwa_dismissed', 'true');
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 dir-rtl">
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white p-4 rounded-2xl border border-blue-500/40 shadow-2xl shadow-blue-900/50 relative overflow-hidden">
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
                تثبيت المنظومة كبرنامج مباشر وآيقونة مستقيمة على الكمبيوتر أو الهواتف الذكية.
              </p>

              {statusMessage && (
                <div className="mt-2 p-2 bg-blue-950/80 border border-blue-500/40 rounded-xl text-[11px] text-cyan-300 font-semibold leading-relaxed animate-in fade-in duration-200">
                  {statusMessage}
                </div>
              )}

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
                      <span>تثبيت التطبيق الآن</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="px-2.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  title="دليل التثبيت"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">التعليمات</span>
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

      {/* Guide Modal for Desktop / Android / iOS Manual Installation */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200 dir-rtl">
          <div className="bg-slate-900 border border-blue-500/40 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 border border-blue-400/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-lg">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">طريقة تثبيت تطبيق الخرائط</h3>
                <p className="text-xs text-slate-400">خطوات تثبيت التطبيق بآيقونة مستقيمة على جهازك</p>
              </div>
            </div>

            {/* Device Tabs */}
            <div className="flex bg-slate-950/60 p-1 rounded-2xl border border-slate-800 mb-4 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'desktop'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>الكمبيوتر</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>أندرويد</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Share className="w-3.5 h-3.5" />
                <span>آيفون (iOS)</span>
              </button>
            </div>

            {/* Tab Instructions Content */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 text-xs text-slate-200 leading-relaxed space-y-3">
              {isInIframe() && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs font-medium leading-relaxed mb-2">
                  <strong>ملاحظة هامة:</strong> أنت تعاين الموقع داخل نافذة معزولة. اضغط على <strong>"فتح بتبويب جديد للتثبيت"</strong> أدناه لتفعيل زر التثبيت المباشر بالمتصفح!
                </div>
              )}

              {activeTab === 'desktop' && (
                <>
                  <div className="font-semibold text-amber-300 text-sm mb-1 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    <span>تثبيت التطبيق على الكمبيوتر (Windows / Mac)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">1</span>
                    <span>افتح رابط الموقع بمتصفح <strong>Google Chrome</strong> أو <strong>Microsoft Edge</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">2</span>
                    <span>اضغط على أيقونة التثبيت <strong>(⊕)</strong> الموجودة أعلى شريط العنوان بجوار رابط الموقع، أو خيارات القائمة <strong>(⋮)</strong> ثم اختر <strong>"تثبيت الخرائط التفاعلية"</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">3</span>
                    <span>اضغط <strong>"تثبيت" (Install)</strong> وسيتم إضافة اختصار مباشر برمز التطبيق على سطح المكتب وفائقة السرعة!</span>
                  </div>
                </>
              )}

              {activeTab === 'android' && (
                <>
                  <div className="font-semibold text-amber-300 text-sm mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>تثبيت التطبيق على أندرويد (Android)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">1</span>
                    <span>افتح الموقع بمتصفح <strong>Google Chrome</strong> للجوال.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">2</span>
                    <span>اضغط على قائمة الخيارات <strong>(⋮)</strong> في أعلى المتصفح.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">3</span>
                    <span>اختر <strong>"تثبيت التطبيق"</strong> أو <strong>"الإضافة إلى الشاشة الرئيسية"</strong>.</span>
                  </div>
                </>
              )}

              {activeTab === 'ios' && (
                <>
                  <div className="font-semibold text-amber-300 text-sm mb-1 flex items-center gap-1.5">
                    <Share className="w-4 h-4 text-blue-400" />
                    <span>تثبيت التطبيق على آيفون / آيباد (Safari)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">1</span>
                    <span>افتح الموقع باستخدام متصفح <strong>Safari</strong> الرسمي.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">2</span>
                    <span>اضغط على زر <strong>المشاركة (Share ⎕↑)</strong> في أسفل شاشة Safari.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">3</span>
                    <span>اختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong> ثم اضغط <strong>"إضافة"</strong>.</span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowGuideModal(false);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform"
              >
                <span>فتح بتبويب مستقل للتثبيت</span>
                <ArrowUpRight className="w-4 h-4 text-amber-300" />
              </button>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
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
    if (isInIframe()) {
      window.open(window.location.href, '_blank');
      return;
    }

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
      window.open(window.location.href, '_blank');
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
