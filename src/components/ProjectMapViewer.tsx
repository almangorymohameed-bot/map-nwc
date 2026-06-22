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
  CheckCircle2,
  ExternalLink,
  Lock,
  Unlock,
  Share2,
  Globe
} from 'lucide-react';

interface ProjectMapViewerProps {
  project: Project | null;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
  onEditClick?: (project: Project) => void;
  canEdit: boolean;
  onUpdateProjectCoordinates?: (projectId: number, lat: number, lng: number) => void;
  isAdmin?: boolean;
}

// Robust fallback coordinate resolver to map projects of Riyadh & provinces beautifully
export function getProjectCoordinates(p: Project): { lat: number; lng: number } {
  // 0. Prioritize manually specified x (longitude) and y (latitude) coordinates if available and valid
  const hasY = p.y !== undefined && p.y !== null && p.y !== 0;
  const hasX = p.x !== undefined && p.x !== null && p.x !== 0;
  if (hasY && hasX) {
    const parseFloatY = typeof p.y === 'string' ? parseFloat(p.y) : p.y;
    const parseFloatX = typeof p.x === 'string' ? parseFloat(p.x) : p.x;
    if (!isNaN(parseFloatY) && !isNaN(parseFloatX) && parseFloatY > 10 && parseFloatY < 35 && parseFloatX > 30 && parseFloatX < 60) {
      return { lat: parseFloatY, lng: parseFloatX };
    }
  }

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
  onUpdateProjectCoordinates,
  isAdmin = false
}: ProjectMapViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Map Lock state to prevent traps when scrolling on mobile.
  // Defaults to unlocked on desktop, but locked on mobile/touch screen for safe scrolling.
  const [isMapUnlocked, setIsMapUnlocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // screen size lg is generally desktop
    }
    return true;
  });
  
  // Default map view mode:
  // 'osm': OpenStreetMap with interactive vector points (perfect fallback, respects security)
  // 'iframe': Original raw Google map iframe (if project has a valid URL and is not master)
  const [mapMode, setMapMode] = useState<'osm' | 'iframe'>('osm');
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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

  // Automatically reset map mode based on active project selection
  useEffect(() => {
    setIsIframeLoading(true);
    if (!project || project.id === -1) {
      setMapMode('osm');
    } else {
      setMapMode('iframe');
    }
  }, [project]);

  // Register global callback for Leaflet popup button click to switch map tab mode dynamically on the same page
  useEffect(() => {
    (window as any).switchToIframeMap = (projectId: number) => {
      const foundProject = (projects || []).find(p => p.id === projectId);
      if (foundProject) {
        if (onSelectProject) {
          onSelectProject(foundProject);
        }
        setMapMode('iframe');
      }
    };
    return () => {
      delete (window as any).switchToIframeMap;
    };
  }, [projects, onSelectProject]);

  // High performance observer to update OpenStreetMap view borders immediately
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current && mapMode === 'osm') {
        mapInstanceRef.current.invalidateSize({ animate: false });
      }
    });
    
    resizeObserver.observe(mapContainerRef.current);
    
    // Staggered interval to ensure rendering resolves with zero unrendered white sections
    const invalidateInterval = setInterval(() => {
      if (mapInstanceRef.current && mapMode === 'osm') {
        mapInstanceRef.current.invalidateSize({ animate: false });
      }
    }, 450);

    return () => {
      resizeObserver.disconnect();
      clearInterval(invalidateInterval);
    };
  }, [isLeafletReady, mapMode]);

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

  // Track map state for locking / unlocking dynamically to give smooth mobile pages scroll
  useEffect(() => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      if (isMapUnlocked) {
        if (map.dragging) map.dragging.enable();
        if (map.touchZoom) map.touchZoom.enable();
        if (map.doubleClickZoom) map.doubleClickZoom.enable();
        if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
      } else {
        if (map.dragging) map.dragging.disable();
        if (map.touchZoom) map.touchZoom.disable();
        if (map.doubleClickZoom) map.doubleClickZoom.disable();
        if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
      }
    }
  }, [isMapUnlocked, isLeafletReady, mapMode]);

  // Sync / render open points map
  useEffect(() => {
    if (!isLeafletReady || mapMode !== 'osm' || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Instantiate map if not loaded
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [23.8859, 45.0792],
        zoom: 5.5,
        zoomControl: true,
        attributionControl: true,
        tap: !L.Browser.mobile,
        dragging: isMapUnlocked,
        touchZoom: isMapUnlocked,
        doubleClickZoom: isMapUnlocked,
        scrollWheelZoom: isMapUnlocked
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

    // Trigger instant layout size update to prevent gray/white unrendered areas
    if (map) {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false });
        }
      }, 50);
    }

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

      // Classify color palette: water (blue) vs. wastewater/sewer (green)
      const isSewage = p.scope.includes('صرف') || p.scope.includes('بيئية') || p.scope.includes('حمأة');
      const isWater = p.scope.includes('مياه');
      
      let strokeColor = '#475569'; // slate-600 default
      let fillColor = '#94a3b8'; // slate-400 default
      
      if (isSewage) {
        strokeColor = '#15803d'; // green-700
        fillColor = '#22c55e'; // green-500
      } else if (isWater) {
        strokeColor = '#1d4ed8'; // blue-700
        fillColor = '#3b82f6'; // blue-500
      }

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
            <div class="mt-3 pt-2 border-t border-slate-100">
              <button 
                onclick="if(window.switchToIframeMap){ window.switchToIframeMap(${p.id}); } else { window.open('${p.mapUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}', '_blank'); }"
                type="button"
                class="flex items-center justify-center gap-1.5 w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-2xs transition-all text-center cursor-pointer font-bold border-0"
                style="text-decoration: none; color: white !important;"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-left:4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                 المعاينة في خريطة قوقل ماب الداخلية 🗺️
              </button>
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
          <p class="text-[10px] text-slate-500 leading-relaxed mb-2">انقر على زر "اعتماد وحفظ" باللوحة لاعتماد تعديل الإحداثيات مباشرة للمشروع.</p>
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
        // Master view: Auto fit camera viewport to encapsulate all actual projects flawlessly
        const validCoords = (projects || [])
          .filter(p => p.id !== -1)
          .map(p => {
            const { lat, lng } = getProjectCoordinates(p);
            return [lat, lng] as [number, number];
          });
        if (validCoords.length > 0) {
          map.fitBounds(validCoords, { padding: [40, 40], maxZoom: 11, animate: true, duration: 0.6 });
        } else {
          map.setView([24.7136, 46.6753], 6.5, { animate: true });
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
  // Fallback to coordinates on google maps if mapUrl is not defined.
  const embedUrl = project
    ? (project.mapUrl
        ? getEmbeddableMapUrl(project.mapUrl)
        : `https://maps.google.com/maps?q=${getProjectCoordinates(project).lat},${getProjectCoordinates(project).lng}&z=15&output=embed`)
    : null;
  const isMasterMap = !project; // If no project is selected, treat it as the general overview map

  return (
    <div 
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-white' : 'relative z-10 h-[620px]'
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
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 self-stretch sm:self-auto relative z-10 shrink-0 md:grow-0 justify-end w-full sm:w-auto mt-2 sm:mt-0 select-none">
          {!isMasterMap && project && (
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700/60 shrink-0 shadow-xs">
              <button
                type="button"
                onClick={() => setMapMode('osm')}
                className={`px-1.5 py-1 text-[9px] sm:text-[11px] font-bold rounded transition-all cursor-pointer ${
                  mapMode === 'osm'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض نقاط المشروع على خريطة ماب الافتراضية المفتوحة"
              >
                نقاط ماب (OSM)
              </button>
              <button
                type="button"
                onClick={() => setMapMode('iframe')}
                className={`px-1.5 py-1 text-[9px] sm:text-[11px] font-bold rounded transition-all cursor-pointer ${
                  mapMode === 'iframe'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض خريطة قوقل ماب التفاعلية الكاملة"
              >
                خريطة قوقل ماب (Google Maps) 🗺️
              </button>
            </div>
          )}

          {!isMasterMap && project && project.mapUrl && (
            <a
              href={project.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] sm:text-[11px] font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="الذهاب لخريطة المشروع الرسمية على موقع قوقل ماب الخارجي"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              <span>فتح تطبيق Google Maps ↗️</span>
            </a>
          )}

          {canEdit && onEditClick && !isMasterMap && project && (
            <button
              onClick={() => onEditClick(project)}
              className="flex items-center gap-1 p-1 px-1.5 sm:px-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-[9px] sm:text-xs font-bold transition-all text-white cursor-pointer shrink-0 shadow-xs"
              title="تعديل المخطط"
            >
              <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-blue-200" />
              <span>تعديل</span>
            </button>
          )}

          {/* Admin features: External map opening (تبويب خارجي) and share link (مشاركة) */}
          {isAdmin && (
            <>
              {/* Share map link */}
              <button
                type="button"
                onClick={() => {
                  const url = isMasterMap 
                    ? window.location.href 
                    : (project?.mapUrl || window.location.href);
                  navigator.clipboard.writeText(url).then(() => {
                    triggerFeedback('📋 تم نسخ رابط الخريطة والمشاركة إلى الحافظة بنجاح!');
                  }).catch(() => {
                    triggerFeedback('فشل نسخ رابط المشاركة.');
                  });
                }}
                title="نسخ رابط المشاركة"
                className="flex items-center gap-1 p-1 px-1.5 sm:px-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[9px] sm:text-xs font-bold transition-all text-white cursor-pointer shrink-0 shadow-xs"
              >
                <Share2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-emerald-200" />
                <span>مشاركة</span>
              </button>

              {/* Google Earth Online button */}
              {isAdmin && (
                <a
                  href={isMasterMap 
                    ? 'https://earth.google.com/web/@24.7136,46.6753,400d,35y,0h,0t,0r' 
                    : (project ? `https://earth.google.com/web/@${getProjectCoordinates(project).lat},${getProjectCoordinates(project).lng},400d,35y,0h,0t,0r` : 'https://earth.google.com/web/@24.7136,46.6753,400d,35y,0h,0t,0r')
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  title="مشاهدة الموقع مجسماً عبر قوقل إيرث ثلاثي الأبعاد"
                  className="flex items-center gap-1 p-1 px-1.5 sm:px-2.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-[9px] sm:text-xs font-bold transition-all text-white cursor-pointer shrink-0 shadow-xs"
                >
                  <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-blue-200 animate-pulse" />
                  <span>قوقل إيرث</span>
                </a>
              )}

              {/* External Map opening button */}
              {isAdmin && (
                <a
                  href={isMasterMap ? 'https://www.openstreetmap.org/#map=10/24.7136/46.6753' : (
                    mapMode === 'osm' 
                      ? `https://www.openstreetmap.org/?mlat=${getProjectCoordinates(project).lat}&mlon=${getProjectCoordinates(project).lng}#map=15/${getProjectCoordinates(project).lat}/${getProjectCoordinates(project).lng}`
                      : (project?.mapUrl || `https://www.google.com/maps/search/?api=1&query=${getProjectCoordinates(project).lat},${getProjectCoordinates(project).lng}`)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="فتح الخريطة والإحداثيات في نافذة مستقلة"
                  className="flex items-center gap-1 p-1 px-1.5 sm:px-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[9px] sm:text-xs font-bold transition-all text-white cursor-pointer shrink-0 shadow-xs"
                >
                  <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-indigo-200" />
                  <span>تبويب خارجي</span>
                </a>
              )}
            </>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "تصغير المستعرض" : "توسيع ملء الشاشة"}
            className="p-1 sm:p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white cursor-pointer shrink-0 flex items-center justify-center animate-pulse-once"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Security and authorization info banners */}
      {isMasterMap && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-1.5 text-right w-full">
            <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="flex-1">
              <strong>مستعرض خرائط ماب المفتوحة (OpenStreetMap) التكاملي: يعرض حالياً {projects?.length || 0} نقطة جغرافية مأذونة تتبع صلاحيات حسابك الحالي.</strong>
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-1 font-mono text-[9px] bg-amber-100 px-2 py-0.5 rounded text-amber-950 shrink-0 uppercase">
            MAPS: OPENSTREETMAP_ACTIVE
          </div>
        </div>
      )}

      {/* local notification toast inside map panel */}
      {feedbackMessage && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-bold animate-in slide-in-from-top duration-300 flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Google My Maps interactive URL banner */}
      {!isMasterMap && project?.mapUrl && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-blue-900 gap-2 font-medium">
          <div className="flex items-center gap-2 text-right min-w-0 flex-1">
            <Globe className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-bold text-blue-800 shrink-0">معاينة ومخطط قوقل ماب (Google Maps):</span>
            <span className="text-slate-500 text-[11px] font-semibold">
              {isAdmin && "متاحة للملاحة بموجب صلاحيات مدير النظام"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 self-auto block">
            {isAdmin && (
              <a
                href={project.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 hover:border-blue-300 rounded font-bold transition-all text-[10px] inline-flex items-center gap-1 cursor-pointer"
              >
                <span>فتح وملاحة ↗️</span>
              </a>
            )}
            {mapMode !== 'iframe' ? (
              <button
                onClick={() => setMapMode('iframe')}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-extrabold transition-all text-[10px] animate-pulse cursor-pointer shadow-xs"
              >
                تفعيل المعاينة المدمجة 🗺️
              </button>
            ) : (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px] flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                المعاينة المدمجة نشطة
              </span>
            )}
          </div>
        </div>
      )}

      {/* Map body */}
      <div className="flex-1 bg-slate-100 relative min-h-0">
        {/* Floating map lock helper overlay for perfect page scrolling on mobile/touch screens */}
        {isLeafletReady && mapMode === 'osm' && (
          <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsMapUnlocked(!isMapUnlocked)}
              className={`p-2 px-3.5 rounded-xl shadow-lg border text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                isMapUnlocked
                  ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isMapUnlocked ? (
                <>
                  <Unlock className="h-3.5 w-3.5 shrink-0 text-blue-100" />
                  <span>تصفح الخريطة نشط (انقر للقفل)</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <span>تفعيل حركة الخريطة 🗺️</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* OpenStreetMap dynamic container */}
        <div 
          ref={mapContainerRef} 
          className={`w-full h-full ${mapMode === 'osm' ? 'block' : 'hidden'}`}
          style={{ minHeight: '100%' }}
        />

        {/* Traditional Iframe viewer fallback if chosen */}
        {mapMode === 'iframe' && (
          embedUrl ? (
            <div className="w-full h-full relative overflow-hidden bg-slate-900">
              {isIframeLoading && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-center p-6 z-20 transition-all duration-300">
                  <div className="relative flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin"></div>
                    <div className="w-10 h-10 rounded-full border-4 border-slate-705 border-t-emerald-500 animate-spin absolute" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mb-1.5">جاري جلب تفاصيل المخطط التفاعلي</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                    يتم الآن تزامن وتحميل طبقات خريطة قوقل ماب للمشروع. يرجى الانتظار لتفادي ظهور الشاشة البيضاء ومزامنة البيانات محلياً...
                  </p>
                </div>
              )}
              {/* Visual Crop overlay covering the top: The top header is pushed up by -56px and hidden by overflow-hidden */}
              <iframe
                key={project.id}
                src={embedUrl}
                title={project.name}
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

    </div>
  );
}
