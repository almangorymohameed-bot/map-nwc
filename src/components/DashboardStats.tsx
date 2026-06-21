/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Project } from '../types';
import { Droplet, Wind, RefreshCw, CheckCircle2, AlertTriangle, Building2, MapPin, Layers } from 'lucide-react';

interface DashboardStatsProps {
  projects: Project[];
}

export function DashboardStats({ projects }: DashboardStatsProps) {
  // Calculations based on the input projects
  const total = projects.length;
  
  const sewageCount = projects.filter(p => p.scope.includes('صرف') || p.scope.includes('بيئية')).length;
  const waterCount = projects.filter(p => p.scope.includes('مياه')).length;
  const otherScopeCount = total - sewageCount - waterCount;

  const currentCount = projects.filter(p => 
    (p.status.includes('جاري') || p.status.includes('تنفيذ') || p.status.includes('التنفيذ')) && !p.status.includes('الاستلام')
  ).length;
  const initialHandoverCount = projects.filter(p => 
    p.status.includes('مسلم') || p.status.includes('الاستلام') || p.status.includes('مكتمل')
  ).length;
  const withdrawnCount = projects.filter(p => 
    p.status.includes('مسحوب') || p.status.includes('معلق')
  ).length;
  
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
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div id="stat-total" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500">إجمالي المشاريع المتاحة</span>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{total}</h3>
            <span className="text-xs text-slate-400">حسب صلاحيات حسابك الحالي</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Water Projects */}
        <div id="stat-water" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500">شبكات ومشاريع المياه</span>
            <h3 className="text-3xl font-bold text-cyan-600 tracking-tight">{waterCount}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
              <span>نسبة مئوية: {total > 0 ? Math.round((waterCount / total) * 105) / 1.05 : 0}%</span>
            </div>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
            <Droplet className="h-6 w-6" />
          </div>
        </div>

        {/* Sewage Projects */}
        <div id="stat-sewage" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500">شبكات ومحطات الصرف</span>
            <h3 className="text-3xl font-bold text-emerald-600 tracking-tight">{sewageCount}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>نسبة مئوية: {total > 0 ? Math.round((sewageCount / total) * 100) : 0}%</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Wind className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        {/* Ongoing projects */}
        <div id="stat-ongoing" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-500">مشاريع جاري تنفيذها</span>
            <h3 className="text-3xl font-bold text-amber-600 tracking-tight">{currentCount}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="text-emerald-600 font-medium">{initialHandoverCount} مكتمل/مُسلم</span>
              <span className="text-rose-600 font-medium">{withdrawnCount} معلق/مسحوب</span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <RefreshCw className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Breakdowns section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Custom regional distribution chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-7 space-y-4">
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            التوزيع الجغرافي للمشاريع المفوضة لك
          </h4>
          
          <div className="space-y-3 pt-2">
            {Object.entries(regionsMap).map(([regionName, count]) => {
              const pet = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={regionName} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{regionName}</span>
                    <span className="text-slate-500 font-medium">{count} مشروع ({Math.round(pet)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${pet}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {Object.keys(regionsMap).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">لا يوجد بيانات توزيع متاحة</p>
            )}
          </div>
        </div>

        {/* Contractor Leaderboard */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-5 space-y-4">
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            المقاولين الأكثر تنفيذاً للمشاريع
          </h4>

          <div className="divide-y divide-slate-100">
            {topContractors.map(([contractor, count], idx) => (
              <div key={contractor} className="flex items-center justify-between py-3 first:pt-1 last:pb-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                    {idx + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]" title={contractor}>
                    {contractor}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-slate-50 text-slate-700 border border-slate-100 text-[11px] px-2 py-0.5 rounded-md font-bold">
                    {count} مشروع
                  </span>
                </div>
              </div>
            ))}

            {topContractors.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">لا يوجد مقاولين لتصنيفهم</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
