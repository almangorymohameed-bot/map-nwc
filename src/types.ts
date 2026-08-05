/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Project {
  id: number;
  operationalNumber: string;
  name: string;
  po: string;
  unifierNo: string;
  contractor: string;
  consultant: string;
  status: string; // جاري, مسلم ابتدائي, مسحوب, جاري الاستلام الابتدائي
  scope: string; // صرف صحي, مياه
  classification: string; // شبكات, خطوط رئيسية, خزانات, مخطط استراتيجي, خطوط ناقلة, ترحيل, استبدال, محطات معالجة صرف صحي, الخ
  businessUnit: string; // وحدة أعمال الرياض, الخ
  region: string; // شمال الرياض, جنوب الرياض, غرب الرياض, المحافظات الشمالية, المحافظات الجنوبية, المحافظات الغربية, المتفرقات
  subProgram: string;
  mapUrl: string;
  isFavorite?: boolean;
  x?: number | null; // خط الطول (X)
  y?: number | null; // خط العرض (Y)
  surveyorName?: string; // اسم المساح
  surveyorPhone?: string; // رقم التواصل للمساح
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  allowedRegions: string[]; // e.g. ["شمال الرياض"] - empty or ["الكل"] means all regions
  allowedScopes: string[];  // e.g. ["مياه", "صرف صحي"] - empty or ["الكل"] means all scopes
  password?: string; // كلمة المرور الخاصة بالمستخدم
  
  // خصائص الصلاحيات الجديدة للموقع
  allowedTabs?: string[]; // التبويبات المسموحة: ["maps", "stats", "layers", "users"]
  canOpenExternalLinks?: boolean; // فتح روابط خارجية
  canFilter?: boolean; // التصفية والبحث
  canInsert?: boolean; // إدراج مشاريع جديدة
  
  // بيانات الملف الشخصي للمستخدم الجديد
  department?: string; // القسم
  jobTitle?: string; // الوظيفة
  
  // صلاحية اختيار مشاريع محددة
  allowedProjectIds?: number[]; // معرفات المشاريع المحددة المسموحة

  // صلاحية طبقات المشاريع المفصلة
  allowedLayers?: string[]; // المعرفات المسموحة: ["water", "sewage", "materials"]
}

export interface AppNotification {
  id: string;
  projectId: number;
  projectName: string;
  type: 'add' | 'edit';
  message: string;
  timestamp: string;
  read: boolean;
  region: string;
  scope: string;
  groupedCount?: number;
  groupedIds?: string[];
}

export type StatusCategory = 'executed_water' | 'executed_sewage' | 'ongoing' | 'remaining' | 'cancelled';

export interface KMLFeatureItem {
  id: string;
  name: string;
  segmentId: string;
  permitNo: string;
  colorHex: string; // #01579B, #097138, #ffea00, #a52714, #F48FB1
  statusCategory: StatusCategory;
  statusLabel: string; // منفذ - مياه | منفذ - صرف | جاري العمل | أعمال متبقية | خطوط تم إلغائها
  lengthMeters: number;
  lengthKm: number;
  coordinatesCount: number;
  description?: string;
  layerName?: string;
}

export interface ColorStatsSummary {
  colorHex: string;
  label: string;
  category: StatusCategory;
  totalLengthMeters: number;
  totalLengthKm: number;
  segmentCount: number;
  permitCount: number;
  percentage: number;
}

export interface KMLAnalysisResult {
  projectName?: string;
  mapUrl?: string;
  totalLengthMeters: number;
  totalLengthKm: number;
  totalFeaturesCount: number;
  colorBreakdown: Record<StatusCategory, ColorStatsSummary>;
  segmentIdsByStatus: {
    executedWater: string[];
    executedSewage: string[];
    ongoing: string[];
    remaining: string[];
    cancelled: string[];
  };
  permitNosByStatus: {
    executedWater: string[];
    executedSewage: string[];
    ongoing: string[];
    remaining: string[];
    cancelled: string[];
  };
  items: KMLFeatureItem[];
  parsedAt: string;
}

