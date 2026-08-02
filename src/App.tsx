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
  Map as MapIcon, 
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
  Bell,
  Sun,
  Moon
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
  if ((oldP.mapUrl || '').trim() !== (newP.mapUrl || '').trim()) {
    changes.push(`رابط الخارطة التفاعلية`);
  }
  if ((oldP.surveyorName || '').trim() !== (newP.surveyorName || '').trim()) {
    changes.push(`اسم المساح (من "${oldP.surveyorName || 'غير محدد'}" إلى "${newP.surveyorName || 'غير محدد'}")`);
  }
  if ((oldP.surveyorPhone || '').trim() !== (newP.surveyorPhone || '').trim()) {
    changes.push(`رقم تواصل المساح (من "${oldP.surveyorPhone || 'غير محدد'}" إلى "${newP.surveyorPhone || 'غير محدد'}")`);
  }
  
  if (changes.length === 0) return '';
  return `وتم تعديل: ${changes.join(' و ')}`;
};

export const isNotificationAllowed = (notif: AppNotification, user: User): boolean => {
  if (user.role === 'admin') return true;
  
  if (user.allowedProjectIds && user.allowedProjectIds.length > 0) {
    return user.allowedProjectIds.includes(Number(notif.projectId));
  }

  const uRegions = (user.allowedRegions || []).map(r => r.trim());
  const isAllRegions = uRegions.includes('الكل');
  
  let isRegionAllowed = isAllRegions;
  if (!isRegionAllowed && notif.region) {
    const pr = notif.region.trim();
    if (uRegions.includes(pr)) {
      isRegionAllowed = true;
    } else {
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

  const isAllScopes = user.allowedScopes.includes('الكل');
  let isScopeAllowed = isAllScopes;
  if (!isScopeAllowed && notif.scope) {
    const ns = notif.scope.trim();
    isScopeAllowed = user.allowedScopes.some(scopeType => {
      const uScope = scopeType.trim();
      if (!uScope) return false;
      return ns === uScope || (ns.includes('صرف') && uScope.includes('صرف')) || (ns.includes('مياه') && uScope.includes('مياه'));
    });
  }

  return isRegionAllowed && isScopeAllowed;
};

export default function App() {
  // 0. Dark Mode State & Global Class Sync
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('water_maps_dark_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('water_maps_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

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
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedAndActive = localStorage.getItem('water_maps_active_user_id');
    try {
      const cached = localStorage.getItem('water_maps_cached_users');
      if (cached) {
        const cachedUsers = JSON.parse(cached);
        if (savedAndActive) {
          const matched = cachedUsers.find((u: any) => u.id === savedAndActive);
          if (matched) return matched;
        } else {
          if (cachedUsers.length > 0) return cachedUsers[0];
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (savedAndActive) {
      return { id: savedAndActive, username: 'admin', name: 'جاري التحميل...', role: 'admin', allowedRegions: ['الكل'], allowedScopes: ['الكل'], allowedLayers: ['water', 'sewage', 'materials'], password: '' };
    }
    return {
      id: 'guest',
      username: 'guest',
      name: 'زائر',
      role: 'viewer',
      allowedRegions: ['الكل'],
      allowedScopes: ['الكل'],
      allowedLayers: ['water', 'sewage', 'materials'],
      password: ''
    };
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

  // 📢 دالة إرسال التنبيهات إلى ستارة النظام الخارجية بالجوال والكمبيوتر
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
        new Notification('   • ', {
          body: `مرحباً بك المهندس ${userName}، تم تفعيل ميزة إشعارات ستارة الجوال الخارجية بنجاح.`,
          icon: '/vite.svg',
          dir: 'rtl'
        });
      }
    }
  };

  // دالة جلب البيانات من Supabase عند تشغيل الموقع
  const fetchDataFromSupabase = async (userToUse?: User) => {
    const activeUser = userToUse || currentUser;
    const isActuallyLogged = isLogged || !!userToUse;
    
    if (!isActuallyLogged) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: dbProjects, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projError) {
        console.warn("فشل الاتصال بـ Supabase:", projError.message);
        setSupabaseError(projError.message);
      } else if (dbProjects) {
        setSupabaseError(null);
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
          y: p.y !== undefined && p.y !== null ? Number(p.y) : null,
          surveyorName: p.surveyor_name || '',
          surveyorPhone: p.surveyor_phone || ''
        }));

        setProjects(mappedProjects);
        try {
          localStorage.setItem('water_maps_cached_projects', JSON.stringify(mappedProjects));
        } catch (cacheErr) {
          console.error(cacheErr);
        }
      }

      // لا يتم جلب جدول المستخدمين إلا إذا كان المستخدم الحالي مديراً للنظام لضمان الخصوصية والأمان التام
      if (activeUser && activeUser.role === 'admin') {
        const { data: dbUsers, error: userError } = await supabase
          .from('users')
          .select('*');

        if (userError) {
          console.warn("فشل جلب المستخدمين:", userError.message);
        } else if (dbUsers) {
          const cachedUsersFromStorage = (() => {
            try { return JSON.parse(localStorage.getItem('water_maps_cached_users') || '[]'); } catch (e) { return []; }
          })();

          const mappedUsers = dbUsers.map((u: any) => {
            const existingLocal = users.find(existing => existing.id === u.id) || cachedUsersFromStorage.find((existing: any) => existing.id === u.id);

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

            let allowedTabs = existingLocal?.allowedTabs || ['maps', 'stats', 'layers'];
            if (u.allowed_tabs !== undefined && u.allowed_tabs !== null) {
              if (Array.isArray(u.allowed_tabs)) { allowedTabs = u.allowed_tabs; } 
              else { try { allowedTabs = JSON.parse(u.allowed_tabs); } catch (e) { } }
            }

            let allowedLayers: string[] = existingLocal?.allowedLayers || ['water', 'sewage', 'materials'];
            if (u.allowed_layers !== undefined && u.allowed_layers !== null) {
              if (Array.isArray(u.allowed_layers)) { allowedLayers = u.allowed_layers; } 
              else { try { allowedLayers = JSON.parse(u.allowed_layers); } catch (e) { allowedLayers = [u.allowed_layers]; } }
            }

            let allowedProjectIds: number[] = existingLocal?.allowedProjectIds || [];
            if (u.allowed_project_ids !== undefined && u.allowed_project_ids !== null) {
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
              allowedLayers: allowedLayers,
              canOpenExternalLinks: u.can_open_external_links !== undefined && u.can_open_external_links !== null
                ? u.can_open_external_links !== false
                : (existingLocal?.canOpenExternalLinks !== false),
              canFilter: u.can_filter !== undefined && u.can_filter !== null
                ? u.can_filter !== false
                : (existingLocal?.canFilter !== false),
              canInsert: u.can_insert !== undefined && u.can_insert !== null
                ? u.can_insert !== false
                : (existingLocal?.canInsert !== false),
              department: u.department || existingLocal?.department || '',
              jobTitle: u.job_title || existingLocal?.jobTitle || '',
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
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setActiveTab('maps');
    if (isLogged) {
      fetchDataFromSupabase();
    } else {
      setIsLoading(false);
    }
  }, [isLogged]);

  // 🔄 المزامنة الحية لِـسحب الإشعارات من سوبابيس وتمرير الأحداث الدقيقة لِـستارة الجوال
  useEffect(() => {
    const fetchUserNotifications = async () => {
      if (!currentUser || !currentUser.id || !isLogged) return;
      
      try {
        // سحب آخر 100 إشعار مشاريع من السيرفر بشكل عام لجميع المستخدمين
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          // استدعاء معرفات الإشعارات المقروءة والممسوحة المخزنة محلياً لهذا المستخدم بالذات لعدم التداخل
          const readIdsKey = `water_maps_read_notifs_${currentUser.id}`;
          const clearedIdsKey = `water_maps_cleared_notifs_${currentUser.id}`;
          
          let readIds: string[] = [];
          let clearedIds: string[] = [];
          
          try {
            const savedRead = localStorage.getItem(readIdsKey);
            readIds = savedRead ? JSON.parse(savedRead) : [];
          } catch (e) {}
          
          try {
            const savedCleared = localStorage.getItem(clearedIdsKey);
            clearedIds = savedCleared ? JSON.parse(savedCleared) : [];
          } catch (e) {}

          const mappedNotifs = data
            .map((n: any) => ({
              id: String(n.id),
              projectId: n.project_id,
              projectName: n.project_name,
              type: n.type,
              message: n.message,
              timestamp: new Date(n.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(n.created_at).toLocaleDateString('ar-SA'),
              read: readIds.includes(String(n.id)),
              region: n.region || '',
              scope: n.scope || ''
            }))
            .filter((notif: any) => isNotificationAllowed(notif, currentUser) && !clearedIds.includes(String(notif.id)));

          // عند لقط إشعار جديد غير مقروء ومسموح به قادم من السيرفر، يتم دفعه لِـستارة الجوال فوراً
          if (notifications.length > 0 && mappedNotifs.length > 0) {
            const newNotifs = mappedNotifs.filter(mn => !notifications.some(n => n.id === mn.id));
            newNotifs.forEach(newNotif => {
              if (!newNotif.read) {
                sendNativeNotification('تنبيه مشاريع NWC 🔔', newNotif.message);
              }
            });
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

  // تجميع الإشعارات المتشابهة حسب المشروع لعدم التكرار وإظهار عداد التحديثات المجمعة
  const groupedNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) return [];

    const map = new Map<string, AppNotification>();
    const orderKeys: string[] = [];

    for (const notif of notifications) {
      const key = notif.projectId ? `proj_${notif.projectId}` : (notif.projectName ? `name_${notif.projectName}` : `id_${notif.id}`);

      if (!map.has(key)) {
        orderKeys.push(key);
        map.set(key, {
          ...notif,
          groupedCount: 1,
          groupedIds: [String(notif.id)]
        });
      } else {
        const existing = map.get(key)!;
        existing.groupedCount = (existing.groupedCount || 1) + 1;
        if (!existing.groupedIds) existing.groupedIds = [String(existing.id)];
        existing.groupedIds.push(String(notif.id));
        if (!notif.read) {
          existing.read = false;
        }
      }
    }

    return orderKeys.map(k => map.get(k)!);
  }, [notifications]);

  const unreadNotificationsCount = useMemo(() => {
    return groupedNotifications.filter(n => !n.read).length;
  }, [groupedNotifications]);

  const handleMarkAllAsRead = () => {
    const readIdsKey = `water_maps_read_notifs_${currentUser.id}`;
    const allIds = notifications.map(n => String(n.id));
    localStorage.setItem(readIdsKey, JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showNotification('تم تحديد جميع الإشعارات كمقروءة');
  };

  const handleClearNotifications = () => {
    const clearedIdsKey = `water_maps_cleared_notifs_${currentUser.id}`;
    const allIds = notifications.map(n => String(n.id));
    localStorage.setItem(clearedIdsKey, JSON.stringify(allIds));
    setNotifications([]);
    showNotification('تم مسح قائمة الإشعارات');
  };

  const handleNotificationClick = (notif: AppNotification) => {
    const readIdsKey = `water_maps_read_notifs_${currentUser.id}`;
    try {
      const saved = localStorage.getItem(readIdsKey);
      let readIds: string[] = saved ? JSON.parse(saved) : [];
      const idsToMark = notif.groupedIds && notif.groupedIds.length > 0 ? notif.groupedIds : [String(notif.id)];
      let changed = false;
      idsToMark.forEach(id => {
        if (!readIds.includes(id)) {
          readIds.push(id);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(readIdsKey, JSON.stringify(readIds));
      }
    } catch (e) { }
    
    const idsToSet = new Set(notif.groupedIds || [String(notif.id)]);
    setNotifications(prev => prev.map(n => idsToSet.has(String(n.id)) ? { ...n, read: true } : n));
    
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

  const handleNwcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const email = nwcEmail.trim().toLowerCase();
    const nwcRegex = /^[a-zA-Z0-9._%+-]+@nwc\.com\.sa$/;
    if (!nwcRegex.test(email)) {
      setLoginError('يرجى التواصل مع مدير النظام almangoyo@gmail.com');
      return;
    }
    const prefix = email.split('@')[0];
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', prefix);

      if (error || !data || data.length === 0) {
        setLoginError('عذراً، هذا البريد غير معتمد ومسجل مسبقاً في النظام.');
        setIsLoading(false);
        return;
      }

      const found = data[0];
      if (nwcPassword.trim() !== (found.password || 'nwc1234')) {
        setLoginError('كلمة المرور المدخلة غير صحيحة!');
        setIsLoading(false);
        return;
      }

      let allowedRegions: string[] = ['الكل'];
      if (found.allowed_regions) {
        if (Array.isArray(found.allowed_regions)) { allowedRegions = found.allowed_regions; } 
        else { try { allowedRegions = JSON.parse(found.allowed_regions); } catch (e) { allowedRegions = [found.allowed_regions]; } }
      }
      let allowedScopes: string[] = ['الكل'];
      if (found.allowed_scopes) {
        if (Array.isArray(found.allowed_scopes)) { allowedScopes = found.allowed_scopes; } 
        else { try { allowedScopes = JSON.parse(found.allowed_scopes); } catch (e) { allowedScopes = [found.allowed_scopes]; } }
      }
      let allowedTabs = ['maps', 'stats', 'layers'];
      if (found.allowed_tabs) {
        if (Array.isArray(found.allowed_tabs)) { allowedTabs = found.allowed_tabs; } 
        else { try { allowedTabs = JSON.parse(found.allowed_tabs); } catch (e) { } }
      }
      let allowedLayers: string[] = ['water', 'sewage', 'materials'];
      if (found.allowed_layers) {
        if (Array.isArray(found.allowed_layers)) { allowedLayers = found.allowed_layers; } 
        else { try { allowedLayers = JSON.parse(found.allowed_layers); } catch (e) { allowedLayers = [found.allowed_layers]; } }
      }
      let allowedProjectIds: number[] = [];
      if (found.allowed_project_ids) {
        if (Array.isArray(found.allowed_project_ids)) { allowedProjectIds = found.allowed_project_ids.map(Number); } 
        else { try { allowedProjectIds = JSON.parse(found.allowed_project_ids).map(Number); } catch (e) { } }
      }

      const mappedUser = {
        id: found.id,
        username: found.username,
        name: found.name,
        role: found.role,
        allowedRegions: allowedRegions,
        allowedScopes: allowedScopes,
        password: found.password,
        allowedTabs: allowedTabs,
        allowedLayers: allowedLayers,
        canOpenExternalLinks: found.can_open_external_links !== false,
        canFilter: found.can_filter !== false,
        canInsert: found.can_insert !== false,
        department: found.department || '',
        jobTitle: found.job_title || '',
        allowedProjectIds: allowedProjectIds
      };

      setCurrentUser(mappedUser);
      setIsLogged(true);
      setActiveTab('maps');
      localStorage.setItem('water_maps_is_logged', 'true');
      localStorage.setItem('water_maps_active_user_id', mappedUser.id);
      localStorage.setItem('water_maps_cached_users', JSON.stringify([mappedUser]));
      showNotification(`مرحباً بك مجدداً المهندس: ${mappedUser.name}`);
      
      requestNotificationPermission(mappedUser.name);

      await fetchDataFromSupabase(mappedUser);
    } catch (err) {
      console.error(err);
      setLoginError('حدث خطأ أثناء الاتصال بقاعدة البيانات.');
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin');

      if (error || !data || data.length === 0) {
        setLoginError('لم يتم العثور على حساب مدير النظام.');
        setIsLoading(false);
        return;
      }

      const found = data.find((u: any) => u.password === adminPassword.trim());
      if (!found) {
        setLoginError('كلمة المرور غير صحيحة!');
        setIsLoading(false);
        return;
      }

      let allowedRegions: string[] = ['الكل'];
      if (found.allowed_regions) {
        if (Array.isArray(found.allowed_regions)) { allowedRegions = found.allowed_regions; } 
        else { try { allowedRegions = JSON.parse(found.allowed_regions); } catch (e) { allowedRegions = [found.allowed_regions]; } }
      }
      let allowedScopes: string[] = ['الكل'];
      if (found.allowed_scopes) {
        if (Array.isArray(found.allowed_scopes)) { allowedScopes = found.allowed_scopes; } 
        else { try { allowedScopes = JSON.parse(found.allowed_scopes); } catch (e) { allowedScopes = [found.allowed_scopes]; } }
      }
      let allowedTabs = ['maps', 'stats', 'layers'];
      if (found.allowed_tabs) {
        if (Array.isArray(found.allowed_tabs)) { allowedTabs = found.allowed_tabs; } 
        else { try { allowedTabs = JSON.parse(found.allowed_tabs); } catch (e) { } }
      }
      let allowedLayers: string[] = ['water', 'sewage', 'materials'];
      if (found.allowed_layers) {
        if (Array.isArray(found.allowed_layers)) { allowedLayers = found.allowed_layers; } 
        else { try { allowedLayers = JSON.parse(found.allowed_layers); } catch (e) { allowedLayers = [found.allowed_layers]; } }
      }
      let allowedProjectIds: number[] = [];
      if (found.allowed_project_ids) {
        if (Array.isArray(found.allowed_project_ids)) { allowedProjectIds = found.allowed_project_ids.map(Number); } 
        else { try { allowedProjectIds = JSON.parse(found.allowed_project_ids).map(Number); } catch (e) { } }
      }

      const mappedUser = {
        id: found.id,
        username: found.username,
        name: found.name,
        role: found.role,
        allowedRegions: allowedRegions,
        allowedScopes: allowedScopes,
        password: found.password,
        allowedTabs: allowedTabs,
        allowedLayers: allowedLayers,
        canOpenExternalLinks: found.can_open_external_links !== false,
        canFilter: found.can_filter !== false,
        canInsert: found.can_insert !== false,
        department: found.department || '',
        jobTitle: found.job_title || '',
        allowedProjectIds: allowedProjectIds
      };

      setCurrentUser(mappedUser);
      setIsLogged(true);
      setActiveTab('maps');
      localStorage.setItem('water_maps_is_logged', 'true');
      localStorage.setItem('water_maps_active_user_id', mappedUser.id);
      localStorage.setItem('water_maps_cached_users', JSON.stringify([mappedUser]));
      showNotification('أهلاً بك يا مدير النظام، تم تسجيل الدخول بنجاح.');
      
      requestNotificationPermission('مدير النظام');

      await fetchDataFromSupabase(mappedUser);
    } catch (err) {
      console.error(err);
      setLoginError('حدث خطأ أثناء الاتصال بقاعدة البيانات.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLogged(false);
    localStorage.removeItem('water_maps_is_logged');
    localStorage.removeItem('water_maps_active_user_id');
    localStorage.removeItem('water_maps_cached_users');
    localStorage.removeItem('water_maps_cached_projects');
    setProjects([]);
    setUsers([]);
    setNotifications([]);
    setSelectedProjectId(null);
    showNotification('تم تسجيل الخروج بنجاح.');
  };

  // ==========================================
  // دالة الحفظ المحدثة بالكامل لصياغة الحدث الدقيق مدمجاً باسم المهندس الحقيقي
  // ==========================================
  const handleSaveProject = async (savedProj: Project) => {
    const payload: any = {
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
      y: savedProj.y !== undefined && savedProj.y !== null ? Number(savedProj.y) : null,
      surveyor_name: savedProj.surveyorName || '',
      surveyor_phone: savedProj.surveyorPhone || ''
    };

    const exists = projects.some(p => p.id === savedProj.id);
    
    // 1️⃣ حساب الفروقات ودمجها بذكاء مع اسم المهندس القام بالحركة لتطير جملة واحدة مقفلة
    let dynamicDiffMsg = '';
    if (exists) {
      const oldProj = projects.find(p => p.id === savedProj.id);
      const diffDetails = oldProj ? getProjectDifferencesMessage(oldProj, savedProj) : '';
      
      if (diffDetails) {
        dynamicDiffMsg = `قام المهندس ${currentUser.name} بتعديل مشروع: ${savedProj.name}، ${diffDetails}`;
      } else {
        dynamicDiffMsg = `قام المهندس ${currentUser.name} بتعديل بيانات في مشروع: ${savedProj.name}`;
      }
    } else {
      dynamicDiffMsg = `🚀 قام المهندس ${currentUser.name} بإضافة مشروع جديد: ${savedProj.name}`;
    }

    try {
      if (exists) {
        // 2️⃣ الرفع طوالي لقاعدة البيانات
        let { error } = await supabase.from('projects').update(payload).eq('id', savedProj.id);
        
        // إذا لم تكن الأعمدة surveyor_name / surveyor_phone مضافة بعد في جدول Supabase
        if (error && (error.code === '42703' || error.message.includes('surveyor_name') || error.message.includes('surveyor_phone'))) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.surveyor_name;
          delete fallbackPayload.surveyor_phone;
          const retryRes = await supabase.from('projects').update(fallbackPayload).eq('id', savedProj.id);
          error = retryRes.error;
        }

        if (!error) {
          showNotification(`تم تحديث بيانات مشروع بالسيرفر: ${savedProj.name}`);
          
          // طيران إشعار فوري منزلق لستارة الجوال الخارجية بالحدث المدمج الكامل
          sendNativeNotification('تعديل مشروع 💾', dynamicDiffMsg);

          // إدخال سطر الإشعار الحامِل لِلاسم والحدث الدقيق ليتوزع وراء الستار للباقيين
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
        let { data: insertedData, error } = await supabase.from('projects').insert([payload]).select();
        
        // إذا لم تكن الأعمدة مضافة بعد في Supabase
        if (error && (error.code === '42703' || error.message.includes('surveyor_name') || error.message.includes('surveyor_phone'))) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.surveyor_name;
          delete fallbackPayload.surveyor_phone;
          const retryRes = await supabase.from('projects').insert([fallbackPayload]).select();
          insertedData = retryRes.data;
          error = retryRes.error;
        }

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

    // 3️⃣ تحديث الـ State المحلية ونعش البيانات بعد الإرسال الناجح لضمان سلامة الترتيب وحساب الفروقات
    setProjects(prev => {
      const exists = prev.some(p => p.id === savedProj.id);
      if (exists) {
        return prev.map(p => p.id === savedProj.id ? savedProj : p);
      } else {
        return [savedProj, ...prev];
      }
    });

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
    // 1. Update local users state and local storage immediately
    setUsers(prev => {
      const exists = prev.some(u => u.id === updatedUser.id);
      const nextUsers = exists 
        ? prev.map(u => u.id === updatedUser.id ? updatedUser : u)
        : [updatedUser, ...prev];
      try {
        localStorage.setItem('water_maps_cached_users', JSON.stringify(nextUsers));
      } catch (e) {
        console.error(e);
      }
      return nextUsers;
    });

    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }

    const payload = {
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      allowed_regions: updatedUser.allowedRegions,
      allowed_scopes: updatedUser.allowedScopes,
      password: updatedUser.password || 'nwc1234',
      allowed_tabs: updatedUser.allowedTabs || ['maps', 'stats', 'layers'],
      allowed_layers: updatedUser.allowedLayers || ['water', 'sewage', 'materials'],
      can_open_external_links: updatedUser.canOpenExternalLinks !== false,
      can_filter: updatedUser.canFilter !== false,
      can_insert: updatedUser.canInsert !== false,
      department: updatedUser.department || '',
      job_title: updatedUser.jobTitle || '',
      allowed_project_ids: updatedUser.allowedProjectIds || []
    };

    const exists = users.some(u => u.id === updatedUser.id);
    try {
      let { error } = exists
        ? await supabase.from('users').update(payload).eq('id', updatedUser.id)
        : await supabase.from('users').insert([{ id: updatedUser.id, ...payload }]);

      if (error) {
        console.warn("تعذر إضافة الأعمدة المتقدمة في Supabase، جاري الحفظ بالأعمدة الأساسية:", error.message);
        const fallbackPayload = {
          username: updatedUser.username,
          name: updatedUser.name,
          role: updatedUser.role,
          allowed_regions: updatedUser.allowedRegions,
          allowed_scopes: updatedUser.allowedScopes,
          password: updatedUser.password || 'nwc1234'
        };
        await (exists
          ? supabase.from('users').update(fallbackPayload).eq('id', updatedUser.id)
          : supabase.from('users').insert([{ id: updatedUser.id, ...fallbackPayload }]));
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
                   • 
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-2">الخرائط التفاعلية </h2>
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200" id="app-root">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xs sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <NWCLogo size="sm" className="h-11 w-auto" />
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">الخرائط التفاعلية </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium"> </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 relative">
              <div className="hidden sm:block text-right">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">المستخدم الحالي</span>
                <span className="text-xs text-slate-800 dark:text-slate-200 font-extrabold">{currentUser.name}</span>
              </div>

              {/* Dark Mode Toggle Switch Button */}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                }`}
                title={darkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
              >
                {darkMode ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span className="hidden sm:inline text-amber-300">نهاري ☀️</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-slate-600 fill-slate-200" />
                    <span className="hidden sm:inline">ليلي 🌙</span>
                  </>
                )}
              </button>

              <div className="relative" id="notifications-bell-container">
                <button type="button" onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative ${showNotificationsDropdown ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Bell className="h-4 w-4" />{unreadNotificationsCount > 0 && (<span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center animate-bounce">{unreadNotificationsCount}</span>)}</button>

                {showNotificationsDropdown && (
                  <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden text-right">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">إشعارات المشاريع والشبكات</span></div>
                      <div className="flex gap-2">
                        {unreadNotificationsCount > 0 && (<button type="button" onClick={handleMarkAllAsRead} className="text-[10px] text-blue-600 dark:text-blue-400 font-bold cursor-pointer">تحديد الكل كمقروء</button>)}
                        {notifications.length > 0 && (<button type="button" onClick={handleClearNotifications} className="text-[10px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer">مسح الكل</button>)}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {groupedNotifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2"><Bell className="h-8 w-8 text-slate-200 dark:text-slate-700" /><span>لا توجد إشعارات نشطة حالياً</span></div>
                      ) : (
                        groupedNotifications.map(notif => (
                          <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer flex gap-3 items-start ${!notif.read ? 'bg-blue-50/20 dark:bg-blue-950/30' : ''}`}>
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${notif.type === 'add' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'}`}>{notif.type === 'add' ? <Plus className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}</div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs text-slate-800 dark:text-slate-200 font-extrabold truncate">{notif.projectName ? `مشروع: ${notif.projectName}` : 'تحديث مشروع'}</p>
                                {notif.groupedCount && notif.groupedCount > 1 ? (
                                  <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-extrabold text-[9.5px] px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 shrink-0 flex items-center gap-0.5">
                                    <span>×{notif.groupedCount} تحديثات</span>
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">{notif.message}</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                                <span>{notif.timestamp}</span>
                                <div className="flex items-center gap-1.5">
                                  {notif.groupedCount && notif.groupedCount > 1 ? (
                                    <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded font-bold text-[9px]">
                                      مجمعة ({notif.groupedCount})
                                    </span>
                                  ) : null}
                                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded font-medium text-[9px]">{notif.region || notif.scope}</span>
                                </div>
                              </div>
                            </div>
                            {!notif.read && (<span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2"></span>)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleLogout} className="p-2 text-rose-600 hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-100 dark:border-rose-900 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">تسجيل الخروج</span></button>
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
        <div className="bg-slate-900 dark:bg-slate-900/90 leading-normal p-4.5 rounded-2xl border border-slate-700/60 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
            <div>
              <div className="text-xs text-slate-200">مرحباً: <span className="font-bold text-blue-400">{currentUser.name}</span> ({currentUser.role === 'admin' ? 'صلاحية مدير النظام الكاملة' : 'محرر خرائط'})</div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">الوصول المسموح: <span className="text-slate-300">المناطق [ {currentUser.allowedRegions.join('، ')} ]</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            {canEditProjects && (<button onClick={handleStartAddNewProject} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"><Plus className="h-4 w-4" /><span>إدراج مشروع خارطة جديد</span></button>)}
          </div>
        </div>

        <div className="border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              ...((currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('maps')) ? [{ id: 'maps', label: 'الخرائط التفاعلية', icon: MapIcon }] : []),
              ...((currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('stats')) ? [{ id: 'stats', label: ' الإحصائيات ', icon: Layers }] : []),
              ...((currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('layers')) ? [{ id: 'layers', label: 'طبقات المشاريع', icon: Compass }] : []),
              ...(currentUser.role === 'admin' ? [{ id: 'users', label: 'إدارة وتوزيع صلاحيات الحسابات', icon: Users }] : [])
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Icon className="h-4 w-4 shrink-0" /><span>{tab.label}</span></button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'maps' && (
            <div className="flex flex-col space-y-4">
              <div className="xl:hidden bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex">
                <button type="button" onClick={() => setMobileViewMode('map')} className={`flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${mobileViewMode === 'map' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}><MapIcon className="h-3.5 w-3.5 shrink-0" /><span>الخارطة التفاعلية</span></button>
                <button type="button" onClick={() => setMobileViewMode('list')} className={`flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${mobileViewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}><FileSpreadsheet className="h-3.5 w-3.5 shrink-0" /><span>قائمة المشاريع ({visibleProjects.length})</span></button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                <div className={`xl:col-span-7 ${mobileViewMode === 'map' ? 'block' : 'hidden xl:block'}`} id="map-port-view">
                  <ProjectMapViewer project={selectedProject} projects={filteredProjects} onSelectProject={(proj) => { setSelectedProjectId(proj.id); setMobileViewMode('map'); }} onEditClick={handleStartEditProject} canEdit={canEditProjects} isAdmin={currentUser.role === 'admin'} canOpenExternalLinks={currentUser.canOpenExternalLinks !== false} onUpdateProjectCoordinates={(id, lat, lng) => { const updated = projects.map(p => { if (p.id === id) { const newUrl = `https://www.google.com/maps/d/viewer?mid=custom&ll=${lat},${lng}&z=13`; const updatedProj = { ...p, mapUrl: newUrl, x: lng, y: lat }; handleSaveProject(updatedProj); return updatedProj; } return p; }); setProjects(updated); }} />
                </div>

                <div className={`xl:col-span-5 flex flex-col ${mobileViewMode === 'list' ? 'block' : 'hidden xl:flex'}`}>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-t-2xl border dark:border-slate-800 flex items-center justify-between"><div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-slate-500 dark:text-slate-400" /><span className="text-xs font-bold text-slate-800 dark:text-slate-200">قائمة المشاريع</span></div><span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold">{filteredProjects.length} عدد المشاريع</span></div>
                  <div className="bg-slate-50/50 dark:bg-slate-950/50 p-4 border dark:border-slate-800 rounded-b-2xl max-h-[580px] overflow-y-auto w-full">
                    <ProjectList 
                      projects={visibleProjects} 
                      filteredProjects={filteredProjects} 
                      selectedProject={selectedProject} 
                      onSelectProject={(proj) => { 
                        setSelectedProjectId(selectedProjectId === proj.id ? null : proj.id);
                      }}
                      onGoToMap={(proj) => {
                        setSelectedProjectId(proj.id);
                        setMobileViewMode('map');
                        showNotification(`تم الانتقال لخريطة مشروع: ${proj.name}`);
                      }}
                      currentUser={currentUser} 
                      onToggleFavorite={handleToggleFavorite} 
                      onEditProject={canEditProjects ? handleStartEditProject : undefined} 
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
          <p>© {new Date().getFullYear()} نظام الخرائط التفاعلية الآمن •   </p>
        </div>
      </footer>
    </div>
  );
}