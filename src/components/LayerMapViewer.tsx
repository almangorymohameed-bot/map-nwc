import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { KMZLayer, KMZFeature, Project } from '../types';
import { parseKMZFile } from '../utils/kmzParser';
import { 
  Plus, Trash2, Layers, Upload, Download, Eye, EyeOff, Edit, Check, X, 
  MapPin, Share2, Award, Info, RefreshCw, FolderOpen, Save, FileCode, CheckSquare, Link,
  Image, UploadCloud
} from 'lucide-react';

interface LayerMapViewerProps {
  hasWriteAccess: boolean;
  onFeedback: (message: string) => void;
  projects?: Project[];
}

// Beautiful Pre-seeded Layers for Riyadh to match the user's screenshots perfectly!
const SEED_LAYERS: KMZLayer[] = [
  {
    id: 'seed-future',
    name: 'مشاريع مستقبلي (المرحلة 1)',
    fileName: 'future_projects.kmz',
    visible: true,
    color: '#8b5cf6', // Indigo/Purple
    features: [
      {
        type: 'polygon',
        name: 'نطاق مشاريع الملقا والياسمين',
        description: 'توسعة شبكات الصرف الصحي والتغذية المستقبلية للأحياء الشمالية',
        coordinates: [
          [24.825, 46.590],
          [24.845, 46.615],
          [24.830, 46.645],
          [24.805, 46.610],
          [24.825, 46.590] // Closed
        ]
      },
      {
        type: 'point',
        name: 'محطة ضخ شمال الرياض المقترحة',
        description: 'السعة المستهدفة: 150 ألف متر مكعب يومياً',
        coordinates: [[24.835, 46.625]]
      }
    ]
  },
  {
    id: 'seed-water',
    name: 'شبكة المياه القائمة',
    fileName: 'existing_water_grid.kmz',
    visible: true,
    color: '#3b82f6', // NWC Blue
    features: [
      {
        type: 'polyline',
        name: 'الخط الناقل الرئيسي قطر 1200ملم',
        description: 'خط مياه صالح للشرب ناقل من محطة التحلية باتجاه خزانات حطين',
        coordinates: [
          [24.770, 46.580],
          [24.785, 46.610],
          [24.805, 46.635],
          [24.815, 46.670]
        ]
      },
      {
        type: 'polygon',
        name: 'خزانات ومحطات ضخ غرب الرياض',
        description: 'منطقة حماية الخزانات الاستراتيجية للمياه العذبة',
        coordinates: [
          [24.730, 46.540],
          [24.750, 46.550],
          [24.745, 46.570],
          [24.720, 46.560],
          [24.730, 46.540]
        ]
      }
    ]
  },
  {
    id: 'seed-sewage',
    name: 'مشاريع الصرف الصحي الجاري تنفيذها',
    fileName: 'active_sewage.kmz',
    visible: true,
    color: '#10b981', // Emerald Green
    features: [
      {
        type: 'polygon',
        name: 'نطاق حي النرجس والقرطبة',
        description: 'عقود التوصيلات المنزلية وربط الشبكات الفرعية للمياه الرمادية والصرف',
        coordinates: [
          [24.820, 46.690],
          [24.850, 46.710],
          [24.835, 46.740],
          [24.800, 46.720],
          [24.820, 46.690]
        ]
      }
    ]
  }
];

