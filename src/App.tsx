/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Project, User } from './types';
import { getParsedProjects } from './data/initialProjects';
import { INITIAL_USERS } from './data/initialUsers';

// استيراد عميل سوبابيس للربط والمزامنة الحية
import { supabase } from './supabase';

// Components
import { DashboardStats } from './components/DashboardStats';
import { ProjectMapViewer } from './components/ProjectMapViewer';
import { UserManagement } from './components/UserManagement';
import { ProjectModal } from './components/ProjectModal';
import { ProjectList } from './components/ProjectList';
import { NWCLogo } from './components/NWCLogo';

// Icons
import { 
  Layers, 
  Map, 
  Users, 
  Plus, 
  ChevronDown, 
  ShieldAlert, 
  Settings, 
  LifeBuoy, 
  ShieldCheck, 
  Lock,
  Compass,
  FileSpreadsheet,
  AlertCircle,
  Mail,
  Key,
  LogOut,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  // 1. Authentication State
  const [isLogged, setIsLogged] = useState<boolean>(() => {
    return localStorage.getItem('water_maps_is_logged') === 'true';
  });

  // 2. Core State (تبدأ محلياً من الكاش لضمان عدم حدوث شاشة بيضاء في وضع عدم الاتصال، ويتم تحديثها لايف من سوبابيس)
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const cached = localStorage.getItem('water_maps_cached_projects');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error(e);
    }
    return getParsedProjects();
  });
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const cached = localStorage.getItem('water_maps_cached_users');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_USERS;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedAndActive = localStorage.getItem('water_maps_active_user_id');
    if (savedAndActive) {
      // سيتم مطابقتها بعد جلب المستخدمين من السيرفر، مرحلياً نضع قيمة افتراضية
      return { id: savedAndActive, username: 'admin', name: 'جاري التحميل...', role: 'admin', allowedRegions: ['الكل'], allowedScopes: ['الكل'], password: '' };
    }
    return INITIAL_USERS[0]; // Admin by default
  });

  // 3. UI Control State
  const [activeTab, setActiveTab] = useState<'maps' | 'stats' | 'users'>('maps');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'map' | 'list'>('list');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showRoleSwitcherDropdown, setShowRoleSwitcherDropdown] = useState(false);
  const [successNotification, setSuccessNotification] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);

  // 3.0. Offline/Online Status Monitor
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3.1 Login states
  const [loginTab, setLoginTab] = useState<'nwc' | 'admin'>('nwc');
  const [nwcEmail, setNwcEmail] = useState('');
  const [nwcName, setNwcName] = useState('');
  const [nwcPassword, setNwcPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 4. Persistent Synchronization effects (المشاريع المفضلة)
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    const savedActive = localStorage.getItem('water_maps_active_user_id');
    const userId = savedActive || 'admin';
    const saved = localStorage.getItem(`water_maps_favorites_${userId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  });

  // ==========================================
  // دالة جلب البيانات من Supabase عند تشغيل الموقع
  // ==========================================
  const fetchDataFromSupabase = async () => {
    setIsLoading(true);
    try {
      // 1. جلب المشروعات مرتبة بالأحدث
      const { data: dbProjects, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. جلب المستخدمين المعتمدين
      const { data: dbUsers, error: userError } = await supabase
        .from('users')
        .select('*');

      if (!projError && dbProjects) {
        // مطابقة وتغيير مسميات الحقول لتتوافق مع الـ Frontend إن وجدت
        const mappedProjects = dbProjects.map((p: any) => ({
          id: p.id,
          operationalNumber: p.operational_number,
          name: p.name,
          po: p.po || '',
          unifierNo: p.unifier_no || '',
          contractor: p.contractor,
          consultant: p.consultant,
          status: p.status,
          scope: p.scope || '',
          classification: p.classification,
          businessUnit: p.business_unit,
          region: p.region,
          subProgram: p.sub_program || '',
          mapUrl: p.map_url || '',
          x: p.x !== undefined && p.x !== null ? Number(p.x) : null,
          y: p.y !== undefined && p.y !== null ? Number(p.y) : null
        }));
        setProjects(mappedProjects);
        try {
          localStorage.setItem('water_maps_cached_projects', JSON.stringify(mappedProjects));
        } catch (cacheErr) {
          console.error("خطأ في حفظ كاش المشاريع:", cacheErr);
        }
      } else {
        // fallback للبيانات المحلية في حال عدم توفر داتا في السيرفر بعد
        const localProjs = getParsedProjects();
        setProjects(localProjs);
      }

      if (!userError && dbUsers) {
        const mappedUsers = dbUsers.map((u: any) => {
          let allowedRegions: string[] = ['الكل'];
          if (u.allowed_regions) {
            if (Array.isArray(u.allowed_regions)) {
              allowedRegions = u.allowed_regions;
            } else if (typeof u.allowed_regions === 'string') {
              try {
                const cleaned = u.allowed_regions.trim();
                if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
                  allowedRegions = JSON.parse(cleaned);
                } else {
                  allowedRegions = cleaned.split(',').map((x: string) => x.trim()).filter(Boolean);
                }
              } catch (e) {
                allowedRegions = u.allowed_regions.split(',').map((x: string) => x.trim()).filter(Boolean);
              }
            }
          }

          let allowedScopes: string[] = ['الكل'];
          if (u.allowed_scopes) {
            if (Array.isArray(u.allowed_scopes)) {
              allowedScopes = u.allowed_scopes;
            } else if (typeof u.allowed_scopes === 'string') {
              try {
                const cleaned = u.allowed_scopes.trim();
                if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
                  allowedScopes = JSON.parse(cleaned);
                } else {
                  allowedScopes = cleaned.split(',').map((x: string) => x.trim()).filter(Boolean);
                }
              } catch (e) {
                allowedScopes = u.allowed_scopes.split(',').map((x: string) => x.trim()).filter(Boolean);
              }
            }
          }

          return {
            id: u.id,
            username: u.username,
            name: u.name,
            role: u.role,
            allowedRegions: allowedRegions.length > 0 ? allowedRegions : ['الكل'],
            allowedScopes: allowedScopes.length > 0 ? allowedScopes : ['الكل'],
            password: u.password
          };
        });
        setUsers(mappedUsers);
        try {
          localStorage.setItem('water_maps_cached_users', JSON.stringify(mappedUsers));
        } catch (cacheErr) {
          console.error("خطأ في حفظ كاش المستخدمين:", cacheErr);
        }

        // تعيين المستخدم الحالي النشط من السيرفر طالما مسجل دخول
        const savedAndActive = localStorage.getItem('water_maps_active_user_id');
        if (savedAndActive) {
          const found = mappedUsers.find(u => u.id === savedAndActive);
          if (found) setCurrentUser(found);
        } else {
          setCurrentUser(mappedUsers[0] || INITIAL_USERS[0]);
        }
      } else {
        setUsers(INITIAL_USERS);
      }
    } catch (err) {
      console.warn("حدثت مشكلة بالاتصال بموقع السيرفر، تم تحميل كاش العمل المحلي بنجاح لتجنب انقطاع العمل:", err);
      // Fallback in case of extreme errors, try to read from cache immediately
      try {
        const cachedProj = localStorage.getItem('water_maps_cached_projects');
        if (cachedProj) {
          setProjects(JSON.parse(cachedProj));
        }
        const cachedUsr = localStorage.getItem('water_maps_cached_users');
        if (cachedUsr) {
          const mappedUsers = JSON.parse(cachedUsr);
          setUsers(mappedUsers);
        }
      } catch (cacheFetchErr) {
        console.error("تعذر استرداد الكاش التالف:", cacheFetchErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromSupabase();
  }, []);

  // حفظ تعديل المفضلة محلياً
  useEffect(() => {
    localStorage.setItem('water_maps_active_user_id', currentUser.id);
    if (currentUser.role !== 'admin' && activeTab === 'users') {
      setActiveTab('maps');
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    const saved = localStorage.getItem(`water_maps_favorites_${currentUser.id}`);
    if (saved) {
      try { setFavoriteIds(JSON.parse(saved)); } catch (e) { setFavoriteIds([]); }
    } else {
      setFavoriteIds([]);
    }
  }, [currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`water_maps_favorites_${currentUser.id}`, JSON.stringify(favoriteIds));
  }, [favoriteIds, currentUser.id]);

  // دمج ميزة الرجوع الذكي باستخدام زر الرجوع للجوال والمتصفح لضمان عدم إغلاق التطبيق فجأة
  useEffect(() => {
    if (!isLogged) return;

    // تهيئة حالة أولية في تاريخ المتصفح
    if (!window.history.state || window.history.state.step !== 'app') {
      window.history.replaceState({ step: 'root' }, '');
      window.history.pushState({ step: 'app' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      // إذا كانت نافذة الخروج النشطة معروضة، يتم إغلاقها بدلاً من المغادرة
      if (showExitModal) {
        setShowExitModal(false);
        window.history.pushState({ step: 'app' }, '');
        return;
      }

      let handled = false;

      // 1. إغلاق نافذة تعديل أو إضافة مشروع إذا كانت مفتوحة
      if (isProjectModalOpen) {
        setIsProjectModalOpen(false);
        handled = true;
      }
      // 2. إلغاء تحديد المشروع النشط على الخارطة والرجوع للقائمة
      else if (selectedProjectId !== null) {
        setSelectedProjectId(null);
        setMobileViewMode('list');
        handled = true;
      }
      // 3. الرجوع لتبويب الخرائط إن كان المستخدم يتصفح الإحصائيات أو الحسابات
      else if (activeTab !== 'maps') {
        setActiveTab('maps');
        handled = true;
      }

      if (handled) {
        // إعادة تعبئة الـ History Stack لتظل الميزة فعالة في المرة القادمة
        window.history.pushState({ step: 'app' }, '');
      } else {
        // إذا كان المستخدم في الصفحة الرئيسية ومطبّق عليه قائمة المشاريع، نعرض رسالة تأكيد الخروج
        setShowExitModal(true);
        window.history.pushState({ step: 'app' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLogged, isProjectModalOpen, selectedProjectId, activeTab, showExitModal]);

  const handleToggleFavorite = (projectId: number) => {
    setFavoriteIds(prev => {
      const isFav = prev.includes(projectId);
      const updated = isFav ? prev.filter(id => id !== projectId) : [...prev, projectId];
      showNotification(isFav ? 'تمت الإزالة من المشاريع المفضلة ⭐️' : 'تمت الإضافة إلى المشاريع المفضلة ⭐');
      return updated;
    });
  };

  // 5. Role-based Project Filtering Logic
  const visibleProjects = useMemo(() => {
    // Helper to determine the actual effective scope of a project (resolving any data classification discrepancies)
    const getActualProjectScope = (proj: Project): string => {
      const name = (proj.name || '').trim();
      const scope = (proj.scope || '').trim();
      const classification = (proj.classification || '').trim();
      const subProgram = (proj.subProgram || '').trim();
      
      // If the project mentions "صرف صحي" or "الصرف الصحي" or sewage treatment/environmental elements in its name, classification, or subprogram,
      // it MUST be classified as sewage/wastewater (صرف صحي) to protect users from permission data-entry errors.
      if (
        name.includes('صرف') || 
        name.includes('الصرف') || 
        classification.includes('صرف') || 
        classification.includes('معالجة') || 
        classification.includes('بيئية') || 
        subProgram.includes('صرف')
      ) {
        return 'صرف صحي';
      }
      
      if (scope.includes('صرف')) {
        return 'صرف صحي';
      }
      
      if (scope.includes('مياه')) {
        return 'مياه';
      }
      
      return scope || 'مياه';
    };

    return projects.filter(p => {
      if (currentUser.role === 'admin') return true;
      const uRegions = (currentUser.allowedRegions || []).map(r => r.trim());
      const isAllRegions = uRegions.includes('الكل');
      
      let isRegionAllowed = isAllRegions;
      if (!isRegionAllowed) {
        const pr = (p.region || '').trim();
        const pb = (p.businessUnit || '').trim();
        const ps = (p.subProgram || '').trim();
        
        // 1. Direct match on region or business unit
        if (uRegions.includes(pr) || uRegions.includes(pb) || uRegions.includes(ps)) {
          isRegionAllowed = true;
        }
        
        // 2. Map-based fallbacks for Governorate classifications to be absolutely perfect
        if (!isRegionAllowed) {
          const northGovs = ['المجمعة', 'رماح', 'الزلفي', 'ثادق', 'حريملاء', 'الغاط', 'ثادق وحريملاء'];
          const southGovs = ['السليل', 'وادي الدواسر', 'الأفلاج', 'حوطة بني تميم', 'الحريق', 'السيح', 'الخرج', 'تمرة', 'خيران', 'السيح والخرج'];
          const westGovs = ['المزاحمية', 'شقراء', 'عفيف', 'القويعية', 'البجاديه', 'البجادية', 'ضرما', 'ضرماء', 'الدوادمي', 'شقراء ومرات', 'عفيف والدوادمي', 'المزاحمية و ضرماء'];
          
          if (uRegions.includes('المحافظات الشمالية') && (northGovs.includes(pr) || pr.includes('المجمعة') || pr.includes('رماح') || pr.includes('الزلفي') || pr.includes('حريملاء') || pr.includes('الغاط') || pr.includes('ثادق'))) {
            isRegionAllowed = true;
          }
          if (uRegions.includes('المحافظات الجنوبية') && (southGovs.includes(pr) || pr.includes('السليل') || pr.includes('الدواسر') || pr.includes('الأفلاج') || pr.includes('تميم') || pr.includes('الخرج') || pr.includes('الحريق') || pr.includes('السيح'))) {
            isRegionAllowed = true;
          }
          if (uRegions.includes('المحافظات الغربية') && (westGovs.includes(pr) || pr.includes('عفيف') || pr.includes('الدوادمي') || pr.includes('المزاحمية') || pr.includes('شقراء') || pr.includes('القويعية') || pr.includes('البجادية') || pr.includes('البجاديه') || pr.includes('ضرما') || pr.includes('ضرماء'))) {
            isRegionAllowed = true;
          }
        }
      }

      const isAllScopes = currentUser.allowedScopes.includes('الكل');
      const actualScope = getActualProjectScope(p);
      const isScopeAllowed = isAllScopes || currentUser.allowedScopes.some(scopeType => {
        const uScope = scopeType.trim();
        if (!uScope) return false;
        return actualScope === uScope;
      });

      return isRegionAllowed && isScopeAllowed;
    }).map(p => ({
      ...p,
      isFavorite: favoriteIds.includes(p.id)
    }));
  }, [projects, currentUser, favoriteIds]);

  // 5.1 Lifted Advanced Search / Filter States for Global Synchrony
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubProgram, setSelectedSubProgram] = useState('الكل');
  const [selectedClassification, setSelectedClassification] = useState('الكل');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 5.2 Compute filteredProjects based on active filtering criteria
  const filteredProjects = useMemo(() => {
    return visibleProjects.filter(p => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query ||
        p.name.toLowerCase().includes(query) ||
        p.operationalNumber.toLowerCase().includes(query) ||
        (p.contractor || '').toLowerCase().includes(query) ||
        (p.consultant || '').toLowerCase().includes(query) ||
        (p.po || '').toLowerCase().includes(query) ||
        (p.unifierNo || '').toLowerCase().includes(query) ||
        (p.classification || '').toLowerCase().includes(query) ||
        (p.status || '').toLowerCase().includes(query);

      const matchesSubProgram = selectedSubProgram === 'الكل' || p.subProgram === selectedSubProgram;
      const matchesClassification = selectedClassification === 'الكل' || p.classification === selectedClassification;
      const matchesStatus = selectedStatus === 'الكل' || p.status === selectedStatus;
      const matchesFavorites = !showOnlyFavorites || !!p.isFavorite;

      return matchesSearch && matchesSubProgram && matchesClassification && matchesStatus && matchesFavorites;
    });
  }, [visibleProjects, searchTerm, selectedSubProgram, selectedClassification, selectedStatus, showOnlyFavorites]);

  // 6. Selected Project Details resolver
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    const found = visibleProjects.find(p => p.id === selectedProjectId);
    return found || null;
  }, [visibleProjects, selectedProjectId]);

  const canEditProjects = currentUser.role === 'admin' || currentUser.role === 'editor';

  const showNotification = (msg: string) => {
    setSuccessNotification(msg);
    setTimeout(() => setSuccessNotification(''), 4000);
  };

  // 7. Login Submission Handler
  const handleNwcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const email = nwcEmail.trim().toLowerCase();
    
    const nwcRegex = /^[a-zA-Z0-9._%+-]+@nwc\.com\.sa$/;
    if (!nwcRegex.test(email)) {
      setLoginError('الرجاء استخدام البريد الإلكتروني الرسمي لشركة المياه الوطنية والمنتهي بنطاق @nwc.com.sa');
      return;
    }

    const prefix = email.split('@')[0];
    const found = users.find(u => u.username.toLowerCase() === prefix);

    if (found) {
      const correctPassword = found.password || 'nwc1234';
      if (nwcPassword.trim() !== correctPassword) {
        setLoginError('كلمة المرور المدخلة غير صحيحة! يرجى التأكد من كلمة المرور أو مراجعة مدير النظام.');
        return;
      }
      setCurrentUser(found);
      setIsLogged(true);
      localStorage.setItem('water_maps_is_logged', 'true');
      localStorage.setItem('water_maps_active_user_id', found.id);
      showNotification(`مرحباً بك مجدداً المهندس: ${found.name}`);
    } else {
      setLoginError('عذراً، هذا البريد غير معتمد ومسجل مسبقاً في النظام. يرجى مراجعة مدير النظام.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (adminPassword === '20302060') {
      const adminUser = users.find(u => u.role === 'admin') || INITIAL_USERS[0];
      setCurrentUser(adminUser);
      setIsLogged(true);
      localStorage.setItem('water_maps_is_logged', 'true');
      localStorage.setItem('water_maps_active_user_id', adminUser.id);
      showNotification('أهلاً بك يا مدير النظام، تم تسجيل الدخول بنجاح.');
    } else {
      setLoginError('كلمة المرور غير صحيحة! يرجى إدخال رمز التحقق الأمني الصحيح الخاص بمدير النظام.');
    }
  };

  const handleLogout = () => {
    setIsLogged(false);
    localStorage.removeItem('water_maps_is_logged');
    setSelectedProjectId(null);
    showNotification('تم تسجيل الخروج بنجاح وسحب ترخيص البوابة المؤقت.');
  };

  // ==========================================
  // حفظ وإدراج المشاريع الحية في سوبابيس لايف
  // ==========================================
  const handleSaveProject = async (savedProj: Project) => {
    const payload = {
      operational_number: savedProj.operationalNumber,
      name: savedProj.name,
      po: savedProj.po,
      unifier_no: savedProj.unifierNo,
      contractor: savedProj.contractor,
      consultant: savedProj.consultant,
      status: savedProj.status,
      scope: typeof savedProj.scope === 'string' ? savedProj.scope : (Array.isArray(savedProj.scope) ? savedProj.scope[0] : 'صرف صحي'), // تخزين القيمة كمصطلح نصي بالجدول
      classification: savedProj.classification,
      business_unit: savedProj.businessUnit,
      region: savedProj.region,
      sub_program: savedProj.subProgram,
      map_url: savedProj.mapUrl,
      x: savedProj.x !== undefined && savedProj.x !== null ? Number(savedProj.x) : null,
      y: savedProj.y !== undefined && savedProj.y !== null ? Number(savedProj.y) : null
    };

    const exists = projects.some(p => p.id === savedProj.id);
    
    if (exists) {
      // تحديث مشروع قائم بالسيرفر
      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', savedProj.id);
      
      if (!error) showNotification(`تم تحديث بيانات مشروع بالسيرفر: ${savedProj.name}`);
    } else {
      // إدراج مشروع جديد كلياً
      const { error } = await supabase
        .from('projects')
        .insert([payload]);
      
      if (!error) showNotification(`تم إضافة مشروع شبكة جديد بنجاح للسيرفر: ${savedProj.name}`);
    }
    // إعادة إنعاش البيانات لمطابقتها فوراً
    fetchDataFromSupabase();
  };

  const handleStartAddNewProject = () => {
    if (!canEditProjects) return;
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleStartEditProject = (proj: Project) => {
    if (!canEditProjects) return;
    setEditingProject(proj);
    setIsProjectModalOpen(true);
  };

  // ==========================================
  // مزامنة صلاحيات ومستخدمي النظام مع سوبابيس
  // ==========================================
  const handleSaveUserPermissions = async (updatedUser: User) => {
    const payload = {
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      allowed_regions: updatedUser.allowedRegions,
      allowed_scopes: updatedUser.allowedScopes,
      password: updatedUser.password || 'nwc1234'
    };

    const exists = users.some(u => u.id === updatedUser.id);
    try {
      if (exists) {
        // تحديث مستخدم قائم
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', updatedUser.id);
        
        if (!error) {
          showNotification(`تم حفظ إعداد الصلاحيات للمستخدم: ${updatedUser.name}`);
        } else {
          console.error("error updating user", error);
        }
      } else {
        // إدراج مستخدم جديد
        const { error } = await supabase
          .from('users')
          .insert([{
            id: updatedUser.id,
            ...payload
          }]);
        
        if (!error) {
          showNotification(`تم إنشاء مستخدم وصلاحيات جديدة بنجاح: ${updatedUser.name}`);
        } else {
          console.error("error inserting user", error);
        }
      }
    } catch (err) {
      console.error(err);
    }
    // تحديث البيانات لايف
    fetchDataFromSupabase();
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (!error) {
        showNotification('تم إلغاء حساب المستخدم وسحب شهادات الاعتماد.');
      } else {
        console.error("error deleting user", error);
      }
    } catch (err) {
      console.error(err);
    }
    fetchDataFromSupabase();
  };

  // Intercept with high-fidelity corporate login if not authenticated
  if (!isLogged) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans" id="login-container">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.03] polish-dot-grid pointer-events-none"></div>

        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 relative z-10">
          
          {/* Logo & Vibe */}
          <div className="text-center space-y-3">
            <div className="mx-auto flex justify-center pb-2">
              <NWCLogo size="lg" className="h-20 w-auto" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 text-[9.5px] tracking-wide font-extrabold text-blue-800 bg-blue-50 rounded-full uppercase border border-blue-100">
                شركة المياه الوطنية • NWC
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-2">الخرائط التفاعلية بالقطاع الاوسط</h2>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                المنصة الموحدة لعرض وتتبع مخططات شبكات ومشاريع المياه والصرف الصحي بالقطاع الأوسط لموظفي قطاع التخطيط والتشغيل
              </p>
            </div>
          </div>

          {/* Error notice */}
          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs text-center leading-relaxed">
              <div className="font-bold flex items-center justify-center gap-1.5 mb-1">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <span>طابع أمني مفقود</span>
              </div>
              <p>{loginError}</p>
            </div>
          )}

          {/* Segmented control tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 animate-pulse-once">
            <button
              onClick={() => { setLoginTab('nwc'); setLoginError(''); }}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                loginTab === 'nwc' 
                  ? 'bg-white text-blue-700 shadow-md border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>موظفو NWC</span>
            </button>
            <button
              onClick={() => { setLoginTab('admin'); setLoginError(''); }}
              className={`flex-1 text-center py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                loginTab === 'admin' 
                  ? 'bg-white text-blue-700 shadow-md border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>مدير النظام</span>
            </button>
          </div>

          {/* Forms */}
          {loginTab === 'nwc' ? (
            <form onSubmit={handleNwcSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">البريد الإلكتروني للشركة:</label>
                <input
                  type="email"
                  required
                  value={nwcEmail}
                  onChange={e => setNwcEmail(e.target.value)}
                  placeholder="username@nwc.com.sa"
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 outline-none font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">كلمة المرور الخاصة بحسابك:</label>
                <input
                  type="password"
                  required
                  value={nwcPassword}
                  onChange={e => setNwcPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 outline-none font-mono text-center tracking-widest placeholder:tracking-normal"
                />
              </div>

              <div className="text-[9.5px] text-slate-400 font-semibold leading-normal text-right">
                * الدخول مقصور على الحسابات المسجلة والمعتمدة مسبقاً من مدير النظام مع كلمة المرور المعطاة لك.
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>التحقق والدخول للبوابة الجغرافية</span>
                <Compass className="h-4 w-4 animate-spin-slow" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">رمز المرور الأمني للمشرف العام:</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 outline-none font-mono text-center tracking-widest placeholder:tracking-normal"
                />
                <div className="text-[9.5px] text-slate-400 font-semibold leading-normal mt-1 text-right">
                  * مخصص لمدير النظام لتعديل الهيكل الإداري، والصلاحيات الجغرافية، والمنظومة الفنية للمراقبين.
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>دخول لوحة تحكم الصلاحيات</span>
                <Key className="h-4 w-4" />
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 text-center text-[9.5px] text-slate-400 leading-normal">
            بوابة آمنة ومحمية بالتنسيق مع شركة المياه الوطنية • 1447هـ / 2026م.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans" id="app-root">
      
      {/* 1. Header & Navigation Panel */}
      <header className="bg-white border-b border-slate-200 text-slate-800 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo and App Title */}
            <div className="flex items-center gap-3">
              <NWCLogo size="sm" className="h-11 w-auto" />
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900">الخرائط التفاعلية بالقطاع الاوسط</h1>
                <p className="text-[10px] text-slate-500 font-medium">شركة المياه الوطنية • مشروعات المياه والصرف الصحي بالقطاع الأوسط</p>
              </div>
            </div>

            {/* User status badge & Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <span className="text-[10px] text-slate-400 font-bold block">المستخدم الحالي</span>
                <span className="text-xs text-slate-800 font-extrabold">{currentUser.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="تسجيل الخروج من النظام"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Offline dynamic warning banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs px-6 py-2.5 font-bold shadow-inner text-center flex items-center justify-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0"></span>
          <span>وضع تصفح غير متصل بالإنترنت نشط (Offline) | تم تحميل كافة مشاريع شبكات المياه ومحطات الرفع محلياً لضمان سرعة الاستجابة ومنع الشاشة البيضاء.</span>
        </div>
      )}

      {/* 2. Success dynamic alert */}
      {successNotification && (
        <div className="bg-emerald-600 text-white text-xs px-6 py-3 font-semibold shadow-inner text-center animate-pulse flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          <span>{successNotification}</span>
        </div>
      )}

      {/* 3. Main Dashboard Wrapper */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Active Security badge */}
        <div className="bg-slate-900 leading-normal p-4.5 rounded-2xl border border-slate-700/60 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 polish-dot-grid pointer-events-none"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <div>
              <div className="text-xs text-slate-200">
                مرحباً: <span className="font-bold text-blue-400">{currentUser.name}</span> ({
                  currentUser.role === 'admin' ? 'صلاحية مدير النظام الكاملة' : currentUser.role === 'editor' ? 'صلاحية محرر خرائط وبيانات' : 'صلاحية عرض الخرائط فقط'
                })
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                الوصول المسموح: <span className="text-slate-300">المناطق [ {currentUser.allowedRegions.join('، ')} ]</span> | <span className="text-slate-300">القطاعات [ {currentUser.allowedScopes.join('، ')} ]</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {canEditProjects && (
              <button
                onClick={handleStartAddNewProject}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>إدراج مشروع خارطة جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs bar */}
        <div className="border-b border-slate-200 flex justify-between items-center bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'maps', label: 'الخرائط التفاعلية', icon: Map },
              { id: 'stats', label: ' الإحصائيات ', icon: Layers },
              // Admin permission tab only visible to admin
              ...(currentUser.role === 'admin' ? [{ id: 'users', label: 'إدارة وتوزيع صلاحيات الحسابات', icon: Users }] : [])
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span></span>
          </div>
        </div>

        {/* 4. Tab Views content switch */}
        <div className="space-y-6">
          
          {/* Active Tab: Interactive Maps Core */}
          {activeTab === 'maps' && (
            <div className="flex flex-col space-y-4">
              
              {/* Mobile Only Selector Card (Simple & friendly for small touch devices) */}
              <div className="xl:hidden bg-white p-1 rounded-2xl border border-slate-200 shadow-xs flex animate-pulse-once">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('map')}
                  className={`flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mobileViewMode === 'map'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Map className="h-3.5 w-3.5 shrink-0" />
                  <span>الخارطة التفاعلية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('list')}
                  className={`flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mobileViewMode === 'list'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                  <span>قائمة المشاريع ({filteredProjects.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                
                {/* Map Preview Column (Full Interactive embedded Maps Component) */}
                <div 
                  className={`xl:col-span-7 ${mobileViewMode === 'map' ? 'block' : 'hidden xl:block'}`} 
                  id="map-port-view"
                >
                  <ProjectMapViewer 
                    project={selectedProject} 
                    projects={filteredProjects}
                    onSelectProject={(proj) => {
                      setSelectedProjectId(proj.id);
                      setMobileViewMode('map'); // Switch to map when user selects
                    }}
                    onEditClick={handleStartEditProject}
                    canEdit={canEditProjects}
                    isAdmin={currentUser.role === 'admin'}
                    onUpdateProjectCoordinates={(id, lat, lng) => {
                      const updated = projects.map(p => {
                        if (p.id === id) {
                          const newUrl = `https://www.google.com/maps/d/viewer?mid=custom&ll=${lat},${lng}&z=13`;
                          const updatedProj = { ...p, mapUrl: newUrl, x: lng, y: lat };
                          // Auto write back to Supabase database!
                          handleSaveProject(updatedProj);
                          return updatedProj;
                        }
                        return p;
                      });
                      setProjects(updated);
                    }}
                  />
                </div>

                {/* Projects List & Filters Column */}
                <div 
                  className={`xl:col-span-5 flex flex-col ${mobileViewMode === 'list' ? 'block animate-in slide-in-from-bottom duration-250' : 'hidden xl:flex'}`}
                >
                  <div className="bg-white p-4 rounded-t-2xl border-t border-r border-l border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-slate-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800">قائمة المشاريع</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                      {filteredProjects.length} عدد المشاريع  
                    </span>
                  </div>
                  <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-b-2xl max-h-[580px] overflow-y-auto w-full">
                    <ProjectList 
                      projects={visibleProjects}
                      filteredProjects={filteredProjects}
                      selectedProject={selectedProject}
                      onSelectProject={(proj) => {
                        setSelectedProjectId(proj.id);
                        setMobileViewMode('map'); // Auto switch to map upon selecting a project! Very mobile friendly!
                        showNotification(`تم تحديد مشروع: ${proj.name}`);
                      }}
                      currentUser={currentUser}
                      onToggleFavorite={handleToggleFavorite}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      selectedSubProgram={selectedSubProgram}
                      setSelectedSubProgram={setSelectedSubProgram}
                      selectedClassification={selectedClassification}
                      setSelectedClassification={setSelectedClassification}
                      selectedStatus={selectedStatus}
                      setSelectedStatus={setSelectedStatus}
                      showFilters={showFilters}
                      setShowFilters={setShowFilters}
                      showOnlyFavorites={showOnlyFavorites}
                      setShowOnlyFavorites={setShowOnlyFavorites}
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Active Tab: Analytics Dashboard Stats */}
          {activeTab === 'stats' && (
            <div className="animate-in fade-in duration-300">
              <DashboardStats projects={filteredProjects} />
            </div>
          )}

          {/* Active Tab: Users security configuration */}
          {activeTab === 'users' && currentUser.role === 'admin' && (
            <div className="animate-in fade-in duration-300">
              <UserManagement 
                users={users} 
                currentUser={currentUser} 
                onSaveUser={handleSaveUserPermissions}
                onDeleteUser={handleDeleteUser}
              />
            </div>
          )}

        </div>

      </main>

      {/* 5. Modals for Adding / Editing Projects */}
      <ProjectModal 
        isOpen={isProjectModalOpen}
        project={editingProject}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
      />

      {/* 5.1 Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div dir="rtl" className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl flex flex-col gap-4 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto bg-amber-50 text-amber-600 p-3.5 rounded-full border border-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-8 w-8 stroke-[2.5]" />
            </div>
            
            <div className="space-y-1.5Packed text-right">
              <h3 className="text-base font-extrabold text-slate-900 text-center">هل أنت متأكد من رغبتك بالخروج؟</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-center">
                سيؤدي هذا لتسجيل الخروج الآمن وإغلاق جلستك النشطة في نظام الخرائط التفاعلية NWC.
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false);
                  // Push state back so we can intercept physical back clicks again
                  window.history.pushState({ step: 'app' }, '');
                }}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl border border-slate-200 transition-all cursor-pointer"
              >
                الاستمرار في التصفح
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false);
                  setIsLogged(false);
                  localStorage.removeItem('water_maps_is_logged');
                  // Let the back chain finish
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer"
              >
                تأكيد الخروج الآمن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Professional Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <p>© {new Date().getFullYear()} نظام الخرائط التفاعلية الآمن • وحدة التنسيق الرقمية والتراخيص الهندسية </p>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            نطاق وصول مشفر • SECURE_PORTAL_LOG • IP Address Masked
          </p>
        </div>
      </footer>

    </div>
  );
}