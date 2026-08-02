/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, Project } from '../types';
import { 
  Users, 
  UserCheck, 
  Shield, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Key, 
  CheckSquare, 
  Square, 
  Settings, 
  Eye, 
  EyeOff, 
  Briefcase, 
  Building2, 
  Layers, 
  MapPin, 
  Bookmark, 
  Compass, 
  Filter, 
  ExternalLink 
} from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  projects?: Project[];
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

const TAB_OPTIONS = [
  { id: 'maps', label: 'الخرائط التفاعلية 🗺️' },
  { id: 'stats', label: 'الإحصائيات الجغرافية 📊' },
  { id: 'layers', label: 'طبقات المشاريع 🥞' }
];

const LAYER_OPTIONS = [
  { id: 'water', label: 'طبقة المياه 💧' },
  { id: 'sewage', label: 'طبقة الصرف 🌿' },
  { id: 'materials', label: 'طبقة مواد التشوين 📦' }
];

export function UserManagement({ 
  users, 
  currentUser, 
  onSaveUser, 
  onDeleteUser, 
  projects = [] 
}: UserManagementProps) {
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
    allowedScopes: ['الكل'],
    allowedTabs: ['maps', 'stats', 'layers'],
    canOpenExternalLinks: true,
    canFilter: true,
    canInsert: true,
    department: '',
    jobTitle: '',
    allowedProjectIds: []
  });

  // Sub-program selection state for permissions
  const [selectedSubProgramForPerms, setSelectedSubProgramForPerms] = useState<string>('');

  const isAdmin = currentUser.role === 'admin';

  // Compute unique sub-programs from projects list
  const subPrograms = useMemo(() => {
    const set = new Set(projects.map(p => p.subProgram).filter(Boolean));
    return Array.from(set).sort();
  }, [projects]);

  // Set default sub-program when entering creation/editing
  React.useEffect(() => {
    if (subPrograms.length > 0 && !selectedSubProgramForPerms) {
      setSelectedSubProgramForPerms(subPrograms[0]);
    }
  }, [subPrograms, selectedSubProgramForPerms]);

  // Compute projects in the selected sub-program
  const projectsInSelectedSubProgram = useMemo(() => {
    if (!selectedSubProgramForPerms) return [];
    return projects.filter(p => p.subProgram === selectedSubProgramForPerms && p.id !== -1);
  }, [projects, selectedSubProgramForPerms]);

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
      allowedTabs: ['maps', 'stats', 'layers'],
      allowedLayers: ['water', 'sewage', 'materials'],
      canOpenExternalLinks: true,
      canFilter: true,
      canInsert: true,
      department: '',
      jobTitle: '',
      allowedProjectIds: [],
      password: 'nwc' + Math.floor(1000 + Math.random() * 9000)
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
      username: displayedUsername,
      allowedTabs: selectedUser.allowedTabs || ['maps', 'stats', 'layers'],
      allowedLayers: selectedUser.allowedLayers || ['water', 'sewage', 'materials'],
      canOpenExternalLinks: selectedUser.canOpenExternalLinks !== false,
      canFilter: selectedUser.canFilter !== false,
      canInsert: selectedUser.canInsert !== false,
      department: selectedUser.department || '',
      jobTitle: selectedUser.jobTitle || '',
      allowedProjectIds: selectedUser.allowedProjectIds || []
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

  const handleTabToggle = (tabId: string) => {
    const currentTabs = formData.allowedTabs || ['maps', 'stats', 'layers'];
    let newTabs: string[];
    if (currentTabs.includes(tabId)) {
      newTabs = currentTabs.filter(t => t !== tabId);
    } else {
      newTabs = [...currentTabs, tabId];
    }
    setFormData({ ...formData, allowedTabs: newTabs });
  };

  // Specific projects selection handlers
  const handleToggleProjectPermission = (projectId: number) => {
    const list = formData.allowedProjectIds || [];
    let newList: number[];
    if (list.includes(projectId)) {
      newList = list.filter(id => id !== projectId);
    } else {
      newList = [...list, projectId];
    }
    setFormData({ ...formData, allowedProjectIds: newList });
  };

  const handleSelectAllProjectsInSubProgram = () => {
    const list = formData.allowedProjectIds || [];
    const subProjIds = projectsInSelectedSubProgram.map(p => p.id);
    
    // Add all project IDs of current sub-program if they are not already in the list
    const combined = Array.from(new Set([...list, ...subProjIds]));
    setFormData({ ...formData, allowedProjectIds: combined });
  };

  const handleDeselectAllProjectsInSubProgram = () => {
    const list = formData.allowedProjectIds || [];
    const subProjIds = projectsInSelectedSubProgram.map(p => p.id);
    
    // Remove all projects of this sub-program from the list
    const filtered = list.filter(id => !subProjIds.includes(id));
    setFormData({ ...formData, allowedProjectIds: filtered });
  };

  const handleSelectAllProjectsAcrossAllPrograms = () => {
    const allProjIds = projects.filter(p => p.id !== -1).map(p => p.id);
    setFormData({ ...formData, allowedProjectIds: allProjIds });
  };

  const handleDeselectAllProjectsAcrossAllPrograms = () => {
    setFormData({ ...formData, allowedProjectIds: [] });
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
      alert('الرجاء كتابة اسم المستخدم (البادئة) بشكل صحيح قبل النطاق.');
      return;
    }

    const savedUser: User = {
      id: formData.id || `user_${Date.now()}`,
      username: prefix,
      name: formData.name.trim(),
      role: formData.role as 'admin' | 'editor' | 'viewer',
      allowedRegions: formData.allowedRegions || ['الكل'],
      allowedScopes: formData.allowedScopes || ['الكل'],
      password: formData.password ? formData.password.trim() : 'nwc1234',
      
      // New fields mapping
      allowedTabs: formData.allowedTabs || ['maps', 'stats', 'layers'],
      allowedLayers: formData.allowedLayers || ['water', 'sewage', 'materials'],
      canOpenExternalLinks: formData.canOpenExternalLinks !== false,
      canFilter: formData.canFilter !== false,
      canInsert: formData.canInsert !== false,
      department: formData.department?.trim() || '',
      jobTitle: formData.jobTitle?.trim() || '',
      allowedProjectIds: formData.allowedProjectIds || []
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]" id="user-management-panel" dir="rtl">
      
      {/* Users List Column */}
      <div className="lg:col-span-4 border-l border-slate-200/80 p-5 space-y-4 flex flex-col">
        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h4 className="font-bold text-slate-800 text-sm">مستخدمو النظام</h4>
          </div>
          {isAdmin && (
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>مستخدم جديد</span>
            </button>
          )}
        </div>

        {/* List of Users */}
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {users.map(u => {
            const isSelected = selectedUser?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 text-right ${
                  isSelected 
                    ? 'border-blue-500/80 bg-blue-50/25 shadow-xs' 
                    : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-slate-850 text-xs flex flex-wrap items-center gap-1.5 leading-tight">
                      <span>{u.name}</span>
                      {u.id === currentUser.id && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-normal">
                          أنت حالياً
                        </span>
                      )}
                    </h5>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">@{u.username}</p>
                    
                    {/* Display Job Title and Department if present */}
                    {(u.jobTitle || u.department) && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-slate-500 text-[10px] font-semibold">
                        {u.jobTitle && (
                          <span className="flex items-center gap-0.5">
                            <Briefcase className="h-3 w-3 shrink-0 text-slate-400" />
                            {u.jobTitle}
                          </span>
                        )}
                        {u.department && (
                          <span className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-1.5">
                            <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                            {u.department}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap ${
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
                  {u.allowedProjectIds && u.allowedProjectIds.length > 0 && (
                    <div className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-bold">
                      مشاريع مخصصة: {u.allowedProjectIds.length}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail / Config Panel Column */}
      <div className="lg:col-span-8 p-6 flex flex-col justify-between overflow-y-auto max-h-[700px]">
        
        {/* Security Warning notice if not admin */}
        {!isAdmin && (
          <div className="mb-4 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-600 text-xs flex items-start gap-2 text-right">
            <Shield className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">مستند للقراءة فقط:</span> صلاحيات حسابك الحالي (<span className="font-semibold text-rose-600">{currentUser.name}</span>) لا تسمح لك بتعديل أو سحب صلاحيات مستخدمين آخرين. لوحة التعديل مقفلة.
            </div>
          </div>
        )}

        {(isEditing || isCreating) ? (
          <form onSubmit={handleSave} className="space-y-5 text-right">
            <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              {isCreating ? 'إعداد حساب مستخدم وصلاحيات جديدة' : `تعديل صلاحيات المستشار: ${formData.name}`}
            </h4>

            {/* Basic Info & Department/Job Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">الاسم الثلاثي أو القطاع</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: المهندس فيصل المقرن"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-right"
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
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono text-left"
                  dir="ltr"
                  value={formData.username || ''}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">كلمة مرور الحساب (لصاحب البريد)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: nwc1234"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono text-center"
                  value={formData.password || ''}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              {/* Requirement 3: Add Department and Job Title fields */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 justify-start">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>القسم / الإدارة</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: إدارة مشاريع الصرف الصحي"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-right"
                  value={formData.department || ''}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 justify-start">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span>الوظيفة / المسمى الوظيفي</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: أخصائي نظم معلومات جغرافية"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-right"
                  value={formData.jobTitle || ''}
                  onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>
            </div>

            {/* Role Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">مرتبة وامتياز الحساب</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { value: 'viewer', title: 'مستعرض', desc: 'استعراض البيانات والخرائط فقط دون القدرة على تعديل الرابط أو مواصفات العقد.' },
                  { value: 'editor', title: 'محرر خرائط', desc: 'صلاحية تعديل روابط الـ KMZ للمناطق المسموحة له والبيانات الفنية.' },
                  { value: 'admin', title: 'مدير كامل', desc: 'حق الوصول لجميع المشاريع وتلقي التقارير وإنشاء وتعديل مستخدمي النظام.' }
                ].map(r => (
                  <label
                    key={r.value}
                    className={`p-2.5 rounded-lg border text-right cursor-pointer flex flex-col justify-between transition-all ${
                      formData.role === r.value 
                        ? 'border-blue-600 bg-blue-50/25 shadow-2xs' 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{r.title}</span>
                      <input
                        type="radio"
                        name="role"
                        className="accent-blue-600 cursor-pointer"
                        checked={formData.role === r.value}
                        onChange={() => setFormData({ ...formData, role: r.value as any })}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 leading-normal mt-1">{r.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Requirement 2: List all site features in permissions */}
            <div className="border border-slate-200/80 rounded-2xl p-4.5 bg-slate-50/40 space-y-4">
              <span className="text-xs font-extrabold text-slate-800 block">إعداد خصائص الموقع وصلاحيات الاستخدام</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* A. Tab Permissions */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">التبويبات المسموح للرؤية بزيارتها:</label>
                  <div className="space-y-1.5">
                    {TAB_OPTIONS.map(tab => {
                      const isAllowed = (formData.allowedTabs || ['maps', 'stats', 'layers']).includes(tab.id);
                      return (
                        <button
                          type="button"
                          key={tab.id}
                          onClick={() => handleTabToggle(tab.id)}
                          className={`flex items-center justify-between w-full p-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            isAllowed 
                              ? 'bg-white border-blue-200 text-blue-800' 
                              : 'bg-white/50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {isAllowed ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* B. Specific Feature Settings */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">تراخيص التحكم والتصفح الإضافية:</label>
                  <div className="space-y-1.5">
                    {/* B1. Open External Links */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, canOpenExternalLinks: !formData.canOpenExternalLinks })}
                      className={`flex items-center justify-between w-full p-2.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        formData.canOpenExternalLinks !== false
                          ? 'bg-white border-blue-200 text-blue-800'
                          : 'bg-white/50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span>فتح روابط خارجية ↗️</span>
                        <span className="text-[9px] text-slate-400 font-normal">تفعيل أزرار ملاحة خرائط قوقل الخارجية</span>
                      </div>
                      {formData.canOpenExternalLinks !== false ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                    </button>

                    {/* B2. Filtering and Search */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, canFilter: !formData.canFilter })}
                      className={`flex items-center justify-between w-full p-2.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        formData.canFilter !== false
                          ? 'bg-white border-blue-200 text-blue-800'
                          : 'bg-white/50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span>البحث والتصفية والفلترة 🔍</span>
                        <span className="text-[9px] text-slate-400 font-normal">عرض شريط فلترة المشاريع في القائمة</span>
                      </div>
                      {formData.canFilter !== false ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                    </button>

                    {/* B3. Inserting projects */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, canInsert: !formData.canInsert })}
                      className={`flex items-center justify-between w-full p-2.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        formData.canInsert !== false
                          ? 'bg-white border-blue-200 text-blue-800'
                          : 'bg-white/50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span>إدراج وإضافة مشاريع جديدة ➕</span>
                        <span className="text-[9px] text-slate-400 font-normal">السماح بتعبئة وإدراج مشاريع جغرافية بالبوابة</span>
                      </div>
                      {formData.canInsert !== false ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* B4. Project Layers Permissions */}
                <div className="space-y-2 col-span-1 md:col-span-2 border-t border-slate-200/60 pt-3 mt-1">
                  <label className="text-xs font-bold text-slate-700 block">صلاحيات رؤية طبقات المشاريع التفصيلية:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {LAYER_OPTIONS.map(layer => {
                      const list = formData.allowedLayers || ['water', 'sewage', 'materials'];
                      const isAllowed = list.includes(layer.id) || list.includes('الكل');
                      return (
                        <button
                          type="button"
                          key={layer.id}
                          onClick={() => {
                            let baseList = list.includes('الكل') 
                              ? ['water', 'sewage', 'materials'] 
                              : list.filter(l => l !== 'الكل');
                            let newLayers: string[];
                            if (baseList.includes(layer.id)) {
                              newLayers = baseList.filter(l => l !== layer.id);
                            } else {
                              newLayers = [...baseList, layer.id];
                            }
                            setFormData({ ...formData, allowedLayers: newLayers });
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            isAllowed
                              ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs'
                              : 'bg-white/50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span>{layer.label}</span>
                          {isAllowed ? (
                            <CheckSquare className="h-4 w-4 text-amber-600 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Allowed Regions (Checkboxes) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">تحديد المنافذ الجغرافية المسموحة (المناطق والأقاليم)</label>
                <button
                  type="button"
                  onClick={() => handleCheckboxChange('allowedRegions', 'الكل')}
                  className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer border-0 ${
                    formData.allowedRegions?.includes('الكل') 
                      ? 'bg-blue-600 text-white border-blue-600 font-bold' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-semibold'
                  }`}
                >
                  الوصول العام (الكل)
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {REGION_OPTIONS.map(reg => {
                  const isChecked = formData.allowedRegions?.includes(reg) || formData.allowedRegions?.includes('الكل');
                  return (
                    <button
                      type="button"
                      key={reg}
                      onClick={() => handleCheckboxChange('allowedRegions', reg)}
                      className={`flex items-center gap-2 p-1.5 rounded text-right text-xs transition-colors cursor-pointer ${
                        isChecked 
                          ? 'bg-white text-blue-700 font-bold border border-blue-200 shadow-xs' 
                          : 'text-slate-500 hover:bg-slate-100 bg-transparent border-0'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" /> : <Square className="h-4 w-4 text-slate-300 shrink-0" />}
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
                  className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer border-0 ${
                    formData.allowedScopes?.includes('الكل') 
                      ? 'bg-blue-600 text-white border-blue-600 font-bold' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-semibold'
                  }`}
                >
                  صلاحية شاملة (الكل)
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {SCOPE_OPTIONS.map(scope => {
                  const isChecked = formData.allowedScopes?.includes(scope) || formData.allowedScopes?.includes('الكل');
                  return (
                    <button
                      type="button"
                      key={scope}
                      onClick={() => handleCheckboxChange('allowedScopes', scope)}
                      className={`flex items-center gap-2 p-1.5 rounded text-right text-xs transition-colors cursor-pointer ${
                        isChecked 
                          ? 'bg-white text-emerald-700 font-bold border border-emerald-200 shadow-xs' 
                          : 'text-slate-500 hover:bg-slate-100 bg-transparent border-0'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" /> : <Square className="h-4 w-4 text-slate-300 shrink-0" />}
                      <span>{scope}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Requirement 2: Custom project permissions based on Sub-Program selection */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-amber-50/20 border-amber-200/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/30 pb-2">
                <div>
                  <h5 className="text-xs font-extrabold text-amber-800 flex items-center gap-1">
                    <Layers className="h-4 w-4 text-amber-600" />
                    <span>صلاحية تحديد مشاريع مخصصة داخل البرنامج الفرعي</span>
                  </h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    اختر البرنامج الفرعي، ثم عيّن مشاريع محددة للمستشار أو عيّنها كاملة.
                  </p>
                </div>
                {formData.allowedProjectIds && formData.allowedProjectIds.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-bold">
                    إجمالي المشاريع المحددة المسموحة: {formData.allowedProjectIds.length}
                  </span>
                )}
              </div>

              {/* Global control for all projects across all programs */}
              <div className="bg-amber-500/5 border border-amber-200/40 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" id="global-projects-bulk-actions">
                <div className="space-y-0.5 text-right">
                  <span className="text-xs font-bold text-amber-900 block">التحكم الشامل بكافة المشاريع:</span>
                  <p className="text-[10px] text-slate-500 leading-normal">تحديد أو إلغاء تحديد كافة المشاريع بجميع البرامج الفرعية المتاحة بضغطة واحدة.</p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllProjectsAcrossAllPrograms}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-black rounded-lg transition-colors border-0 cursor-pointer shadow-3xs"
                  >
                    تحديد جميع المشاريع بكافة البرامج 🌐
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllProjectsAcrossAllPrograms}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 cursor-pointer shadow-3xs"
                  >
                    إلغاء تحديد كافة المشاريع 🧹
                  </button>
                </div>
              </div>

              {/* Sub-Program dropdown selection */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <label className="text-xs font-bold text-slate-600 shrink-0">البرنامج الفرعي النشط:</label>
                <select
                  value={selectedSubProgramForPerms}
                  onChange={e => setSelectedSubProgramForPerms(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1"
                >
                  <option value="">-- اختر البرنامج الفرعي --</option>
                  {subPrograms.map(sp => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>

                {selectedSubProgramForPerms && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllProjectsInSubProgram}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black rounded-lg transition-colors border-0 cursor-pointer"
                    >
                      كامل مشاريع هذا البرنامج 🎯
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllProjectsInSubProgram}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition-colors border-0 cursor-pointer"
                    >
                      إلغاء تحديد الكل
                    </button>
                  </div>
                )}
              </div>

              {/* Projects in Selected Sub-Program Checkbox List */}
              {selectedSubProgramForPerms ? (
                projectsInSelectedSubProgram.length > 0 ? (
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto bg-white border border-slate-200 rounded-xl p-3">
                    {projectsInSelectedSubProgram.map(proj => {
                      const isChecked = (formData.allowedProjectIds || []).includes(proj.id);
                      return (
                        <button
                          type="button"
                          key={proj.id}
                          onClick={() => handleToggleProjectPermission(proj.id)}
                          className={`flex items-start gap-2.5 p-2 rounded-lg text-right text-xs transition-all w-full border cursor-pointer ${
                            isChecked 
                              ? 'bg-amber-50/50 border-amber-200 text-amber-900 font-bold' 
                              : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-slate-350 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-slate-800 text-[11px] font-extrabold">{proj.name}</span>
                              <span className="text-[9px] px-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded whitespace-nowrap">{proj.classification}</span>
                            </div>
                            <div className="text-[9.5px] text-slate-400 font-normal mt-1 leading-none">
                              الرقم التشغيلي: <span className="font-mono">{proj.operationalNumber}</span> | المقاول: {proj.contractor}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-100 rounded-xl text-center text-xs text-slate-400">
                    لا توجد مشاريع مضافة تابعة لهذا البرنامج الفرعي بعد.
                  </div>
                )
              ) : (
                <div className="p-4 bg-white border border-slate-100 rounded-xl text-center text-xs text-slate-400">
                  يرجى تحديد برنامج فرعي لعرض ومطابقة المشاريع الفردية.
                </div>
              )}
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setIsCreating(false);
                  if (users[0]) setSelectedUser(users[0]);
                }}
                className="text-xs font-semibold px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer bg-white"
              >
                إلغاء التعديل
              </button>
              <button
                type="submit"
                className="text-xs font-bold px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-xs cursor-pointer border-0"
              >
                حفظ كافة الصلاحيات
              </button>
            </div>
          </form>
        ) : selectedUser ? (
          <div className="space-y-6 flex-1 flex flex-col justify-between text-right">
            {/* Show User Detail */}
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{selectedUser.name}</h4>
                  <p className="text-xs font-mono text-slate-400">اسم حساب البوابة: @{selectedUser.username}</p>
                  
                  {/* Display Department & Job Title in Detail Card */}
                  {(selectedUser.jobTitle || selectedUser.department) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-slate-600 text-xs">
                      {selectedUser.jobTitle && (
                        <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                          <Briefcase className="h-4 w-4 text-slate-400" />
                          <span>الوظيفة: <strong>{selectedUser.jobTitle}</strong></span>
                        </span>
                      )}
                      {selectedUser.department && (
                        <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span>القسم: <strong>{selectedUser.department}</strong></span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shrink-0">
                  <UserCheck className="h-7 w-7" />
                </div>
              </div>

              {/* Badges and parameters summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1 text-right">المرتبة الأمنية للمستخدم</span>
                  <div className="flex items-center gap-1.5 justify-start">
                    <Shield className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">
                      {selectedUser.role === 'admin' ? 'مدير كامل' : selectedUser.role === 'editor' ? 'محرر خرائط فنية' : 'مستعرض خرائط فقط'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1 text-right">حالة الحساب بمركز التنسيق</span>
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span className="text-xs font-semibold text-slate-800">نَشِط ومتصل لـ KMZ</span>
                  </div>
                </div>

                <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-100/60">
                  <span className="text-[10px] text-blue-500 font-bold block mb-1 text-right">كلمة المرور المسجلة له</span>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-blue-800">
                      <Key className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>{showPassword ? (selectedUser.password || 'nwc1234') : '••••••••'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-100/50 transition-all cursor-pointer shrink-0 border-0 bg-transparent"
                      title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Requirement 2 Checklist overview in User detail card */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <span className="text-xs font-extrabold text-slate-800 block">امتيازات التحكم المفصلة:</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                  {/* Tabs */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">التبويبات المصرح بزيارتها:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedUser.allowedTabs || ['maps', 'stats', 'layers']).map(tab => (
                        <span key={tab} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          {tab === 'maps' ? 'الخرائط التفاعلية' : tab === 'stats' ? 'الإحصائيات' : tab === 'layers' ? 'طبقات المشاريع' : tab}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">الخصائص الإضافية المسموحة:</span>
                    <div className="flex flex-col gap-1 text-[11px] font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.canOpenExternalLinks !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className={selectedUser.canOpenExternalLinks !== false ? 'text-emerald-700' : 'text-slate-400'}>
                          فتح الروابط الخارجية: {selectedUser.canOpenExternalLinks !== false ? 'مسموح ✅' : 'معطل 🔒'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.canFilter !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className={selectedUser.canFilter !== false ? 'text-emerald-700' : 'text-slate-400'}>
                          البحث والتصفية: {selectedUser.canFilter !== false ? 'مسموح ✅' : 'معطل 🔒'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.canInsert !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className={selectedUser.canInsert !== false ? 'text-emerald-700' : 'text-slate-400'}>
                          إدراج وإضافة مشاريع: {selectedUser.canInsert !== false ? 'مسموح ✅' : 'معطل 🔒'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Layers allowed */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 md:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">طبقات المشاريع المسموح برؤيتها:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {((selectedUser.allowedLayers && selectedUser.allowedLayers.length > 0) ? selectedUser.allowedLayers : ['water', 'sewage', 'materials']).map(l => (
                        <span key={l} className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/60 rounded text-[10px] font-bold">
                          {l === 'water' ? '💧 المياه' : l === 'sewage' ? '🌿 الصرف الصحي' : l === 'materials' ? '📦 مواد التشوين' : l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Geographic boundaries visual */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">نطاق التراخيص الجغرافي والقطاعي الممنوح للمستخدم:</span>
                
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-500">
                    <strong className="text-slate-800">الأقاليم والمحافظات المسموحة:</strong>{' '}
                    {selectedUser.allowedRegions.includes('الكل') ? (
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">وصول جغرافي كامل (جميع المناطق)</span>
                    ) : (
                      <span className="text-slate-700 font-semibold">{selectedUser.allowedRegions.join('، ')}</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-slate-500">
                    <strong className="text-slate-800">القطاعات الفنية المسموحة:</strong>{' '}
                    {selectedUser.allowedScopes.includes('الكل') ? (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">كافة تخصصات المياه والصرف</span>
                    ) : (
                      <span className="text-slate-700 font-semibold">{selectedUser.allowedScopes.join('، ')}</span>
                    )}
                  </div>

                  {selectedUser.allowedProjectIds && selectedUser.allowedProjectIds.length > 0 && (
                    <div className="text-xs text-slate-500 border-t border-dashed border-slate-200 pt-2.5 mt-2.5">
                      <strong className="text-amber-800">🔒 الوصول مقتصر على مشاريع محددة ({selectedUser.allowedProjectIds.length}):</strong>{' '}
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                        تم تقييد رؤية هذا المستشار حصراً على المشاريع المحددة التي عينها المشرف العام. لن يتمكن من رؤية غيرها في البوابة.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rules description */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                <span className="font-bold block mb-0.5">💡 أثر الصلاحيات والقيود:</span>
                تلقائياً يقوم النظام بتطبيق القيود الجغرافية والقطاعية والمشاريع المخصصة لفلترة المشاريع في الخرائط والإحصائيات وتفاصيل البوابة لضمان حماية ومطابقة السرية التامة للمعلومات الرسمية لشركة المياه الوطنية.
              </div>
            </div>

            {/* Actions for selection */}
            {isAdmin && (
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedUser.id)}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 px-3 py-2 rounded-xl transition-all cursor-pointer bg-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف الحساب</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer border-0"
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
