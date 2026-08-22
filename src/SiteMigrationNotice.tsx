import React, { useState } from 'react';
import { 
  ExternalLink, 
  MessageCircle, 
  Phone, 
  Copy, 
  Check, 
  MapPin, 
  ShieldAlert, 
  ArrowRight, 
  Globe,
  Sparkles,
  Info
} from 'lucide-react';
import { NWCLogo } from './components/NWCLogo';

export const SiteMigrationNotice: React.FC = () => {
  const newSiteUrl = 'https://interactive-maps-8do.pages.dev/';
  const phoneNumber = '0561698865';
  const internationalPhone = '966561698865';
  const whatsappUrl = `https://wa.me/${internationalPhone}?text=${encodeURIComponent('مرحباً، بخصوص الاستفسار عن نظام الخرائط التفاعلية والرابط الجديد.')}`;

  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(newSiteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div 
      dir="rtl" 
      className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 md:p-10 select-none font-sans"
    >
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <NWCLogo />
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              نظام الخرائط التفاعلية الموحد
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-300 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span>تنبيه هام بالنقل</span>
        </div>
      </header>

      {/* Main Container Card */}
      <main className="relative z-10 w-full max-w-2xl my-auto py-8 sm:py-12">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-blue-950/50 text-center relative overflow-hidden">
          
          {/* Top highlight gradient strip */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400"></div>

          {/* Icon Badge */}
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-400/30 rounded-3xl flex items-center justify-center mb-6 shadow-inner relative group">
            <Globe className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400 animate-pulse" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1.5 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
            تم انتقال الموقع إلى الرابط الجديد
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg mx-auto mb-8 font-medium">
            نود إحاطتكم بأنه تم ترقية وتحديث نظام الخرائط التفاعلية بالكامل ونقله بشكل دائم إلى المنصة المحدثة الجديدة.
          </p>

          {/* New URL Action Box */}
          <div className="bg-slate-950/80 border-2 border-blue-500/40 hover:border-blue-400/70 transition-all rounded-2xl p-4 sm:p-5 mb-6 text-right relative group shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                الرابط المعتمد الجديد:
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-xs flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="نسخ الرابط"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold text-[11px]">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">نسخ الرابط</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center sm:text-right font-mono text-emerald-400 font-extrabold text-sm sm:text-base break-all select-all py-1" dir="ltr">
              {newSiteUrl}
            </div>
          </div>

          {/* Main Redirect Button */}
          <a
            href={newSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold text-base sm:text-lg px-6 py-4 rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer mb-8"
          >
            <span>الدخول إلى الموقع الجديد مباشرة</span>
            <ExternalLink className="w-5 h-5" />
          </a>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-4 text-slate-400 font-bold">
                للتواصل والدعم الفني
              </span>
            </div>
          </div>

          {/* Contact Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Direct WhatsApp Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-3.5 rounded-xl shadow-md hover:shadow-emerald-600/30 transition-all cursor-pointer group"
            >
              <MessageCircle className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              <span>محادثة واتساب مباشرة</span>
            </a>

            {/* Direct Phone Call Button */}
            <a
              href={`tel:${phoneNumber}`}
              className="flex items-center justify-center gap-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm px-4 py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
            >
              <Phone className="w-5 h-5 text-blue-400" />
              <span dir="ltr" className="font-mono tracking-wide">{phoneNumber}</span>
              <span className="text-xs text-slate-400 font-normal">(اتصال)</span>
            </a>
          </div>

          {/* Additional note */}
          <div className="mt-8 bg-blue-950/40 border border-blue-800/40 rounded-xl p-3.5 text-right flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              يرجى تحديث الروابط المحفوظة لديكم (Bookmarks) واستخدام الرابط الجديد لضمان الوصول لكافة الميزات والخرائط المحدثة.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl text-center py-4 text-xs text-slate-500 border-t border-slate-800/60">
        <p>© {new Date().getFullYear()} نظام الخرائط التفاعلية • جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
};
