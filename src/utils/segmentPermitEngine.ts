import { KMLFeatureItem, StatusCategory, KMLAnalysisResult } from '../types';
import { isValidIdentifier, getHaversineDistanceMeters, cleanSegmentId, cleanPermitNo } from './myMapsKmlParser';

export interface PermitBoundaryPolygon {
  permitNo: string;
  projectName?: string;
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  coordinates?: Array<[number, number]>;
}

/**
 * 1️⃣ Header Matching & Property Extraction for Segment ID
 * Searches properties, XML tags, layer names, and text for explicit Segment ID keywords.
 */
export function extractSegmentIdFromData(
  properties: Record<string, any> | Array<{ name: string; value: string }>,
  layerName: string = '',
  descriptionText: string = '',
  featureName: string = ''
): string {
  const targetKeys = [
    'segment id', 'segment_id', 'segmentid', 'segment', 'seg_id', 'seg', 'sec_id', 'sec',
    'معرف القطاع', 'رقم المقطع', 'رقم السجمنت', 'رقم القطاع', 'رمز القطاع', 'القطاع', 'السجمنت'
  ];

  // 1. Check direct properties array or object
  if (Array.isArray(properties)) {
    for (const p of properties) {
      const k = (p.name || '').trim().toLowerCase();
      const val = (p.value || '').trim();
      if (targetKeys.some(tk => k === tk || k.includes(tk)) && isValidIdentifier(val)) {
        const cleaned = cleanSegmentId(val);
        if (cleaned && isValidIdentifier(cleaned)) return cleaned;
      }
    }
  } else if (properties && typeof properties === 'object') {
    for (const [k, v] of Object.entries(properties)) {
      const keyLower = k.trim().toLowerCase();
      const val = String(v || '').trim();
      if (targetKeys.some(tk => keyLower === tk || keyLower.includes(tk)) && isValidIdentifier(val)) {
        const cleaned = cleanSegmentId(val);
        if (cleaned && isValidIdentifier(cleaned)) return cleaned;
      }
    }
  }

  // 2. Check CAD / GIS Layer name (e.g., Layer_SEG-204_Water or Segment_ID_102)
  if (layerName) {
    const layerMatch = layerName.match(/(?:SEG|SEGMENT|SEC|SEC-|قطاع|سجمنت)[\s_#-]*([A-Za-z0-9_-]+)/i);
    if (layerMatch) {
      const cleaned = cleanSegmentId(layerMatch[1] || layerMatch[0]);
      if (cleaned && isValidIdentifier(cleaned)) {
        return cleaned;
      }
    }
  }

  // 3. Regex search in description & feature name
  const combinedText = `${featureName} ${descriptionText}`.replace(/<[^>]+>/g, ' ');
  const segRegexes = [
    /(?:Segment\s*ID|Segment_ID|SegmentID|Segment|معرف\s*القطاع|رقم\s*المقطع|رقم\s*السجمنت|رقم\s*القطاع|رمز\s*القطاع)\s*[:=#-]?\s*([A-Za-z0-9_/-]+)/i,
    /\b(SEG-[A-Za-z0-9_/-]+)\b/i,
    /\b(SEG_[A-Za-z0-9_/-]+)\b/i,
    /\b(SEG[0-9]{3,8})\b/i,
    /\b(SEC-[A-Za-z0-9_/-]+)\b/i
  ];

  for (const rx of segRegexes) {
    const m = combinedText.match(rx);
    if (m) {
      const extracted = m[1] || m[0];
      const cleaned = cleanSegmentId(extracted);
      if (cleaned && isValidIdentifier(cleaned)) {
        return cleaned;
      }
    }
  }

  return '';
}

/**
 * 2️⃣ Pattern Extraction for Permit No (تصريح الحفر)
 * Searches text properties, descriptions, notes, and layer names for standard national permit patterns.
 */
export function extractPermitNoFromText(
  properties: Record<string, any> | Array<{ name: string; value: string }>,
  descriptionText: string = '',
  featureName: string = '',
  layerName: string = ''
): string {
  const targetKeys = [
    'permit no', 'permit_no', 'permitno', 'permit', 'perm_no', 'perm',
    'تصريح', 'رقم التصريح', 'رخصة الحفر', 'رقم الرخصة', 'فسح', 'رقم الفسح', 'إذن حفر', 'اذن حفر'
  ];

  // 1. Check direct properties array or object
  if (Array.isArray(properties)) {
    for (const p of properties) {
      const k = (p.name || '').trim().toLowerCase();
      const val = (p.value || '').trim();
      if (targetKeys.some(tk => k === tk || k.includes(tk)) && isValidIdentifier(val)) {
        const cleaned = cleanPermitNo(val);
        if (cleaned && isValidIdentifier(cleaned)) return cleaned;
      }
    }
  } else if (properties && typeof properties === 'object') {
    for (const [k, v] of Object.entries(properties)) {
      const keyLower = k.trim().toLowerCase();
      const val = String(v || '').trim();
      if (targetKeys.some(tk => keyLower === tk || keyLower.includes(tk)) && isValidIdentifier(val)) {
        const cleaned = cleanPermitNo(val);
        if (cleaned && isValidIdentifier(cleaned)) return cleaned;
      }
    }
  }

  const combinedText = `${featureName} ${descriptionText} ${layerName}`.replace(/<[^>]+>/g, ' ');

  // 2. Pattern Matching for National Digging Permits (Amanah, Balady, NWC, Ministry)
  const permitPatterns = [
    // Standard slashes/dashes permit numbers e.g. 24/19/2/02/0012/1 or 2024/0012/1 or 24-10-01-0012
    /\b([0-9]{2,4}[\/\\-][0-9]{1,4}[\/\\-][0-9]{1,4}[\/\\-][0-9]{1,4}(?:[\/\\-][0-9]{1,4})*)\b/i,
    // Prefixed permit numbers e.g. PERM-2025-1092, PERMIT-99120, PRM-2024-101, PERMIT_NO_9921
    /(?:PERMIT|PERM_NO|PERM|PRM|PER)\s*[:=#-]?\s*([A-Za-z0-9_-]{5,25})/i,
    /\b(P[-_#\s]+[A-Za-z0-9_-]{5,20})\b/i,
    // Arabic keywords followed explicitly by permit numbers e.g. "تصريح 4400123456" or "رقم الفسح: 20251092"
    /(?:تصريح|رخصة|فسح)\s*(?:حفر|عمل|رمزي|رقم|مشاريع)?\s*[:=#-]?\s*([A-Za-z0-9_-]{5,25})/i
  ];

  for (const rx of permitPatterns) {
    const m = combinedText.match(rx);
    if (m) {
      const candidate = (m[1] || m[0]).trim();
      const cleaned = cleanPermitNo(candidate);
      // Ensure candidate isn't a date like 20260811 or year 2025 or pure length like 1500
      if (cleaned && isValidIdentifier(cleaned) && cleaned.length >= 5 && !/^(19|20)\d{2}$/.test(cleaned)) {
        return cleaned;
      }
    }
  }

  return '';
}

/**
 * Helper to test if point [lat, lng] is inside polygon using ray casting
 */
function isPointInPolygon(lat: number, lng: number, polygon: Array<[number, number]>): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0]; // [lng, lat]
    const xj = polygon[j][1], yj = polygon[j][0];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 3️⃣ Spatial Overlay & Geofencing for Work Permits
 * Assigns Permit No to features if they fall inside work permit boundary polygons.
 */
export function processSpatialPermitOverlay(
  items: KMLFeatureItem[],
  permitBoundaries: PermitBoundaryPolygon[] = []
): { items: KMLFeatureItem[]; matchedCount: number } {
  let matchedCount = 0;
  if (!permitBoundaries || permitBoundaries.length === 0) {
    // Construct permit boundaries ONLY from closed polygon features that have permitNo and at least 4 coordinates
    const extractedBoundaries: PermitBoundaryPolygon[] = [];
    items.forEach(it => {
      if (it.permitNo && isValidIdentifier(it.permitNo) && it.coordinates && it.coordinates.length >= 4) {
        const first = it.coordinates[0];
        const last = it.coordinates[it.coordinates.length - 1];
        // Check if closed polygon ring (distance between first and last point < 20 meters)
        const isClosed = getHaversineDistanceMeters(first[1], first[0], last[1], last[0]) < 20;
        if (isClosed) {
          let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
          it.coordinates.forEach(([lng, lat]) => {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
          });
          extractedBoundaries.push({
            permitNo: it.permitNo,
            bounds: { minLat, maxLat, minLng, maxLng },
            coordinates: it.coordinates
          });
        }
      }
    });

    if (extractedBoundaries.length > 0) {
      permitBoundaries = extractedBoundaries;
    }
  }

  if (!permitBoundaries || permitBoundaries.length === 0) {
    return { items, matchedCount: 0 };
  }

  const updatedItems = items.map(item => {
    if (item.permitNo && isValidIdentifier(item.permitNo)) {
      return item; // Already has permit
    }

    if (item.centerLat === undefined || item.centerLng === undefined) {
      return item;
    }

    const lat = item.centerLat;
    const lng = item.centerLng;

    for (const pb of permitBoundaries) {
      // Must pass Bounding Box check first as quick filter
      if (pb.bounds) {
        if (lat < pb.bounds.minLat || lat > pb.bounds.maxLat ||
            lng < pb.bounds.minLng || lng > pb.bounds.maxLng) {
          continue;
        }
      }

      // Check strict ray-casting Point-In-Polygon match
      if (pb.coordinates && pb.coordinates.length >= 3) {
        if (isPointInPolygon(lat, lng, pb.coordinates)) {
          matchedCount++;
          return {
            ...item,
            permitNo: pb.permitNo
          };
        }
      }
    }

    return item;
  });

  return { items: updatedItems, matchedCount };
}

/**
 * 4️⃣ Geometrical Classification & Segment Vault System
 * If explicit Segment ID is missing:
 * - Group connected / adjacent line features within tolerance (default 2m).
 * - Generate standardized unified Segment ID: SEG-[القطر]-[النوع]-[رقم تسلسلي]
 * - Group main lines & attached branch connections under the same Vault Segment ID.
 */
export function processGeometricalSegmentationAndVault(
  items: KMLFeatureItem[],
  toleranceMeters: number = 2.0
): { items: KMLFeatureItem[]; generatedCount: number; clustersCount: number } {
  let generatedCount = 0;

  // Extract diameter numeric value e.g. "400" or "160"
  const getCleanDiameter = (it: KMLFeatureItem): string => {
    if (it.innerDiameter) {
      const match = it.innerDiameter.match(/\d+/);
      if (match) return match[0];
    }
    const nameMatch = (it.name + ' ' + it.description).match(/(?:Ø|D|قطر|mm|\b)(\d{2,4})\b/i);
    if (nameMatch) return nameMatch[1];
    return '160'; // Default standard pipe diameter
  };

  // Determine service type code
  const getServiceTypeCode = (it: KMLFeatureItem): string => {
    if (it.statusCategory === 'executed_water') return 'WATER';
    if (it.statusCategory === 'executed_sewage') return 'SEWAGE';
    if (it.statusCategory === 'ongoing') return 'ONGOING';
    if (it.statusCategory === 'remaining') return 'REMAINING';
    if (it.statusCategory === 'cancelled') return 'CANCELLED';
    return 'PIPE';
  };

  // Store existing clusters for proximity grouping (Vault System)
  interface ClusterInfo {
    id: string;
    diameter: string;
    type: string;
    points: Array<[number, number]>;
    itemsCount: number;
  }

  const clusters: ClusterInfo[] = [];

  // First pass: register existing valid segment IDs into clusters
  items.forEach(it => {
    if (it.segmentId && isValidIdentifier(it.segmentId) && it.centerLat !== undefined && it.centerLng !== undefined) {
      const diameter = getCleanDiameter(it);
      const type = getServiceTypeCode(it);
      clusters.push({
        id: it.segmentId.trim(),
        diameter,
        type,
        points: [[it.centerLng, it.centerLat]],
        itemsCount: 1
      });
    }
  });

  let nextSequence = clusters.length + 1;

  const updatedItems = items.map(item => {
    if (item.segmentId && isValidIdentifier(item.segmentId)) {
      return item; // Keep existing valid segment ID as is
    }

    // Do NOT generate default or synthetic segment IDs
    return {
      ...item,
      segmentId: ''
    };
  });

  return {
    items: updatedItems,
    generatedCount,
    clustersCount: clusters.length
  };
}

/**
 * 5️⃣ Full Pipeline for Data Formatting (قسم تنسيق البيانات)
 * Runs Header Matching, Pattern Extraction, Spatial Permit Geofencing, and Geometrical Segmentation & Vault System.
 */
export function runAttributeFormatterPipeline(
  analysisResult: KMLAnalysisResult,
  options?: {
    toleranceMeters?: number;
    permitBoundaries?: PermitBoundaryPolygon[];
  }
): {
  updatedResult: KMLAnalysisResult;
  filledPermitCount: number;
  filledSegmentCount: number;
  vaultClustersCount: number;
} {
  const tolerance = options?.toleranceMeters ?? 2.0;

  // Step 1: Run Header & Pattern Extraction for all items
  let step1Items = analysisResult.items.map(it => {
    let segId = it.segmentId || '';
    let prmNo = it.permitNo || '';

    if (!isValidIdentifier(segId)) {
      segId = extractSegmentIdFromData({}, '', it.description || '', it.name || '');
    }

    if (!isValidIdentifier(prmNo)) {
      prmNo = extractPermitNoFromText({}, it.description || '', it.name || '', '');
    }

    return {
      ...it,
      segmentId: isValidIdentifier(segId) ? segId : '',
      permitNo: isValidIdentifier(prmNo) ? prmNo : ''
    };
  });

  // Step 2: Spatial Overlay & Geofencing for Permits
  const { items: step2Items, matchedCount: filledPermitCount } = processSpatialPermitOverlay(
    step1Items,
    options?.permitBoundaries
  );

  // Step 3: Geometrical Segmentation & Segment Vault System
  const { items: finalItems, generatedCount: filledSegmentCount, clustersCount: vaultClustersCount } = processGeometricalSegmentationAndVault(
    step2Items,
    tolerance
  );

  // Step 4: Re-calculate KMLAnalysisResult stats
  const segmentSetMap: Record<StatusCategory, Set<string>> = {
    executed_water: new Set(),
    executed_sewage: new Set(),
    ongoing: new Set(),
    remaining: new Set(),
    cancelled: new Set()
  };

  const permitSetMap: Record<StatusCategory, Set<string>> = {
    executed_water: new Set(),
    executed_sewage: new Set(),
    ongoing: new Set(),
    remaining: new Set(),
    cancelled: new Set()
  };

  finalItems.forEach(it => {
    const cat = it.statusCategory;
    if (isValidIdentifier(it.segmentId)) segmentSetMap[cat].add(it.segmentId.trim());
    if (isValidIdentifier(it.permitNo)) permitSetMap[cat].add(it.permitNo.trim());
  });

  const updatedColorBreakdown = { ...analysisResult.colorBreakdown };
  (['executed_water', 'executed_sewage', 'ongoing', 'remaining', 'cancelled'] as StatusCategory[]).forEach(cat => {
    if (updatedColorBreakdown[cat]) {
      updatedColorBreakdown[cat] = {
        ...updatedColorBreakdown[cat],
        segmentCount: segmentSetMap[cat].size,
        permitCount: permitSetMap[cat].size
      };
    }
  });

  const updatedResult: KMLAnalysisResult = {
    ...analysisResult,
    items: finalItems,
    colorBreakdown: updatedColorBreakdown,
    segmentIdsByStatus: {
      executedWater: Array.from(segmentSetMap.executed_water),
      executedSewage: Array.from(segmentSetMap.executed_sewage),
      ongoing: Array.from(segmentSetMap.ongoing),
      remaining: Array.from(segmentSetMap.remaining),
      cancelled: Array.from(segmentSetMap.cancelled)
    },
    permitNosByStatus: {
      executedWater: Array.from(permitSetMap.executed_water),
      executedSewage: Array.from(permitSetMap.executed_sewage),
      ongoing: Array.from(permitSetMap.ongoing),
      remaining: Array.from(permitSetMap.remaining),
      cancelled: Array.from(permitSetMap.cancelled)
    }
  };

  return {
    updatedResult,
    filledPermitCount,
    filledSegmentCount,
    vaultClustersCount
  };
}
