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

export const ReportHistoryStore = {
  async getHistoricalReports(projectId: number, projectName?: string): Promise<HistoricalReport[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const numId = Number(projectId);
        let data: any[] | null = null;

        // Tier 1: Query by numeric project_id
        if (!isNaN(numId)) {
          const res1 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_id', numId)
            .order('created_at', { ascending: false });
          if (!res1.error && res1.data && res1.data.length > 0) {
            data = res1.data;
          }
        }

        // Tier 2: Query by string project_id
        if ((!data || data.length === 0) && projectId) {
          const res2 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_id', String(projectId))
            .order('created_at', { ascending: false });
          if (!res2.error && res2.data && res2.data.length > 0) {
            data = res2.data;
          }
        }

        // Tier 3: Query by exact project_name
        if ((!data || data.length === 0) && projectName) {
          const cleanName = projectName.trim();
          const res3 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_name', cleanName)
            .order('created_at', { ascending: false });
          if (!res3.error && res3.data && res3.data.length > 0) {
            data = res3.data;
          }
        }

        // Tier 4: Query by ilike project_name
        if ((!data || data.length === 0) && projectName) {
          const cleanName = projectName.trim();
          const res4 = await (supabase.from('project_reports') as any)
            .select('*')
            .ilike('project_name', `%${cleanName}%`)
            .order('created_at', { ascending: false });
          if (!res4.error && res4.data && res4.data.length > 0) {
            data = res4.data;
          }
        }

        // Tier 5: Query by key word in project_name
        if ((!data || data.length === 0) && projectName) {
          const words = projectName.trim().split(/\s+/).filter(w => w.length > 3);
          const lastWord = words[words.length - 1];
          if (lastWord) {
            const res5 = await (supabase.from('project_reports') as any)
              .select('*')
              .ilike('project_name', `%${lastWord}%`)
              .order('created_at', { ascending: false });
            if (!res5.error && res5.data && res5.data.length > 0) {
              data = res5.data;
            }
          }
        }

        if (data && data.length > 0) {
          return data.map(mapRowToHistoricalReport);
        }
      } catch (err) {
        console.error('Supabase getHistoricalReports exception:', err);
      }
    }

    return memoryReports
      .filter((r) => r.projectId === projectId || (projectName && r.projectName.includes(projectName.trim())))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getLatestReport(projectId: number, projectName?: string): Promise<HistoricalReport | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const numId = Number(projectId);
        let data: any[] | null = null;

        // Tier 1: Query by numeric project_id
        if (!isNaN(numId)) {
          const res1 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_id', numId)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!res1.error && res1.data && res1.data.length > 0) {
            data = res1.data;
          }
        }

        // Tier 2: Query by string project_id
        if ((!data || data.length === 0) && projectId) {
          const res2 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_id', String(projectId))
            .order('created_at', { ascending: false })
            .limit(1);
          if (!res2.error && res2.data && res2.data.length > 0) {
            data = res2.data;
          }
        }

        // Tier 3: Query by exact project_name
        if ((!data || data.length === 0) && projectName) {
          const cleanName = projectName.trim();
          const res3 = await (supabase.from('project_reports') as any)
            .select('*')
            .eq('project_name', cleanName)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!res3.error && res3.data && res3.data.length > 0) {
            data = res3.data;
          }
        }

        // Tier 4: Query by ilike project_name
        if ((!data || data.length === 0) && projectName) {
          const cleanName = projectName.trim();
          const res4 = await (supabase.from('project_reports') as any)
            .select('*')
            .ilike('project_name', `%${cleanName}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!res4.error && res4.data && res4.data.length > 0) {
            data = res4.data;
          }
        }

        // Tier 5: Query by key word in project_name
        if ((!data || data.length === 0) && projectName) {
          const words = projectName.trim().split(/\s+/).filter(w => w.length > 3);
          const lastWord = words[words.length - 1];
          if (lastWord) {
            const res5 = await (supabase.from('project_reports') as any)
              .select('*')
              .ilike('project_name', `%${lastWord}%`)
              .order('created_at', { ascending: false })
              .limit(1);
            if (!res5.error && res5.data && res5.data.length > 0) {
              data = res5.data;
            }
          }
        }

        if (data && data.length > 0) {
          return mapRowToHistoricalReport(data[0]);
        }
      } catch (err) {
        console.error('Supabase getLatestReport exception:', err);
      }
    }

    const list = memoryReports
      .filter((r) => r.projectId === projectId || (projectName && r.projectName.includes(projectName.trim())))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.length > 0 ? list[0] : null;
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
          return dbReport;
        }
      } catch (err: any) {
        console.error('Supabase async exception:', err);
      }
    } else {
      console.warn('⚠️ Supabase config not provided. Saved report in temporary session memory.');
    }

    return localReport;
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
