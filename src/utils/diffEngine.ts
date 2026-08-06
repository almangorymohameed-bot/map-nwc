/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  KMLAnalysisResult, 
  ProjectDiffResult, 
  YellowLineStageChange, 
  LengthChangeDetail, 
  PermitChangeDetail, 
  ScopeChangeDetail,
  StatusCategory
} from '../types';
import { COLOR_CONFIG } from './myMapsKmlParser';

/**
 * Performs a comprehensive diff check between previous KML analysis and newly extracted KML analysis
 */
export function compareKMLAnalyses(
  oldResult: KMLAnalysisResult | null,
  newResult: KMLAnalysisResult,
  projectId: number,
  projectName: string
): ProjectDiffResult {
  const currentReportDate = newResult.parsedAt || new Date().toLocaleString('ar-SA');
  const previousReportDate = oldResult?.parsedAt || 'لا يوجد تقرير سابق';

  const categories: StatusCategory[] = ['executed_water', 'executed_sewage', 'ongoing', 'remaining', 'cancelled'];

  if (!oldResult) {
    // Initial analysis snapshot (no previous report to compare against)
    return {
      hasChanges: false,
      projectId,
      projectName,
      currentReportDate,
      previousReportDate: 'التقرير الأولي التأسيسي',
      totalLengthDiffKm: 0,
      totalLengthDiffMeters: 0,
      lengthChanges: [],
      addedPermits: [],
      removedPermits: [],
      scopeChanges: [],
      yellowLineStageChanges: [],
      summaryMessages: ['تم تسجيل هذا التحليل الجغرافي كمرجع تأسيسي للمشروع. سيتم المقارنة وتتبع التغيرات ابتداءً من التقرير القادم.']
    };
  }

  // 1. Total length diff
  const totalLengthDiffMeters = Math.round(newResult.totalLengthMeters - oldResult.totalLengthMeters);
  const totalLengthDiffKm = Number((newResult.totalLengthKm - oldResult.totalLengthKm).toFixed(3));

  // 2. Length breakdown diff per category
  const lengthChanges: LengthChangeDetail[] = [];
  categories.forEach((cat) => {
    const oldCatStats = oldResult.colorBreakdown[cat] || { totalLengthKm: 0, totalLengthMeters: 0 };
    const newCatStats = newResult.colorBreakdown[cat] || { totalLengthKm: 0, totalLengthMeters: 0 };

    const diffMeters = Math.round(newCatStats.totalLengthMeters - oldCatStats.totalLengthMeters);
    const diffKm = Number((newCatStats.totalLengthKm - oldCatStats.totalLengthKm).toFixed(3));
    
    let percentChange = 0;
    if (oldCatStats.totalLengthMeters > 0) {
      percentChange = Number(((diffMeters / oldCatStats.totalLengthMeters) * 100).toFixed(1));
    }

    if (diffMeters !== 0) {
      lengthChanges.push({
        category: cat,
        label: COLOR_CONFIG[cat]?.label || cat,
        oldKm: oldCatStats.totalLengthKm,
        newKm: newCatStats.totalLengthKm,
        diffKm,
        diffMeters,
        percentChange
      });
    }
  });

  // 3. Permits Comparison (إضافة فسح جديد / تعديل الفسوح)
  const extractAllPermits = (res: KMLAnalysisResult) => {
    const set = new Set<string>();
    Object.values(res.permitNosByStatus || {}).forEach((arr) => {
      (arr || []).forEach((p) => {
        if (p && p.trim() && p !== '-') set.add(p.trim());
      });
    });
    // Also scan items
    (res.items || []).forEach((item) => {
      if (item.permitNo && item.permitNo.trim() && item.permitNo !== '-') set.add(item.permitNo.trim());
    });
    return set;
  };

  const oldPermits = extractAllPermits(oldResult);
  const newPermits = extractAllPermits(newResult);

  const addedPermits: PermitChangeDetail[] = [];
  const removedPermits: PermitChangeDetail[] = [];

  newPermits.forEach((p) => {
    if (!oldPermits.has(p)) {
      // Find matching item for segment reference
      const matchingItem = newResult.items.find(it => it.permitNo === p);
      addedPermits.push({
        type: 'added',
        permitNo: p,
        category: matchingItem?.statusLabel || 'فسح جديد',
        segmentId: matchingItem?.segmentId
      });
    }
  });

  oldPermits.forEach((p) => {
    if (!newPermits.has(p)) {
      removedPermits.push({
        type: 'removed',
        permitNo: p
      });
    }
  });

  // 4. Yellow Line Stage Comparison (#ffea00 / ongoing items)
  // Check Stage property on yellow lines (ongoing status category)
  const yellowLineStageChanges: YellowLineStageChange[] = [];

  const oldOngoingItemsMap = new Map<string, { stage: string; item: any }>();
  (oldResult.items || [])
    .filter((it) => it.statusCategory === 'ongoing' || it.colorHex?.toLowerCase() === '#ffea00')
    .forEach((it) => {
      const key = it.segmentId || it.name || it.id;
      oldOngoingItemsMap.set(key, { stage: it.stage || 'لم تحدد المرحلة', item: it });
    });

  (newResult.items || [])
    .filter((it) => it.statusCategory === 'ongoing' || it.colorHex?.toLowerCase() === '#ffea00')
    .forEach((newItem) => {
      const key = newItem.segmentId || newItem.name || newItem.id;
      const oldData = oldOngoingItemsMap.get(key);

      const currentStage = newItem.stage || 'حفرية جارية';

      if (oldData) {
        const previousStage = oldData.stage;
        if (previousStage !== currentStage) {
          yellowLineStageChanges.push({
            segmentId: newItem.segmentId,
            featureName: newItem.name,
            previousStage,
            newStage: currentStage,
            permitNo: newItem.permitNo,
            lengthMeters: newItem.lengthMeters,
            colorHex: newItem.colorHex || '#ffea00'
          });
        }
      } else {
        // New yellow line segment added
        yellowLineStageChanges.push({
          segmentId: newItem.segmentId,
          featureName: newItem.name,
          previousStage: 'قطاع جديد',
          newStage: currentStage,
          permitNo: newItem.permitNo,
          lengthMeters: newItem.lengthMeters,
          colorHex: newItem.colorHex || '#ffea00'
        });
      }
    });

  // 5. Scopes and feature counts comparison
  const scopeChanges: ScopeChangeDetail[] = [];
  if (oldResult.totalFeaturesCount !== newResult.totalFeaturesCount) {
    scopeChanges.push({
      type: 'modified',
      field: 'عدد قطاعات الخطوط',
      oldValue: `${oldResult.totalFeaturesCount} قطاع`,
      newValue: `${newResult.totalFeaturesCount} قطاع`
    });
  }

  // 6. Generate Human-Readable Summary Bullet Messages
  const summaryMessages: string[] = [];

  if (totalLengthDiffMeters !== 0) {
    const sign = totalLengthDiffMeters > 0 ? '+' : '';
    summaryMessages.push(`📏 تغير إجمالي أطوال خطوط الشبكة بمقدار ${sign}${totalLengthDiffMeters.toLocaleString()} متر (${sign}${totalLengthDiffKm} كم)`);
  }

  if (addedPermits.length > 0) {
    addedPermits.forEach(ap => {
      summaryMessages.push(`📄 تم إضافة فسح/رخصة جديدة برقم: (${ap.permitNo}) ${ap.segmentId ? `للقطاع ${ap.segmentId}` : ''}`);
    });
  }

  if (yellowLineStageChanges.length > 0) {
    yellowLineStageChanges.forEach(yc => {
      summaryMessages.push(`🏗️ تغير وضع قطاع الحفرية (${yc.segmentId}) للخطوط الصفراء إلى: [${yc.newStage}] (المرحلة السابقة: ${yc.previousStage})`);
    });
  }

  lengthChanges.forEach(lc => {
    const sign = lc.diffMeters > 0 ? '+' : '';
    summaryMessages.push(`📊 تغير في فئة (${lc.label}): ${sign}${lc.diffMeters.toLocaleString()} م (${sign}${lc.diffKm} كم)`);
  });

  const hasChanges = 
    totalLengthDiffMeters !== 0 ||
    addedPermits.length > 0 ||
    removedPermits.length > 0 ||
    yellowLineStageChanges.length > 0 ||
    lengthChanges.length > 0 ||
    scopeChanges.length > 0;

  if (!hasChanges) {
    summaryMessages.push('✅ لا توجد تغيرات طارئة على أطوال وفسوح ومراحل هذا المشروع مقارنة بالتقرير السابق.');
  }

  return {
    hasChanges,
    projectId,
    projectName,
    currentReportDate,
    previousReportDate,
    totalLengthDiffKm,
    totalLengthDiffMeters,
    lengthChanges,
    addedPermits,
    removedPermits,
    scopeChanges,
    yellowLineStageChanges,
    summaryMessages
  };
}
