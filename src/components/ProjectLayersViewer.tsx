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
  Package,
  Globe, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Lock, 
  Share2,
  CheckCircle2,
  Compass,
  Search,
  X,
  MapPin,
  Copy,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

interface ProjectLayersViewerProps {
  currentUser: User;
}

export function ProjectLayersViewer({ currentUser }: ProjectLayersViewerProps) {
  const isLayerAllowed = (layerId: 'water' | 'sewage' | 'materials'): boolean => {
    if (currentUser.role === 'admin') return true;
    
    // Check allowedLayers
    const uLayers = currentUser.allowedLayers || ['water', 'sewage', 'materials'];
    const isLayerInAllowedLayers = uLayers.includes('الكل') || uLayers.includes(layerId);
    
    // Check allowedScopes
    const uScopes = currentUser.allowedScopes || ['الكل'];
    let isLayerInAllowedScopes = true;
    if (!uScopes.includes('الكل')) {
      if (layerId === 'water') isLayerInAllowedScopes = uScopes.includes('مياه');
      else if (layerId === 'sewage') isLayerInAllowedScopes = uScopes.includes('صرف صحي');
      // materials is shared, so allowed if any scope is allowed or if materials layer is explicitly in allowedLayers
    }

    return isLayerInAllowedLayers && isLayerInAllowedScopes;
  };

  const [activeLayer, setActiveLayer] = useState<'water' | 'sewage' | 'materials'>(() => {
    if (isLayerAllowed('water')) return 'water';
    if (isLayerAllowed('sewage')) return 'sewage';
    if (isLayerAllowed('materials')) return 'materials';
    return 'water';
  });

  React.useEffect(() => {
    if (!isLayerAllowed(activeLayer)) {
      if (isLayerAllowed('water')) setActiveLayer('water');
      else if (isLayerAllowed('sewage')) setActiveLayer('sewage');
      else if (isLayerAllowed('materials')) setActiveLayer('materials');
    }
  }, [currentUser, currentUser.allowedLayers, currentUser.role, activeLayer]);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Search by Coordinates or Street inside Layers
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    display_name: string;
    lat: number;
    lng: number;
    isCoords: boolean;
  } | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isSearchPanelExpanded, setIsSearchPanelExpanded] = useState(false);
  const [isSearchPinVisible, setIsSearchPinVisible] = useState(true);

  // Check custom permissions (default to true if not explicitly set to false)
  const canOpenExternalLinks = currentUser.canOpenExternalLinks !== false;

  const layers = {
    water: {
      id: 'water' as const,
      title: 'مشاريع المياه بالقطاع الأوسط',
      url: 'https://www.google.com/maps/d/edit?hl=ar&mid=1hrnowKe74j1S5v2l_gSWIQ3iwVjJjr4&ll=24.702632565864192%2C46.65687544661741&z=10',
      description: 'مخطط طبقة شبكات مياه الشرب، خطوط النقل، الخزانات الاستراتيجية، ومحطات الضخ المغذية للقطاع الأوسط.',
      color: 'blue',
      badge: 'طبقة المياه 💧'
    },
    sewage: {
      id: 'sewage' as const,
      title: 'مشاريع الصرف الصحي بالقطاع الأوسط',
      url: 'https://www.google.com/maps/d/edit?mid=13p8cYCEMXWhXBIfrfHNynb0pmCNq-Jo&ll=24.766901986769675%2C46.808473494494145&z=10',
      description: 'مخطط طبقة شبكات تجميع الصرف الصحي، خطوط الطرد الرئيسية، محطات الرفع، ومحطات المعالجة البيئية.',
      color: 'emerald',
      badge: 'طبقة الصرف 🌿'
    },
    materials: {
      id: 'materials' as const,
      title: 'مواقع مواد التشوين بالقطاع الأوسط',
      url: 'https://www.google.com/maps/d/edit?mid=1xOG_18lYoUbDqJHewEHR3grDvj9H38g&usp=sharing',
      description: 'مخطط طبقة مواقع ومستودعات ومناطق مواد التشوين والمستلزمات التشغيلية بالقطاع الأوسط.',
      color: 'amber',
      badge: 'مواد التشوين 📦'
    }
  };

  const currentLayer = layers[activeLayer];
  let embedUrl = getEmbeddableMapUrl(currentLayer.url);

  if (searchResult) {
    try {
      const urlObj = new URL(embedUrl);
      urlObj.searchParams.set('ll', `${searchResult.lat},${searchResult.lng}`);
      urlObj.searchParams.set('z', '14'); // Target zoom level
      embedUrl = urlObj.toString();
    } catch (e) {
      if (embedUrl.includes('?')) {
        embedUrl += `&ll=${searchResult.lat},${searchResult.lng}&z=14`;
      } else {
        embedUrl += `?ll=${searchResult.lat},${searchResult.lng}&z=14`;
      }
    }
  }

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

  const handleCopyCoordsToClipboard = (lat: number, lng: number) => {
    const coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(coordsText).then(() => {
      triggerFeedback(`📋 تم نسخ الإحداثيات [${coordsText}]! يمكنك لصقها الآن في بحث الخريطة مدمجاً.`);
    }).catch(() => {
      triggerFeedback('فشل نسخ الإحداثيات.');
    });
  };

  const handleLayerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    setIsSearchPinVisible(true);

    const query = searchQuery.trim();
    if (!query) return;

    // Coordinate parsing
    const tryExtractCoords = (text: string) => {
      const cleaned = text.replace(/[°'"’“”NnEeSsWw\u0634\u0631\u0642\u0645\u0644\u064a\u062c,;:\/]/g, ' ').trim();
      const numberPattern = /[+-]?\d+(?:\.\d+)?/g;
      const matches = cleaned.match(numberPattern);
      if (matches && matches.length >= 2) {
        const num1 = parseFloat(matches[0]);
        const num2 = parseFloat(matches[1]);
        if (num1 >= 15 && num1 <= 35 && num2 >= 30 && num2 <= 60) {
          return { lat: num1, lng: num2 };
        }
        if (num2 >= 15 && num2 <= 35 && num1 >= 30 && num1 <= 60) {
          return { lat: num2, lng: num1 };
        }
      }
      return null;
    };

    const parsed = tryExtractCoords(query);
    if (parsed) {
      setSearchResult({
        display_name: `إحداثيات جغرافية مخصصة: ${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`,
        lat: parsed.lat,
        lng: parsed.lng,
        isCoords: true
      });
      triggerFeedback('📍 تم تحديد الإحداثيات بنجاح! انسخها وضعها في الخريطة.');
      return;
    }

    // Geocoding API Search for street names or places
    setIsSearching(true);
    try {
      let apiQuery = query;
      if (!apiQuery.toLowerCase().includes('رياض') && !apiQuery.toLowerCase().includes('riyadh') && !apiQuery.includes('السعودية')) {
        apiQuery += ', الرياض, السعودية';
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(apiQuery)}&limit=1&accept-language=ar`
      );
      if (!response.ok) {
        throw new Error('فشل جلب البيانات الجغرافية.');
      }
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        setSearchResult({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          isCoords: false
        });
        triggerFeedback('📍 تم العثور على الموقع الجغرافي المطابق للشارع!');
      } else {
        setSearchError('لم نجد أي موقع أو شارع مطابق للاسم المدخل في الرياض.');
      }
    } catch (err) {
      console.error(err);
      setSearchError('حدث خطأ أثناء الاستعلام من خادم العنونة الجغرافية.');
    } finally {
      setIsSearching(false);
    }
  };

  const hasAnyLayerAllowed = isLayerAllowed('water') || isLayerAllowed('sewage') || isLayerAllowed('materials');

  if (!hasAnyLayerAllowed) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
        <div className="p-4 bg-amber-50 text-amber-600 rounded-full">
          <Lock className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">لا توجد طبقات مشاريع مسموحة</h3>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          عفواً، لا تملك صلاحيات لاستعراض أي من طبقات المشاريع. يرجى التواصل مع مسؤول النظام لتحديد الطبقات المسموحة لك.
        </p>
      </div>
    );
  }

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
          <div className={`p-2 rounded-lg text-white shrink-0 ${activeLayer === 'water' ? 'bg-blue-600' : activeLayer === 'sewage' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
            {activeLayer === 'water' ? <Droplet className="h-5 w-5" /> : activeLayer === 'sewage' ? <Waves className="h-5 w-5" /> : <Package className="h-5 w-5" />}
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
            {(['water', 'sewage', 'materials'] as const).map(key => {
              const allowed = isLayerAllowed(key);
              if (!allowed) return null;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (activeLayer !== key) {
                      setActiveLayer(key);
                      setIsIframeLoading(true);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    activeLayer === key
                      ? key === 'water' 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : key === 'sewage' 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {key === 'water' && <Droplet className="h-3 w-3" />}
                  {key === 'sewage' && <Waves className="h-3 w-3" />}
                  {key === 'materials' && <Package className="h-3 w-3" />}
                  <span>{layers[key].badge}</span>
                </button>
              );
            })}
          </div>

          {/* External Links Allowed Checklist */}
          {canOpenExternalLinks && (
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
                  activeLayer === 'water' 
                    ? 'bg-blue-700 hover:bg-blue-600' 
                    : activeLayer === 'sewage' 
                      ? 'bg-emerald-700 hover:bg-emerald-600' 
                      : 'bg-amber-700 hover:bg-amber-600'
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/80" />
                <span>تبويب خارجي ↗️</span>
              </a>
            </>
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
        {/* Visual search indicator pin positioned dead-center of the map viewport */}
        {searchResult && isSearchPinVisible && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="flex flex-col items-center justify-center animate-bounce duration-1000">
              <div className="w-10 h-10 rounded-full bg-red-600/30 flex items-center justify-center border-2 border-red-600 shadow-2xl relative">
                <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
                {/* Ping rings */}
                <div className="absolute inset-0 rounded-full border border-red-600 animate-ping opacity-75"></div>
              </div>
              <div className="mt-1 bg-slate-900/90 text-white text-[9.5px] font-black px-2 py-0.5 rounded-md shadow-lg border border-slate-700/60 backdrop-blur-xs select-none">
                موقع البحث المستهدف بالمنتصف 📍
              </div>
            </div>
          </div>
        )}

        {/* Floating Search Panel for layers map */}
        <div className="absolute top-3 right-3 z-10 w-[295px] sm:w-[350px] max-w-[calc(100vw-32px)] text-right font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300">
            {/* Toggle Header */}
            <button
              type="button"
              onClick={() => setIsSearchPanelExpanded(!isSearchPanelExpanded)}
              className="p-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-between font-bold text-xs border-0 cursor-pointer w-full text-right"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-blue-400" />
                <span>ابحث بالطبقات (إحداثيات أو شوارع) 🔎</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
                {isSearchPanelExpanded ? 'إغلاق ✕' : 'فتح 🔍'}
              </span>
            </button>

            {isSearchPanelExpanded && (
              <div className="p-3 bg-white space-y-3">
                <form onSubmit={handleLayerSearch} className="flex items-center gap-1.5">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالشارع، الحي، أو الإحداثيات..."
                      className="w-full text-right text-xs pr-2.5 pl-7 py-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-bold placeholder-slate-400"
                      dir="rtl"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResult(null);
                          setSearchError('');
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer transition-colors border-0 bg-transparent"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-xs font-black rounded-lg cursor-pointer shrink-0 transition-colors shadow-xs border-0 flex items-center justify-center"
                  >
                    {isSearching ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>بحث</span>
                    )}
                  </button>
                </form>

                {/* Info Text */}
                <div className="text-[10px] text-slate-500 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 leading-normal flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="flex-1">
                    نظرًا لطبيعة عرض الطبقات المدمج، للبحث الفوري، يمكنك نسخ الإحداثيات من هذا المساعد ولصقها مباشرة في <b>أيقونة البحث المدمجة بأعلى الخريطة 🔍</b>.
                  </p>
                </div>

                {/* Error */}
                {searchError && (
                  <div className="p-2 bg-rose-50 text-[10px] text-rose-700 font-bold rounded-lg border border-rose-100 text-right">
                    ⚠️ {searchError}
                  </div>
                )}

                {/* Result card with Copy and Google Maps links */}
                {searchResult && (
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 space-y-2 text-right">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-black text-slate-800 leading-snug block">
                          {searchResult.display_name.split(',')[0]}
                        </span>
                        <span className="text-[9px] text-slate-500 truncate block mt-0.5">
                          {searchResult.display_name.split(',').slice(1, 4).join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10.5px] bg-white p-1.5 rounded border border-slate-100 font-mono text-slate-600 flex justify-between items-center">
                      <span className="text-[9px] font-sans font-bold text-slate-400">الإحداثيات:</span>
                      <span>{searchResult.lat.toFixed(6)}, {searchResult.lng.toFixed(6)}</span>
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyCoordsToClipboard(searchResult.lat, searchResult.lng)}
                        className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        <span>نسخ الإحداثيات 📋</span>
                      </button>

                      {canOpenExternalLinks && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${searchResult.lat},${searchResult.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 text-center font-sans"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>تحديد بالخارج ↗️</span>
                        </a>
                      )}
                    </div>

                    <div className="pt-0.5 border-t border-slate-100 mt-1">
                      <button
                        type="button"
                        onClick={() => setIsSearchPinVisible(!isSearchPinVisible)}
                        className={`w-full py-1.5 border rounded text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isSearchPinVisible 
                            ? 'bg-amber-50 border-amber-200 text-amber-750 hover:bg-amber-100' 
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSearchPinVisible ? <EyeOff className="h-3.5 w-3.5 text-amber-600" /> : <Eye className="h-3.5 w-3.5 text-slate-500" />}
                        <span>{isSearchPinVisible ? 'إخفاء مؤشر الدبوس بالمنتصف 📍' : 'عرض مؤشر الدبوس بالمنتصف 📍'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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

        {/* Visual Crop overlay covering the top and bottom: The top header of My Maps is pushed up by -56px, and the bottom footer is pushed down by 40px and hidden by overflow-hidden */}
        <iframe
          key={activeLayer}
          src={embedUrl}
          title={currentLayer.title}
          className="absolute left-0 w-full border-0 z-0"
          style={{
            top: '-56px',
            height: 'calc(100% + 56px + 40px)'
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
            طبقة جغرافية شاملة للقطاع الأوسط ({activeLayer === 'water' ? 'مياه شرب' : activeLayer === 'sewage' ? 'صرف صحي' : 'مواد التشوين'})
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
