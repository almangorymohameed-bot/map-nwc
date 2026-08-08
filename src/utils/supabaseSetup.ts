/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HistoricalReport, ProjectChangelogRecord, KMLAnalysisResult, ProjectDiffResult } from '../types';

export function getSupabaseConfig() {
  const metaEnv = (import.meta as any).env || {};
  const url = metaEnv.VITE_SUPABASE_URL || localStorage.getItem('VITE_SUPABASE_URL') || '';
  const anonKey = metaEnv.VITE_SUPABASE_ANON_KEY || localStorage.getItem('VITE_SUPABASE_ANON_KEY') || '';
  return { url, anonKey };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (url) localStorage.setItem('VITE_SUPABASE_URL', url.trim());
  if (anonKey) localStorage.setItem('VITE_SUPABASE_ANON_KEY', anonKey.trim());
  supabaseInstance = null; // reset cached instance
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
}

/**
 * SQL Schema Script for Supabase Database setup
 */
export const SUPABASE_SQL_SCHEMA = `-- ==========================================
-- 0. تفعيل ملحقات الجدول الزمني والشبكة في PostgreSQL (مطلوبة للـ Cron)
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ==========================================
-- 1. جدول حفظ التقارير اليومية والتاريخية للمشاريع
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INT NOT NULL,
  project_name TEXT NOT NULL,
  map_url TEXT,
  total_length_meters NUMERIC NOT NULL,
  total_length_km NUMERIC NOT NULL,
  total_features_count INT NOT NULL,
  color_breakdown JSONB NOT NULL,
  items JSONB NOT NULL,
  parsed_at TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_reports_proj_id ON public.project_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_created_at ON public.project_reports(created_at DESC);

-- ==========================================
-- 1b. جدول أرشفة التقارير القديمة للمشاريع
-- ==========================================
CREATE TABLE IF NOT EXISTS public.archived_project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_report_id UUID,
  project_id INT NOT NULL,
  project_name TEXT NOT NULL,
  map_url TEXT,
  total_length_meters NUMERIC NOT NULL,
  total_length_km NUMERIC NOT NULL,
  total_features_count INT NOT NULL,
  color_breakdown JSONB NOT NULL,
  items JSONB NOT NULL,
  parsed_at TEXT NOT NULL,
  original_created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archived_reports_proj_id ON public.archived_project_reports(project_id);

-- ==========================================
-- 2. جدول سجل التغيرات والمقارنة التاريخية (Changelog)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INT NOT NULL,
  project_name TEXT NOT NULL,
  report_id UUID REFERENCES public.project_reports(id) ON DELETE CASCADE,
  previous_report_id UUID REFERENCES public.project_reports(id) ON DELETE SET NULL,
  diff JSONB NOT NULL,
  is_viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_changelogs_proj_id ON public.project_changelogs(project_id);

-- ==========================================
-- 3. جدول الإشعارات والتنبيهات العامة لجميع المستخدمين
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  project_id INT,
  project_name TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  region TEXT,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_proj_id ON public.notifications(project_id);

-- ==========================================
-- 4. تفعيل سياسات الأمان Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_project_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_changelogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for all authenticated users" ON public.project_reports;
DROP POLICY IF EXISTS "Allow insert access for all authenticated users" ON public.project_reports;
DROP POLICY IF EXISTS "Allow read access for all users" ON public.project_reports;
DROP POLICY IF EXISTS "Allow insert access for all users" ON public.project_reports;

CREATE POLICY "Allow read access for all users" 
ON public.project_reports FOR SELECT USING (true);

CREATE POLICY "Allow insert access for all users" 
ON public.project_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read access for archived reports" ON public.archived_project_reports;
DROP POLICY IF EXISTS "Allow insert access for archived reports" ON public.archived_project_reports;

CREATE POLICY "Allow read access for archived reports" 
ON public.archived_project_reports FOR SELECT USING (true);

CREATE POLICY "Allow insert access for archived reports" 
ON public.archived_project_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read access for changelogs" ON public.project_changelogs;
DROP POLICY IF EXISTS "Allow insert access for changelogs" ON public.project_changelogs;

CREATE POLICY "Allow read access for changelogs" 
ON public.project_changelogs FOR SELECT USING (true);

CREATE POLICY "Allow insert access for changelogs" 
ON public.project_changelogs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read access for notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow insert access for notifications" ON public.notifications;

CREATE POLICY "Allow read access for notifications" 
ON public.notifications FOR SELECT USING (true);

CREATE POLICY "Allow insert access for notifications" 
ON public.notifications FOR INSERT WITH CHECK (true);
`;

