/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Project } from '../types';
import { getEmbeddableMapUrl } from '../data/initialProjects';

if (typeof window !== 'undefined') {
  (window as any).L = L;
}
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
  Globe,
  Search,
  Key
} from 'lucide-react';

interface ProjectMapViewerProps {
  project: Project | null;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
  onEditClick?: (project: Project) => void;
  canEdit: boolean;
  onUpdateProjectCoordinates?: (projectId: number, lat: number, lng: number) => void;
  isAdmin?: boolean;
  canOpenExternalLinks?: boolean;
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
  isAdmin = false,
  canOpenExternalLinks = true
}: ProjectMapViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLeafletReady, setIsLeafletReady] = useState(true);
  const hasWriteAccess = isAdmin || canEdit;

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

  const projectsRef = useRef<any[]>([]);
  projectsRef.current = projects || [];

  const onSelectProjectRef = useRef<any>(null);
  onSelectProjectRef.current = onSelectProject;

  const setMapModeRef = useRef<any>(null);
  setMapModeRef.current = setMapMode;

  const onMapClickCallbackRef = useRef<(lat: number, lng: number) => void>();
  onMapClickCallbackRef.current = (lat: number, lng: number) => {
    setPendingCoords({ lat, lng });
  };

  const triggerFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // Local/Geographic search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [matchingProjects, setMatchingProjects] = useState<Project[]>([]);
  const [searchError, setSearchError] = useState('');
  const [activeSearchMarkerCoords, setActiveSearchMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const searchMarkerRef = useRef<any>(null);

  const clearSearchMarker = () => {
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }
    setActiveSearchMarkerCoords(null);
    setSearchResults([]);
    setMatchingProjects([]);
    setSearchQuery('');
    setSearchError('');
  };

  const focusOnCoordinates = (lat: number, lng: number, popupLabel: string, optProject?: Project) => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Direct OSM mode if user switches
    setMapMode('osm');

    // Remove any older search marker
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
    }

    map.setView([lat, lng], 14, { animate: true, duration: 1.0 });

    const popupHtml = `
      <div dir="rtl" class="text-right p-1.5 font-sans min-w-[200px]">
        <div class="flex items-center gap-1.5 mb-1.5 align-right">
          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">الموقع المحدد للبحث 📍</span>
          <span class="px-1.5 py-0.5 rounded text-[8.5px] bg-slate-100 text-slate-600 font-mono">GPS_MATCH</span>
        </div>
        <div class="font-extrabold text-slate-900 text-xs mb-1">${popupLabel}</div>
        <div class="text-[9px] text-slate-400 font-mono flex items-center justify-between bg-slate-50 p-1 rounded mt-2 border border-slate-100">
          <span>خط العرض: ${lat.toFixed(6)}</span>
          <span class="text-slate-300">|</span>
          <span>خط الطول: ${lng.toFixed(6)}</span>
        </div>
      </div>
    `;

    // Draw a prominent, beautiful red pulsing circle marker representing the exact geocoded match
    const searchMarkerOptions = {
      radius: 12,
      color: '#DC2626', // Red-600
      fillColor: '#FEE2E2', // Red-100
      weight: 3.5,
      opacity: 1,
      fillOpacity: 0.85,
      className: 'leaflet-active-pulse-glow'
    };

    searchMarkerRef.current = L.circleMarker([lat, lng], searchMarkerOptions)
      .bindPopup(popupHtml, { maxWidth: 260, closeButton: true })
      .addTo(map);

    setActiveSearchMarkerCoords({ lat, lng });

    setTimeout(() => {
      if (searchMarkerRef.current) {
        searchMarkerRef.current.openPopup();
      }
    }, 200);

    // If an associated project exists, select it
    if (optProject && onSelectProject) {
      onSelectProject(optProject);
    }
  };

  const handleMapSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError('');
    setSearchResults([]);
    setMatchingProjects([]);

    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) return;

    // 1. Check if the input contains coordinates (lat, lng) in various formats
    const tryExtractCoords = (text: string) => {
      // Normalise characters: remove degree/minutes symbols, N, E, Lat, Lng, and Arabic direction symbols
      const cleaned = text.replace(/[°'"’“”NnEeSsWw\u0634\u0631\u0642\u0645\u0644\u064a\u062c,;:\/]/g, ' ').trim();
      const numberPattern = /[+-]?\d+(?:\.\d+)?/g;
      const matches = cleaned.match(numberPattern);
      if (matches && matches.length >= 2) {
        const num1 = parseFloat(matches[0]);
        const num2 = parseFloat(matches[1]);
        
        // Saudi Arabia lat/lng bounds (approx 15 to 35 Lat, 30 to 60 Lng)
        if (num1 >= 15 && num1 <= 35 && num2 >= 30 && num2 <= 60) {
          return { lat: num1, lng: num2 };
        }
        if (num2 >= 15 && num2 <= 35 && num1 >= 30 && num1 <= 60) {
          return { lat: num2, lng: num1 };
        }
      }
      return null;
    };

    const parsedCoords = tryExtractCoords(cleanQuery);

    if (parsedCoords) {
      focusOnCoordinates(parsedCoords.lat, parsedCoords.lng, `الإحداثيات المدخلة: ${parsedCoords.lat.toFixed(5)}، ${parsedCoords.lng.toFixed(5)}`);
      triggerFeedback('📍 تم الانتقال للإحداثيات المعطاة على الخريطة مباشرة!');
      return;
    }

    // 2. Local Projects Match
    const normalisedQuery = cleanQuery.toLowerCase();
    const localMatches = (projects || []).filter(p => {
      if (p.id === -1) return false;
      return (
        p.name.toLowerCase().includes(normalisedQuery) ||
        (p.operationalNumber && p.operationalNumber.toLowerCase().includes(normalisedQuery)) ||
        (p.contractor && p.contractor.toLowerCase().includes(normalisedQuery)) ||
        (p.consultant && p.consultant.toLowerCase().includes(normalisedQuery)) ||
        (p.region && p.region.toLowerCase().includes(normalisedQuery))
      );
    });
    
    if (localMatches.length > 0) {
      setMatchingProjects(localMatches);
    }

    // 3. Web Geocoding match using OSM Nominatim free API
    setIsSearching(true);
    try {
      let apiQuery = cleanQuery;
      if (!apiQuery.toLowerCase().includes('رياض') && !apiQuery.toLowerCase().includes('riyadh') && !apiQuery.includes('السعودية')) {
        apiQuery += ', الرياض, السعودية';
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(apiQuery)}&limit=5&accept-language=ar`
      );
      if (!response.ok) {
        throw new Error('فشل جلب البيانات من المزود الخارجي الجغرافي.');
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        setSearchResults(data);
      } else if (localMatches.length === 0) {
        setSearchError('لم يتم العثور على أي نتائج مطابقة للاسم أو الإحداثيات. يرجى توضيح المعلمات أو المحاولة مجدداً.');
      }
    } catch (err: any) {
      console.error('Nominatim query error:', err);
      if (localMatches.length === 0) {
        setSearchError('عذراً، حدث خطأ أثناء الاتصال بمزود خرائط العنونة. يرجى تكرار المحاولة لاحقاً أو البحث بالإيجاز.');
      }
    } finally {
      setIsSearching(false);
    }
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
    // Keep mapMode on 'osm' first so they see the interactive Leaflet popup card on the map!
    setMapMode('osm');
  }, [project]);

  // Clean search marker on unmount
  useEffect(() => {
    return () => {
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
      }
    };
  }, []);

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

  // Leaflet is now statically imported and ready
  useEffect(() => {
    setIsLeafletReady(true);
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
        center: [24.4, 46.4],
        zoom: 7,
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

      // Listen to popup open to bind handlers cleanly without breaking CSP or throwing Script errors
      mapInstanceRef.current.on('popupopen', (e: any) => {
        const popup = e.popup;
        const container = popup.getElement();
        if (!container) return;
        
        // Find inspect button in the opened popup
        const switchBtn = container.querySelector('.switch-to-iframe-btn');
        if (switchBtn) {
          const id = parseInt(switchBtn.getAttribute('data-project-id') || '', 10);
          switchBtn.onclick = () => {
            const foundProject = projectsRef.current.find(p => p.id === id);
            if (foundProject) {
              if (onSelectProjectRef.current) {
                onSelectProjectRef.current(foundProject);
              }
              if (setMapModeRef.current) {
                setMapModeRef.current('iframe');
              }
            }
          };
        }
        
        const openMapsBtn = container.querySelector('.open-maps-btn');
        if (openMapsBtn) {
          const mapUrl = openMapsBtn.getAttribute('data-map-url') || '';
          openMapsBtn.onclick = () => {
            if (mapUrl) {
              try {
                window.open(mapUrl, '_blank');
              } catch (err) {
                console.error("Popup window.open failed", err);
              }
            }
          };
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
      const textToScan = ((p.scope || '') + ' ' + (p.classification || '') + ' ' + (p.name || '')).toLowerCase();
      const isSewage = textToScan.includes('صرف') || textToScan.includes('بيئية') || textToScan.includes('حمأة') || textToScan.includes('معالجة') || textToScan.includes('مياه معالجة');
      const isWater = !isSewage || textToScan.includes('مياه') || textToScan.includes('شرب') || textToScan.includes('خزانات') || textToScan.includes('خزان');
      
      let strokeColor = '#1d4ed8'; // Default blue-700
      let fillColor = '#3b82f6'; // Default blue-500
      
      if (isSewage) {
        strokeColor = '#15803d'; // green-700
        fillColor = '#10b981'; // emerald-500
      } else {
        strokeColor = '#1d4ed8'; // blue-700
        fillColor = '#3b82f6'; // blue-500
      }

      let radius = 7.5;
      let weight = 1.5;
      let opacity = 0.85;
      let fillOpacity = 0.7;

      if (isSelected) {
        radius = 12;
        weight = 3.5;
        opacity = 1.0;
        fillOpacity = 0.95;
        // Keep classification fillColor, but make high-contrast dark slate outline border
        strokeColor = '#1e293b';
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

      // Clean RTL styling inside Leaflet popups - made very compact for small mobile screens
      const popupHtml = `
        <div dir="rtl" class="text-right font-sans p-0 flex flex-col gap-1.5 w-[210px] sm:w-[255px] select-none">
          <div class="flex flex-wrap items-center gap-1 mb-0.5 justify-start">
            <span class="px-1.5 py-0.5 rounded text-[8.5px] font-black shadow-3xs ${
              isWater ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }">
              ${p.scope}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-slate-100 text-slate-700 border border-slate-200 shadow-3xs">
              ${p.classification}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[8.5px] font-black shadow-3xs ${
              (p.status || '').includes('جاري') 
                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                : (p.status || '').includes('مسحوب')
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }">
              ${p.status || ''}
            </span>
          </div>
          <h5 class="font-black text-[#0F172A] text-[11.5px] sm:text-[12.5px] leading-tight tracking-tight mb-1 text-right break-words">${p.name}</h5>
          
          <div class="text-[9.5px] text-slate-500 space-y-1 mt-0.5 border-t border-slate-100 pt-1.5 leading-normal">
            <div class="flex justify-between items-start gap-1.5 pb-0.5 border-b border-dashed border-slate-100/60"><strong class="text-slate-400 shrink-0 font-bold">الرقم التشغيلي:</strong> <span class="font-mono text-slate-800 font-extrabold text-left break-all select-all">${p.operationalNumber}</span></div>
            <div class="flex justify-between items-start gap-1.5 pb-0.5 border-b border-dashed border-slate-100/60"><strong class="text-slate-400 shrink-0 font-bold">المقاول:</strong> <span class="text-slate-800 font-extrabold text-left leading-tight">${p.contractor}</span></div>
            <div class="flex justify-between items-start gap-1.5 pb-0.5 border-b border-dashed border-slate-100/60"><strong class="text-slate-400 shrink-0 font-bold">الاستشاري:</strong> <span class="text-slate-800 font-extrabold text-left leading-tight">${p.consultant}</span></div>
            <div class="flex justify-between items-start gap-1.5"><strong class="text-slate-400 shrink-0 font-bold">النطاق:</strong> <span class="text-slate-800 font-extrabold text-left">${p.region}</span></div>
          </div>
          
          <div class="mt-2 pt-1.5 border-t border-slate-100 flex flex-col gap-1">
            <button 
              type="button"
              data-project-id="${p.id}"
              class="switch-to-iframe-btn flex items-center justify-center gap-1 w-full bg-blue-600 hover:bg-blue-500 text-white text-[9.5px] py-1.5 px-2 rounded-lg shadow-xs transition-all text-center cursor-pointer font-black border-0"
              style="text-decoration: none; color: white !important;"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-left:2px;"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
              المعاينة والتفاصيل 🔍
            </button>
            ${hasWriteAccess ? `
            <button 
              type="button"
              data-map-url="${p.mapUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}"
              class="open-maps-btn flex items-center justify-center gap-1 w-full bg-slate-100 hover:bg-slate-200 text-slate-850 text-[9.5px] py-1 px-2 rounded-lg border border-slate-200 transition-all text-center cursor-pointer font-extrabold shadow-3xs"
              style="text-decoration: none;"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-left:2px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              فتح في قوقل ماب 🌐
            </button>
            ` : ''}
          </div>
        </div>
      `;

      const marker = L.circleMarker([lat, lng], markerOptions)
        .bindPopup(popupHtml, { 
          maxWidth: 260, 
          minWidth: 210, 
          closeButton: false,
          autoPan: true,
          autoPanPadding: [12, 110]
        })
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
        // Master view: Center perfectly on the Central Sector [القطاع الأوسط] as shown in the picture
        map.setView([24.4, 46.4], 7, { animate: true });
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
          border-radius: 18px !important;
          border: 2px solid #94A3B8 !important; /* Elegant high-contrast border representing premium card container */
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1) !important;
          padding: 0 !important;
          background: #FFFFFF !important;
        }
        .leaflet-popup-content {
          margin: 14px 16px !important;
          width: auto !important;
        }
        .leaflet-popup-tip {
          background: #FFFFFF !important;
          border: 1px solid #94A3B8 !important;
          box-shadow: none !important;
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
        @media (max-width: 639px) {
          .leaflet-top.leaflet-left {
            top: auto !important;
            bottom: 124px !important;
            left: 12px !important;
          }
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
            </div>
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

          {hasWriteAccess && onEditClick && !isMasterMap && project && (
            <button
              onClick={() => onEditClick(project)}
              className="flex items-center gap-1 p-1 px-1.5 sm:px-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-[9px] sm:text-xs font-bold transition-all text-white cursor-pointer shrink-0 shadow-xs"
              title="تعديل المخطط"
            >
              <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-blue-200" />
              <span>تعديل</span>
            </button>
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
            <span className="font-bold text-blue-800 shrink-0">معاينة تقاصيل المشروع:</span>
            <span className="text-slate-500 text-[11px] font-semibold">
              {isAdmin && ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 self-auto block">
            {canOpenExternalLinks !== false && (
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
                تفعيل المعاينة🗺️
              </button>
            ) : (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px] flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                المعاينة نشطة
              </span>
            )}
          </div>
        </div>
      )}

      {/* Map body */}
      <div className="flex-1 bg-slate-100 relative min-h-0">
        {/* Floating map search bar panel */}
        {isLeafletReady && mapMode === 'osm' && (
          <div className="absolute top-3 right-3 z-[1001] text-right font-sans">
            {!isSearchExpanded ? (
              <button
                type="button"
                onClick={() => setIsSearchExpanded(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-blue-600 font-black text-xs rounded-xl border border-slate-200/80 shadow-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                dir="rtl"
              >
                <Search className="h-4 w-4 text-blue-500 shrink-0" />
                <span>بحث 🔎</span>
              </button>
            ) : (
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col w-[290px] sm:w-[350px] max-w-[calc(100vw-32px)] transition-all duration-300">
                <form onSubmit={handleMapSearch} className="flex items-center gap-1.5 p-2 bg-slate-50 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchExpanded(false);
                      clearSearchMarker();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 shrink-0 cursor-pointer border-0"
                    title="إغلاق وإخفاء البحث"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم، الشارع، الحي، أو الإحداثيات..."
                      className="w-full text-right text-xs pr-2.5 pl-7 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-bold placeholder-slate-400"
                      dir="rtl"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearchMarker}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
                        title="مسح البحث والرجوع"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-xs font-black rounded-lg cursor-pointer shrink-0 transition-colors shadow-xs flex items-center justify-center gap-1 border-0"
                  >
                    {isSearching ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>بحث</span>
                    )}
                  </button>
                </form>

                {/* Quick interactive search guide tip */}
                <div className="px-3 py-1.5 bg-blue-500/5 text-[9.5px] text-slate-500 font-bold border-b border-slate-100/80 flex items-center justify-between select-none">
                  <span className="text-blue-700">🔎 تلميح البحث السريع:</span>
                  <span className="text-slate-600"> "" "24.71, 46.67"</span>
                </div>

              {/* Error indicator */}
              {searchError && (
                <div className="p-2.5 px-3 bg-rose-50 border-b border-rose-100 text-[10px] text-rose-700 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <p className="flex-1 leading-normal text-right">{searchError}</p>
                </div>
              )}

              {/* Quick info if active search marker */}
              {activeSearchMarkerCoords && !searchResults.length && !matchingProjects.length && !searchError && (
                <div className="p-2 px-3 bg-purple-50 text-[10px] text-purple-700 font-bold flex items-center justify-between">
                  <span>تم تحديد الإحداثيات على الخريطة</span>
                  <button 
                    type="button" 
                    onClick={clearSearchMarker} 
                    className="text-purple-900 underline font-bold cursor-pointer hover:text-purple-950 border-0 bg-transparent text-[10px]"
                  >
                    إلغاء التحديد ✖
                  </button>
                </div>
              )}

              {/* Local projects matched results */}
              {matchingProjects.length > 0 && (
                <div className="flex flex-col max-h-[145px] overflow-y-auto divide-y divide-slate-100 border-b border-slate-105">
                  <div className="p-1 px-2.5 bg-blue-50 text-[9.5px] font-black text-blue-800 text-right">
                    المشاريع التابعة للمطابقة المحلّية ({matchingProjects.length})
                  </div>
                  {matchingProjects.map((proj) => (
                    <button
                      key={`local-search-${proj.id}`}
                      type="button"
                      onClick={() => {
                        const { lat, lng } = getProjectCoordinates(proj);
                        focusOnCoordinates(lat, lng, proj.name, proj);
                      }}
                      className="p-2 px-3 text-right hover:bg-[#F8FAFC] transition-colors flex flex-col w-full text-xs font-semibold text-slate-705 cursor-pointer border-0 bg-transparent"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate text-[11px] leading-tight text-right flex-1 text-slate-800 font-extrabold">{proj.name}</span>
                        <span className="text-[8.5px] shrink-0 font-bold px-1.5 bg-blue-100 text-blue-700 rounded-sm mr-2">{proj.classification}</span>
                      </div>
                      <span className="text-[9.5px] text-slate-400 font-bold mt-1 text-right">الجهة: {proj.region} | فئة: {proj.scope}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Nominatim dynamic Geocoding API results */}
              {searchResults.length > 0 && (
                <div className="flex flex-col max-h-[165px] overflow-y-auto divide-y divide-slate-100">
                  <div className="p-1 px-2.5 bg-emerald-50 text-[9.5px] font-black text-emerald-800 text-right">
                    نتائج العنونة ومطابقة الشوارع والأحياء العامة ({searchResults.length})
                  </div>
                  {searchResults.map((result: any, idx: number) => (
                    <button
                      key={`geo-search-${idx}`}
                      type="button"
                      onClick={() => {
                        const lat = parseFloat(result.lat);
                        const lng = parseFloat(result.lon);
                        focusOnCoordinates(lat, lng, result.display_name.split(',')[0] || searchQuery);
                      }}
                      className="p-2 px-3 text-right hover:bg-[#F8FAFC] transition-colors flex items-start gap-2 w-full text-xs text-slate-700 cursor-pointer border-0 bg-transparent"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold truncate text-[11px] text-slate-800 text-right leading-tight">
                          {result.display_name.split(',')[0]}
                        </p>
                        <p className="text-[9.5px] text-slate-400 truncate text-right font-medium leading-none mt-1">
                          {result.display_name.split(',').slice(1, 4).join(', ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        )}

        {/* Floating map lock helper overlay for perfect page scrolling on mobile/touch screens */}
        {isLeafletReady && mapMode === 'osm' && (
          <div className="absolute top-[90px] left-3 z-[1000] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsMapUnlocked(!isMapUnlocked)}
              title={isMapUnlocked ? "تعطيل تحريك الخريطة (وضع التمرير الآمن)" : "تمكين تحريك وتصفح الخريطة 🗺️"}
              className={`w-10 h-10 rounded-xl shadow-lg border flex items-center justify-center cursor-pointer select-none transition-all active:scale-95 relative ${
                isMapUnlocked
                  ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700 hover:scale-[1.05]'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:scale-[1.05]'
              }`}
            >
              {/* Pulsing Alert Beacon */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isMapUnlocked ? 'bg-emerald-400' : 'bg-rose-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  isMapUnlocked ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></span>
              </span>

              {isMapUnlocked ? (
                <Unlock className="h-5 w-5 shrink-0" />
              ) : (
                <Lock className="h-5 w-5 shrink-0 text-rose-600 animate-pulse" />
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

        {/* Floating map classification legend block */}
        {isLeafletReady && mapMode === 'osm' && (
          <div className="absolute bottom-4 left-4 z-[999] flex flex-col items-end gap-2" dir="rtl">
            {!isLegendExpanded ? (
              <button
                type="button"
                onClick={() => setIsLegendExpanded(true)}
                title="مفاتيح الخريطة"
                className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/85 shadow-lg flex items-center justify-center text-blue-600 transition-all active:scale-95 hover:scale-105 cursor-pointer"
              >
                <Key className="h-5 w-5 text-blue-500 animate-pulse" />
              </button>
            ) : (
              <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-xl border border-slate-200/80 text-xs font-bold text-slate-700 flex flex-col gap-2 min-w-[120px] text-right animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-0.5 gap-4">
                  <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                    <Key className="h-3 w-3 text-blue-500" />
                    مفاتيح الخريطة
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLegendExpanded(false)}
                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer border-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] border border-blue-700 flex-shrink-0"></span>
                  <span className="text-[11px] text-slate-800">مياه 💧</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] border border-green-700 flex-shrink-0"></span>
                  <span className="text-[11px] text-slate-800">صرف 🌿</span>
                </div>
              </div>
            )}
          </div>
        )}

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
                    جاري المعالجة...
                  </p>
                </div>
              )}
              {/* Visual Crop overlay covering the top and bottom: The top header is pushed up by -56px, and the bottom footer is pushed down by 40px and hidden by overflow-hidden */}
              <iframe
                key={project.id}
                src={embedUrl}
                title={project.name}
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
        {!isMasterMap ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              الاستشاري المشرف:
            </span>
            <span className="text-slate-600 truncate max-w-[200px]">
              {project?.consultant}
            </span>
          </div>
        ) : (
          <div />
        )}
        
        {isMasterMap ? (
          <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px] bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-600" />
            <span>مشاريع القطاع الاوسط</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>التصنيف : {project?.classification}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>الحالة: <span className="text-emerald-700 font-bold">{project?.status}</span></span>
          </div>
        )}
      </div>

    </div>
  );
}