export default function LayerMapViewer({ hasWriteAccess, onFeedback, projects = [] }: LayerMapViewerProps) {
  // 1. Core State Managers
  const [layers, setLayers] = useState<KMZLayer[]>(() => {
    const saved = localStorage.getItem('nwc_project_layers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Error loading saved layers, resetting to seeds', e);
      }
    }
    return SEED_LAYERS;
  });

  const [activeLayerId, setActiveLayerId] = useState<string>(() => {
    const saved = localStorage.getItem('nwc_project_layers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      } catch {}
    }
    return 'seed-future';
  });

  // Selected feature for information details editing/display
  const [selectedFeature, setSelectedFeature] = useState<{ layerId: string; index: number } | null>(null);

  // Drawing tools state
  // 'none' | 'polygon' | 'polyline' | 'point'
  const [drawingMode, setDrawingMode] = useState<'none' | 'polygon' | 'polyline' | 'point'>('none');
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [tempFeatureName, setTempFeatureName] = useState('');
  const [tempFeatureDesc, setTempFeatureDesc] = useState('');
  const [tempFeatureImageUrl, setTempFeatureImageUrl] = useState('');

  // Editing existing geometry/details state
  const [isEditingVertices, setIsEditingVertices] = useState(false);
  const [isEditingFeatureDetails, setIsEditingFeatureDetails] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [editingImageUrl, setEditingImageUrl] = useState('');
  const [editingFeaturePath, setEditingFeaturePath] = useState<{ layerId: string; index: number } | null>(null);

  // New layer creation modal / inline state
  const [showAddLayerInline, setShowAddLayerInline] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#3b82f6');
  const [newLayerProjectId, setNewLayerProjectId] = useState<number | 'none'>('none');

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Storage of active leaflet layer groups to toggle Visibilities smoothly
  const leafletLayersRef = useRef<{ [layerId: string]: L.FeatureGroup }>({});
  // Draggable edit markers ref
  const editMarkersGroupRef = useRef<L.FeatureGroup | null>(null);

  // Ref to synchronize drawing states into events cleanly without closure staleness
  const drawingStateRef = useRef({
    mode: drawingMode,
    points: drawingPoints
  });

  useEffect(() => {
    drawingStateRef.current = {
      mode: drawingMode,
      points: drawingPoints
    };
  }, [drawingMode, drawingPoints]);

  // Synchronize selected feature details into editing states
  useEffect(() => {
    if (selectedFeature) {
      const layer = layers.find(l => l.id === selectedFeature.layerId);
      const feat = layer?.features[selectedFeature.index];
      if (feat) {
        setEditingName(feat.name);
        setEditingDesc(feat.description || '');
        setEditingImageUrl(feat.imageUrl || '');
      }
    } else {
      setIsEditingFeatureDetails(false);
    }
  }, [selectedFeature]);

  // Persist layers in local storage
  useEffect(() => {
    localStorage.setItem('nwc_project_layers', JSON.stringify(layers));
  }, [layers]);

  // 2. Setup Leaflet Map on Mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map with center at Riyadh
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [24.75, 46.67],
        zoom: 11,
        zoomControl: true,
        attributionControl: true
      });

      // Free public high-contrast map tiles suitable for GIS digitization
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
      }).addTo(mapInstanceRef.current);

      // Setup group for drag handles
      editMarkersGroupRef.current = L.featureGroup().addTo(mapInstanceRef.current);

      // Handle map clicks for DRAWING geometry manually
      mapInstanceRef.current.on('click', (e: any) => {
        const { mode, points } = drawingStateRef.current;
        if (mode === 'none') return;

        const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];

        if (mode === 'point') {
          // Immediately open save popup for Point marker
          setDrawingPoints([newPoint]);
          // Prompt name
          setTempFeatureName('نقطة جديدة');
          setTempFeatureDesc('معلم جاري إضافته يدوياً');
        } else {
          // Add vertex for Polygon or Polyline
          setDrawingPoints([...points, newPoint]);
        }
      });
    }

    // High precision resize responder
    const map = mapInstanceRef.current;
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Render Layers & Geometries dynamically onto map when layers/visibility change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old layers
    Object.keys(leafletLayersRef.current).forEach(layerId => {
      leafletLayersRef.current[layerId].remove();
      delete leafletLayersRef.current[layerId];
    });

    // Draw active layers
    layers.forEach(layer => {
      if (!layer.visible) return;

      const layerGroup = L.featureGroup();

      layer.features.forEach((feature, index) => {
        let leafletObj: L.Layer | null = null;

        if (feature.type === 'polygon' && feature.coordinates.length > 2) {
          leafletObj = L.polygon(feature.coordinates as L.LatLngExpression[], {
            color: layer.color,
            fillColor: layer.color,
            fillOpacity: 0.35,
            weight: 3,
            dashArray: layer.id === 'seed-future' ? '5, 5' : undefined
          });
        } else if (feature.type === 'polyline' && feature.coordinates.length > 1) {
          leafletObj = L.polyline(feature.coordinates as L.LatLngExpression[], {
            color: layer.color,
            weight: 4,
            opacity: 0.85
          });
        } else if (feature.type === 'point' && feature.coordinates.length > 0) {
          const coord = feature.coordinates[0];
          // Custom beautiful SVG marker representing water infrastructure
          const pointIcon = L.divIcon({
            html: `
              <div class="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow-md relative" style="background-color: ${layer.color}">
                <div class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            `,
            className: 'bg-transparent border-0',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          leafletObj = L.marker(coord as L.LatLngExpression, { icon: pointIcon });
        }

        if (leafletObj) {
          // Interactive detailed popup
          const popupContent = `
            <div dir="rtl" class="text-right font-sans p-1 min-w-[200px]">
              <div class="flex items-center gap-1.5 mb-1.5 justify-start">
                <span class="px-2 py-0.5 rounded-md text-[9px] font-extrabold text-white shadow-3xs" style="background-color: ${layer.color}">
                  طبقة: ${layer.name}
                </span>
                <span class="px-1.5 py-0.5 rounded text-[8px] bg-slate-100 text-slate-500 border border-slate-200">
                  ${feature.type === 'polygon' ? 'مضلع مغلق' : feature.type === 'polyline' ? 'مسار/أنبوب' : 'موقع/محطة'}
                </span>
              </div>
              <h5 class="font-extrabold text-[#0F172A] text-xs mb-1">${feature.name}</h5>
              <p class="text-[10px] text-slate-500 leading-relaxed mb-1">${feature.description || 'لا يوجد وصف.'}</p>
              ${feature.imageUrl ? `
                <div class="my-2 overflow-hidden rounded-lg border border-slate-100 max-h-[110px] bg-slate-50 flex items-center justify-center">
                  <img src="${feature.imageUrl}" class="w-full h-auto max-h-[110px] object-cover" alt="المرفق" />
                </div>
              ` : ''}
              <div class="text-[8.5px] text-slate-400 font-mono">
                الموقع: ${feature.coordinates[0]?.[0]?.toFixed(5)}, ${feature.coordinates[0]?.[1]?.toFixed(5)}
              </div>
            </div>
          `;

          leafletObj.bindPopup(popupContent, { closeButton: true });

          // Click handler to select feature in sidebar
          leafletObj.on('click', () => {
            setSelectedFeature({ layerId: layer.id, index });
          });

          leafletObj.addTo(layerGroup);
        }
      });

      layerGroup.addTo(map);
      leafletLayersRef.current[layer.id] = layerGroup;
    });

  }, [layers]);

  // 4. Render Dynamic Drawing Overlay dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Use a temporary canvas/polyline layer to draw current active points
    const tempGroup = L.featureGroup().addTo(map);

    if (drawingPoints.length > 0) {
      // 1. Draw points as mini blue circles
      drawingPoints.forEach((pt, idx) => {
        L.circleMarker(pt, {
          radius: 5,
          color: '#1e3a8a',
          fillColor: '#3b82f6',
          fillOpacity: 1,
          weight: 2
        }).addTo(tempGroup);
      });

      // 2. Draw connecting shape
      if (drawingMode === 'polygon' && drawingPoints.length > 1) {
        L.polygon(drawingPoints, {
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.25,
          weight: 2.5,
          dashArray: '4, 4'
        }).addTo(tempGroup);
      } else if (drawingMode === 'polyline' && drawingPoints.length > 1) {
        L.polyline(drawingPoints, {
          color: '#2563eb',
          weight: 3,
          dashArray: '4, 4'
        }).addTo(tempGroup);
      }
    }

    return () => {
      tempGroup.remove();
    };
  }, [drawingPoints, drawingMode]);

  // 5. Render Draggable Vertices for EDIT mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !editMarkersGroupRef.current) return;

    // Clear previous edit markers
    editMarkersGroupRef.current.clearLayers();

    if (isEditingVertices && editingFeaturePath) {
      const { layerId, index } = editingFeaturePath;
      const targetLayer = layers.find(l => l.id === layerId);
      const targetFeature = targetLayer?.features[index];

      if (targetFeature) {
        targetFeature.coordinates.forEach((coord, vertexIdx) => {
          const handleIcon = L.divIcon({
            html: `<div class="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-md cursor-move"></div>`,
            className: 'bg-transparent border-0',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          const handleMarker = L.marker(coord as L.LatLngExpression, {
            icon: handleIcon,
            draggable: true
          });

          handleMarker.on('drag', (e: any) => {
            const newLat = e.latlng.lat;
            const newLng = e.latlng.lng;

            // Deep copy and update layers state instantly
            setLayers(prev => prev.map(l => {
              if (l.id !== layerId) return l;
              return {
                ...l,
                features: l.features.map((f, fIdx) => {
                  if (fIdx !== index) return f;
                  const newCoords = [...f.coordinates];
                  newCoords[vertexIdx] = [newLat, newLng];
                  
                  // For polygon, if we drag the first point, make sure the closed last point matches
                  if (f.type === 'polygon' && vertexIdx === 0) {
                    newCoords[newCoords.length - 1] = [newLat, newLng];
                  }
                  if (f.type === 'polygon' && vertexIdx === newCoords.length - 1) {
                    newCoords[0] = [newLat, newLng];
                  }

                  return { ...f, coordinates: newCoords };
                })
              };
            }));
          });

          handleMarker.addTo(editMarkersGroupRef.current!);
        });

        // Auto fly to show vertices clearly
        if (targetFeature.coordinates.length > 0) {
          map.panTo(targetFeature.coordinates[0]);
        }
      }
    }
  }, [isEditingVertices, editingFeaturePath]);

  // 6. Handle KMZ File Upload
  const handleKMZImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    onFeedback(`جاري معالجة وتحليل ملف الطبقة: ${file.name}...`);

    try {
      const parsed = await parseKMZFile(file);
      
      if (parsed.features.length === 0) {
        onFeedback('⚠️ الملف المقروء فارغ ولا يحتوي على أي مضلعات أو مسارات صالحة.');
        return;
      }

      // Add as a new layer
      const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      const newLayer: KMZLayer = {
        id: `layer-${Date.now()}`,
        name: parsed.name,
        fileName: file.name,
        visible: true,
        color: randomColor,
        features: parsed.features
      };

      setLayers(prev => [...prev, newLayer]);
      setActiveLayerId(newLayer.id);
      onFeedback(`✅ تم استيراد طبقة [${parsed.name}] وتحميلها بالنظام بنجاح مع عدد ${parsed.features.length} معالم جغرافية!`);

      // Fly map to first parsed feature
      const map = mapInstanceRef.current;
      if (map && parsed.features.length > 0 && parsed.features[0].coordinates.length > 0) {
        map.flyTo(parsed.features[0].coordinates[0], 12);
      }
    } catch (err: any) {
      console.error(err);
      onFeedback(`❌ فشل استيراد ملف KMZ: ${err.message || err}`);
    }

    // Reset file input
    e.target.value = '';
  };

  // 7. Toggle Layer Visibility
  const toggleLayerVisible = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  // Delete layer completely
  const handleDeleteLayer = (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف طبقة [${name}] بالكامل مع كافة المعالم داخلها؟`)) return;
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) {
      setActiveLayerId(layers[0]?.id || '');
    }
    setSelectedFeature(null);
    onFeedback(`🗑️ تم حذف الطبقة [${name}] بنجاح.`);
  };

  // Handle project select change to auto-fill layer name and associate ID
  const handleProjectSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'none') {
      setNewLayerProjectId('none');
    } else {
      const pId = parseInt(val, 10);
      setNewLayerProjectId(pId);
      const matched = projects.find(p => p.id === pId);
      if (matched) {
        setNewLayerName(matched.name);
      }
    }
  };

  // Create new empty layer
  const handleCreateEmptyLayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayerName.trim()) return;

    const linkedProjId = newLayerProjectId !== 'none' ? newLayerProjectId : undefined;
    const linkedProj = linkedProjId ? projects.find(p => p.id === linkedProjId) : null;

    const newLayer: KMZLayer = {
      id: `layer-${Date.now()}`,
      name: newLayerName.trim(),
      fileName: linkedProj ? `مرتبط بالمشروع: ${linkedProj.name}` : 'ملف محلي مرسوم',
      visible: true,
      color: newLayerColor,
      features: [],
      projectId: linkedProjId
    };

    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    setNewLayerName('');
    setNewLayerProjectId('none');
    setShowAddLayerInline(false);
    
    if (linkedProj) {
      onFeedback(`📁 تم إنشاء طبقة جديدة باسم [${newLayer.name}] وربطها تلقائياً بالمشروع [${linkedProj.name}] بنجاح.`);
    } else {
      onFeedback(`📁 تم إنشاء طبقة جديدة باسم [${newLayer.name}]، يمكنك البدء بالرسم عليها الآن.`);
    }
  };

  // 8. Handle Saving Drawn Shape
  const handleSaveDrawing = () => {
    if (drawingPoints.length === 0) return;
    if (!activeLayerId) {
      onFeedback('⚠️ يرجى تحديد طبقة لتخزين المعلم الجديد داخلها أولاً.');
      return;
    }

    let finalPoints = [...drawingPoints];

    // Auto close Polygon
    if (drawingMode === 'polygon') {
      if (finalPoints.length < 3) {
        onFeedback('المضلع يتطلب 3 نقاط على الأقل للرسم.');
        return;
      }
      // Ensure starting and ending match to close loop
      const start = finalPoints[0];
      const end = finalPoints[finalPoints.length - 1];
      if (start[0] !== end[0] || start[1] !== end[1]) {
        finalPoints.push([start[0], start[1]]);
      }
    } else if (drawingMode === 'polyline' && finalPoints.length < 2) {
      onFeedback('المسار الخطي يتطلب نقطتين على الأقل.');
      return;
    }

    const newFeature: KMZFeature = {
      type: drawingMode as 'polygon' | 'polyline' | 'point',
      name: tempFeatureName.trim() || `معلم جديد ${Date.now().toString().slice(-4)}`,
      description: tempFeatureDesc.trim() || 'تم رسم هذا المعلم مباشرة على خريطة النظام التفاعلية NWC.',
      coordinates: finalPoints,
      imageUrl: tempFeatureImageUrl.trim() || undefined
    };

    setLayers(prev => prev.map(l => {
      if (l.id !== activeLayerId) return l;
      return {
        ...l,
        features: [...l.features, newFeature]
      };
    }));

    onFeedback(`💾 تم حفظ الشكل [${newFeature.name}] بنجاح داخل الطبقة المحددة.`);
    
    // Clear drawing state
    setDrawingPoints([]);
    setDrawingMode('none');
    setTempFeatureName('');
    setTempFeatureDesc('');
    setTempFeatureImageUrl('');
  };

  // Cancel Drawing
  const handleCancelDrawing = () => {
    setDrawingPoints([]);
    setDrawingMode('none');
    setTempFeatureName('');
    setTempFeatureDesc('');
    setTempFeatureImageUrl('');
    onFeedback('تم إلغاء عملية الرسم الحالية.');
  };

  // Delete individual feature inside layer
  const handleDeleteFeature = (layerId: string, idx: number, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المعلم [${name}] من هذه الطبقة؟`)) return;

    setLayers(prev => prev.map(l => {
      if (l.id !== layerId) return l;
      return {
        ...l,
        features: l.features.filter((_, fIdx) => fIdx !== idx)
      };
    }));

    setSelectedFeature(null);
    setIsEditingVertices(false);
    setEditingFeaturePath(null);
    onFeedback(`🗑️ تم حذف المعلم [${name}] بنجاح.`);
  };

  // Export current layers to JSON representing DB backups
  const handleExportLayersJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(layers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nwc_project_layers_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onFeedback('📥 تم تصدير بيانات الطبقات بنجاح لحفظها بنسخة احتياطية.');
  };

  // Selected feature references
  const activeLayerObj = layers.find(l => l.id === activeLayerId);
  const selectedFeatureObj = selectedFeature 
    ? layers.find(l => l.id === selectedFeature.layerId)?.features[selectedFeature.index]
    : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      {/* Sidebar: Layer management and list of items */}
      <div className="xl:col-span-1 flex flex-col gap-5">
        
        {/* Layer Manager Panel */}
        <div dir="rtl" className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">إدارة طبقات الخرائط</h3>
                <p className="text-[10px] text-slate-400">تحميل KMZ، تحكم بالرسم والعرض</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddLayerInline(!showAddLayerInline)}
              className="p-1.5 hover:bg-slate-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title="إضافة طبقة فارغة جديدة"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Create Empty Layer Inline */}
          {showAddLayerInline && (() => {
            const ongoingProjects = projects.filter(p => p.status === 'جاري');
            const otherProjects = projects.filter(p => p.status !== 'جاري');
            return (
              <form onSubmit={handleCreateEmptyLayer} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-col gap-2.5 animate-in slide-in-from-top duration-200">
                <h4 className="text-[11px] font-extrabold text-slate-700">إنشاء طبقة جديدة يدويّاً</h4>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Link className="w-3 h-3 text-indigo-500" />
                    ربط بمشروع مسجل في البوابة:
                  </label>
                  <select
                    value={newLayerProjectId}
                    onChange={handleProjectSelectChange}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
                  >
                    <option value="none">--- طبقة حرة (غير مرتبطة بمشروع) ---</option>
                    {ongoingProjects.length > 0 && (
                      <optgroup label="المشاريع الجارية (تم اختيارها تلقائياً)">
                        {ongoingProjects.map(p => (
                          <option key={p.id} value={p.id}>
                            🟢 {p.name} ({p.operationalNumber || 'بدون رقم تشغيلي'})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherProjects.length > 0 && (
                      <optgroup label="باقي المشاريع المسجلة بقاعدة البيانات">
                        {otherProjects.map(p => (
                          <option key={p.id} value={p.id}>
                            ⚪ {p.name} ({p.operationalNumber || 'بدون رقم تشغيلي'})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="اسم الطبقة (سيتم تعبئته تلقائياً عند اختيار مشروع)"
                    value={newLayerName}
                    onChange={e => setNewLayerName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    required
                  />
                  <input
                    type="color"
                    value={newLayerColor}
                    onChange={e => setNewLayerColor(e.target.value)}
                    className="w-10 h-8 rounded-xl cursor-pointer p-0 border-0 outline-none shrink-0"
                    title="لون الطبقة على الخريطة"
                  />
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddLayerInline(false);
                      setNewLayerProjectId('none');
                      setNewLayerName('');
                    }}
                    className="px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-2xs hover:bg-indigo-500 cursor-pointer"
                  >
                    إنشاء الطبقة والربط
                  </button>
                </div>
              </form>
            );
          })()}

          {/* List of Layers */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {layers.map(layer => {
              const isSelected = layer.id === activeLayerId;
              const linkedProject = layer.projectId ? projects.find(p => p.id === layer.projectId) : null;
              return (
                <div 
                  key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected 
                      ? 'bg-indigo-50/50 border-indigo-200 shadow-3xs' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Color indicator */}
                      <span 
                        className="w-3 h-3 rounded-full shrink-0 border border-white shadow-2xs" 
                        style={{ backgroundColor: layer.color }}
                      ></span>
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate" title={layer.name}>
                          {layer.name}
                        </h4>
                        {linkedProject && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[8.5px] font-extrabold mt-0.5">
                            <Link className="w-2.5 h-2.5 shrink-0" />
                            مشروع جاري: {linkedProject.operationalNumber || 'مسجل'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {/* Visible Switch */}
                      <button
                        onClick={() => toggleLayerVisible(layer.id)}
                        className={`p-1 rounded-lg transition-colors ${
                          layer.visible ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 hover:bg-slate-50'
                        }`}
                        title="إظهار/إخفاء الطبقة بالكامل على الخارطة"
                      >
                        {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>

                      {/* Delete layer */}
                      {hasWriteAccess && (
                        <button
                          onClick={() => handleDeleteLayer(layer.id, layer.name)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="حذف الطبقة نهائياً"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[9.5px] text-slate-400 border-t border-slate-100 pt-1.5 mt-0.5">
                    <span>{layer.features.length} معالم جغرافية</span>
                    <span className="truncate max-w-[120px] text-left font-mono text-[8px]">{layer.fileName}</span>
                  </div>
                </div>
              );
            })}

            {layers.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs">
                لا توجد طبقات محملة حالياً، يرجى إضافة طبقة أو استيراد ملف KMZ.
              </div>
            )}
          </div>

          {/* Import KMZ / Backup Tools */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
            <label className="flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-[10px] font-extrabold cursor-pointer transition-colors text-center shadow-3xs">
              <Upload className="h-3.5 w-3.5 text-indigo-600" />
              <span>استيراد KMZ</span>
              <input
                type="file"
                accept=".kmz,.kml"
                onChange={handleKMZImport}
                className="hidden"
              />
            </label>

            <button
              onClick={handleExportLayersJSON}
              className="flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-[10px] font-extrabold cursor-pointer transition-colors text-center shadow-3xs"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>تصدير النسخة</span>
            </button>
          </div>

        </div>

        {/* Selected Feature Info Box */}
        {selectedFeatureObj && (
          <div dir="rtl" className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3.5 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold text-indigo-950">تفاصيل المعلم المحدد</h4>
              <button 
                onClick={() => {
                  setSelectedFeature(null);
                  setIsEditingVertices(false);
                  setIsEditingFeatureDetails(false);
                  setEditingFeaturePath(null);
                }}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {isEditingFeatureDetails ? (
              <div className="space-y-3 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold text-slate-500">اسم المعلم الجغرافي:</label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold text-slate-500">الوصف والتفاصيل:</label>
                  <textarea
                    value={editingDesc}
                    onChange={e => setEditingDesc(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex flex-col gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="text-[10px] font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                    إرفاق صور أو مستند رقمي للموقع:
                  </label>

                  {/* Local Uploader */}
                  <label className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-700 text-[10px] font-bold cursor-pointer transition-colors shadow-3xs text-center">
                    <UploadCloud className="h-4 w-4 text-indigo-500" />
                    <span>رفع صورة محلية مباشرة (Base64)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setEditingImageUrl(reader.result);
                              onFeedback('📸 تم رفع الصورة بنجاح وتجهيزها للحفظ.');
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Google Drive Guide */}
                  <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 text-[10px] text-slate-700 leading-normal flex flex-col gap-1">
                    <span className="font-extrabold text-indigo-950">📁 تخزين الصور سحابياً في قوقل درايف:</span>
                    <p className="text-[9px] text-slate-500">يمكنك رفع الصور مباشرة إلى مجلد الدرايف المشترك أدناه ثم إرفاق رابطه بالأسفل:</p>
                    <a 
                      href="https://drive.google.com/drive/folders/1TKChKu05nDEgvFMwUB6eVzAdyURppEUr?usp=sharing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[9px] text-indigo-600 hover:text-indigo-800 font-extrabold underline self-start"
                    >
                      <Link className="w-2.5 h-2.5" />
                      مجلد قوقل درايف المشترك لمشروع الرقمنة ↗
                    </a>
                  </div>

                  {/* Image URL Input */}
                  <input
                    type="url"
                    placeholder="ضع رابط الصورة أو رابط قوقل درايف هنا"
                    value={editingImageUrl}
                    onChange={e => setEditingImageUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
                    dir="ltr"
                  />

                  {editingImageUrl && (
                    <div className="relative mt-1 rounded-xl overflow-hidden border border-slate-200 max-h-[80px] bg-slate-100 flex items-center justify-center">
                      <img src={editingImageUrl} className="h-full w-auto max-h-[80px] object-cover" alt="المرفق المعاين" />
                      <button
                        type="button"
                        onClick={() => setEditingImageUrl('')}
                        className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full hover:bg-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setIsEditingFeatureDetails(false);
                    }}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      setLayers(prev => prev.map(l => {
                        if (l.id !== selectedFeature.layerId) return l;
                        return {
                          ...l,
                          features: l.features.map((f, fIdx) => {
                            if (fIdx !== selectedFeature.index) return f;
                            return {
                              ...f,
                              name: editingName.trim() || f.name,
                              description: editingDesc.trim(),
                              imageUrl: editingImageUrl.trim() || undefined
                            };
                          })
                        };
                      }));
                      onFeedback(`✅ تم تعديل تفاصيل المعلم [${editingName}] وحفظ المرفق بنجاح.`);
                      setIsEditingFeatureDetails(false);
                    }}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-extrabold cursor-pointer text-center"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-[11px] border-b border-dashed border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold">الاسم الحالي:</span>
                    <span className="text-slate-800 font-extrabold">{selectedFeatureObj.name}</span>
                  </div>
                  <div className="flex justify-between text-[11px] border-b border-dashed border-slate-100 pb-1.5">
                    <span className="text-slate-400 font-bold">النوع جغرافي:</span>
                    <span className="text-slate-800 font-bold">
                      {selectedFeatureObj.type === 'polygon' ? '🟢 مضلع مغلق' : selectedFeatureObj.type === 'polyline' ? '🔵 مسار / أنبوب' : '🔴 موقع / نقطة'}
                    </span>
                  </div>
                  <div className="text-[11px] border-b border-dashed border-slate-100 pb-2">
                    <span className="text-slate-400 font-bold block mb-1">الوصف التفصيلي:</span>
                    <p className="bg-slate-50 p-2 rounded-xl text-slate-600 leading-relaxed text-[10px] border border-slate-100 max-h-[80px] overflow-y-auto font-medium">
                      {selectedFeatureObj.description || 'لا يوجد وصف مضاف حالياً.'}
                    </p>
                  </div>

                  {selectedFeatureObj.imageUrl && (
                    <div className="text-[11px] space-y-1">
                      <span className="text-slate-400 font-bold block">المستندات أو الصور المرفقة:</span>
                      <div className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center max-h-[140px] shadow-3xs">
                        <img 
                          src={selectedFeatureObj.imageUrl} 
                          className="w-full h-auto max-h-[140px] object-cover transition-transform duration-300 group-hover:scale-105" 
                          alt="مرفق الموقع" 
                          onError={(e) => {
                            // display text warning for non-direct links, like raw drive folders or html
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <a 
                          href={selectedFeatureObj.imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[9px] px-2.5 py-1.5 rounded-lg font-bold hover:bg-slate-900 flex items-center gap-1 transition-colors"
                        >
                          <Link className="w-3 h-3" />
                          عرض المرفق / المجلد ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {hasWriteAccess && selectedFeature && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditingFeatureDetails(true);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-xl text-[10px] font-bold border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Image className="h-3.5 w-3.5" />
                        <span>تعديل المرفقات والبيانات</span>
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (isEditingVertices) {
                            setIsEditingVertices(false);
                            setEditingFeaturePath(null);
                            onFeedback('تم إنهاء وضع تعديل الإحداثيات وحفظ التعديلات.');
                          } else {
                            setIsEditingVertices(true);
                            setEditingFeaturePath(selectedFeature);
                            onFeedback('🔍 وضع تعديل العُقد نشط: يمكنك الآن سحب النقاط الصفراء على الخريطة لتعديل الشكل الجغرافي مباشرة!');
                          }
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isEditingVertices 
                            ? 'bg-amber-600 border-amber-500 text-white hover:bg-amber-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>{isEditingVertices ? 'إنهاء تعديل الإحداثيات' : 'تعديل الإحداثيات على الخريطة'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteFeature(selectedFeature.layerId, selectedFeature.index, selectedFeatureObj.name)}
                        className="px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                        title="حذف هذا المعلم الجغرافي من الطبقة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Database Sync Guidance Card */}
        <div dir="rtl" className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm text-slate-300 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <FileCode className="h-4.5 w-4.5 text-blue-400" />
            <h4 className="text-xs font-extrabold text-white">الربط مع قاعدة البيانات SQL</h4>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            تم تزويدك بملف الإسكيمو الخاص بقواعد البيانات <code className="bg-slate-800 p-0.5 rounded px-1 text-blue-300">project_layers_schema.sql</code> في جذر المشروع. يدعم:
          </p>
          <ul className="text-[9.5px] text-slate-300 space-y-1 pr-4 list-disc">
            <li>دعم الإحداثيات المفتوحة <code className="bg-slate-800 px-0.5 rounded text-indigo-300">JSONB</code>.</li>
            <li>امتداد نظم المعلومات <code className="bg-slate-800 px-0.5 rounded text-indigo-300">PostGIS</code> للفرز الجغرافي الفائق.</li>
            <li>محفزات المزامنة التلقائية <code className="bg-slate-800 px-0.5 rounded text-indigo-300">TRIGGER</code>.</li>
          </ul>
        </div>

      </div>

      {/* Main Column: Interactive Free Map with Drawing Controls */}
      <div className="xl:col-span-3 flex flex-col gap-4">
        
        {/* Drawing & Control Bar */}
        <div dir="rtl" className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">الطبقة النشطة المستهدفة للرسم:</span>
              <span className="text-xs font-extrabold text-indigo-950">
                {activeLayerObj ? activeLayerObj.name : 'لا توجد طبقة نشطة (يرجى تحديد أو إنشاء طبقة)'}
              </span>
            </div>
          </div>

          {/* Active Drawing Tools */}
          {hasWriteAccess && activeLayerObj && (
            <div className="flex items-center gap-1.5">
              
              <span className="text-[10px] text-slate-400 font-bold ml-1.5">أدوات رسم الخرائط:</span>

              {/* Draw Polygon */}
              <button
                type="button"
                onClick={() => {
                  setDrawingMode('polygon');
                  setDrawingPoints([]);
                  onFeedback('✏️ وضع المضلع نشط: انقر في أي مكان على الخارطة لإضافة عُقد الحدود المضلعة للمشروع.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  drawingMode === 'polygon'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>رسم مضلع/نطاق</span>
              </button>

              {/* Draw Polyline */}
              <button
                type="button"
                onClick={() => {
                  setDrawingMode('polyline');
                  setDrawingPoints([]);
                  onFeedback('✏️ وضع الخط نشط: انقر على الخارطة لرسم مسارات الأنابيب أو الخطوط الناقلة.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  drawingMode === 'polyline'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5 rotate-90" />
                <span>رسم أنبوب/مسار</span>
              </button>

              {/* Place Point */}
              <button
                type="button"
                onClick={() => {
                  setDrawingMode('point');
                  setDrawingPoints([]);
                  onFeedback('✏️ وضع الإبرة نشط: انقر في أي مكان لتثبيت موقع محطة أو خزان.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  drawingMode === 'point'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>تثبيت محطة/نقطة</span>
              </button>

            </div>
          )}

        </div>

        {/* Live Drawing Modal Form / Saving Details Box */}
        {drawingMode !== 'none' && drawingPoints.length > 0 && (
          <div dir="rtl" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <Info className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1 md:flex-none">
                <h5 className="text-xs font-extrabold text-amber-900">جاري رسم المعلم الجغرافي الآن ({drawingPoints.length} عُقد مضافة)</h5>
                <p className="text-[10px] text-amber-700 leading-normal">
                  {drawingMode === 'polygon' && 'انقر على الخريطة لتوسيع نطاق المضلع، ثم املأ البيانات بالجانب الأيسر لحفظه.'}
                  {drawingMode === 'polyline' && 'أضف نقاط لتحديد مسار الخط أو الأنبوب على طول المحور.'}
                  {drawingMode === 'point' && 'انقر مرة واحدة لتحديد الإحداثي الدقيق للنقطة.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <input
                type="text"
                placeholder="اسم المعلم الجغرافي"
                value={tempFeatureName}
                onChange={e => setTempFeatureName(e.target.value)}
                className="px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none w-full md:w-[130px]"
              />
              <input
                type="text"
                placeholder="وصف مختصر للمعلم"
                value={tempFeatureDesc}
                onChange={e => setTempFeatureDesc(e.target.value)}
                className="px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none w-full md:w-[160px]"
              />

              {/* Image attachment / Google Drive pasting options */}
              <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-xl px-2 py-1.5">
                <label className="text-amber-800 hover:text-amber-900 cursor-pointer flex items-center gap-1 text-[10px] font-bold">
                  <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                  <span>ارفاق صورة</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setTempFeatureImageUrl(reader.result);
                            onFeedback('📸 تم إرفاق صورة للمعلم الجاري رسمه بنجاح.');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {tempFeatureImageUrl && (
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" title="تم إرفاق صورة"></span>
                )}
              </div>

              <input
                type="text"
                placeholder="رابط الصورة أو رابط قوقل درايف"
                value={tempFeatureImageUrl}
                onChange={e => setTempFeatureImageUrl(e.target.value)}
                className="px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-[10px] focus:ring-1 focus:ring-amber-500 outline-none w-full md:w-[150px] font-mono text-left"
                dir="ltr"
              />
              
              <div className="flex gap-1.5 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCancelDrawing}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveDrawing}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-xs flex items-center gap-1"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>حفظ الشكل 💾</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Canvas Frame */}
        <div className="relative h-[580px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          
          {/* Legend indicator overlapping on Leaflet map */}
          <div dir="rtl" className="absolute bottom-4 right-4 z-[400] bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-md flex flex-col gap-2 pointer-events-auto max-w-[200px]">
            <h5 className="text-[10px] font-extrabold text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-indigo-600" />
              <span>دليل أشكال ومعالم الطبقات</span>
            </h5>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9.5px] text-slate-600">
                <span className="w-3.5 h-2.5 bg-indigo-200 border border-indigo-500 rounded-sm"></span>
                <span>مضلع / نطاق مغلق</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9.5px] text-slate-600">
                <span className="w-3.5 h-0.5 bg-indigo-500 rounded-full"></span>
                <span>مسار خطي / أنبوب</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9.5px] text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 border border-white shadow-3xs"></span>
                <span>موقع / خزان / محطة</span>
              </div>
            </div>
          </div>

          {/* Quick instructions HUD */}
          <div dir="rtl" className="absolute top-4 right-4 z-[400] bg-slate-900/85 backdrop-blur-md p-2.5 px-3.5 rounded-xl border border-slate-800 text-white text-[10px] flex items-center gap-2 pointer-events-none shadow-lg">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
            <span>بوابة الرقمنة الجغرافية الحرة لمدينة الرياض</span>
          </div>

        </div>

      </div>

    </div>
  );
}
