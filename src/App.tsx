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

export const isProjectAllowedForUser = (p: Project, currentUser: User): boolean => {
  if (currentUser.role === 'admin') return true;
  
  // إذا حدد مسؤول النظام مشاريع معينة للمستخدم، فإن حقه بالوصول يقتصر عليها حصراً لتعزيز الحماية والسرية
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
    changes.push(`البرنامج الفرعي (من "${oldP.subProgram}" إلى "${newP.subProgram}")`);
  }
  
  if (changes.length === 0) return '';
  return `تم تعديل: ${changes.join(' و ')} في مشروع: ${newP.name}`;
};

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
      const matchedLocal = INITIAL_USERS.find(u => u.id === savedAndActive);
      if (matchedLocal) return matchedLocal;
      return { id: savedAndActive, username: 'admin', name: 'جاري التحميل...', role: 'admin', allowedRegions: ['الكل'], allowedScopes: ['الكل'], password: '' };
    }
    return INITIAL_USERS[0]; // Admin by default
  });

  // 3.0.1 Notifications & Alerts State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const savedActive = localStorage.getItem('water_maps_active_user_id');
      const userId = savedActive || 'admin';
      const saved = localStorage.getItem(`water_maps_notifications_${userId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("error loading notifications", e);
    }
    return [];
  });
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

  // 3.0.2 Notification Permission & Service Worker State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [isSwRegistered, setIsSwRegistered] = useState(false);

  // Register Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('NWC Service Worker registered with scope:', reg.scope);
          setIsSwRegistered(true);
        })
        .catch((err) => {
          console.error('NWC Service Worker registration failed:', err);
        });
    }
  }, []);

  // Request native permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showNotification('تنبيه: هذا المتصفح أو الجهاز لا يدعم الإشعارات الخارجية.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        showNotification('تم تفعيل استقبال الإشعارات على الجوال بنجاح! 🔔');
        // Trigger a test notification
        triggerNativeNotification(
          'بوابة الخرائط الجغرافية 🌍',
          'أهلاً بك مهندسنا العزيز! تم ربط جهازك لتلقي إشعارات تحديثات مشاريع المياه والصرف الصحي بنجاح.'
        );
      } else if (permission === 'denied') {
        showNotification('تنبيه: تم رفض إذن الإشعارات المباشرة. يرجى تفعيلها يدوياً من إعدادات المتصفح.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  // Trigger Native OS notification helper
  const triggerNativeNotification = async (title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      // Try using the active Service Worker registration for robust mobile system tray support
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (reg && 'showNotification' in reg) {
          reg.showNotification(title, {
            body,
            icon: '/vite.svg',
            badge: '/vite.svg',
            dir: 'rtl',
            tag: 'nwc-water-maps-notif',
            renotify: true
          });
          return;
        }
      }
      
      // Fallback to standard native Notification constructor
      new Notification(title, {
        body,
        dir: 'rtl',
        icon: '/vite.svg'
      });
    } catch (err) {
      console.error('Error displaying native notification:', err);
    }
  };

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

      if (userError || projError) {
        const errorDetails = [
          userError ? `جدول المستخدمين: ${userError.message} (${userError.details || 'لا توجد تفاصيل إضافية'})` : null,
          projError ? `جدول المشاريع: ${projError.message} (${projError.details || 'لا توجد تفاصيل إضافية'})` : null
        ].filter(Boolean).join(" | ");
        console.warn("فشل الاتصال بـ Supabase:", errorDetails);
        setSupabaseError(errorDetails);
      } else {
        setSupabaseError(null);
      }

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
        // مقارنة البيانات الواردة مع البيانات المحلية الحالية لتوليد إشعارات بالتحديثات والإضافات الجديدة المسموحة للمستخدم
        setProjects(prevProjects => {
          // إذا كانت القائمة فارغة أو تملك فقط القيمة الافتراضية الأولية، فلا نقوم بإغراق المستخدم بالإشعارات
          if (prevProjects && prevProjects.length > 0 && prevProjects.length !== 121) {
            const newNotifications: AppNotification[] = [];
            let addedCount = 0;
            
            mappedProjects.forEach(newP => {
              const oldP = prevProjects.find(op => op.id === newP.id);
              if (!oldP) {
                // مشروع جديد تمت إضافته
                if (isProjectAllowedForUser(newP, currentUser) && addedCount < 10) {
                  const uniqueId = `add_${newP.id}_${newP.name}`;
                  // تجنب التكرار
                  if (!notifications.some(n => n.id === uniqueId) && !newNotifications.some(n => n.id === uniqueId)) {
                    newNotifications.push({
                      id: uniqueId,
                      projectId: newP.id,
                      projectName: newP.name,
                      type: 'add',
                      message: `تمت إضافة مشروع جديد في النظام: ${newP.name}`,
                      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('ar-SA'),
                      read: false,
                      region: newP.region || '',
                      scope: newP.scope || ''
                    });
                    addedCount++;
                  }
                }
              } else {
                // مشروع قائم، فحص التعديلات الهامة
                const diffMsg = getProjectDifferencesMessage(oldP, newP);
                
                if (diffMsg && isProjectAllowedForUser(newP, currentUser) && addedCount < 10) {
                  const uniqueId = `edit_${newP.id}_${newP.status}_${Date.now()}`;
                  if (!notifications.some(n => n.id === uniqueId) && !newNotifications.some(n => n.id === uniqueId)) {
                    newNotifications.push({
                      id: uniqueId,
                      projectId: newP.id,
                      projectName: newP.name,
                      type: 'edit',
                      message: diffMsg,
                      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('ar-SA'),
                      read: false,
                      region: newP.region || '',
                      scope: newP.scope || ''
                    });
                    addedCount++;
                  }
                }
              }
            });

            if (newNotifications.length > 0) {
              setNotifications(prev => [...newNotifications, ...prev]);
              // Trigger native system tray notifications for each fetched project update
              newNotifications.forEach(n => {
                triggerNativeNotification(
                  n.type === 'add' ? 'إضافة مشروع جديد 🆕' : 'تحديث بيانات مشروع 🔄',
                  n.message
                );
              });
            }
          }
          return mappedProjects;
        });
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

          let allowedTabs = ['maps', 'stats', 'layers'];
          if (u.allowed_tabs) {
            if (Array.isArray(u.allowed_tabs)) {
              allowedTabs = u.allowed_tabs;
            } else if (typeof u.allowed_tabs === 'string') {
              try {
                allowedTabs = JSON.parse(u.allowed_tabs);
              } catch (e) {
                allowedTabs = u.allowed_tabs.split(',').map((x: string) => x.trim()).filter(Boolean);
              }
            }
          }

          let allowedProjectIds: number[] = [];
          if (u.allowed_project_ids) {
            if (Array.isArray(u.allowed_project_ids)) {
              allowedProjectIds = u.allowed_project_ids.map(Number);
            } else if (typeof u.allowed_project_ids === 'string') {
              try {
                allowedProjectIds = JSON.parse(u.allowed_project_ids).map(Number);
              } catch (e) {
                allowedProjectIds = u.allowed_project_ids.split(',').map(Number).filter((x: any) => !isNaN(x));
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
    setActiveTab('maps');
    fetchDataFromSupabase();
  }, []);

  // Poll Supabase for new projects / changes every 20 seconds to trigger native background notifications
  useEffect(() => {
    if (!isLogged) return;
    const interval = setInterval(() => {
      fetchDataFromSupabase();
    }, 20000);
    return () => clearInterval(interval);
  }, [isLogged]);

  // حفظ تعديل المفضلة محلياً
  useEffect(() => {
    localStorage.setItem('water_maps_active_user_id', currentUser.id);
    if (currentUser.role !== 'admin') {
      if (activeTab === 'users') {
        setActiveTab('maps');
      } else {
        const allowed = currentUser.allowedTabs || ['maps', 'stats', 'layers'];
        if (!allowed.includes(activeTab)) {
          setActiveTab((allowed[0] as any) || 'maps');
        }
      }
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`water_maps_notifications_${currentUser.id}`);
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications([]);
      }
    } catch (e) {
      setNotifications([]);
    }
  }, [currentUser.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`water_maps_notifications_${currentUser.id}`, JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }
  }, [notifications, currentUser.id]);

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
      showNotification(isFav ? 'تمت الإزالة من المشاريع المفضلة ⭐️' : 'تمت الإضافة إلى المشاريع المفضلة ⭐');
      return updated;
    });
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showNotification('تم تحديد جميع الإشعارات كمقروءة');
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    showNotification('تم مسح قائمة الإشعارات');
  };

  const handleNotificationClick = (notif: AppNotification) => {
    // 1. Mark as read
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    
    // 2. Select project and focus on maps tab
    if (notif.projectId) {
      setSelectedProjectId(notif.projectId);
      setActiveTab('maps');
      setMobileViewMode('map');
      showNotification(`تم تحديد مشروع: ${notif.projectName}`);
    }
    
    // 3. Close notifications dropdown
    setShowNotificationsDropdown(false);
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
      
      // إذا حدد مسؤول النظام مشاريع معينة للمستخدم، فإن حقه بالوصول يقتصر عليها حصراً لتعزيز الحماية والسرية
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

  const canEditProjects = currentUser.role === 'admin' || (currentUser.role === 'editor' && currentUser.canInsert !== false) || currentUser.canInsert === true;

  const showNotification = (msg: string) => {
    setSuccessNotification(msg);
    setTimeout(() => setSuccessNotification(''), 4000);
    // Trigger native OS system notification
    triggerNativeNotification('بوابة الخرائط الجغرافية 🌍', msg);
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
      setActiveTab('maps');
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
      setActiveTab('maps');
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

    // تحديث الحالة المحلية فوراً لضمان سرعة الاستجابة وانعكاس البيانات مباشرة
    setProjects(prev => {
      const exists = prev.some(p => p.id === savedProj.id);
      if (exists) {
        return prev.map(p => p.id === savedProj.id ? savedProj : p);
      } else {
        return [savedProj, ...prev];
      }
    });

    const exists = projects.some(p => p.id === savedProj.id);
    const notifType = exists ? 'edit' : 'add';
    
    let notifMsg = '';
    if (exists) {
      const oldProj = projects.find(p => p.id === savedProj.id);
      const diffStr = oldProj ? getProjectDifferencesMessage(oldProj, savedProj) : '';
      notifMsg = diffStr || `قمتم بتعديل بيانات المشروع: ${savedProj.name}`;
    } else {
      notifMsg = `قمتم بإضافة مشروع جديد: ${savedProj.name}`;
    }
    
    const selfNotif: AppNotification = {
      id: `self_${notifType}_${savedProj.id || Date.now()}_${Date.now()}`,
      projectId: savedProj.id || Date.now(),
      projectName: savedProj.name,
      type: notifType,
      message: notifMsg,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('ar-SA'),
      read: true, // It's their own action, so mark as read by default
      region: savedProj.region || '',
      scope: typeof savedProj.scope === 'string' ? savedProj.scope : 'صرف صحي'
    };
    setNotifications(prev => [selfNotif, ...prev]);
    triggerNativeNotification(
      notifType === 'add' ? 'إضافة مشروع جديد 🆕' : 'تحديث بيانات مشروع 🔄',
      notifMsg
    );

    try {
      if (exists) {
        // تحديث مشروع قائم بالسيرفر
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', savedProj.id);
        
        if (!error) {
          showNotification(`تم تحديث بيانات مشروع بالسيرفر: ${savedProj.name}`);
        } else {
          console.error("error updating project", error);
          alert(`خطأ في تحديث المشروع على سوبابيس:\n${error.message}\n\nتأكد من مطابقة أعمدة جدول projects في سوبابيس.`);
        }
      } else {
        // إدراج مشروع جديد كلياً
        const { error } = await supabase
          .from('projects')
          .insert([payload]);
        
        if (!error) {
          showNotification(`تم إضافة مشروع شبكة جديد بنجاح للسيرفر: ${savedProj.name}`);
        } else {
          console.error("error inserting project", error);
          alert(`خطأ في إضافة مشروع جديد على سوبابيس:\n${error.message}\n\nتأكد من مطابقة أعمدة جدول projects في سوبابيس.`);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`خطأ بالاتصال مع سوبابيس: ${err.message || err}`);
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
  // مزامنة صلاحيات ومخدمي النظام مع سوبابيس
  // ==========================================
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

    // تحديث الحالة المحلية فوراً لضمان الاستجابة السريعة وانعكاس الصلاحيات مباشرة
    setUsers(prev => {
      const exists = prev.some(u => u.id === updatedUser.id);
      if (exists) {
        return prev.map(u => u.id === updatedUser.id ? updatedUser : u);
      } else {
        return [...prev, updatedUser];
      }
    });

    if (updatedUser.id === currentUser.id) {
      setCurrentUser(updatedUser);
    }

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
          alert(`خطأ في تحديث الصلاحيات على سوبابيس:\n${error.message}\n\nتأكد من إنشاء جدول 'users' بالأعمدة المطلوبة وتفعيل صلاحيات RLS.`);
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
          alert(`خطأ في إضافة مستخدم جديد إلى سوبابيس:\n${error.message}\n\nتأكد من إنشاء جدول 'users' بالأعمدة المطلوبة وتفعيل صلاحيات RLS.`);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`خطأ بالاتصال مع سوبابيس: ${err.message || err}`);
    }
    // تحديث البيانات لايف
    fetchDataFromSupabase();
  };

  const handleDeleteUser = async (userId: string) => {
    // تحديث فوري للحالة المحلية
    setUsers(prev => prev.filter(u => u.id !== userId));
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (!error) {
        showNotification('تم إلغاء حساب المستخدم وسحب شهادات الاعتماد.');
      } else {
        console.error("error deleting user", error);
        alert(`خطأ في حذف المستخدم من سوبابيس:\n${error.message}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`خطأ بالاتصال مع سوبابيس: ${err.message || err}`);
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

            {/* User status badge, Notification Bell & Logout */}
            <div className="flex items-center gap-3 relative">
              <div className="hidden sm:block text-right">
                <span className="text-[10px] text-slate-400 font-bold block">المستخدم الحالي</span>
                <span className="text-xs text-slate-800 font-extrabold">{currentUser.name}</span>
              </div>

              {/* Notification Bell */}
              <div className="relative" id="notifications-bell-container">
                <button
                  type="button"
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative ${
                    showNotificationsDropdown
                      ? 'bg-blue-50 border-blue-200 text-blue-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="تنبيهات النظام والمشاريع"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border border-white shadow-sm animate-pulse z-10">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {showNotificationsDropdown && (
                  <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 text-right">
                    {/* Header */}
                    <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-extrabold text-slate-800">إشعارات المشاريع والشبكات</span>
                      </div>
                      <div className="flex gap-2">
                        {unreadNotificationsCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                          >
                            تحديد الكل كمقروء
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearNotifications}
                            className="text-[10px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                          >
                            مسح الكل
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Notification PWA Status Checker */}
                    <div className="p-2.5 px-3.5 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between text-[11px] font-medium">
                      <span className="text-slate-500 font-bold">إشعارات الجوال والنظام الخارجية:</span>
                      {notificationPermission === 'granted' ? (
                        <span className="text-emerald-600 font-extrabold flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>نشطة ومفعلة</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={requestNotificationPermission}
                          className="text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Smartphone className="h-3 w-3" />
                          <span>تفعيل الإشعارات 🔔</span>
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                          <Bell className="h-8 w-8 text-slate-200 animate-pulse" />
                          <span>لا توجد إشعارات نشطة حالياً</span>
                          <span className="text-[10px] text-slate-300">يتم إشعارك تلقائياً عند إضافة أو تعديل مشاريع مسموحة لك.</span>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 items-start ${
                              !notif.read ? 'bg-blue-50/20' : ''
                            }`}
                          >
                            {/* Icon */}
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                              notif.type === 'add' 
                                ? 'bg-emerald-50 text-emerald-600' 
                                : 'bg-blue-50 text-blue-600'
                            }`}>
                              {notif.type === 'add' ? <Plus className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>{notif.timestamp}</span>
                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-medium text-[9px]">
                                  {notif.region || notif.scope}
                                </span>
                              </div>
                            </div>

                            {/* Unread dot */}
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2"></span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
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

      {/* Supabase Error & SQL Creator Warning Banner */}
      {supabaseError && currentUser && currentUser.role === 'admin' && (
        <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs px-6 py-4 font-medium shadow-md text-right flex flex-col md:flex-row items-center justify-between gap-4 border-b border-red-700/50">
          <div className="flex items-start gap-2.5">
            <span className="p-1.5 bg-white/10 rounded-lg shrink-0 mt-0.5 text-base">⚠️</span>
            <div>
              <span className="font-extrabold text-sm block mb-1">تنبيه لمدير النظام: لم يتم تفعيل أو مطابقة جداول قاعدة بيانات Supabase بشكل كامل!</span>
              <p className="opacity-95 text-[11px] leading-relaxed">
                البوابة تعمل حالياً بوضع المحاكاة الآمن (Local Fallback Cache). لتفعيل حفظ وتعديل الصلاحيات والمشاريع لجميع المستخدمين، يرجى تشغيل كود الـ SQL المخصص في قسم <code className="bg-black/25 px-1 py-0.5 rounded font-mono text-[10px]">SQL Editor</code> داخل حسابك في Supabase.
              </p>
              <div className="mt-2 text-[10px] bg-black/20 p-2 rounded font-mono overflow-x-auto text-left" dir="ltr">
                {supabaseError}
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              const sql = `-- كود إنشاء جداول الصلاحيات لشركة المياه الوطنية بالقطاع الأوسط NWC\n\n` +
                `CREATE TABLE IF NOT EXISTS users (\n` +
                `  id TEXT PRIMARY KEY,\n` +
                `  username TEXT UNIQUE NOT NULL,\n` +
                `  name TEXT NOT NULL,\n` +
                `  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),\n` +
                `  allowed_regions JSONB DEFAULT '["الكل"]'::jsonb,\n` +
                `  allowed_scopes JSONB DEFAULT '["الكل"]'::jsonb,\n` +
                `  allowed_tabs JSONB DEFAULT '["maps", "stats", "layers"]'::jsonb,\n` +
                `  password TEXT NOT NULL DEFAULT 'nwc1234',\n` +
                `  can_open_external_links BOOLEAN DEFAULT true,\n` +
                `  can_filter BOOLEAN DEFAULT true,\n` +
                `  can_insert BOOLEAN DEFAULT true,\n` +
                `  department TEXT DEFAULT '',\n` +
                `  job_title TEXT DEFAULT '',\n` +
                `  allowed_project_ids JSONB DEFAULT '[]'::jsonb,\n` +
                `  created_at TIMESTAMPTZ DEFAULT NOW()\n` +
                `);\n\n` +
                `CREATE TABLE IF NOT EXISTS projects (\n` +
                `  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,\n` +
                `  operational_number TEXT UNIQUE NOT NULL,\n` +
                `  name TEXT NOT NULL,\n` +
                `  po TEXT DEFAULT '',\n` +
                `  unifier_no TEXT DEFAULT '',\n` +
                `  contractor TEXT,\n` +
                `  consultant TEXT,\n` +
                `  status TEXT,\n` +
                `  scope TEXT,\n` +
                `  classification TEXT,\n` +
                `  business_unit TEXT,\n` +
                `  region TEXT,\n` +
                `  sub_program TEXT,\n` +
                `  map_url TEXT,\n` +
                `  x NUMERIC,\n` +
                `  y NUMERIC,\n` +
                `  created_at TIMESTAMPTZ DEFAULT NOW()\n` +
                `);\n\n` +
                `-- إدراج المستخدمين الافتراضيين لشركة المياه الوطنية\n` +
                `INSERT INTO users (id, username, name, role, allowed_regions, allowed_scopes, password, allowed_tabs, can_open_external_links, can_filter, can_insert, department, job_title, allowed_project_ids)\n` +
                `VALUES \n` +
                `('admin', 'admin', 'المهندس مدير النظام (الكل)', 'admin', '["الكل"]'::jsonb, '["الكل"]'::jsonb, '20302060', '["maps", "stats", "layers"]'::jsonb, true, true, true, 'إدارة النظم', 'مدير النظام', '[]'::jsonb),\n` +
                `('riyadh_eng', 'riyadh.engineer', 'مهندس مشاريع وحدة الرياض', 'editor', '["شمال الرياض", "جنوب الرياض", "غرب الرياض", "المتفرقات"]'::jsonb, '["الكل"]'::jsonb, 'nwc1234', '["maps", "stats", "layers"]'::jsonb, true, true, true, 'وحدة أعمال الرياض', 'مهندس مشاريع', '[]'::jsonb),\n` +
                `('govs_eng', 'gov.engineer', 'مهندس مشاريع المحافظات', 'editor', '["المحافظات الشمالية", "المحافظات الجنوبية", "المحافظات الغربية"]'::jsonb, '["الكل"]'::jsonb, 'nwc1234', '["maps", "stats", "layers"]'::jsonb, true, true, true, 'إدارة المحافظات', 'مهندس مشاريع', '[]'::jsonb),\n` +
                `('water_monitor', 'water.monitor', 'مراقب عام قطاع المياه', 'viewer', '["الكل"]'::jsonb, '["مياه"]'::jsonb, 'nwc1234', '["maps", "stats", "layers"]'::jsonb, true, true, true, 'إدارة التشغيل والصيانة', 'مراقب عام قطاع المياه', '[]'::jsonb),\n` +
                `('sewage_monitor', 'sewage.monitor', 'مراقب عام قطاع الصرف الصحي', 'viewer', '["الكل"]'::jsonb, '["صرف صحي"]'::jsonb, 'nwc1234', '["maps", "stats", "layers"]'::jsonb, true, true, true, 'إدارة التشغيل والصيانة', 'مراقب عام قطاع الصرف الصحي', '[]'::jsonb),\n` +
                `('guest_riyadh', 'guest.riyadh', 'زائر بلدية الرياض الفرعية', 'viewer', '["شمال الرياض", "جنوب الرياض"]'::jsonb, '["الكل"]'::jsonb, 'nwc1234', '["maps", "stats", "layers"]'::jsonb, true, true, true, 'بلدية الرياض', 'زائر معتمد', '[]'::jsonb)\n` +
                `ON CONFLICT (username) DO NOTHING;`;
              navigator.clipboard.writeText(sql);
              alert("تم نسخ كود SQL لإنشاء وتجهيز الجداول بنجاح! الصقه في الـ SQL Editor في Supabase واضغط Run لتهيئة قاعدة البيانات وعكس الصلاحيات مباشرة.");
            }}
            className="bg-white hover:bg-slate-50 text-amber-700 font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shrink-0 shadow-sm border border-white/20"
          >
            نسخ كود SQL للتهيئة 📋
          </button>
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

        {/* مطالبة تفعيل إشعارات الجوال والنظام */}
        {notificationPermission === 'default' && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/80 rounded-2xl p-4.5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300 text-right">
            <div className="flex items-center gap-3.5 w-full md:w-auto">
              <div className="p-3 bg-blue-600 text-white rounded-xl shrink-0 shadow-sm animate-bounce">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                  <span>تفعيل التنبيهات المباشرة للجوال والنظام 🔔</span>
                  <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">موصى به للجوال</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  هل تود تلقي إشعارات فورية في ستارة هاتفك الخارجية عند إضافة أو تعديل أي من المشاريع والشبكات التابعة لقطاعك؟
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => setNotificationPermission('denied')}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
              >
                ليس الآن
              </button>
              <button
                onClick={requestNotificationPermission}
                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Smartphone className="h-4 w-4" />
                <span>تفعيل التنبيهات الخارجية</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs bar */}
        <div className="border-b border-slate-200 flex justify-between items-center bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              ...((currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('maps')) ? [{ id: 'maps', label: 'الخرائط التفاعلية', icon: Map }] : []),
              ...((currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('stats')) ? [{ id: 'stats', label: ' الإحصائيات ', icon: Layers }] : []),
              ...((currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('layers')) ? [{ id: 'layers', label: 'طبقات المشاريع', icon: Compass }] : []),
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
                  <span>قائمة المشاريع ({visibleProjects.length})</span>
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
                    canOpenExternalLinks={currentUser.canOpenExternalLinks !== false}
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

          {/* Active Tab: Analytics Dashboard Stats */}
          {activeTab === 'stats' && (currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('stats')) && (
            <div className="animate-in fade-in duration-300">
              <DashboardStats projects={filteredProjects} />
            </div>
          )}

          {/* Active Tab: Project Layers Viewer */}
          {activeTab === 'layers' && (currentUser.role === 'admin' || (currentUser.allowedTabs || ['maps', 'stats', 'layers']).includes('layers')) && (
            <div className="animate-in fade-in duration-300">
              <ProjectLayersViewer currentUser={currentUser} />
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
                projects={projects}
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