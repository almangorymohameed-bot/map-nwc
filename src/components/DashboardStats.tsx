/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project } from '../types';
import { Droplet, Wind, RefreshCw, CheckCircle2, AlertTriangle, Building2, MapPin, Layers, BarChart3, Globe, Sparkles } from 'lucide-react';
import { MyMapsAnalysisPanel } from './MyMapsAnalysisPanel';

interface DashboardStatsProps {
  projects: Project[];
  selectedProject?: Project | null;
  onSelectProject?: (project: Project) => void;
}

export function DashboardStats({ projects, selectedProject, onSelectProject }: DashboardStatsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'mymaps'>('general');

  // Calculations based on the input projects
  const total = projects.length;
  
  const sewageCount = projects.filter(p => {
    const scopeStr = Array.isArray(p.scope) ? p.scope.join(' ') : (p.scope || '');
    const nameStr = p.name || '';
    const classStr = p.classification || '';
    return scopeStr.includes('صرف') || scopeStr.includes('بيئية') || scopeStr.includes('الرفع') || scopeStr.includes('رفع') ||
           nameStr.includes('الرفع') || nameStr.includes('صرف') || classStr.includes('الرفع') || classStr.includes('صرف');
  }).length;

  const waterCount = projects.filter(p => {
    const scopeStr = Array.isArray(p.scope) ? p.scope.join(' ') : (p.scope || '');
    const nameStr = p.name || '';
    const classStr = p.classification || '';
    return scopeStr.includes('مياه') || nameStr.includes('مياه') || classStr.includes('مياه');
  }).length;

  const otherScopeCount = total - sewageCount - waterCount;

  const currentCount = projects.filter(p => {
    const statusStr = p.status || '';
    return (statusStr.includes('جاري') || statusStr.includes('تنفيذ') || statusStr.includes('التنفيذ') || statusStr.includes('مستأنف')) && !statusStr.includes('الاستلام');
  }).length;
  const initialHandoverCount = projects.filter(p => {
    const statusStr = p.status || '';
    return statusStr.includes('مسلم') || statusStr.includes('الاستلام') || statusStr.includes('مكتمل');
  }).length;
  const withdrawnCount = projects.filter(p => {
    const statusStr = p.status || '';
    return statusStr.includes('مسحوب') || statusStr.includes('معلق') || statusStr.includes('متوقف');
  }).length;
  
  // Contractors breakdown
  const contractorsMap: Record<string, number> = {};
  projects.forEach(p => {
    if (p.contractor) {
      contractorsMap[p.contractor] = (contractorsMap[p.contractor] || 0) + 1;
    }
  });
  const topContractors = Object.entries(contractorsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Region breakdown
  const regionsMap: Record<string, number> = {};
  projects.forEach(p => {
    if (p.region) {
      regionsMap[p.region] = (regionsMap[p.region] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6">
      {/* Sub-tabs header */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('general')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'general'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>إحصائيات المشاريع العامة 📈</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('mymaps')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 relative ${
              activeSubTab === 'mymaps'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="h-4 w-4 text-amber-400" />
            <span>تحليل الخرائط وحصر الأطوال (Google My Maps) 📊</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hidden sm:flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          <span>استخراج أطوال الخطوط، Segment ID، أرقام التصاريح والألوان</span>
        </div>
      </div>

      {activeSubTab === 'mymaps' ? (
        <MyMapsAnalysisPanel
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
        />
      ) : (
        <>
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div id="stat-total" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">إجمالي المشاريع المتاحة</span>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{total}</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">حسب صلاحيات حسابك الحالي</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Water Projects */}
        <div id="stat-water" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">شبكات ومشاريع المياه</span>
            <h3 className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 tracking-tight">{waterCount}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400"></span>
              <span>نسبة مئوية: %{total > 0 ? ((waterCount / total) * 100).toFixed(2) : '0.00'}</span>
            </div>
          </div>
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 rounded-2xl">
            <Droplet className="h-6 w-6" />
          </div>
        </div>

        {/* Sewage Projects */}
        <div id="stat-sewage" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">شبكات ومحطات الرفع والصرف</span>
            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{sewageCount}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
              <span>نسبة مئوية: %{total > 0 ? ((sewageCount / total) * 100).toFixed(2) : '0.00'}</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Wind className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        {/* Ongoing projects */}
        <div id="stat-ongoing" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">مشاريع جاري تنفيذها</span>
            <h3 className="text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">{currentCount}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{initialHandoverCount} مكتمل/مُسلم</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">{withdrawnCount} معلق/مسحوب</span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
            <RefreshCw className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Breakdowns section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Custom regional distribution chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-7 space-y-4">
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            التوزيع الجغرافي للمشاريع المفوضة لك
          </h4>
          
          <div className="space-y-3 pt-2">
            {Object.entries(regionsMap).map(([regionName, count]) => {
              const pet = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={regionName} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{regionName}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{count} مشروع ({pet.toFixed(2)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 dark:bg-blue-400 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${pet}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {Object.keys(regionsMap).length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">لا يوجد بيانات توزيع متاحة</p>
            )}
          </div>
        </div>

        {/* Contractor Leaderboard */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-5 space-y-4">
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            المقاولين الأكثر تنفيذاً للمشاريع
          </h4>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topContractors.map(([contractor, count], idx) => (
              <div key={contractor} className="flex items-center justify-between py-3 first:pt-1 last:pb-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full">
                    {idx + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={contractor}>
                    {contractor}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 text-[11px] px-2 py-0.5 rounded-md font-bold">
                    {count} مشروع
                  </span>
                </div>
              </div>
            ))}

            {topContractors.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">لا يوجد مقاولين لتصنيفهم</p>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
