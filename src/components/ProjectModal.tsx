/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { X, Save, AlertTriangle, Info, Map, CheckCircle } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (project: Project) => void;
}

const REGIONS = [
  'شمال الرياض',
  'جنوب الرياض',
  'غرب الرياض',
  'المحافظات الشمالية',
  'المحافظات الجنوبية',
  'المحافظات الغربية',
  'المتفرقات'
];

const SCOPES = [
  'صرف صحي',
  'مياه'
];

const STATUSES = [
  'جاري',
  'قيد التنفيذ',
  'مكتمل',
  'معلق',
  'مسلم ابتدائي',
  'مسحوب',
  'جاري الاستلام الابتدائي'
];

const CLASSIFICATIONS = [
  'شبكات',
  'خطوط رئيسية',
  'خزانات',
  'مخطط استراتيجي',
  'خطوط ناقلة',
  'ترحيل',
  'استبدال',
  'محطات معالجة بيئية',
  'خطوط وشبكات',
  'خطوط'
];

export function ProjectModal({ isOpen, project, onClose, onSave }: ProjectModalProps) {
  const [formData, setFormData] = useState<Partial<Project>>({
    operationalNumber: '',
    name: '',
    po: '',
    unifierNo: '',
    contractor: '',
    consultant: '',
    status: 'جاري',
    scope: 'صرف صحي',
    classification: 'شبكات',
    businessUnit: 'وحدة أعمال الرياض',
    region: 'شمال الرياض',
    subProgram: '',
    mapUrl: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setFormData(project);
    } else {
      setFormData({
        operationalNumber: '',
        name: '',
        po: '',
        unifierNo: '',
        contractor: '',
        consultant: 'مكتب الياردة للاستشارات الهندسية',
        status: 'جاري',
        scope: 'صرف صحي',
        classification: 'شبكات',
        businessUnit: 'وحدة أعمال الرياض',
        region: 'شمال الرياض',
        subProgram: 'شمال الرياض - صرف',
        mapUrl: ''
      });
    }
    setError('');
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.operationalNumber) {
      setError('الرجاء تعبئة اسم المشروع والرقم التشغيلي للمطابقة التنظيمية');
      return;
    }

    if (formData.mapUrl && !formData.mapUrl.startsWith('http')) {
      setError('رابط الخريطة يجب أن يكون رابطاً صالحاً يبدأ بـ http:// أو https://');
      return;
    }

    const savedProject: Project = {
      id: project ? project.id : Math.floor(Math.random() * 900000) + 100000,
      operationalNumber: formData.operationalNumber || '',
      name: formData.name || '',
      po: formData.po || '',
      unifierNo: formData.unifierNo || '',
      contractor: formData.contractor || '',
      consultant: formData.consultant || '',
      status: formData.status || 'جاري',
      scope: formData.scope || 'صرف صحي',
      classification: formData.classification || 'شبكات',
      businessUnit: formData.businessUnit || 'وحدة أعمال الرياض',
      region: formData.region || 'شمال الرياض',
      subProgram: formData.subProgram || '',
      mapUrl: formData.mapUrl || ''
    };

    onSave(savedProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-bold">
              {project ? 'تعديل بيانات المشروع والخرائط الفنية' : 'إدراج مشروع تنفيذ وخارطة تفاعلية جديدة'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-xs text-blue-900 leading-normal">
            ⚙️ <span className="font-bold">تنويه إدخال البيانات:</span> تخفي البوابة تلقائياً الروابط المضافة حديثاً عن المشاهدين العاديين، وتقوم بإتاحتهم للمستخدمين المفوضين بالمنطقة الجغرافية المحددة.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Project Name */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">إسم المشروع بالكامل (Ar) <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="مثال: عقد تنفيذ شبكات صرف صحي بأجزاء من حي طويق"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Operational Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">الرقم التشغيلي للمشروع <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="مثال: 24/23/2/02/0012/1"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono"
                value={formData.operationalNumber || ''}
                onChange={e => setFormData({ ...formData, operationalNumber: e.target.value })}
              />
            </div>

            {/* Contractor */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">إسم شركة المقاولات المنفذة</label>
              <input
                type="text"
                placeholder="مثال: شركة صلت للمقاولات"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                value={formData.contractor || ''}
                onChange={e => setFormData({ ...formData, contractor: e.target.value })}
              />
            </div>

            {/* PO */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">رقم أمر الشراء PO</label>
              <input
                type="text"
                placeholder="مثال: 201230390"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono"
                value={formData.po || ''}
                onChange={e => setFormData({ ...formData, po: e.target.value })}
              />
            </div>

            {/* Unifier No */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">رقم Unifier</label>
              <input
                type="text"
                placeholder="مثال: 10120"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono"
                value={formData.unifierNo || ''}
                onChange={e => setFormData({ ...formData, unifierNo: e.target.value })}
              />
            </div>

            {/* Execution Consultant */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">إسم استشاري الإشراف والتنفيذ</label>
              <input
                type="text"
                placeholder="مثال: مكتب الياردة للاستشارات الهندسية"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                value={formData.consultant || ''}
                onChange={e => setFormData({ ...formData, consultant: e.target.value })}
              />
            </div>

            {/* Sub-program */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">البرنامج الفرعي للتنفيذ</label>
              <input
                type="text"
                placeholder="مثال: جنوب الرياض - صرف"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                value={formData.subProgram || ''}
                onChange={e => setFormData({ ...formData, subProgram: e.target.value })}
              />
            </div>

            {/* Scope (Dropdown) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">النطاق العام (القطاع)</label>
              <select
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                value={formData.scope}
                onChange={e => setFormData({ ...formData, scope: e.target.value })}
              >
                {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Region (Dropdown) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">منطقة نطاق المشروع الجغرافي</label>
              <select
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                value={formData.region}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
              >
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Classification (Dropdown / Datalist) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">تصنيف المشروع</label>
              <select
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                value={formData.classification}
                onChange={e => setFormData({ ...formData, classification: e.target.value })}
              >
                {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Status (Dropdown) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">مرحلة المشروع (الحالة)</label>
              <select
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            {/* Map URL */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">رابط خريطة قوقل التفاعلية (Google My Maps URL)</label>
              <input
                type="url"
                placeholder="https://www.google.com/maps/d/viewer?mid=..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono"
                value={formData.mapUrl || ''}
                onChange={e => setFormData({ ...formData, mapUrl: e.target.value })}
              />
              <span className="text-[10px] text-slate-400 block">
                يقبل روابط خريطة قوقل للتحرير (My Maps edit) أو العرض (My Maps viewer). يقوم النظام بفلترتها وعرضها بآمان.
              </span>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
            >
              إلغاء التعديل
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 text-xs font-bold px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>حفظ سجل المشروع</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