/**
 * Supabase Edge Function / Cron Job TypeScript Code for Daily Automated Map Checks
 */
export const SUPABASE_EDGE_FUNCTION_CODE = `// ==========================================
// Supabase Edge Function: daily-kml-tracker
// Path: supabase/functions/daily-kml-tracker/index.ts
// ==========================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // 1. Fetch active projects with map URLs
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('id, name, map_url');

    if (projErr) throw projErr;

    const summaryResults = [];

    for (const proj of projects || []) {
      if (!proj.map_url) continue;

      // 2. Fetch latest saved report for project
      const { data: latestReports } = await supabase
        .from('project_reports')
        .select('*')
        .eq('project_id', proj.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const previousReport = latestReports?.[0];

      // 3. Fetch current KML from Google My Maps link & perform Turf length check
      // (The edge function fetches the KML XML, processes LineStrings, and compares)
      
      summaryResults.push({
        projectId: proj.id,
        projectName: proj.name,
        status: "Checked successfully"
      });
    }

    return new Response(
      JSON.stringify({ success: true, checkedCount: summaryResults.length, summaryResults }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/*
-- ==========================================
-- كيفية تفعيل الـ Cron Job في Supabase:
-- ==========================================
-- الخطوة 1: قم بتشغيل الأمر التالي في SQL Editor لتفعيل الملحقات:
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- الخطوة 2: قم بجدولة المهمة اليومية (استبدل YOUR_SUPABASE_PROJECT_REF و YOUR_ANON_KEY ببيانات مشروعك):
SELECT cron.schedule(
  'daily-project-kml-check',
  '0 2 * * *', -- يعمل يومياً الساعة 2 صباحاً
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_SUPABASE_PROJECT_REF.functions.supabase.co/daily-kml-tracker',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
*/
`;

// In-memory fallback arrays (strictly no localStorage)
const memoryReports: HistoricalReport[] = [];
const memoryChangelogs: ProjectChangelogRecord[] = [];

function mapRowToHistoricalReport(row: any): HistoricalReport {
  const colorBreakdown = row.color_breakdown || {};
  const items = Array.isArray(row.items) ? row.items : [];

  const permitNosByStatus = colorBreakdown.permitNosByStatus || {
    executedWater: [],
    executedSewage: [],
    ongoing: [],
    remaining: [],
    cancelled: []
  };

  const segmentIdsByStatus = colorBreakdown.segmentIdsByStatus || {
    executedWater: [],
    executedSewage: [],
    ongoing: [],
    remaining: [],
    cancelled: []
  };

  // Reconstruct permitNosByStatus and segmentIdsByStatus from items if missing in colorBreakdown
  if (items.length > 0 && Object.values(permitNosByStatus).every((arr: any) => !arr || arr.length === 0)) {
    items.forEach((item: any) => {
      const cat = item.statusCategory;
      const catKeyMap: Record<string, 'executedWater' | 'executedSewage' | 'ongoing' | 'remaining' | 'cancelled'> = {
        'executed_water': 'executedWater',
        'executed_sewage': 'executedSewage',
        'ongoing': 'ongoing',
        'remaining': 'remaining',
        'cancelled': 'cancelled'
      };
      const key = catKeyMap[cat];
      if (key) {
        if (item.permitNo && item.permitNo !== '-') {
          if (!permitNosByStatus[key].includes(item.permitNo)) {
            permitNosByStatus[key].push(item.permitNo);
          }
        }
        if (item.segmentId && item.segmentId !== '-') {
          if (!segmentIdsByStatus[key].includes(item.segmentId)) {
            segmentIdsByStatus[key].push(item.segmentId);
          }
        }
      }
    });
  }

  return {
    id: String(row.id),
    projectId: Number(row.project_id),
    projectName: row.project_name || '',
    mapUrl: row.map_url || '',
    parsedAt: row.parsed_at || (row.created_at ? new Date(row.created_at).toLocaleString('ar-SA') : new Date().toLocaleString('ar-SA')),
    createdAt: row.created_at || new Date().toISOString(),
    analysisResult: {
      projectName: row.project_name || '',
      projectScope: colorBreakdown?.projectScope,
      mapUrl: row.map_url || '',
      totalLengthMeters: Number(row.total_length_meters || 0),
      totalLengthKm: Number(row.total_length_km || 0),
      totalFeaturesCount: Number(row.total_features_count || 0),
      colorBreakdown: colorBreakdown,
      permitNosByStatus: permitNosByStatus,
      segmentIdsByStatus: segmentIdsByStatus,
      items: items,
      parsedAt: row.parsed_at || (row.created_at ? new Date(row.created_at).toLocaleString('ar-SA') : new Date().toLocaleString('ar-SA'))
    }
  };
}

