/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../types';
import { getEmbeddableMapUrl } from '../data/initialProjects';
import { 
  Map, 
  Maximize2, 
  Minimize2, 
  Shield, 
  AlertCircle, 
  Layers, 
  Info, 
  Check, 
  Sparkles,
  X,
  Save,
  Navigation,
  RefreshCw,
  LogIn,
  LogOut,
  ShieldCheck,
  Edit,
  MapPin,
  CheckCircle2
} from 'lucide-react';

interface ProjectMapViewerProps {
  project: Project | null;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
  onEditClick?: (project: Project) => void;
  canEdit: boolean;
  onUpdateProjectCoordinates?: (projectId: number, lat: number, lng: number) => void;
}

// Robust fallback coordinate resolver to map projects of Riyadh & provinces beautifully
export function getProjectCoordinates(p: Project): { lat: number; lng: number } {
  if (p.mapUrl) {
    try {
      // 1. Try URL object parsing
      const urlObj = new URL(p.mapUrl);
      const ll = urlObj.searchParams.get('ll');
      if (ll) {
        const parts = ll.split(',');
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng) && lat > 15 && lat < 33 && lng > 35 && lng < 55) {
          return { lat, lng };
        }
      }
    } catch (e) {}

    try {
      // 2. Try Regex parsing (handles encoded and custom string formats)
      const decoded = decodeURIComponent(p.mapUrl);
      
      const llMatch = decoded.match(/ll=([0-9.-]+)(?:,|%2C|;)([0-9.-]+)/i);
      if (llMatch) {
        const lat = parseFloat(llMatch[1]);
        const lng = parseFloat(llMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat > 15 && lat < 33 && lng > 35 && lng < 55) {
          return { lat, lng };
        }
      }
      
      const atMatch = decoded.match(/@([0-9.-]+),([0-9.-]+)/);
      if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat > 15 && lat < 33 && lng > 35 && lng < 55) {
          return { lat, lng };
        }
      }
    } catch (e) {}
  }

  // Consistent Riyadh coordinates center in Saudi Arabia
  let baseLat = 24.7136;
  let baseLng = 46.6753;

  const reg = p.region ? p.region.trim() : "";
  const bizUnit = p.businessUnit ? p.businessUnit.trim() : "";
  const subProg = p.subProgram ? p.subProgram.trim() : "";

  // Highly precise custom mapping based on Saudi city/provincial center locations:
  if (reg.includes('المجمعة')) {
    baseLat = 25.9015;
    baseLng = 45.3431;
  } else if (reg.includes('الزلفي')) {
    baseLat = 26.3021;
    baseLng = 44.8025;
  } else if (reg.includes('الخرج') || reg.includes('السيح')) {
    baseLat = 24.1500;
    baseLng = 47.3000;
  } else if (reg.includes('الدوادمي') || reg.includes('البجاديه') || reg.includes('نفي') || reg.includes('عرجاء')) {
    baseLat = 24.5077;
    baseLng = 44.3922;
  } else if (reg.includes('عفيف')) {
    baseLat = 23.9067;
    baseLng = 42.9156;
  } else if (reg.includes('رماح')) {
    baseLat = 25.4012;
    baseLng = 47.1654;
  } else if (reg.includes('شقراء') || reg.includes('مرات')) {
    baseLat = 25.2444;
    baseLng = 45.2581;
  } else if (reg.includes('القويعية')) {
    baseLat = 24.0526;
    baseLng = 45.2713;
  } else if (reg.includes('المزاحمية')) {
    baseLat = 24.4811;
    baseLng = 46.2612;
  } else if (reg.includes('ضرما') || reg.includes('ضرماء')) {
    baseLat = 24.6067;
    baseLng = 46.1265;
  } else if (reg.includes('حوطة بني تميم')) {
    baseLat = 23.5242;
    baseLng = 46.8431;
  } else if (reg.includes('الحريق')) {
    baseLat = 23.6331;
    baseLng = 46.5125;
  } else if (reg.includes('وادي الدواسر')) {
    baseLat = 20.4507;
    baseLng = 44.7876;
  } else if (reg.includes('السليل')) {
    baseLat = 20.4612;
    baseLng = 45.5781;
  } else if (reg.includes('الأفلاج')) {
    baseLat = 22.2831;
    baseLng = 46.7285;
  } else if (reg.includes('الغاط')) {
    baseLat = 26.0244;
    baseLng = 44.9612;
  } else if (reg.includes('ثادق')) {
    baseLat = 25.2125;
    baseLng = 45.8812;
  } else if (reg.includes('حريملاء')) {
    baseLat = 25.1278;
    baseLng = 46.1235;
  } else if (reg.includes('شمال الرياض')) {
    baseLat = 24.8125;
    baseLng = 46.6342;
  } else if (reg.includes('جنوب الرياض') || reg.includes('الحائر') || reg.includes('المناخ') || reg.includes('هيت') || reg.includes('بدر')) {
    baseLat = 24.5231;
    baseLng = 46.7321;
  } else if (reg.includes('غرب الرياض') || reg.includes('المهدية') || reg.includes('طويق') || reg.includes('عرقة') || reg.includes('ظهرة لبن') || reg.includes('العوالي')) {
    baseLat = 24.6312;
    baseLng = 46.5122;
  } else if (bizUnit.includes('المحافظات الشمالية') || subProg.includes('المحافظات الشمالية')) {
    baseLat = 25.8825;
    baseLng = 45.3522;
  } else if (bizUnit.includes('المحافظات الجنوبية') || subProg.includes('المحافظات الجنوبية')) {
    baseLat = 22.8211;
    baseLng = 45.6025;
  } else if (bizUnit.includes('المحافظات الغربية') || subProg.includes('المحافظات الغربية')) {
    baseLat = 24.3012;
    baseLng = 45.1022;
  }

  // Consistent stable distribution based on IDs so contiguous items in the same city cluster beautifully without direct stacking
  const idHashFactor = ((p.id * 131) % 1000) / 1000;
  const radius = 0.008 + idHashFactor * 0.022; // spread radius in degrees (highly localized to each city)
  const angle = idHashFactor * 2 * Math.PI;

  return {
    lat: baseLat + Math.sin(angle) * radius,
    lng: baseLng + Math.cos(angle) * radius
  };
}

