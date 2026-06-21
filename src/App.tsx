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

  // 2. Core State (تبدأ مصفوفات فارغة ويتم تغذيتها لايف من سوبابيس)
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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
          scope: [p.scope],
          classification: p.classification,
          businessUnit: p.business_unit,
          region: p.region,
          subProgram: p.sub_program || '',
          mapUrl: p.map_url || ''
        }));
        setProjects(mappedProjects);
      } else {
        // fallback للبيانات المحلية في حال عدم توفر داتا في السيرفر بعد
        setProjects(getParsedProjects());
      }

      if (!userError && dbUsers) {
        const mappedUsers = dbUsers.map((u: any) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          role: u.role,
          allowedRegions: u.allowed_regions || ['الكل'],
          allowedScopes: u.allowed_scopes || ['الكل'],
          password: u.password
        }));
        setUsers(mappedUsers);

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
      console.error("خطأ في الاتصال بسوبابيس:", err);
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
  }, [currentUser]);

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
    return projects.filter(p => {
      if (currentUser.role === 'admin') return true;
      const isAllRegions = currentUser.allowedRegions.includes('الكل');
      const isRegionAllowed = isAllRegions || currentUser.allowedRegions.includes(p.region);
      const isAllScopes = currentUser.allowedScopes.includes('الكل');
      const isScopeAllowed = isAllScopes || currentUser.allowedScopes.some(scopeType => p.scope.includes(scopeType));
      return isRegionAllowed && isScopeAllowed;
    }).map(p => ({
      ...p,
      isFavorite: favoriteIds.includes(p.id)
    }));
  }, [projects, currentUser, favoriteIds]);

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
      scope: savedProj.scope[0], // تخزين القيمة الأولى كمصطلح نصي بالجدول
      classification: savedProj.classification,
      business_unit: savedProj.businessUnit,
      region: savedProj.region,
      sub_program: savedProj.subProgram,
      map_url: savedProj.mapUrl
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
  const handleSaveUserPermissions = async (updatedUser: