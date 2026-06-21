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
    allowedScopes: ['الكل'],
    password: '20302060'
  },
  {
    id: 'riyadh_eng',
    username: 'riyadh.engineer',
    name: 'مهندس مشاريع وحدة الرياض',
    role: 'editor',
    allowedRegions: ['شمال الرياض', 'جنوب الرياض', 'غرب الرياض', 'المتفرقات'],
    allowedScopes: ['الكل'],
    password: 'nwc1234'
  },
  {
    id: 'govs_eng',
    username: 'gov.engineer',
    name: 'مهندس مشاريع المحافظات',
    role: 'editor',
    allowedRegions: ['المحافظات الشمالية', 'المحافظات الجنوبية', 'المحافظات الغربية'],
    allowedScopes: ['الكل'],
    password: 'nwc1234'
  },
  {
    id: 'water_monitor',
    username: 'water.monitor',
    name: 'مراقب عام قطاع المياه',
    role: 'viewer',
    allowedRegions: ['الكل'],
    allowedScopes: ['مياه'],
    password: 'nwc1234'
  },
  {
    id: 'sewage_monitor',
    username: 'sewage.monitor',
    name: 'مراقب عام قطاع الصرف الصحي',
    role: 'viewer',
    allowedRegions: ['الكل'],
    allowedScopes: ['صرف صحي'],
    password: 'nwc1234'
  },
  {
    id: 'guest_riyadh',
    username: 'guest.riyadh',
    name: 'زائر بلدية الرياض الفرعية',
    role: 'viewer',
    allowedRegions: ['شمال الرياض', 'جنوب الرياض'],
    allowedScopes: ['الكل'],
    password: 'nwc1234'
  }
];
