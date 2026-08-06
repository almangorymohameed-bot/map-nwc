/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProjectDiffResult } from '../types';
import { 
  X, 
  ArrowLeftRight, 
  Sparkles, 
  Calendar, 
  HardHat, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  Ruler, 
  Layers, 
  Printer, 
  Copy, 
  Check,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';

interface ChangeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  diffResult: ProjectDiffResult | null;
  projectName?: string;
}

export function ChangeReportModal({
  isOpen,
  onClose,
  diffResult,
  projectName
}: ChangeReportModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'stages' | 'permits' | 'lengths'>('all');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen || !diffResult) return null;

  const displayProjectName = projectName || diffResult.projectName || 'المشروع الخاضع للتحليل';

  const handleCopySummary = () => {
    const text = `
📋 تقرير التغيرات والمقارنة التاريخية للمشروع: ${displayProjectName}
📅 تاريخ التحليل الحالي: ${diffResult.currentReportDate}
⏮️ المرجع السابق: ${diffResult.previousReportDate}

📊 ملخص التغيرات المكتشفة:
${diffResult.summaryMessages.map(m => `• ${m}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh] dir-rtl text-right">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600/30 rounded-2xl border border-blue-400/30 text-blue-400">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">
                  تقرير المقارنة وتتبع التغيرات (Change Report)
                </h2>
                {diffResult.hasChanges ? (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    تم رصد تغيرات طارئة
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    مطابق للسجل السابق
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                <span>اسم المشروع: <strong className="text-white">{displayProjectName}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                  التقرير الحالي: {diffResult.currentReportDate}
                </span>
                <span>•</span>
                <span className="text-slate-400">السابق: {diffResult.previousReportDate}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700 shrink-0"
            title="إغلاق النافذة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/80 px-5 pt-3 gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${activeTab === 'all' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-800 shadow-sm' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Layers className="h-4 w-4" />
            <span>كافة التغيرات</span>
          </button>

          <button
            onClick={() => setActiveTab('stages')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${activeTab === 'stages' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-slate-200 dark:border-slate-800 shadow-sm' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <HardHat className="h-4 w-4" />
            <span>مراحل الحفرية (#ffea00)</span>
            {diffResult.yellowLineStageChanges.length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
                {diffResult.yellowLineStageChanges.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('permits')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${activeTab === 'permits' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-800 shadow-sm' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Award className="h-4 w-4" />
            <span>الفسوح والترخيص</span>
            {diffResult.addedPermits.length > 0 && (
              <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full">
                {diffResult.addedPermits.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('lengths')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${activeTab === 'lengths' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-800 shadow-sm' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Ruler className="h-4 w-4" />
            <span>فروقات الأطوال والشبكات</span>
            {diffResult.lengthChanges.length > 0 && (
              <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] font-black rounded-full">
                {diffResult.lengthChanges.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto grow space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
          
          {/* Executive Summary Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>الملخص التنفيذي للفروقات المكتشفة:</span>
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {diffResult.summaryMessages.map((msg, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></span>
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 1: Yellow Line Stages (#ffea00) */}
          {(activeTab === 'all' || activeTab === 'stages') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HardHat className="h-4.5 w-4.5 text-amber-500" />
                  <span>تغير وضع قطاع الحفرية للخطوط الصفراء (#ffea00)</span>
                </h3>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {diffResult.yellowLineStageChanges.length} قطاع متأثر
                </span>
              </div>

              {diffResult.yellowLineStageChanges.length === 0 ? (
                <div className="p-5 text-center rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs">
                  لا توجد تغيرات في مراحل الحفرية للخطوط الصفراء جاري العمل في هذا التقرير.
                </div>
              ) : (
                <div className="space-y-3">
                  {diffResult.yellowLineStageChanges.map((change, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 shadow-xs space-y-3 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-amber-400"></div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-xs font-black rounded-lg">
                            قطاع: {change.segmentId || `خط #${idx + 1}`}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {change.featureName}
                          </span>
                        </div>
                        {change.permitNo && (
                          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-md">
                            رقم التصريح: {change.permitNo}
                          </span>
                        )}
                      </div>

                      {/* Structured Old vs New Comparison List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Old Stage */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 block">
                            🔴 الوضع/المرحلة السابقة (القديم):
                          </span>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono line-through">
                            {change.previousStage}
                          </p>
                        </div>

                        {/* New Stage */}
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 space-y-1">
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">
                            🟢 الوضع/المرحلة الحالية (الجديد):
                          </span>
                          <p className="text-xs font-black text-amber-900 dark:text-amber-200 font-mono">
                            {change.newStage}
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 text-left font-mono pt-1">
                        طول القطاع: {change.lengthMeters.toLocaleString()} متر
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Permits & Licences */}
          {(activeTab === 'all' || activeTab === 'permits') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-emerald-600" />
                  <span>تغيرات الفسوح والرخص الجغرافية</span>
                </h3>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {diffResult.addedPermits.length} فسوح مضافة
                </span>
              </div>

              {diffResult.addedPermits.length === 0 ? (
                <div className="p-5 text-center rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs">
                  لم تظهر فسوح أو تراخيص جديدة في هذا التقرير مقارنة بالتقرير السابق.
                </div>
              ) : (
                <div className="space-y-2">
                  {diffResult.addedPermits.map((permit, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 shadow-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black font-mono rounded-lg">
                          {permit.permitNo}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            إضافة فسح/رخصة جديدة ✨
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            الفئة: {permit.category || 'عام'} {permit.segmentId ? `• للقطاع: ${permit.segmentId}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="px-3 py-1 bg-emerald-500 text-white font-bold text-[10px] rounded-full">
                          جديد مضاف
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Detailed Lengths Differences (Old vs New) */}
          {(activeTab === 'all' || activeTab === 'lengths') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Ruler className="h-4.5 w-4.5 text-indigo-600" />
                  <span>فروقات الأطوال التفصيلية لكل فئة (القديم vs الجديد)</span>
                </h3>
              </div>

              {diffResult.lengthChanges.length === 0 ? (
                <div className="p-5 text-center rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs">
                  أطوال الشبكات مطابقة تماماً للتقرير السابق ولا توجد أي فروقات.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diffResult.lengthChanges.map((lc, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          فئة: {lc.label}
                        </span>
                        <span className={`text-xs font-black font-mono ${lc.diffMeters >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {lc.diffMeters > 0 ? `+${lc.diffMeters.toLocaleString()}` : lc.diffMeters.toLocaleString()} متر
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">الطول القديم:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{lc.oldKm} كم</span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-bold">الطول الجديد:</span>
                          <span className="font-mono font-black text-blue-900 dark:text-blue-200">{lc.newKm} كم</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Scope & Property Modifications */}
          {activeTab === 'all' && diffResult.scopeChanges.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-cyan-600" />
                <span>تغيرات خصائص الخريطة العامة</span>
              </h3>

              <div className="space-y-2">
                {diffResult.scopeChanges.map((sc, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{sc.field}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-400 line-through">القديم: {sc.oldValue}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-blue-500 rotate-180" />
                      <span className="font-bold text-blue-600 dark:text-blue-400">الجديد: {sc.newValue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-500" />}
              <span>{isCopied ? 'تم نسخ التقرير' : 'نسخ النص'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>طباعة / تصدير</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
          >
            إغلاق التقرير
          </button>
        </div>

      </div>
    </div>
  );
}