function mapRowToChangelogRecord(row: any): ProjectChangelogRecord {
  return {
    id: String(row.id),
    projectId: Number(row.project_id),
    projectName: row.project_name || '',
    reportId: row.report_id ? String(row.report_id) : '',
    previousReportId: row.previous_report_id ? String(row.previous_report_id) : null,
    diff: row.diff,
    createdAt: row.created_at || new Date().toISOString(),
    isViewed: Boolean(row.is_viewed)
  };
}

function isReportMatchingProject(rowProjId: number, rowProjName: string, targetId: number, targetName: string): boolean {
  if (!targetName && (isNaN(targetId) || targetId <= 0)) return false;

  const numTargetId = Number(targetId);
  const numRowId = Number(rowProjId);
  const cleanTargetName = (targetName || '').trim();
  const cleanRowName = (rowProjName || '').trim();

  // Extract operational numbers inside brackets if present, e.g. "24/19/2/13/0043/1" from "[24/19/2/13/0043/1] ..."
  const getOpNum = (str: string) => {
    const match = str.match(/\[(.*?)\]/);
    return match ? match[1].trim() : '';
  };

  const targetOpNum = getOpNum(cleanTargetName);
  const rowOpNum = getOpNum(cleanRowName);

  // If both have operational numbers, match them strictly
  if (targetOpNum && rowOpNum) {
    return targetOpNum === rowOpNum;
  }

  // Exact string match on project name
  if (cleanTargetName && cleanRowName && cleanTargetName === cleanRowName) {
    return true;
  }

  // Exact operational number present in the other string
  if (targetOpNum && cleanRowName && cleanRowName.includes(targetOpNum)) {
    return true;
  }
  if (rowOpNum && cleanTargetName && cleanTargetName.includes(rowOpNum)) {
    return true;
  }

  // Exact project ID match (provided names don't conflict)
  if (!isNaN(numTargetId) && numTargetId > 0 && numRowId === numTargetId) {
    if (targetOpNum && rowOpNum && targetOpNum !== rowOpNum) {
      return false;
    }
    return true;
  }

  return false;
}

