/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Project, User, AppNotification } from './types';
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
import { ProjectLayersViewer } from './components/ProjectLayersViewer';

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
  CheckCircle2,
  Bell
} from 'lucide-react';

// Helper to determine the actual effective scope of a project (resolving any data classification discrepancies)
export const getActualProjectScope = (proj: Project): string => {
  const name = (proj.name || '').trim();
  const scope = (proj.scope || '').trim();
  const classification = (proj.classification || '').trim();
  const subProgram = (proj.subProgram || '').trim();
  
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

export const isProjectAllowedForUser = (p: Project, currentUser: User): boolean => {
  if (currentUser.role === 'admin') return true;
  
  if (currentUser.allowedProjectIds && currentUser.allowedProjectIds.length > 0) {
    return currentUser.allowedProjectIds.includes(p.id);
  }

  const uRegions = (currentUser.allowedRegions || []).map(r => r.trim());
  const isAllRegions = uRegions.includes('الكل');
  
  let isRegionAllowed = isAllRegions;
  if (!isRegionAllowed) {
    const pr = (p.region || '').trim();
    const pb = (p.businessUnit || '').trim();
    const ps = (p.subProgram || '').trim();
    
    if (uRegions.includes(pr) || uRegions.includes(pb) || uRegions.includes(ps)) {
      isRegionAllowed = true;
    }
    
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
      if (uRegions.includes('المحافظات الغربية') && (westGovs.includes(pr) || pr.includes('عفيف') || pr.includes('الدوادمي') || pr.includes('المزاحمية') || pr.includes('شقراء', 'مرات') || pr.includes('القويعية') || pr.includes('البجادية') || pr.includes('البجاديه') || pr.includes('ضرما') || pr.includes('ضرماء'))) {
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
};

export const getProjectDifferencesMessage = (oldP: Project, newP: Project): string => {
  const changes: string[] = [];
  
  if ((oldP.name || '').trim() !== (newP.name || '').trim()) {
    changes.push(`الاسم (من "${oldP.name}" إلى "${newP.name}")`);
  }
  if ((oldP.status || '').trim() !== (newP.status || '').trim()) {
    changes.push(`الحالة (من "${oldP.status}" إلى "${newP.status}")`);
  }
  if ((oldP.contractor || '').trim() !== (newP.contractor || '').trim()) {
    changes.push(`المقاول (من "${oldP.contractor || 'غير محدد'}" إلى "${newP.contractor || 'غير محدد'}")`);
  }
  if ((oldP.consultant || '').trim() !== (newP.consultant || '').trim()) {
    changes.push(`الاستشاري (من "${oldP.consultant || 'غير محدد'}" إلى "${newP.consultant || 'غير محدد'}")`);
  }
  if ((oldP.region || '').trim() !== (newP.region || '').trim()) {
    changes.push(`المنطقة (من "${oldP.region}" إلى "${newP.region}")`);
  }
  if ((oldP.classification || '').trim() !== (newP.classification || '').trim()) {
    changes.push(`التصنيف (من "${oldP.classification}" إلى "${newP.classification}")`);
  }
  if ((oldP.po || '').trim() !== (newP.po || '').trim()) {
    changes.push(`رقم PO (من "${oldP.po || '-'}" إلى "${newP.po || '-'}")`);
  }
  if ((oldP.unifierNo || '').trim() !== (newP.unifierNo || '').trim()) {
    changes.push(`رقم Unifier (من "${oldP.unifierNo || '-'}" إلى "${newP.unifierNo || '-'}")`);
  }
  if ((oldP.subProgram || '').trim() !== (newP.subProgram || '').trim()) {
    changes.push(`البرنامج الفرعي (من "${oldP.subProgram}" إلى "${oldP.subProgram}")`);
  }
  
  if (changes.length === 0) return '';
  return `تم تعديل: ${changes.join(' و ')} في مشروع: ${newP.name}`;
};

export default function App() {
  // 1. Authentication State
  const [isLogged, setIsLogged] = useState<boolean>(() => {
    return localStorage.getItem('water_maps_is_logged') === 'true';
  });

  // 2. Core State
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
      const matchedLocal = INITIAL_USERS.find(u => u.id === savedAndActive);
      if (matchedLocal) return matchedLocal;
      return { id: savedAndActive, username: 'admin', name: 'جاري التحميل...', role: 'admin', allowedRegions: ['الكل'], allowedScopes: ['الكل'], password: '' };
    }
    return INITIAL_USERS[0];
  });

  // 3.0.1 Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // 3. UI Control State
  const [activeTab, setActiveTab] = useState<'maps' | 'stats' | 'layers' | 'users'>('maps');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'map' | 'list'>('map');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showRoleSwitcherDropdown, setShowRoleSwitcherDropdown] = useState(false);
  const [successNotification, setSuccessNotification] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

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

  // 4. Persistent Synchronization effects
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    const savedActive = localStorage.getItem('water_maps_active_user_id');
    const userId = savedActive || 'admin';
    const saved = localStorage.getItem(`water_maps_favorites_${userId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  });

  // 📢 دالة دمج ميزة إرسال التنبيهات إلى ستارة النظام الخارجية بالجوال والكمبيوتر
  const sendNativeNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/vite.svg',
        dir: 'rtl'
      });
    }
  };

  // 🔓 دالة تطلب إذن التنبيهات من المستخدم وتطلق ترحيباً منزلقاً فوراً
  const requestNotificationPermission = async (userName: string) => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('شركة المياه الوطنية • NWC', {
          body: `مرحباً بك المهندس ${userName}، تم تفعيل ميزة إشعارات ستارة الجوال الخارجية بنجاح.`,
          icon: '/vite.svg',
          dir: 'rtl'
        });
      }
    }
  };

  // دالة جلب البيانات من Supabase عند تشغيل الموقع
  const fetchDataFromSupabase = async () => {
    setIsLoading(true);
    try {
      const { data: dbProjects, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: dbUsers, error: userError } = await supabase
        .from('users')
        .select('*');

      if (userError || projError) {
        const errorDetails = [
          userError ? `جدول المستخدمين: ${userError.message}` : null,
          projError ? `جدول المشاريع: ${projError.message}` : null
        ].filter(Boolean).join(" | ");
        console.warn("فشل الاتصال بـ Supabase:", errorDetails);
        setSupabaseError(errorDetails);
      } else {
        setSupabaseError(null);
      }

      if (!projError && dbProjects) {
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
          console.error(cacheErr);
        }
      }

      if (!userError && dbUsers) {
        const mappedUsers = dbUsers.map((u: any) => {
          let allowedRegions: string[] = ['الكل'];
          if (u.allowed_regions) {
            if (Array.isArray(u.allowed_regions)) { allowedRegions = u.allowed_regions; } 
            else { try { allowedRegions = JSON.parse(u.allowed_regions); } catch (e) { allowedRegions = [u.allowed_regions]; } }
          }
          let allowedScopes: string[] = ['الكل'];
          if (u.allowed_scopes) {
            if (Array.isArray(u.allowed_scopes)) { allowedScopes = u.allowed_scopes; } 
            else { try { allowedScopes = JSON.parse(u.allowed_scopes); } catch (e) { allowedScopes = [u.allowed_scopes]; } }
          }
          let allowedTabs = ['maps', 'stats', 'layers'];
          if (u.allowed_tabs) {
            if (Array.isArray(u.allowed_tabs)) { allowedTabs = u.allowed_tabs; } 
            else { try { allowedTabs = JSON.parse(u.allowed_tabs); } catch (e) { } }
          }
          let allowedProjectIds: number[] = [];
          if (u.allowed_project_ids) {
            if (Array.isArray(u.allowed_project_ids)) { allowedProjectIds = u.allowed_project_ids.map(Number); } 
            else { try { allowedProjectIds = JSON.parse(u.allowed_project_ids).map(Number); } catch (e) { } }
          }

          return {
            id: u.id,
            username: u.username,
            name: u.name,
            role: u.role,
            allowedRegions: allowedRegions,
            allowedScopes: allowedScopes,
            password: u.password,
            allowedTabs: allowedTabs,
            canOpenExternalLinks: u.can_open_external_links !== false,
            canFilter: u.can_filter !== false,
            canInsert: u.can_insert !== false,
            department: u.department || '',
            jobTitle: u.job_title || '',
            allowedProjectIds: allowedProjectIds
          };
        });

        setUsers(mappedUsers);
        localStorage.setItem('water_maps_cached_users', JSON.stringify(mappedUsers));

        const savedAndActive = localStorage.getItem('water_maps_active_user_id');
        if (savedAndActive) {
          const found = mappedUsers.find(u => u.id === savedAndActive);
          if (found) setCurrentUser(found);
        }
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 المزامنة الحية لِـسحب الإشعارات من سوبابيس وتمرير الأحداث الدقيقة لِـستارة الجوال
  useEffect(() => {
    const fetchUserNotifications = async () => {
      if (!currentUser || !currentUser.id || !isLogged) return;
      
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${currentUser.id},user_id.eq.${currentUser.username}`)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mappedNotifs = data.map((n: any) => ({
            id: n.id,
            projectId: n.project_id,
            projectName: n.project_name,
            type: n.type,
            message: n.message,
            timestamp: new Date(n.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            read: n.read,
            region: n.region || '',
            scope: n.scope || ''
          }));

          // عند لقط إشعار جديد غير مقروء قادم من السيرفر، يتم دفعه لِـستارة الجوال فوراً
          if (notifications.length > 0 && mappedNotifs.length > notifications.length) {
            const latestNotif = mappedNotifs[0];
            if (!latestNotif.read) {
              sendNativeNotification('تنبيه مشاريع NWC 🔔', latestNotif.message);
            }
          }

          setNotifications(mappedNotifs);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchUserNotifications();
    const interval = setInterval(fetchUserNotifications, 8000);
    return () => clearInterval(interval);
  }, [currentUser.id, isLogged, notifications.length]);

  useEffect(() => {
    localStorage.setItem('water_maps_active_user_id', currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    const saved = localStorage.getItem(`water_maps_favorites_${currentUser.id}`);
    if (saved) { try { setFavoriteIds(JSON.parse(saved)); } catch (e) { } }
  }, [currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`water_maps_favorites_${currentUser.id}`, JSON.stringify(favoriteIds));
  }, [favoriteIds, currentUser.id]);

  // دمج ميزة الرجوع الذكي باستخدام زر الرجوع للجوال والمتصفح لضمان عدم إغلاق التطبيق فجأة
  useEffect(() => {
    if (!isLogged) return;

    if (!window.history.state || window.history.state.step !== 'app') {
      window.history.replaceState({ step: 'root' }, '');
      window.history.pushState({ step: 'app' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (showExitModal) {
        setShowExitModal(false);
        window.history.pushState({ step: 'app' }, '');
        return;
      }

      let handled = false;
      if (isProjectModalOpen) {
        setIsProjectModalOpen(false);
        handled = true;
      }
      else if (selectedProjectId !== null) {
        setSelectedProjectId(null);
        setMobileViewMode('list');
        handled = true;
      }
      else if (activeTab !== 'maps') {
        setActiveTab('maps');
        handled = true;
      }

      if (handled) {
        window.history.pushState({ step: 'app' }, '');
      } else {
        setShowExitModal(true);
        window.history.pushState({ step: 'app' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLogged, isProjectModalOpen, selectedProjectId, activeTab, showExitModal]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const bellContainer = document.getElementById('notifications-bell-container');
      if (bellContainer && !bellContainer.contains(event.target as Node)) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleToggleFavorite = (projectId: number) => {
    setFavoriteIds(prev => {
      const isFav = prev.includes(projectId);
      const updated = isFav ? prev.filter(id => id !== projectId) : [...prev, projectId];
      const targetProj = projects.find(p => p.id === projectId);
      const projName = targetProj ? targetProj.name : '';
      
      const alertMsg = isFav ? `تمت الإزالة من المفضلة ⭐️` : `تمت الإضافة للمفضلة ⭐`;
      showNotification(alertMsg);
      
      // مزامنة التفضيل مع ستارة الجوال الخارجية
      sendNativeNotification('المشاريع المفضلة ⭐', `${alertMsg}: ${projName}`);
      
      return updated;
    });
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showNotification('تم تحديد جميع الإشعارات كمقروءة');
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id);
    } catch (e) { }
  };

  const handleClearNotifications = async () => {
    setNotifications([]);
    showNotification('تم مسح قائمة الإشعارات');
    try {
      await supabase.from('notifications').delete().eq('user_id', currentUser.id);
    } catch (e) { }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
    } catch (e) { }
    
    if (notif.projectId) {
      setSelectedProjectId(notif.projectId);
      setActiveTab('maps');
      setMobileViewMode('map');
      showNotification(`تم تحديد مشروع: ${notif.projectName}`);
    }
    setShowNotificationsDropdown(false);
  };

  // 5. Role-based Project Filtering Logic
  const visibleProjects = useMemo(() => {
    return projects.filter(p => {
      if (currentUser.role === 'admin') return true;
      if (currentUser.allowedProjectIds && currentUser.allowedProjectIds.length > 0) {
        return currentUser.allowedProjectIds.includes(p.id);
      }

      const uRegions = (currentUser.allowedRegions || []).map(r => r.trim());
      const isAllRegions = uRegions.includes('الكل');
      
      let isRegionAllowed = isAllRegions;
      if (!isRegionAllowed) {
        const pr = (p.region || '').trim();
        const pb = (p.businessUnit || '').trim();
        const ps = (p.subProgram || '').trim();
        
        if (uRegions.includes(pr) || uRegions.includes(pb) || uRegions.includes(ps)) {
          isRegionAllowed = true;
        }
        
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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubProgram, setSelectedSubProgram] = useState('الكل');
  const [selectedClassification, setSelectedClassification] = useState('الكل');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return visibleProjects.find(p => p.id === selectedProjectId) || null;
  }, [visibleProjects, selectedProjectId]);

  const canEditProjects = currentUser.role === 'admin' || (currentUser.role === 'editor' && currentUser.canInsert !== false) || currentUser.canInsert === true;

  const showNotification = (msg: string) => {
    setSuccessNotification(msg);
    setTimeout(() => setSuccessNotification(''), 4000);
  };

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
      if (nwcPassword.trim() !== (found.password || 'nwc1234')) {
        setLoginError('كلمة المرور المدخلة غير صحيحة!');
        return;
      }
      setCurrentUser(found);
      setIsLogged(true);
      setActiveTab('maps');
      localStorage.setItem('water_maps_is_logged', 'true');
      localStorage.setItem('water_maps_active_user_id', found.id);
      showNotification(`مرحباً بك مجدداً المهندس: ${found.name}`);
      
      // طلب الإذن لِـستارة الجوال فور الدخول الناجح
      requestNotificationPermission(found.name);
    } else {
      setLoginError('عذراً، هذا البريد غير معتمد ومسجل مسبقاً في النظام.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (adminPassword === '20302060') {
      const adminUser = users.find(u => u.role === 'admin') || INITIAL_USERS[0];
      setCurrentUser(adminUser);
      setIsLogged(true);
      setActiveTab('maps');
      localStorage.setItem('water_maps_is_logged', 'true');
      localStorage.setItem('water_maps_active_user_id', adminUser.id);
      showNotification('أهلاً بك يا مدير النظام، تم تسجيل الدخول بنجاح.');
      
      requestNotificationPermission('مدير النظام');
    } else {
      setLoginError('كلمة المرور غير صحيحة!');
    }
  };

  const handleLogout = () => {
    setIsLogged(false);
    localStorage.removeItem('water_maps_is_logged');
    setSelectedProjectId(null);
    showNotification('تم تسجيل الخروج بنجاح.');
  };

  // ==========================================
  // دالة الحفظ المعدلة بالكامل لصياغة الفروقات والأحداث التفصيلية
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
      scope: typeof savedProj.scope === 'string' ? savedProj.scope : (Array.isArray(savedProj.scope) ? savedProj.scope[0] : 'صرف صحي'),
      classification: savedProj.classification,
      business_unit: savedProj.businessUnit,
      region: savedProj.region,
      sub_program: savedProj.subProgram,
      map_url: savedProj.mapUrl,
      x: savedProj.x !== undefined && savedProj.x !== null ? Number(savedProj.x) : null,
      y: savedProj.y !== undefined && savedProj.y !== null ? Number(savedProj.y) : null
    };

    const exists = projects.some(p => p.id === savedProj.id);
    
    // صياغة نص التغيير والحدث التفصيلي الحقيقي (زي تغيير الحالة)
    let dynamicDiffMsg = '';
    if (exists) {
      const oldProj = projects.find(p => p.id === savedProj.id);
      dynamicDiffMsg = oldProj ? getProjectDifferencesMessage(oldProj, savedProj) : '';
      if (!dynamicDiffMsg) {
        dynamicDiffMsg = `تم تحديث بيانات مشروع: ${savedProj.name}`;
      }
    } else {
      dynamicDiffMsg = `قام المهندس ${currentUser.name} بإضافة مشروع جديد: ${savedProj.name}`;
    }

    try {
      if (exists) {
        const { error } = await supabase.from('projects').update(payload).eq('id', savedProj.id);
        if (!error) {
          showNotification(`تم تحديث بيانات مشروع بالسيرفر: ${savedProj.name}`);
          
          // إرسال التنبيه المنزلق الفوري لستارة صاحب الحركة الحالية لِتأكيد الإجراء
          sendNativeNotification('تحديث بيانات المشروع 💾', dynamicDiffMsg);

          // صب التنبيه المفصل في السيرفر ليتوزع آلياً للباقين
          await supabase.from('notifications').insert([{
            user_id: currentUser.id,
            project_id: savedProj.id,
            project_name: savedProj.name,
            type: 'edit',
            message: dynamicDiffMsg, 
            region: savedProj.region,
            scope: payload.scope
          }]);
        }
      } else {
        const { data: insertedData, error } = await supabase.from('projects').insert([payload]).select();
        if (!error && insertedData && insertedData[0]) {
          showNotification(`تم إضافة مشروع شبكة جديد بنجاح للسيرفر: ${savedProj.name}`);
          
          sendNativeNotification('إضافة مشروع جديد 🚀', `تم إدراج خارطة مشروع جديد بنجاح: ${savedProj.name}`);

          await supabase.from('notifications').insert([{
            user_id: currentUser.id,
            project_id: insertedData[0].id,
            project_name: savedProj.name,
            type: 'add',
            message: dynamicDiffMsg,
            region: savedProj.region,
            scope: payload.scope
          }]);
        }
      }
    } catch (err: any) {
      console.error(err);
    }
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

  const handleSaveUserPermissions = async (updatedUser: User) => {
    const payload = {
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      allowed_regions: updatedUser.allowedRegions,
      allowed_scopes: updatedUser.allowedScopes,
      password: updatedUser.password || 'nwc1234',
      allowed_tabs: updatedUser.allowedTabs || ['maps', 'stats', 'layers'],
      can_open_external_links: updatedUser.canOpenExternalLinks !== false,
      can_filter: updatedUser.canFilter !== false,
      can_insert: updatedUser.canInsert !== false,
      department: updatedUser.department || '',
      job_title: updatedUser.jobTitle || '',
      allowed_project_ids: updatedUser.allowedProjectIds || []
    };

    const exists = users.some(u => u.id === updatedUser.id);
    try {
      if (exists) {
        await supabase.from('users').update(payload).eq('id', updatedUser.id);
      } else {
        await supabase.from('users').insert([{ id: updatedUser.id, ...payload }]);
      }
    } catch (err: any) {
      console.error(err);
    }
    fetchDataFromSupabase();
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await supabase.from('users').delete().eq('id', userId);
    } catch (err: any) {
      console.error(err);
    }
    fetchDataFromSupabase();
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans" id="login-container">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 relative z-10">
          <div className="text-center space-y-3">
            <div className="mx-auto flex justify-center pb-2">
              <NWCLogo size="lg" className="h-20 w-auto" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 text-[9.5px] tracking-wide font-extrabold text-blue-800 bg-blue-50 rounded-full uppercase border border-blue-100">
                شركة المياه الوطنية • NWC
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-2">الخرائط التفاعلية بالقطاع الاوسط</h2>
            </div>
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs text-center leading-relaxed">
              <p>{loginError}</p>
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button onClick={() => { setLoginTab('nwc'); setLoginError(''); }} className={`flex-1 text-center py-2 rounded-xl text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 ${loginTab === 'nwc' ? 'bg-white text-blue-700 shadow-md border' : 'text-slate-500'}`}><Mail className="h-4 w-4" /><span>موظفو NWC</span></button>
            <button onClick={() => { setLoginTab('admin'); setLoginError(''); }} className={`flex-1 text-center py-2 rounded-xl text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 ${loginTab === 'admin' ? 'bg-white text-blue-700 shadow-md border' : 'text-slate-500'}`}><Lock className="h-4 w-4" /><span>مدير النظام</span></button>
          </div>

          {loginTab === 'nwc' ? (
            <form onSubmit={handleNwcSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">البريد الإلكتروني للشركة:</label>
                <input type="email" required value={nwcEmail} onChange={e => setNwcEmail(e.target.value)} placeholder="username@nwc.com.sa" className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none text-slate-800 font-mono text-left" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">كلمة المرور الخاصة بحسابك:</label>
                <input type="password" required value={nwcPassword} onChange={e => setNwcPassword(e.target.value)} placeholder="••••••••" className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none text-slate-800 font-mono text-center tracking-widest" />
              </div>
              <button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"><span>التحقق والدخول للبوابة الجغرافية</span><Compass className="h-4 w-4" /></button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">رمز المرور الأمني للمشرف العام:</label>
                <input type="password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none text-slate-800 font-mono text-center tracking-widest" />
              </div>
              <button type="submit" className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"><span>دخول لوحة تحكم الصلاحيات</span><Key className="h-4 w-4" /></button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans" id="app-root">
      <header className="bg-white border-b border-slate-200 text-slate-800 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <NWCLogo size="sm" className="h-11 w-auto" />
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900">الخرائط التفاعلية بالقطاع الاوسط</h1>
                <p className="text-[10px] text-slate-500 font-medium">شركة المياه الوطنية • مشروعات المياه والصرف الصحي بالقطاع الأوسط</p>
              </div>
            </div>

            <div className="flex items-center gap-3 relative">
              <div className="hidden sm:block text-right">
                <span className="text-[10px] text-slate-400 font-bold block">المستخدم الحالي</span>
                <span className="text-xs text-slate-800 font-extrabold">{currentUser.name}</span>
              </div>

              <div className="relative" id="notifications-bell-container">
                <button type="button" onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative ${showNotificationsDropdown ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Bell className="h-4 w-4" />{unreadNotificationsCount > 0 && (<span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center animate-bounce">{unreadNotificationsCount}</span>)}</button>

                {showNotificationsDropdown && (
                  <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-right">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-blue-600" /><span className="text-xs font-extrabold text-slate-800">إشعارات المشاريع والشبكات</span></div>
                      <div className="flex gap-2">
                        {unreadNotificationsCount > 0 && (<button type="button" onClick={handleMarkAllAsRead} className="text-[10px] text-blue-600 font-bold cursor-pointer">تحديد الكل كمقروء</button>)}
                        {notifications.length > 0 && (<button type="button" onClick={handleClearNotifications} className="text-[10px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer">مسح الكل</button>)}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2"><Bell className="h-8 w-8 text-slate-200" /><span>لا توجد إشعارات نشطة حالياً</span></div>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 items-start ${!notif.read ? 'bg-blue-50/20' : ''}`}>
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${notif.type === 'add' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{notif.type === 'add' ? <Plus className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}</div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs text-slate-700 leading-relaxed font-semibold">{notif.message}</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400"><span>{notif.timestamp}</span><span className="bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-medium text-[9px]"> {notif.region || notif.scope}</span></div>
                            </div>
                            {!notif.read && (<span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2"></span>)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleLogout} className="p-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">تسجيل الخروج</span></button>
            </div>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs px-6 py-2.5 font-bold text-center flex items-center justify-center gap-2"><span>وضع تصفح غير متصل بالإنترنت نشط (Offline)</span></div>
      )}

      {successNotification && (
        <div className="bg-emerald-600 text-white text-xs px-6 py-3 font-semibold text-center flex items-center justify-center gap-2"><ShieldCheck className="h-4 w-4" /><span>{successNotification}</span></div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-slate-900 leading-normal p-4.5 rounded-2xl border border-slate-700/60 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
            <div>
              <div className="text-xs text-slate-200">مرحباً: <span className="font-bold text-blue-400">{currentUser.name}</span> ({currentUser.role === 'admin' ? 'صلاحية مدير النظام الكاملة' : 'محرر خرائط'})</div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">الوصول المسموح: <span className="text-slate-300">المناطق [ {currentUser.allowedRegions.join('، ')} ]</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            {canEditProjects && (<button onClick={handleStartAddNewProject} className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"><Plus className="h-4 w-4" /><span>إدراج مشروع خارطة جديد</span></button>)}
          </div>
        </div>

        <div className="border-b border-slate-200 flex justify-between items-center bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              ...((currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('maps')) ? [{ id: 'maps', label: 'الخرائط التفاعلية', icon: Map }] : []),
              ...((currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('stats')) ? [{ id: 'stats', label: ' الإحصائيات ', icon: Layers }] : []),
              ...((currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('layers')) ? [{ id: 'layers', label: 'طبقات المشاريع', icon: Compass }] : []),
              ...(currentUser.role === 'admin' ? [{ id: 'users', label: 'إدارة وتوزيع صلاحيات الحسابات', icon: Users }] : [])
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4 shrink-0" /><span>{tab.label}</span></button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'maps' && (
            <div className="flex flex-col space-y-4">
              <div className="xl:hidden bg-white p-1 rounded-2xl border border-slate-200 shadow-xs flex">
                <button type="button" onClick={() => setMobileViewMode('map')} className={`flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${mobileViewMode === 'map' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Map className="h-3.5 w-3.5 shrink-0" /><span>الخارطة التفاعلية</span></button>
                <button type="button" onClick={() => setMobileViewMode('list')} className={`flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${mobileViewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><FileSpreadsheet className="h-3.5 w-3.5 shrink-0" /><span>قائمة المشاريع ({visibleProjects.length})</span></button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                <div className={`xl:col-span-7 ${mobileViewMode === 'map' ? 'block' : 'hidden xl:block'}`} id="map-port-view">
                  <ProjectMapViewer project={selectedProject} projects={filteredProjects} onSelectProject={(proj) => { setSelectedProjectId(proj.id); setMobileViewMode('map'); }} onEditClick={handleStartEditProject} canEdit={canEditProjects} isAdmin={currentUser.role === 'admin'} canOpenExternalLinks={currentUser.canOpenExternalLinks !== false} onUpdateProjectCoordinates={(id, lat, lng) => { const updated = projects.map(p => { if (p.id === id) { const newUrl = `https://www.google.com/maps/d/viewer?mid=custom&ll=${lat},${lng}&z=13`; const updatedProj = { ...p, mapUrl: newUrl, x: lng, y: lat }; handleSaveProject(updatedProj); return updatedProj; } return p; }); setProjects(updated); }} />
                </div>

                <div className={`xl:col-span-5 flex flex-col ${mobileViewMode === 'list' ? 'block' : 'hidden xl:flex'}`}>
                  <div className="bg-white p-4 rounded-t-2xl border flex items-center justify-between"><div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-slate-500" /><span className="text-xs font-bold text-slate-800">قائمة المشاريع</span></div><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{filteredProjects.length} عدد المشاريع</span></div>
                  <div className="bg-slate-50/50 p-4 border rounded-b-2xl max-h-[580px] overflow-y-auto w-full">
                    <ProjectList projects={visibleProjects} filteredProjects={filteredProjects} selectedProject={selectedProject} onSelectProject={(proj) => { setSelectedProjectId(proj.id); setMobileViewMode('map'); showNotification(`تم تحديد مشروع: ${proj.name}`); }} currentUser={currentUser} onToggleFavorite={handleToggleFavorite} onEditProject={canEditProjects ? handleStartEditProject : undefined} searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedSubProgram={selectedSubProgram} setSelectedSubProgram={setSelectedSubProgram} selectedClassification={selectedClassification} setSelectedClassification={setSelectedClassification} selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} showFilters={showFilters} setShowFilters={setShowFilters} showOnlyFavorites={showOnlyFavorites} setShowOnlyFavorites={setShowOnlyFavorites} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && <DashboardStats projects={filteredProjects} />}
          {activeTab === 'layers' && <ProjectLayersViewer currentUser={currentUser} />}
          {activeTab === 'users' && currentUser.role === 'admin' && <UserManagement users={users} currentUser={currentUser} onSaveUser={handleSaveUserPermissions} onDeleteUser={handleDeleteUser} projects={projects} />}
        </div>
      </main>

      <ProjectModal isOpen={isProjectModalOpen} project={editingProject} onClose={() => setIsProjectModalOpen(false)} onSave={handleSaveProject} />

      {showExitModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div dir="rtl" className="bg-white rounded-3xl p-6 max-w-sm w-full border text-center">
            <div className="mx-auto bg-amber-50 text-amber-600 p-3.5 rounded-full flex items-center justify-center shrink-0"><AlertCircle className="h-8 w-8" /></div>
            <h3 className="text-base font-extrabold text-slate-900 mt-2">هل أنت متأكد من رغبتك بالخروج؟</h3>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => { setShowExitModal(false); window.history.pushState({ step: 'app' }, ''); }} className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-800 text-xs font-bold rounded-2xl border">الاستمرار في التصفح</button>
              <button type="button" onClick={() => { setShowExitModal(false); setIsLogged(false); localStorage.removeItem('water_maps_is_logged'); }} className="flex-1 py-2.5 px-4 bg-rose-600 text-white text-xs font-bold rounded-2xl shadow-xs">تأكيد الخروج الآمن</button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} نظام الخرائط التفاعلية الآمن • شركة المياه الوطنية</p>
        </div>
      </footer>
    </div>
  );
}