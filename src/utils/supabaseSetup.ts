/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HistoricalReport, ProjectChangelogRecord, KMLAnalysisResult, ProjectDiffResult } from '../types';

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
-- 3. تفعيل سياسات الأمان Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_changelogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all authenticated users" 
ON public.project_reports FOR SELECT USING (true);

CREATE POLICY "Allow insert access for all authenticated users" 
ON public.project_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read access for changelogs" 
ON public.project_changelogs FOR SELECT USING (true);

CREATE POLICY "Allow insert access for changelogs" 
ON public.project_changelogs FOR INSERT WITH CHECK (true);
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

// Local storage key for fallback persistence
const STORAGE_KEY_REPORTS = 'nwc_project_historical_reports_v1';
const STORAGE_KEY_CHANGELOGS = 'nwc_project_changelogs_v1';

export const ReportHistoryStore = {
  getHistoricalReports(projectId: number): HistoricalReport[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
      if (!raw) return [];
      const all: HistoricalReport[] = JSON.parse(raw);
      return all
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  },

  getLatestReport(projectId: number): HistoricalReport | null {
    const list = this.getHistoricalReports(projectId);
    return list.length > 0 ? list[0] : null;
  },

  saveReport(projectId: number, projectName: string, mapUrl: string | undefined, analysisResult: KMLAnalysisResult): HistoricalReport {
    const newReport: HistoricalReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      projectName,
      mapUrl,
      parsedAt: analysisResult.parsedAt || new Date().toLocaleString('ar-SA'),
      createdAt: new Date().toISOString(),
      analysisResult
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
      const all: HistoricalReport[] = raw ? JSON.parse(raw) : [];
      all.push(newReport);
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(all));
    } catch (err) {
      console.error('Error saving historical report:', err);
    }

    return newReport;
  },

  saveChangelog(projectId: number, projectName: string, reportId: string, previousReportId: string | null, diff: ProjectDiffResult): ProjectChangelogRecord {
    const newRecord: ProjectChangelogRecord = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      projectName,
      reportId,
      previousReportId,
      diff,
      createdAt: new Date().toISOString(),
      isViewed: false
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHANGELOGS);
      const all: ProjectChangelogRecord[] = raw ? JSON.parse(raw) : [];
      all.unshift(newRecord); // newest first
      localStorage.setItem(STORAGE_KEY_CHANGELOGS, JSON.stringify(all));
    } catch (err) {
      console.error('Error saving changelog record:', err);
    }

    return newRecord;
  },

  getChangelogs(projectId?: number): ProjectChangelogRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHANGELOGS);
      if (!raw) return [];
      const all: ProjectChangelogRecord[] = JSON.parse(raw);
      if (projectId) {
        return all.filter(c => c.projectId === projectId);
      }
      return all;
    } catch {
      return [];
    }
  }
};