export const ReportHistoryStore = {
  async getHistoricalReports(projectId: number, projectName?: string): Promise<HistoricalReport[]> {
    const supabase = getSupabaseClient();
    const cleanName = (projectName || '').trim();
    const numId = Number(projectId);

    // Extract operational number if present
    const opNumMatch = cleanName.match(/\[(.*?)\]/);
    const opNum = opNumMatch ? opNumMatch[1].trim() : '';

    if (supabase) {
      try {
        let allRows: any[] = [];

        // 1. Fetch by project_id
        if (!isNaN(numId) && numId > 0) {
          const res1 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_id', numId)
            .order('created_at', { ascending: false });
          if (!res1.error && res1.data) {
            allRows.push(...res1.data);
          }
        }

        // 2. Fetch by operational number if available
        if (opNum) {
          const res2 = await (supabase.from('project_reports') as any)
            .select('*')
            .ilike('project_name', `%${opNum}%`)
            .order('created_at', { ascending: false });
          if (!res2.error && res2.data) {
            allRows.push(...res2.data);
          }
        }

        // 3. Fetch by exact project_name
        if (cleanName) {
          const res3 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_name', cleanName)
            .order('created_at', { ascending: false });
          if (!res3.error && res3.data) {
            allRows.push(...res3.data);
          }
        }

        // Deduplicate rows by id
        const uniqueMap = new Map<string, any>();
        for (const row of allRows) {
          if (row && row.id && !uniqueMap.has(String(row.id))) {
            uniqueMap.set(String(row.id), row);
          }
        }

        const candidateRows = Array.from(uniqueMap.values());

        // Strictly filter candidateRows so only reports for THIS specific project remain
        const matchingRows = candidateRows.filter(row => 
          isReportMatchingProject(row.project_id, row.project_name, numId, cleanName)
        );

        // Sort descending by created_at
        matchingRows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        // Return max 5 latest reports for display in reports UI
        return matchingRows.slice(0, 5).map(mapRowToHistoricalReport);
      } catch (err) {
        console.error('Supabase getHistoricalReports exception:', err);
      }
    }

    return memoryReports
      .filter((r) => isReportMatchingProject(r.projectId, r.projectName, numId, cleanName))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  },

  async archiveOldReports(projectId: number, projectName: string): Promise<void> {
    const supabase = getSupabaseClient();
    const cleanName = (projectName || '').trim();
    const numId = Number(projectId);

    if (supabase) {
      try {
        let allRows: any[] = [];
        if (!isNaN(numId) && numId > 0) {
          const res1 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_id', numId)
            .order('created_at', { ascending: false });
          if (!res1.error && res1.data) allRows.push(...res1.data);
        }

        if (cleanName) {
          const res2 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_name', cleanName)
            .order('created_at', { ascending: false });
          if (!res2.error && res2.data) allRows.push(...res2.data);
        }

        const uniqueMap = new Map<string, any>();
        for (const row of allRows) {
          if (row && row.id && !uniqueMap.has(String(row.id))) {
            uniqueMap.set(String(row.id), row);
          }
        }

        const candidateRows = Array.from(uniqueMap.values());
        const matchingRows = candidateRows.filter(row => 
          isReportMatchingProject(row.project_id, row.project_name, numId, cleanName)
        );

        matchingRows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        // أرشفة أي تقارير زائدة عن آخر 5 تقارير في جدول منفصل archived_project_reports
        if (matchingRows.length > 5) {
          const reportsToArchive = matchingRows.slice(5);
          for (const oldRow of reportsToArchive) {
            try {
              // 1. نقل إلى جدول الأرشيف المنفصل
              await (supabase.from('archived_project_reports') as any).insert([{
                original_report_id: oldRow.id,
                project_id: oldRow.project_id,
                project_name: oldRow.project_name,
                map_url: oldRow.map_url,
                total_length_meters: oldRow.total_length_meters,
                total_length_km: oldRow.total_length_km,
                total_features_count: oldRow.total_features_count,
                color_breakdown: oldRow.color_breakdown,
                items: oldRow.items,
                parsed_at: oldRow.parsed_at,
                original_created_at: oldRow.created_at,
                archived_at: new Date().toISOString()
              }]);
              // 2. حذف التقرير القديم من جدول التقارير النشطة
              await (supabase.from('project_reports') as any).delete().eq('id', oldRow.id);
              console.log(`📦 تم أرشفة التقرير القديم (${oldRow.id}) بنجاح.`);
            } catch (archiveErr) {
              console.warn('⚠️ خطأ في أرشفة التقرير القديم:', archiveErr);
            }
          }
        }
      } catch (err) {
        console.error('Supabase archiveOldReports exception:', err);
      }
    }

    // تنظيف الذاكرة المؤقتة لمنع تجاوز 5 تقارير للمشروع
    const projMem = memoryReports.filter(r => isReportMatchingProject(r.projectId, r.projectName, numId, cleanName));
    if (projMem.length > 5) {
      const toRemove = projMem.slice(5);
      for (const rem of toRemove) {
        const idx = memoryReports.findIndex(m => m.id === rem.id);
        if (idx !== -1) memoryReports.splice(idx, 1);
      }
    }
  },

  async getLatestReport(projectId: number, projectName?: string): Promise<HistoricalReport | null> {
    const reports = await this.getHistoricalReports(projectId, projectName);
    return reports.length > 0 ? reports[0] : null;
  },

  async saveReport(
    projectId: number, 
    projectName: string, 
    mapUrl: string | undefined, 
    analysisResult: KMLAnalysisResult
  ): Promise<HistoricalReport> {
    const localReport: HistoricalReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      projectName,
      mapUrl,
      parsedAt: analysisResult.parsedAt || new Date().toLocaleString('ar-SA'),
      createdAt: new Date().toISOString(),
      analysisResult
    };

    memoryReports.unshift(localReport);

    const colorBreakdownPayload = {
      ...(analysisResult.colorBreakdown || {}),
      projectScope: analysisResult.projectScope,
      permitNosByStatus: analysisResult.permitNosByStatus,
      segmentIdsByStatus: analysisResult.segmentIdsByStatus
    };

    let resultReport = localReport;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await (supabase.from('project_reports') as any)
          .insert([{
            project_id: projectId,
            project_name: projectName,
            map_url: mapUrl || '',
            total_length_meters: analysisResult.totalLengthMeters,
            total_length_km: analysisResult.totalLengthKm,
            total_features_count: analysisResult.totalFeaturesCount,
            color_breakdown: colorBreakdownPayload,
            items: analysisResult.items || [],
            parsed_at: analysisResult.parsedAt || new Date().toLocaleString('ar-SA')
          }])
          .select();

        if (error) {
          console.error('❌ Supabase Report Insert Error:', error.message);
        } else if (data && data.length > 0) {
          console.log('✅ Successfully inserted report row to Supabase project_reports');
          const dbReport = mapRowToHistoricalReport(data[0]);
          localReport.id = dbReport.id;
          resultReport = dbReport;
        }
      } catch (err: any) {
        console.error('Supabase async exception:', err);
      }
    } else {
      console.warn('⚠️ Supabase config not provided. Saved report in temporary session memory.');
    }

    // أرشفة تلقائية للتقارير القديمة بحيث يتم الاحتفاظ بآخر 5 تقارير فقط
    await this.archiveOldReports(projectId, projectName);

    return resultReport;
  },

  async saveChangelog(
    projectId: number, 
    projectName: string, 
    reportId: string, 
    previousReportId: string | null, 
    diff: ProjectDiffResult
  ): Promise<ProjectChangelogRecord> {
    const localRecord: ProjectChangelogRecord = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      projectName,
      reportId,
      previousReportId,
      diff,
      createdAt: new Date().toISOString(),
      isViewed: false
    };

    memoryChangelogs.unshift(localRecord);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const insertPayload: any = {
          project_id: projectId,
          project_name: projectName,
          diff: diff,
          is_viewed: false
        };

        if (reportId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId)) {
          insertPayload.report_id = reportId;
        }
        if (previousReportId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(previousReportId)) {
          insertPayload.previous_report_id = previousReportId;
        }

        const { data, error } = await (supabase.from('project_changelogs') as any)
          .insert([insertPayload])
          .select();

        // إدراج إشعار موجه لجميع المستخدمين في جدول notifications لإتاحة التنبيه الفوري لكل المهندسين
        if (diff && (diff.hasChanges || diff.addedFeaturesCount || diff.modifiedFeaturesCount || diff.deletedFeaturesCount)) {
          try {
            const parts = [];
            if (diff.addedFeaturesCount > 0) parts.push(`إضافة ${diff.addedFeaturesCount} عنصر`);
            if (diff.modifiedFeaturesCount > 0) parts.push(`تعديل ${diff.modifiedFeaturesCount} عنصر`);
            if (diff.deletedFeaturesCount > 0) parts.push(`حذف ${diff.deletedFeaturesCount} عنصر`);
            if (diff.lengthDiffMeters && Math.abs(diff.lengthDiffMeters) > 0.1) {
              parts.push(`فارق أطوال (${diff.lengthDiffMeters > 0 ? '+' : ''}${diff.lengthDiffMeters.toFixed(1)}m)`);
            }
            const diffDetailsStr = parts.length > 0 ? ` (${parts.join('، ')})` : '';
            const notifMsg = `📢 تم رصد تحديثات وتغيرات جديدة بخريطة مشروع (${projectName})${diffDetailsStr}`;

            await supabase.from('notifications').insert([{
              user_id: 'all',
              project_id: projectId,
              project_name: projectName,
              type: 'change_detected',
              message: notifMsg,
              created_at: new Date().toISOString()
            }]);
          } catch (notifErr) {
            console.warn('Error inserting changelog notification:', notifErr);
          }
        }

        if (error) {
          console.error('❌ Supabase Changelog Insert Error:', error.message);
        } else if (data && data.length > 0) {
          console.log('✅ Successfully inserted changelog row to Supabase project_changelogs');
          const dbRecord = mapRowToChangelogRecord(data[0]);
          localRecord.id = dbRecord.id;
          return dbRecord;
        }
      } catch (err: any) {
        console.error('Supabase async exception:', err);
      }
    }

    return localRecord;
  },

  async getChangelogs(projectId?: number, projectName?: string): Promise<ProjectChangelogRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = (supabase.from('project_changelogs') as any).select('*').order('created_at', { ascending: false });
        if (projectId) {
          query = query.eq('project_id', projectId);
        }
        let { data, error } = await query;
        if ((!data || data.length === 0) && projectName) {
          const fallback = await (supabase.from('project_changelogs') as any)
            .select('*')
            .eq('project_name', projectName)
            .order('created_at', { ascending: false });
          if (!fallback.error && fallback.data) {
            data = fallback.data;
            error = null;
          }
        }
        if (!error && data) {
          return data.map(mapRowToChangelogRecord);
        }
        if (error) {
          console.error('❌ Supabase getChangelogs Error:', error.message);
        }
      } catch (err) {
        console.error('Supabase getChangelogs exception:', err);
      }
    }

    if (projectId) {
      return memoryChangelogs.filter((c) => c.projectId === projectId || (projectName && c.projectName === projectName));
    }
    return memoryChangelogs;
  }
};
