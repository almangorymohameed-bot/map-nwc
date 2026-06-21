/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'admin',
    username: 'admin',
    name: 'المهندس مدير النظام (الكل)',
    role: 'admin',
    allowedRegions: ['الكل'],
    allowedScopes: ['الكل']
  },
  {
    id: 'riyadh_eng',
    username: 'riyadh.engineer',
    name: 'مهندس مشاريع وحدة الرياض',
    role: 'editor',
    allowedRegions: ['شمال الرياض', 'جنوب الرياض', 'غرب الرياض', 'المتفرقات'],
    allowedScopes: ['الكل']
  },
  {
    id: 'govs_eng',
    username: 'gov.engineer',
    name: 'مهندس مشاريع المحافظات',
    role: 'editor',
    allowedRegions: ['المحافظات الشمالية', 'المحافظات الجنوبية', 'المحافظات الغربية'],
    allowedScopes: ['الكل']
  },
  {
    id: 'water_monitor',
    username: 'water.monitor',
    name: 'مراقب عام قطاع المياه',
    role: 'viewer',
    allowedRegions: ['الكل'],
    allowedScopes: ['مياه']
  },
  {
    id: 'sewage_monitor',
    username: 'sewage.monitor',
    name: 'مراقب عام قطاع الصرف الصحي',
    role: 'viewer',
    allowedRegions: ['الكل'],
    allowedScopes: ['صرف صحي']
  },
  {
    id: 'guest_riyadh',
    username: 'guest.riyadh',
    name: 'زائر بلدية الرياض الفرعية',
    role: 'viewer',
    allowedRegions: ['شمال الرياض', 'جنوب الرياض'],
    allowedScopes: ['الكل']
  }
];
