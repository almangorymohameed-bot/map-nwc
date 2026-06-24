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
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  allowedRegions: string[]; // e.g. ["شمال الرياض"] - empty or ["الكل"] means all regions
  allowedScopes: string[];  // e.g. ["مياه", "صرف صحي"] - empty or ["الكل"] means all scopes
  password?: string; // كلمة المرور الخاصة بالمستخدم
}

export interface KMZFeature {
  type: 'polygon' | 'polyline' | 'point';
  name: string;
  description: string;
  coordinates: [number, number][]; // Array of [lat, lng]
  imageUrl?: string; // رابط الصورة المرفقة (سواء محلية أو مرفوعة على جوجل درايف)
}

export interface KMZLayer {
  id: string;
  name: string;
  fileName: string;
  visible: boolean;
  color: string;
  features: KMZFeature[];
  projectId?: number; // الرقم الفريد للمشروع المرتبط
}

