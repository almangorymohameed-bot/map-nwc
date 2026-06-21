import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// If credentials are empty during development, log a warning without crashing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'من فضلك قم بإعداد VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في إعدادات البيئة لربط الموقع بسوبابيس بقاعدة بياناتك.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
