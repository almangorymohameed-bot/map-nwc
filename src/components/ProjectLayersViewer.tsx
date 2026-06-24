/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { getEmbeddableMapUrl } from '../data/initialProjects';
import { 
  Droplet, 
  Waves, 
  Globe, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Lock, 
  Share2,
  CheckCircle2,
  Compass
} from 'lucide-react';

interface ProjectLayersViewerProps {
  currentUser: User;
}

export function ProjectLayersViewer({ currentUser }: ProjectLayersViewerProps) {
  const [activeLayer, setActiveLayer] = useState<'water' | 'sewage'>('water');
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Check custom permissions (default to true if not explicitly set to false)
  const canOpenExternalLinks = currentUser.canOpenExternalLinks !== false;

  const layers = {
    water: {
      title: 'مشاريع المياه بالقطاع الأوسط',
      url: 'https://www.google.com/maps/d/edit?hl=ar&mid=1hrnowKe74j1S5v2l_gSWIQ3iwVjJjr4&ll=24.702632565864192%2C46.65687544661741&z=10',
      description: 'مخطط طبقة شبكات مياه الشرب، خطوط النقل، الخزانات الاستراتيجية، ومحطات الضخ المغذية للقطاع الأوسط.',
      color: 'blue'
    },
    sewage: {
      title: 'مشاريع الصرف الصحي بالقطاع الأوسط',
      url: 'https://www.google.com/maps/d/edit?mid=13p8cYCEMXWhXBIfrfHNynb0pmCNq-Jo&ll=24.766901986769675%2C46.808473494494145&z=10',
      description: 'مخطط طبقة شبكات تجميع الصرف الصحي، خطوط الطرد الرئيسية، محطات الرفع، ومحطات المعالجة البيئية.',
      color: 'emerald'
    }
  };

  const currentLayer = layers[activeLayer];
  const embedUrl = getEmbeddableMapUrl(currentLayer.url);

  const triggerFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(currentLayer.url).then(() => {
      triggerFeedback('📋 تم نسخ رابط الطبقة للمشاركة بنجاح!');
    }).catch(() => {
      triggerFeedback('فشل نسخ رابط المشاركة.');
    });
  };

  return (
    <div 
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-white' : 'relative z-10 h-[650px]'
      }`}
    >
      {/* Header Panel */}
      <div className="bg-[#1E293B] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-5 polish-dot-grid pointer-events-none"></div>
        
        <div className="flex items-center gap-3 relative z-10 min-w-0">
          <div className={`p-2 rounded-lg text-white shrink-0 ${activeLayer === 'water' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
            {activeLayer === 'water' ? <Droplet className="h-5 w-5" /> : <Waves className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold truncate text-right">
              {currentLayer.title}
            </h4>
            <p className="text-[11px] text-slate-400 text-right truncate">
              {currentLayer.description}
            </p>
          </div>
        </div>

        {/* View mode toggle and full-screen switch */}
        <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto relative z-10 shrink-0 justify-end w-full sm:w-auto select-none">
          {/* Layer Selector */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700/60 shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => {
                if (activeLayer !== 'water') {
                  setActiveLayer('water');
                  setIsIframeLoading(true);
                }
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                activeLayer === 'water'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Droplet className="h-3 w-3" />
              <span>طبقة المياه 💧</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeLayer !== 'sewage') {
                  setActiveLayer('sewage');
                  setIsIframeLoading(true);
                }
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                activeLayer === 'sewage'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Waves className="h-3 w-3" />
              <span>طبقة الصرف 🌿</span>
            </button>
          </div>

          {/* External Links Allowed Checklist */}
          {canOpenExternalLinks ? (
            <>
              {/* Share Layer */}
              <button
                type="button"
                onClick={handleShareLink}
                title="نسخ رابط الطبقة التفصيلي للمشاركة"
                className="flex items-center gap-1 p-1.5 px-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-bold transition-all text-white cursor-pointer shrink-0 shadow-xs"
              >
                <Share2 className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <span className="hidden sm:inline">مشاركة</span>
              </button>

              {/* External Tab Opening */}
              <a
                href={currentLayer.url}
                target="_blank"
                rel="noopener noreferrer"
                title="فتح الخريطة والإحداثيات في نافذة مستقلة"
                className={`flex items-center gap-1 p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-white cursor-pointer shrink-0 shadow-xs ${
                  activeLayer === 'water' ? 'bg-blue-700 hover:bg-blue-600' : 'bg-emerald-700 hover:bg-emerald-600'
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/80" />
                <span>تبويب خارجي ↗️</span>
              </a>
            </>
          ) : (
            <div className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg border border-slate-700" title="مغلق بواسطة مدير النظام">
              <Lock className="h-3 w-3 text-rose-500" />
              <span>الروابط الخارجية معطلة</span>
            </div>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "تصغير المستعرض" : "توسيع ملء الشاشة"}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white cursor-pointer shrink-0 flex items-center justify-center"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* local notification toast inside layer panel */}
      {feedbackMessage && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-bold z-30 flex items-center justify-center gap-2 shrink-0">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Map body */}
      <div className="flex-1 bg-slate-900 relative min-h-0 overflow-hidden">
        {isIframeLoading && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-center p-6 z-20 transition-all duration-300">
            <div className="relative flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin"></div>
              <div className="w-10 h-10 rounded-full border-4 border-slate-750 border-t-emerald-500 animate-spin absolute" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
            </div>
            <h4 className="text-sm font-extrabold text-white mb-1.5">جاري جلب تفاصيل الطبقة الجغرافية التفاعلية</h4>
            <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
              يرجى الانتظار لحين معالجة البيانات الجغرافية ومطابقتها...
            </p>
          </div>
        )}

        {/* Visual Crop overlay covering the top: The top header of My Maps is pushed up by -56px and hidden by overflow-hidden */}
        <iframe
          key={activeLayer}
          src={embedUrl}
          title={currentLayer.title}
          className="absolute left-0 w-full border-0 z-0"
          style={{
            top: '-56px',
            height: 'calc(100% + 56px)'
          }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setIsIframeLoading(false)}
        ></iframe>
      </div>

      {/* Footer statistics and metadata indicators */}
      <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 font-medium shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-700">
            نوع العرض:
          </span>
          <span className="text-slate-600">
            طبقة جغرافية شاملة للقطاع الأوسط ({activeLayer === 'water' ? 'مياه شرب' : 'صرف صحي'})
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px] bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
          <Compass className="h-3.5 w-3.5 animate-spin-slow text-indigo-600" />
          <span>منظور طبقات مجمع وشامل</span>
        </div>
      </div>
    </div>
  );
}
