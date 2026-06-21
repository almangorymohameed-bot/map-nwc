/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Project, User } from '../types';
import { Search, MapPin, SlidersHorizontal, Droplet, Waves, RefreshCw, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Eye, Globe, List, LayoutGrid } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  currentUser: User;
}

const ITEMS_PER_PAGE = 12;

export function ProjectList({ projects, selectedProject, onSelectProject, currentUser }: ProjectListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('الكل');
  const [selectedClassification, setSelectedClassification] = useState('الكل');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [selectedScope, setSelectedScope] = useState('الكل');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'cards'>('compact');

  // Filter lists derived dynamically from active accessible projects
  const uniqueRegions = useMemo(() => {
    const list = new Set(projects.map(p => p.region).filter(Boolean));
    return ['الكل', ...Array.from(list)];
  }, [projects]);

  const uniqueClassifications = useMemo(() => {
    const list = new Set(projects.map(p => p.classification).filter(Boolean));
    return ['الكل', ...Array.from(list)];
  }, [projects]);

  const uniqueStatuses = useMemo(() => {
    const list = new Set(projects.map(p => p.status).filter(Boolean));
    return ['الكل', ...Array.from(list)];
  }, [projects]);

  const uniqueScopes = useMemo(() => {
    const list = new Set(projects.map(p => p.scope).filter(Boolean));
    return ['الكل', ...Array.from(list)];
  }, [projects]);

  // Handle actual filtering
  const filteredProjects = useMemo(() => {
    setCurrentPage(1); // reset to page 1 on filter
    return projects.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.operationalNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contractor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.consultant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.po.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRegion = selectedRegion === 'الكل' || p.region === selectedRegion;
      const matchesClassification = selectedClassification === 'الكل' || p.classification === selectedClassification;
      const matchesStatus = selectedStatus === 'الكل' || p.status === selectedStatus;
      const matchesScope = selectedScope === 'الكل' || p.scope === selectedScope;

      return matchesSearch && matchesRegion && matchesClassification && matchesStatus && matchesScope;
    });
  }, [projects, searchTerm, selectedRegion, selectedClassification, selectedStatus, selectedScope]);

  // Paginated views
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Toggle Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالاسم، الرقم التشغيلي، المقاول، الاستشاري أو رقم PO..."
              className="w-full text-xs pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
              showFilters || selectedRegion !== 'الكل' || selectedClassification !== 'الكل' || selectedStatus !== 'الكل' || selectedScope !== 'الكل'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">أدوات تصفية متقدمة</span>
          </button>
        </div>

        {/* Expandable Advanced Filters */}
        {(showFilters || selectedRegion !== 'الكل' || selectedClassification !== 'الكل' || selectedStatus !== 'الكل' || selectedScope !== 'الكل') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            {/* Region select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">تصفية حسب المنطقة</label>
              <select
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
              >
                {uniqueRegions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Scope select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">تصفية حسب القطاع الفني</label>
              <select
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={selectedScope}
                onChange={e => setSelectedScope(e.target.value)}
              >
                {uniqueScopes.map(s => (
                  <option key={s} value={s}>{s === 'الكل' ? 'كل القطاعات' : s}</option>
                ))}
              </select>
            </div>

            {/* Classification select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">تصفية حسب تصنيف الشبكة</label>
              <select
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={selectedClassification}
                onChange={e => setSelectedClassification(e.target.value)}
              >
                {uniqueClassifications.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">تصفية حسب مرحلة المشروع</label>
              <select
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
              >
                {uniqueStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Filtering status indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>تم العثور على <span className="font-bold text-blue-600">{filteredProjects.length}</span> من أصل <span className="font-semibold text-slate-800">{projects.length}</span> مشروع مفوض لحسابك</span>
            
            {/* High fidelity mode toggle */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 select-none shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-white text-blue-700 shadow-3xs border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="عرض قائمة مبسطة ذكية للجوال"
              >
                <List className="h-3 w-3" />
                <span>مبسط للجوال</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-blue-700 shadow-3xs border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="عرض بطاقات تفصيلية"
              >
                <LayoutGrid className="h-3 w-3" />
                <span>بطاقات تفصيلية</span>
              </button>
            </div>
          </div>
          {(selectedRegion !== 'الكل' || selectedClassification !== 'الكل' || selectedStatus !== 'الكل' || selectedScope !== 'الكل' || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRegion('الكل');
                setSelectedClassification('الكل');
                setSelectedStatus('الكل');
                setSelectedScope('الكل');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
            >
              مسح جميع فلاتر التصفية
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid List */}
      <div className={viewMode === 'compact' ? 'flex flex-col gap-2' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4'}>
        {paginatedProjects.map(p => {
          const isSelected = selectedProject?.id === p.id;
          const isWater = p.scope.includes('مياه');
          
          if (viewMode === 'compact') {
            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`bg-white rounded-xl border p-3.5 cursor-pointer transition-all duration-200 hover:shadow-3xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected 
                    ? 'border-blue-500 ring-4 ring-blue-500/10 bg-blue-50/10' 
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* RTL decorative color side-strip */}
                <div className={`absolute top-0 bottom-0 right-0 w-1 ${
                  isWater ? 'bg-cyan-500' : 'bg-emerald-500'
                }`} />

                {/* Info block */}
                <div className="pr-3.5 flex-1 min-w-0 space-y-1 text-right">
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                    <span className="text-[9px] font-bold font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      {p.operationalNumber}
                    </span>
                    <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                      isWater ? 'bg-cyan-50 text-cyan-800 border border-cyan-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                    }`}>
                      {p.scope} • {p.classification}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-300" />
                      {p.region}
                    </span>
                  </div>

                  <h5 className="font-extrabold text-slate-800 text-xs sm:text-[13px] leading-relaxed" title={p.name}>
                    {p.name}
                  </h5>

                  {/* Expanded additional project details comfortably in compact list when selected */}
                  {isSelected && (
                    <div className="text-[10px] text-slate-600 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5 pt-2 mt-2 border-t border-slate-100/80 animate-in fade-in duration-200">
                      <div><strong className="text-slate-400 font-bold">المقاول:</strong> <span className="text-slate-700 font-medium">{p.contractor || 'غير محدد'}</span></div>
                      <div><strong className="text-slate-400 font-bold">الاستشاري:</strong> <span className="text-slate-700 font-medium">{p.consultant || 'مكتب الياردة'}</span></div>
                      <div><strong className="text-slate-400 font-bold">رقم PO:</strong> <span className="text-slate-700 font-mono font-bold">{p.po || '-'}</span></div>
                      <div><strong className="text-slate-400 font-bold">Unifier:</strong> <span className="text-slate-700 font-mono font-bold">{p.unifierNo || '-'}</span></div>
                    </div>
                  )}
                </div>

                {/* Badges / Small Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 pr-3.5 sm:pr-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                    p.status.includes('جاري') && !p.status.includes('الاستلام')
                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : p.status.includes('مسلم') || p.status.includes('الاستلام')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {p.status}
                  </span>

                  <button
                    type="button"
                    className={`flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg transition-colors text-[10px] whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    <span>تحديد</span>
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={p.id}
              onClick={() => onSelectProject(p)}
              className={`bg-white rounded-2xl border p-4.5 cursor-pointer flex flex-col justify-between transition-all duration-300 hover:shadow-md group relative overflow-hidden ${
                isSelected 
                  ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-sm' 
                  : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
              }`}
            >
              {/* Scope accent line */}
              <div className={`absolute top-0 right-0 left-0 h-1 ${
                isWater ? 'bg-cyan-500' : 'bg-emerald-500'
              }`} />

              <div className="space-y-3.5">
                {/* Header */}
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-200/60 rounded">
                    Operational No: {p.operationalNumber}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                    p.status.includes('جاري') && !p.status.includes('الاستلام')
                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : p.status.includes('مسلم') || p.status.includes('الاستلام')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {p.status}
                  </span>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-800 text-xs leading-relaxed line-clamp-2 min-h-[36px] group-hover:text-blue-600 transition-colors text-right" title={p.name}>
                    {p.name}
                  </h5>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{p.region}  {p.subProgram}</span>
                  </div>
                </div>

                {/* Details list as professional bento cards/sub-labels */}
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-2 text-[10px] text-slate-500 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <div className="min-w-0 flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold block text-right">المقاول</span>
                    <span className="text-slate-700 font-medium truncate text-right mt-0.5" title={p.contractor}>{p.contractor || 'غير محدد'}</span>
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold block text-right">الاستشاري</span>
                    <span className="text-slate-700 font-medium truncate text-right mt-0.5" title={p.consultant}>{p.consultant || 'مكتب الياردة'}</span>
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold block text-right">رقم PO</span>
                    <span className="text-slate-700 font-semibold font-mono truncate text-right mt-0.5" title={p.po}>{p.po || '-'}</span>
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold block text-right">رقم Unifier</span>
                    <span className="text-slate-700 font-semibold font-mono truncate text-right mt-0.5" title={p.unifierNo}>{p.unifierNo || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Action area */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                  isWater ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {isWater ? <Droplet className="h-3 w-3" /> : <Waves className="h-3 w-3" />}
                  <span>{p.classification}</span>
                </span>

                <button
                  type="button"
                  className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg transition-colors text-[11px] whitespace-nowrap shrink-0 ${
                    isSelected 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>عرض الخريطة</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center col-span-full space-y-3">
            <AlertTriangle className="h-10 w-10 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h5 className="font-bold text-slate-700 text-sm">معدلات بحث بلا نتائج</h5>
              <p className="text-xs text-slate-500 leading-normal max-w-md mx-auto">
                لم نجد أي مشروع يطابق مرشحات البحث الحالية. يرجى تعديل العبارة أو مراجعة قيود الصلاحيات الممنوحة من لوحة الأمن.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRegion('الكل');
                setSelectedClassification('الكل');
                setSelectedStatus('الكل');
                setSelectedScope('الكل');
              }}
              className="text-xs bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors font-semibold"
            >
              إعادة تعيين المرشحات
            </button>
          </div>
        )}
      </div>

      {/* Paginations */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-xs text-slate-500">
            الصفحة <span className="font-bold text-slate-800">{currentPage}</span> منصل <span className="font-bold text-slate-800">{totalPages}</span> | يعرض الآن مشاريع من <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> إلى <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)}</span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer ${
                currentPage === 1
                  ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'text-slate-600 bg-white hover:bg-slate-50'
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer ${
                currentPage === totalPages
                  ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'text-slate-600 bg-white hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
