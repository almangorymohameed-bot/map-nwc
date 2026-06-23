/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { Users, UserCheck, Shield, HelpCircle, Plus, Trash2, Key, Star, CheckSquare, Square, Settings, Eye, EyeOff } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

const REGION_OPTIONS = [
  'شمال الرياض',
  'جنوب الرياض',
  'غرب الرياض',
  'المحافظات الشمالية',
  'المحافظات الجنوبية',
  'المحافظات الغربية',
  'المتفرقات'
];

const SCOPE_OPTIONS = [
  'مياه',
  'صرف صحي'
];

export function UserManagement({ users, currentUser, onSaveUser, onDeleteUser }: UserManagementProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(users[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    id: '',
    username: '',
    name: '',
    role: 'viewer',
    allowedRegions: ['الكل'],
    allowedScopes: ['الكل']
  });

  const isAdmin = currentUser.role === 'admin';

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setIsEditing(false);
    setIsCreating(false);
    setFormData(user);
  };

  const handleStartCreate = () => {
    if (!isAdmin) return;
    setIsCreating(true);
    setIsEditing(false);
    setSelectedUser(null);
    setFormData({
      id: `user_${Date.now()}`,
      username: '',
      name: '',
      role: 'viewer',
      allowedRegions: ['الكل'],
      allowedScopes: ['الكل'],
      password: 'nwc' + Math.floor(1000 + Math.random() * 9000) // Default random password starting with nwc
    });
  };

  const handleStartEdit = () => {
    if (!isAdmin || !selectedUser) return;
    setIsEditing(true);
    const displayedUsername = selectedUser.username.includes('@')
      ? selectedUser.username
      : `${selectedUser.username}@nwc.com.sa`;
    setFormData({
      ...selectedUser,
      username: displayedUsername
    });
  };

  const handleCheckboxChange = (field: 'allowedRegions' | 'allowedScopes', value: string) => {
    const list = formData[field] || [];
    
    if (value === 'الكل') {
      setFormData({
        ...formData,
        [field]: ['الكل']
      });
      return;
    }

    let newList = list.filter(item => item !== 'الكل');
    if (newList.includes(value)) {
      newList = newList.filter(item => item !== value);
    } else {
      newList.push(value);
    }

    if (newList.length === 0) {
      newList = ['الكل'];
    }

    setFormData({
      ...formData,
      [field]: newList
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.username || !formData.name) {
      alert('الرجاء تعبئة البريد الإلكتروني والاسم الثلاثي');
      return;
    }

    const emailInput = formData.username.trim().toLowerCase();
    const nwcRegex = /^[a-zA-Z0-9._%+-]+@nwc\.com\.sa$/;
    if (!nwcRegex.test(emailInput)) {
      alert('خطأ في إدخال البريد: يجب أن ينتهي البريد الإلكتروني الرسمي للمستخدم بنطاق شركة المياه الوطنية @nwc.com.sa');
      return;
    }

    const prefix = emailInput.split('@')[0];
    if (!prefix) {
      alert('الرجاء كتاية اسم المستخدم (البادئة) بشكل صحيح قبل النطاق.');
      return;
    }

    const savedUser: User = {
      id: formData.id || `user_${Date.now()}`,
      username: prefix,
      name: formData.name.trim(),
      role: formData.role as 'admin' | 'editor' | 'viewer',
      allowedRegions: formData.allowedRegions || ['الكل'],
      allowedScopes: formData.allowedScopes || ['الكل'],
      password: formData.password ? formData.password.trim() : 'nwc1234'
    };

    onSaveUser(savedUser);
    setSelectedUser(savedUser);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleDelete = (userId: string) => {
    if (!isAdmin) return;
    if (userId === currentUser.id) {
      alert('لا يمكنك حذف الحساب النشط حالياً!');
      return;
    }
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا المستخدم وسحب صلاحياته نهائياً؟')) {
      onDeleteUser(userId);
      const remaining = users.filter(u => u.id !== userId);
      setSelectedUser(remaining[0] || null);
      setIsEditing(false);
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
      
      {/* Users List Column */}
      <div className="lg:col-span-5 border-l border-slate-200/80 p-5 space-y-4">
        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h4 className="font-bold text-slate-800 text-sm">مستخدمو النظام</h4>
          </div>
          {isAdmin && (
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>مستخدم جديد</span>
            </button>
          )}
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
          {users.map(u => {
            const isSelected = selectedUser?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-500/80 bg-blue-50/25 shadow-xs shadow-blue-500/5' 
                    : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      {u.name}
                      {u.id === currentUser.id && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-normal">
                          أنت حالياً
                        </span>
                      )}
                    </h5>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">@{u.username}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                    u.role === 'admin' 
                      ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                      : u.role === 'editor'
                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                        : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}>
                    {u.role === 'admin' ? 'مدير كامل' : u.role === 'editor' ? 'محرر خرائط' : 'مستعرض فقط'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2.5">
                  <div className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    المناطق: {u.allowedRegions.join('، ')}
                  </div>
                  <div className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    القطاعات: {u.allowedScopes.join('، ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail / Config Panel Column */}
      <div className="lg:col-span-7 p-6 flex flex-col justify-between">
        
        {/* Security Warning notice if not admin */}
        {!isAdmin && (
          <div className="mb-4 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-600 text-xs flex items-start gap-2">
            <Shield className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">مستند للقراءة فقط:</span> صلاحيات حسابك الحالي (<span className="font-semibold text-rose-600">{currentUser.name}</span>) لا تسمح لك بتعديل أو سحب صلاحيات مستخدمين آخرين. لوحة التعديل مقفلة.
            </div>
          </div>
        )}

        {(isEditing || isCreating) ? (
          <form onSubmit={handleSave} className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              {isCreating ? 'إعداد حساب مستخدم وصلاحيات جديدة' : `تعديل صلاحيات المستشار: ${formData.name}`}
            </h4>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">الاسم الثلاثي أو القطاع</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: المهندس فيصل المقرن"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">البريد الإلكتروني للشركة (يجب أن ينتهي بـ @nwc.com.sa)</label>
                <input
                  type="email"
                  required
                  placeholder="f.mugrin@nwc.com.sa"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono text-left"
                  dir="ltr"
                  value={formData.username || ''}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-grey-600">كلمة مرور الحساب (لصاحب البريد)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: nwc1234"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono"
                  value={formData.password || ''}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {/* Role Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">مرتبة وامتياز الحساب</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: 'viewer', title: 'مستعرض', desc: 'استعراض البيانات والخرائط فقط دون القدرة على تعديل الرابط أو مواصفات العقد.' },
                  { value: 'editor', title: 'محرر خرائط', desc: 'صلاحية تعديل روابط الـ KMZ للمناطق المسموحة له والبيانات الفنية.' },
                  { value: 'admin', title: 'مدير كامل', desc: 'حق الوصول لجميع المشاريع وتلقي التقارير وإنشاء وتعديل مستخدمي النظام.' }
                ].map(r => (
                  <label
                    key={r.value}
                    className={`p-2.5 rounded-lg border text-right cursor-pointer flex flex-col justify-between transition-all ${
                      formData.role === r.value 
                        ? 'border-blue-600 bg-blue-50/20' 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{r.title}</span>
                      <input
                        type="radio"
                        name="role"
                        className="accent-blue-600"
                        checked={formData.role === r.value}
                        onChange={() => setFormData({ ...formData, role: r.value as any })}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 leading-normal mt-1">{r.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Allowed Regions (Checkboxes) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">تحديد المنافذ الجغرافية المسموحة (المناطق والأقاليم)</label>
                <button
                  type="button"
                  onClick={() => handleCheckboxChange('allowedRegions', 'الكل')}
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    formData.allowedRegions?.includes('الكل') 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  الوصول العام (الكل)
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {REGION_OPTIONS.map(reg => {
                  const isChecked = formData.allowedRegions?.includes(reg) || formData.allowedRegions?.includes('الكل');
                  const isAllChecked = formData.allowedRegions?.includes('الكل');
                  return (
                    <button
                      type="button"
                      key={reg}
                      onClick={() => handleCheckboxChange('allowedRegions', reg)}
                      className={`flex items-center gap-2 p-1.5 rounded text-right text-xs transition-colors cursor-pointer ${
                        isChecked 
                          ? 'bg-white text-blue-700 font-bold border border-blue-200 shadow-xs' 
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-slate-300" />}
                      <span className="truncate">{reg}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Allowed Scopes */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">تحديد قطاعات الشبكات المشمولة بالرؤية</label>
                <button
                  type="button"
                  onClick={() => handleCheckboxChange('allowedScopes', 'الكل')}
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    formData.allowedScopes?.includes('الكل') 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  صلاحية شاملة (الكل)
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {SCOPE_OPTIONS.map(scope => {
                  const isChecked = formData.allowedScopes?.includes(scope) || formData.allowedScopes?.includes('الكل');
                  const isAllChecked = formData.allowedScopes?.includes('الكل');
                  return (
                    <button
                      type="button"
                      key={scope}
                      onClick={() => handleCheckboxChange('allowedScopes', scope)}
                      className={`flex items-center gap-2 p-1.5 rounded text-right text-xs transition-colors cursor-pointer ${
                        isChecked 
                          ? 'bg-white text-emerald-700 font-bold border border-emerald-200 shadow-xs' 
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-slate-300" />}
                      <span>{scope}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setIsCreating(false);
                  if (users[0]) setSelectedUser(users[0]);
                }}
                className="text-xs font-semibold px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                إلغاء التعديل
              </button>
              <button
                type="submit"
                className="text-xs font-bold px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-xs"
              >
                حفظ كافة الصلاحيات
              </button>
            </div>
          </form>
        ) : selectedUser ? (
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            {/* Show info */}
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{selectedUser.name}</h4>
                  <p className="text-xs font-mono text-slate-400">اسم حساب البوابة: @{selectedUser.username}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <UserCheck className="h-7 w-7" />
                </div>
              </div>

              {/* Badges and parameters summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 col-span-1">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">المركبة الأمنية للمستخدم</span>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">
                      {selectedUser.role === 'admin' ? 'مدير كامل' : selectedUser.role === 'editor' ? 'محرر خرائط فنية' : 'مستعرض خرائط فقط'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 col-span-1">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">حالة الحساب بمركز التنسيق</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span className="text-xs font-semibold text-slate-800">نَشِط ومتصل لـ KMZ</span>
                  </div>
                </div>

                <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-100/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-blue-500 font-bold block mb-1">كلمة المرور المسجلة له</span>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-blue-800">
                      <Key className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>{showPassword ? (selectedUser.password || 'nwc1234') : '••••••••'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-100/50 transition-all cursor-pointer shrink-0"
                      title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Geographic boundaries visual */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">نطاق التراخيص الممنوح للمستخدم:</span>
                
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-500">
                    <strong className="text-slate-800">الأقاليم والمحافظات المسموحة:</strong>{' '}
                    {selectedUser.allowedRegions.includes('الكل') ? (
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">وصول جغرافي كامل (جميع المناطق)</span>
                    ) : (
                      <span className="text-slate-700">{selectedUser.allowedRegions.join('، ')}</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-slate-500">
                    <strong className="text-slate-800">القطاعات الفنية المسموحة:</strong>{' '}
                    {selectedUser.allowedScopes.includes('الكل') ? (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">كافة تخصصات المياه والصرف</span>
                    ) : (
                      <span className="text-slate-700">{selectedUser.allowedScopes.join('، ')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rules description */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                <span className="font-bold block mb-0.5">💡 أثر الصلاحيات:</span>
                عند قيام هذا المستخدم بتصفح الموقع، سيقوم النظام تلقائيّاً بحجب أي مشروع لا يقع في مناطق نفوذه المحددة، كما يمنع إظهار روابط الخرائط تماماً في واجهة المستخدم، مما يحول دون خروج البيانات السرية خارج البوابة.
              </div>
            </div>

            {/* Actions for selection */}
            {isAdmin && (
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedUser.id)}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 px-3 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف الحساب</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>تعديل هذا المستخدم</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-400 py-16">
            <Users className="h-10 w-10 mx-auto opacity-40 mb-2" />
            <p className="text-xs">الرجاء اختيار مستخدم من القائمة لمشاهدة أو تعديل تفاصيل صلاحياته.</p>
          </div>
        )}

      </div>
    </div>
  );
}