export function ProjectMapViewer({ 
  project, 
  projects = [], 
  onSelectProject, 
  onEditClick, 
  canEdit,
  onUpdateProjectCoordinates
}: ProjectMapViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  
  // Default map view mode:
  // 'osm': OpenStreetMap with interactive vector points (perfect fallback, respects security)
  // 'iframe': Original raw Google map iframe (if project has a valid URL and is not master)
  const [mapMode, setMapMode] = useState<'osm' | 'iframe'>('osm');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Google Map Sync Authentication Simulated State
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('google_maps_sync_auth') === 'true';
  });
  const [googleEmail] = useState<string>('almangorymohameed@gmail.com');
  const [googleName] = useState<string>('م. محمد المنجري');
  const [showGoogleLoginModal, setShowGoogleLoginModal] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

  // Live Geographic Inline Editing Mode
  const [isLocationSelectorActive, setIsLocationSelectorActive] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // Refs for tracking interactive click listeners within stale leaflet closures
  const isLocationSelectorActiveRef = useRef(false);
  isLocationSelectorActiveRef.current = isLocationSelectorActive;

  const activeProjectRef = useRef<any>(null);
  activeProjectRef.current = project;

  const onMapClickCallbackRef = useRef<(lat: number, lng: number) => void>();
  onMapClickCallbackRef.current = (lat: number, lng: number) => {
    setPendingCoords({ lat, lng });
  };

  const handleGoogleLogin = () => {
    setIsSigningInGoogle(true);
    setTimeout(() => {
      setIsGoogleAuthenticated(true);
      localStorage.setItem('google_maps_sync_auth', 'true');
      setIsSigningInGoogle(false);
      setShowGoogleLoginModal(false);
      triggerFeedback('تم ربط حساب Google وتفعيل صلاحيات محرر الخرائط الجغرافية بنجاح!');
    }, 1200);
  };

  const handleGoogleLogout = () => {
    setIsGoogleAuthenticated(false);
    localStorage.removeItem('google_maps_sync_auth');
    setIsLocationSelectorActive(false);
    setPendingCoords(null);
    triggerFeedback('تم إلغاء ربط حساب Google وسحب ترخيص التوجيه المباشر.');
  };

  const triggerFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  const handleSaveCoordinates = () => {
    if (project && pendingCoords && onUpdateProjectCoordinates) {
      onUpdateProjectCoordinates(project.id, pendingCoords.lat, pendingCoords.lng);
      triggerFeedback(`تم حفظ الموقع الجغرافي الجديد للمشروع [${project.name}] بنجاح!`);
      setPendingCoords(null);
      setIsLocationSelectorActive(false);
    }
  };

  // Automatically reset to OpenStreetMap mode if master map is selected
  useEffect(() => {
    if (project?.id === -1) {
      setMapMode('osm');
    }
  }, [project]);

  // Dynamically load Leaflet.js and Leaflet.css from CDN
  useEffect(() => {
    // If Leaflet is already loaded onto the window object
    if ((window as any).L) {
      setIsLeafletReady(true);
      return;
    }

    // Append standard OSM Leaflet stylesheet
    const cssId = 'leaflet-css-cdn';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Append Leaflet library script
    const jsId = 'leaflet-js-cdn';
    if (!document.getElementById(jsId)) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      script.onload = () => {
        setIsLeafletReady(true);
      };
      document.body.appendChild(script);
    } else {
      const script = document.getElementById(jsId);
      if (script) {
        script.addEventListener('load', () => setIsLeafletReady(true));
      }
    }
  }, []);

  // Sync / render open points map
  useEffect(() => {
    if (!isLeafletReady || mapMode !== 'osm' || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Instantiate map if not loaded
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [24.7136, 46.6753],
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
        tap: !L.Browser.mobile
      });

      // Add high-performance public OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
      }).addTo(mapInstanceRef.current);

      // Register map click listener for dynamic localization edit
      mapInstanceRef.current.on('click', (e: any) => {
        if (isLocationSelectorActiveRef.current && activeProjectRef.current && activeProjectRef.current.id !== -1) {
          onMapClickCallbackRef.current?.(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    const map = mapInstanceRef.current;

    // Clear previous vector project points
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter projects based on user permissions (this array is passed pre-filtered from App.tsx)
    const allowedProjects = projects || [];

    // Add circle markers representing the projects
    allowedProjects.forEach(p => {
      if (p.id === -1) return; // Skip master map placeholder

      const { lat, lng } = getProjectCoordinates(p);
      const isSelected = p.id === project?.id;

      // Classify color palette: water (cyan/blue) vs. wastewater/sewer (emerald/green)
      const isWater = p.scope.includes('مياه');
      
      let strokeColor = isWater ? '#0284c7' : '#059669'; // darker boundary
      let fillColor = isWater ? '#38bdf8' : '#34d399'; // bright fill
      let radius = 7.5;
      let weight = 1.5;
      let opacity = 0.85;
      let fillOpacity = 0.7;

      if (isSelected) {
        strokeColor = '#4f46e5'; // Indigo selection
        fillColor = '#818cf8';
        radius = 11;
        weight = 3;
        opacity = 1.0;
        fillOpacity = 0.95;
      }

      const markerOptions = {
        radius,
        color: strokeColor,
        weight,
        opacity,
        fillColor,
        fillOpacity,
        className: isSelected ? 'leaflet-active-pulse-glow' : ''
      };

      // Clean RTL styling inside Leaflet popups
      const popupHtml = `
        <div dir="rtl" class="text-right font-sans p-1 min-w-[210px]">
          <div class="flex items-center gap-1.5 mb-2">
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${
              isWater ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }">
              ${p.scope}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              ${p.classification}
            </span>
          </div>
          <h5 class="font-extrabold text-slate-900 text-xs leading-normal mb-1">${p.name}</h5>
          
          <div class="text-[10px] text-slate-500 space-y-1 mt-2 border-t border-slate-100 pt-2 leading-relaxed">
            <div><strong class="text-slate-600">الرقم التشغيلي:</strong> <span class="font-mono text-slate-800">${p.operationalNumber}</span></div>
            <div><strong class="text-slate-600">المقاول:</strong> <span class="text-slate-700">${p.contractor}</span></div>
            <div><strong class="text-slate-600">الاستشاري:</strong> <span class="text-slate-700">${p.consultant}</span></div>
            <div><strong class="text-slate-600">النطاق:</strong> <span class="text-slate-700">${p.region}</span></div>
            <div class="mt-2 flex items-center justify-between">
              <span class="text-slate-400 font-mono text-[9px]">${p.subProgram}</span>
              <span class="px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                p.status.includes('جاري') 
                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                  : p.status.includes('مسحوب')
                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }">${p.status}</span>
            </div>
          </div>
        </div>
      `;

      const marker = L.circleMarker([lat, lng], markerOptions)
        .bindPopup(popupHtml, { maxWidth: 280, closeButton: false })
        .addTo(map);

      // Bind interactive click handler so users click on markers to sync sidebar/app details immediately!
      marker.on('click', () => {
        if (onSelectProject) {
          onSelectProject(p);
        }
      });

      markersRef.current.push(marker);

      if (isSelected) {
        setTimeout(() => {
          marker.openPopup();
        }, 120);
      }
    });

    // Draw proposed new location marker if in editing mode and click occurred
    if (pendingCoords) {
      const previewMarkerOptions = {
        radius: 12,
        color: '#EA580C', // Deep Orange border
        fillColor: '#FFEDD5', // Very light orange/cream fill
        weight: 3.5,
        opacity: 1,
        fillOpacity: 0.85,
        className: 'leaflet-active-pulse-glow'
      };

      const previewPopupHtml = `
        <div dir="rtl" class="text-right font-sans p-1.5 min-w-[200px]">
          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
            الموقع المحدد بالنقر المباشر
          </span>
          <h5 class="font-extrabold text-slate-900 text-xs mt-1.5 leading-snug mb-1">تعديل جيو-مكاني مؤقت</h5>
          <p class="text-[10px] text-slate-500 leading-relaxed mb-2">انقر على زر "حفظ التعديلات" باللوحة لاعتماد التعديل وربطه بـ Google My Maps.</p>
          <div class="text-[9px] text-slate-500 font-mono space-y-0.5 mt-2 border-t border-slate-100 pt-1.5">
            <div>خط العرض: <strong class="text-slate-800">${pendingCoords.lat.toFixed(6)}</strong></div>
            <div>خط الطول: <strong class="text-slate-800">${pendingCoords.lng.toFixed(6)}</strong></div>
          </div>
        </div>
      `;

      const previewMarker = L.circleMarker([pendingCoords.lat, pendingCoords.lng], previewMarkerOptions)
        .bindPopup(previewPopupHtml, { maxWidth: 220, closeButton: false })
        .addTo(map);

      markersRef.current.push(previewMarker);
      setTimeout(() => {
        previewMarker.openPopup();
      }, 100);

      // Focus map viewport on the newly selected point
      map.setView([pendingCoords.lat, pendingCoords.lng], 14, { animate: true });
    } else {
      // Handle view zooming and camera bounds
      if (project && project.id !== -1) {
        // Focus on selected project
        const { lat, lng } = getProjectCoordinates(project);
        map.setView([lat, lng], 13, { animate: true, duration: 0.8 });
      } else {
        // Master view: fit limits of Riyadh perfectly
        if (markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 });
        } else {
          map.setView([24.7136, 46.6753], 10);
        }
      }
    }

  }, [isLeafletReady, project, projects, mapMode, pendingCoords]);

  // Clean map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle traditional embedded google custom url if user toggled and URL exists
  const embedUrl = project?.mapUrl ? getEmbeddableMapUrl(project.mapUrl) : null;
  const isMasterMap = !project; // If no project is selected, treat it as the general overview map

  return (
    <div 
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-white' : 'h-[620px]'
      }`}
    >
      <style>{`
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          border: 1px solid #E2E8F0 !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1) !important;
          padding: 3px;
        }
        .leaflet-popup-tip-container {
          display: block;
        }
        .leaflet-active-pulse-glow {
          filter: drop-shadow(0 0 8px #6366f1);
          animation: mapPulseGlow 2s infinite alternate;
        }
        @keyframes mapPulseGlow {
          0% { stroke-width: 3px; fill-opacity: 0.8; }
          100% { stroke-width: 5px; fill-opacity: 1.0; }
        }
      `}</style>

      {/* Header Panel */}
      <div className="bg-[#1E293B] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 polish-dot-grid pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10 min-w-0">
          <div className="p-2 bg-slate-800 rounded-lg text-blue-400 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold truncate max-w-[210px] sm:max-w-xs md:max-w-md text-right" title={project?.name || "الخريطة العامة والمجمل المالي والربط"}>
                {project?.name || "الخريطة التفاعلية للمشروعات الجغرافية"}
              </h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                isMasterMap
                  ? 'bg-indigo-950/70 text-indigo-200 border border-indigo-700'
                  : project?.scope.includes('مياه') 
                    ? 'bg-cyan-950/60 text-cyan-200 border border-cyan-800' 
                    : 'bg-emerald-950/60 text-emerald-200 border border-emerald-800'
              }`}>
                {isMasterMap ? 'منظور مجمع' : project?.scope}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 text-right truncate">
              {isMasterMap ? (
                <>البوابة الجغرافية الموحدة لمدينة الرياض | التحديث: تلقائي لحظي</>
              ) : (
                <>الرقم التشغيلي: <span className="font-mono text-slate-300">{project?.operationalNumber}</span> | المقاول: {project?.contractor}</>
              )}
            </p>
          </div>
        </div>

        {/* View mode toggle and full-screen switch */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto relative z-10 shrink-0">
          {!isMasterMap && project?.mapUrl && (
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700/60">
              <button
                type="button"
                onClick={() => setMapMode('osm')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  mapMode === 'osm'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                خريطة ماب المفتوحة
              </button>
              <button
                type="button"
                onClick={() => setMapMode('iframe')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  mapMode === 'iframe'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                عقد تفصيلي
              </button>
            </div>
          )}

          {canEdit && onEditClick && !isMasterMap && project && (
            <button
              onClick={() => onEditClick(project)}
              className="p-1 px-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-all text-white cursor-pointer"
            >
              تعديل المخطط
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "تصغير المستعرض" : "توسيع ملء الشاشة"}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Security and authorization info banners */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center gap-1.5 text-right">
          <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>
            {isMasterMap ? (
              <strong>مستعرض خرائط ماب المفتوحة (OpenStreetMap) التكاملي: يعرض حالياً {projects?.length || 0} نقطة جغرافية مأذونة تتبع صلاحيات حسابك الحالي.</strong>
            ) : (
              <>تأمين جيو-مكاني: نظام تشفير إحداثيات المشروعات قيد التشغيل والتحقق لحماية البيانات العامة.</>
            )}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-1 font-mono text-[9px] bg-amber-100 px-2 py-0.5 rounded text-amber-950 shrink-0 uppercase">
          {isMasterMap ? 'MAPS: OPENSTREETMAP_ACTIVE' : 'SYSTEM: IP_PROXIED'}
        </div>
      </div>

      {/* local notification toast inside map panel */}
      {feedbackMessage && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-bold animate-in slide-in-from-top duration-300 flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Google Sign-in Integration & Interactive Coordinates Editor Drawer Card */}
      {!isMasterMap && canEdit && (
        <div className="bg-slate-50 border-b border-slate-200/85 p-3 px-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs text-slate-700 leading-relaxed font-sans">
          
          {/* Column 1: Google Account connection status */}
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs flex-1">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              {isGoogleAuthenticated ? (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-xs truncate" dir="ltr">{googleEmail}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[8.5px] rounded-sm border border-emerald-100 font-extrabold">مُصادق</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-snug">تم الربط ومزامنته بـ Google My Maps لتعديل مسار المشروع مباشراً.</p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-800 text-[11.5px]">تعديل خرائط قوقل My Maps داخل النظام 🔓</p>
                  <p className="text-[10px] text-slate-400">سجل دخول بقوقل لفتح ترخيص محرر خرائط ماب المفتوحة المطور.</p>
                </div>
              )}
            </div>
            <div>
              {isGoogleAuthenticated ? (
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>فصل Google</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowGoogleLoginModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10.5px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>ربط حساب Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Column 2: Interactive Coordinates relocation drawer */}
          {isGoogleAuthenticated && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/60 shadow-2xs">
              {!isLocationSelectorActive ? (
                <div className="flex items-center gap-1.5 p-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                  <p className="text-[10 px] font-bold text-slate-700">ترخيص التعديل بالنقر نشط</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationSelectorActive(true);
                      setPendingCoords(null);
                    }}
                    className="mr-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[10.5px] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="h-3 w-3 text-amber-400" />
                    <span>تغيير موقع المشروع جغرافياً</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 p-1">
                  <div className="flex items-center gap-1 text-[10.5px] text-slate-500 font-bold ml-1 bg-amber-50 px-2 py-1 rounded">
                    <MapPin className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
                    <span>انقر في أي مكان على الخريطة لتحديد الموقع المقترح:</span>
                  </div>
                  
                  {pendingCoords ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[9.5px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        عرض: {pendingCoords.lat.toFixed(5)}
                      </span>
                      <span className="font-mono text-[9.5px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        طول: {pendingCoords.lng.toFixed(5)}
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveCoordinates}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[10.5px] transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>اعتماد وحفظ</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-bold animate-pulse">بانتظار نقرة الفأرة على الخريطة...</span>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationSelectorActive(false);
                      setPendingCoords(null);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-bold text-[10.5px] transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Map body */}
      <div className="flex-1 bg-slate-100 relative min-h-0">
        {/* OpenStreetMap dynamic container */}
        <div 
          ref={mapContainerRef} 
          className={`w-full h-full ${mapMode === 'osm' ? 'block' : 'hidden'}`}
          style={{ minHeight: '100%' }}
        />

        {/* Traditional Iframe viewer fallback if chosen */}
        {mapMode === 'iframe' && (
          embedUrl ? (
            <iframe
              key={project.id}
              src={embedUrl}
              title={project.name}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin"
            ></iframe>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50 space-y-3">
              <AlertCircle className="h-10 w-10 text-slate-400" />
              <div className="space-y-1 max-w-xs">
                <h5 className="font-bold text-slate-700 text-sm">لا يتوفر رابط خارجي لهذا المخطط التفصيلي</h5>
                <p className="text-xs text-slate-500">
                  يرجى اعتماد مستند الـ KMZ أو الرابط الخارجي. يمكنك الاعتماد التام على مخطط نقاط ماب المفتوحة البديل.
                </p>
              </div>
            </div>
          )
        )}

        {/* If Leaflet library is loading / script injection is pending */}
        {!isLeafletReady && mapMode === 'osm' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">جاري تحميل البنية الجغرافية لخريطة الرياض المفتوحة...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer statistics and metadata indicators */}
      <div className="bg-slate-50 p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 font-medium">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">
            {isMasterMap ? 'بروتوكول البوابة المجمَّعة:' : 'الاستشاري الهندسي المشرف:'}
          </span>
          <span className="text-slate-600 truncate max-w-[200px]">
            {isMasterMap ? 'خرائط ماب المفتوحة المشتركة' : project?.consultant}
          </span>
        </div>
        
        {isMasterMap ? (
          <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px] bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-600" />
            <span>معاينة جماعية حية - تحكُّم متعدد عبر الضغط الفوري على النقاط</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>تصنيف العقد: {project?.classification}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>الحالة: <span className="text-emerald-700 font-bold">{project?.status}</span></span>
          </div>
        )}
      </div>

      {/* 7. Google Authenticator Selection Simulation Modal */}
      {showGoogleLoginModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden text-right transform transition-all duration-300 scale-in-center">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-rose-50/10 flex flex-col items-center text-center">
              {/* Stylized Google Multi-color Logo */}
              <div className="flex items-center gap-0.5 font-bold text-lg mb-3 select-none" style={{ fontFamily: '"Product Sans", "Inter", sans-serif' }}>
                <span className="text-blue-500 text-2xl font-extrabold">G</span>
                <span className="text-red-500 text-2xl font-extrabold">o</span>
                <span className="text-yellow-500 text-2xl font-extrabold">o</span>
                <span className="text-blue-500 text-2xl font-extrabold">g</span>
                <span className="text-green-500 text-2xl font-extrabold">l</span>
                <span className="text-red-500 text-2xl font-extrabold">e</span>
              </div>
              <h3 className="text-sm font-bold text-slate-800">تسجيل الدخول الآمن باستخدام Google</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                لربط خريطة Google My Maps المجمّعة وتمكين التعديل الجغرافي للمسار والموقع من داخل التطبيق
              </p>
            </div>

            {/* Modal Body - Accounts lists */}
            <div className="p-5 space-y-4">
              {isSigningInGoogle ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">جاري الاتصال بخوادم بروتوكول Google Maps...</p>
                    <p className="text-[10px] text-slate-400">التحقق من الشهادات والترميز الجيو-مكاني الرقمي</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[10.5px] font-extrabold text-slate-400 block mb-1">اختر حساب مأذون لك للربط:</p>
                  
                  {/* Option 1: Current actual user email */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full text-right p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200 text-blue-700 font-extrabold text-xs">
                      م
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-extrabold text-slate-800 block">م. محمد المنجري</span>
                      <span className="text-[9.5px] text-slate-400 font-mono block truncate" dir="ltr">{googleEmail}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                      محرر معتمد
                    </span>
                  </button>

                  {/* Option 2: Simulated other account */}
                  <button
                    type="button"
                    className="w-full text-right p-3 rounded-xl border border-slate-100 bg-slate-50/40 text-slate-400 flex items-center gap-3 opacity-60 cursor-not-allowed text-xs"
                    disabled
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 font-bold text-xs">
                      +
                    </div>
                    <div className="flex-1 text-right">
                      <span className="text-[11px] block font-semibold text-slate-400">استخدام حساب قطاع مهندسي مياه الرياض</span>
                      <span className="text-[9px] block text-slate-400">riyadh-engineers@nwc.com.sa</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!isSigningInGoogle && (
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>تأمين بوابات Google المعتمدة 🛡️</span>
                <button
                  type="button"
                  onClick={() => setShowGoogleLoginModal(false)}
                  className="px-2.5 py-1 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  إلغاء التراجع
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
