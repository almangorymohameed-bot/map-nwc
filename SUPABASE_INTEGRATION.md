# دليل ربط طبقات الرقمنة (KMZ) بقاعدة بيانات سوبابيس (Supabase)
## Supabase Database Integration Guide for Digitizing Layers (KMZ/KML)

يوضح هذا الدليل الخطوات الكاملة لتهيئة قاعدة البيانات في منصة **سوبابيس (Supabase)** وإنشاء الجداول وتفعيل سياسات الأمان (RLS)، بالإضافة إلى توفير ملف الخدمة البرمجي للتكامل المباشر مع واجهة البوابة الجغرافية.

---

### 1. مخطط قاعدة البيانات (SQL Schema) لـ Supabase
قم بنسخ الكود البرمجي أدناه ولصقه مباشرة في **SQL Editor** في لوحة تحكم سوبابيس الخاصة بك:

```sql
-- =============================================================================
-- تهيئة الامتدادات الجغرافية (اختياري لتفعيل التحليلات والخرائط المتقدمة)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- 1. جدول طبقات الخريطة الرئيسية (Project Map Layers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.project_layers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,               -- اسم الطبقة (مثال: شبكة المياه الجارية)
    file_name VARCHAR(255),                  -- اسم الملف المرفق الأصلي إن وجد
    color VARCHAR(7) DEFAULT '#3b82f6',      -- اللون الرمزي الست عشري للطبقة على الخريطة
    is_visible BOOLEAN DEFAULT TRUE,         -- حالة الرؤية الافتراضية
    project_id INT,                          -- معرف المشروع الجاري المرتبط من جدول المشاريع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- إضافة فهرس للبحث السريع عن الطبقات المرتبطة بمشروع معين
CREATE INDEX IF NOT EXISTS idx_project_layers_project_id ON public.project_layers(project_id);

-- =============================================================================
-- 2. جدول المعالم والمضلعات الجغرافية (Layer Features)
-- يدعم تخزين الإحداثيات بصيغة JSONB مجهزة للخرائط أو صيغة Geometry الجغرافية
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.project_layer_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    layer_id UUID NOT NULL REFERENCES public.project_layers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,              -- اسم المعلم (مثل: خط ناقل حي الياسمين)
    description TEXT,                        -- تفاصيل أو وصف المعلم
    feature_type VARCHAR(50) NOT NULL,       -- نوع المعلم: 'polygon' | 'polyline' | 'point'
    coordinates_json JSONB NOT NULL,         -- إحداثيات بصيغة [[lat, lng], [lat, lng], ...]
    geom GEOMETRY(Geometry, 4326),           -- العمود الجغرافي للاستعلامات المساحية السريعة
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- فهارس الأداء العالي
CREATE INDEX IF NOT EXISTS idx_layer_features_layer_id ON public.project_layer_features(layer_id);
CREATE INDEX IF NOT EXISTS idx_layer_features_geom ON public.project_layer_features USING GIST (geom);

-- =============================================================================
-- 3. تفعيل سياسات الأمان والحماية (Row Level Security - RLS)
-- =============================================================================
ALTER TABLE public.project_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_layer_features ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بـ قراءة الطبقات والمعالم (للجهات المصرحة والزوار)
CREATE POLICY "Allow public read access to layers" 
ON public.project_layers FOR SELECT USING (true);

CREATE POLICY "Allow public read access to features" 
ON public.project_layer_features FOR SELECT USING (true);

-- السماح للمستخدمين المسجلين فقط (أو المدراء والمهندسين) بالإضافة والتعديل والحذف
CREATE POLICY "Allow insert/update/delete for authenticated users on layers" 
ON public.project_layers FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow insert/update/delete for authenticated users on features" 
ON public.project_layer_features FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- 4. زناد (Trigger) لتحديث عمود المحاذاة الجغرافي تلقائياً عند تغيير الإحداثيات
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_geometry_from_jsonb() 
RETURNS TRIGGER AS $$
DECLARE
    geom_wkt TEXT;
BEGIN
    -- معالجة النقاط الجغرافية
    IF NEW.feature_type = 'point' THEN
        geom_wkt := 'POINT(' || (NEW.coordinates_json->>1)::DOUBLE PRECISION || ' ' || (NEW.coordinates_json->>0)::DOUBLE PRECISION || ')';
        NEW.geom := ST_GeomFromText(geom_wkt, 4326);
        
    -- معالجة الخطوط والمسارات الشبكية
    ELSIF NEW.feature_type = 'polyline' THEN
        SELECT 'LINESTRING(' || string_agg((elem->>1)::TEXT || ' ' || (elem->>0)::TEXT, ', ') || ')'
        INTO geom_wkt
        FROM jsonb_array_elements(NEW.coordinates_json) AS elem;
        NEW.geom := ST_GeomFromText(geom_wkt, 4326);
        
    -- معالجة المضلعات ونطاقات التغطية
    ELSIF NEW.feature_type = 'polygon' THEN
        SELECT 'POLYGON((' || string_agg((elem->>1)::TEXT || ' ' || (elem->>0)::TEXT, ', ') || '))'
        INTO geom_wkt
        FROM jsonb_array_elements(NEW.coordinates_json) AS elem;
        NEW.geom := ST_GeomFromText(geom_wkt, 4326);
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- في حال عدم تطابق الصيغة نكتفي بتخزين إحداثيات JSON دون إسقاط العملية
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_geometry ON public.project_layer_features;
CREATE TRIGGER trigger_sync_geometry
BEFORE INSERT OR UPDATE ON public.project_layer_features
FOR EACH ROW
EXECUTE FUNCTION public.sync_geometry_from_jsonb();
```

---

### 2. الكود البرمجي لربط البوابة الجغرافية بـ Supabase (TypeScript)
لربط البوابة بـ Supabase، نوصي بإنشاء ملف خدمة مخصص مثل `src/services/supabaseService.ts`. فيما يلي نموذج نقي ومتوافق بالكامل للاتصال وسحب وحفظ الطبقات من وإلى سوبابيس:

```typescript
import { createClient } from '@supabase/supabase-js';
import { KMZLayer } from '../types';

// تأكد من استدعاء إعدادات البيئة لـ Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * سحب كافة الطبقات والمعالم الجغرافية من سوبابيس
 */
export async function fetchLayersFromSupabase(): Promise<KMZLayer[]> {
  try {
    // 1. جلب الطبقات الرئيسية مع معلومات الربط بالمشروع
    const { data: layersData, error: layersError } = await supabase
      .from('project_layers')
      .select('*')
      .order('created_at', { ascending: true });

    if (layersError) throw layersError;
    if (!layersData) return [];

    // 2. جلب جميع المعالم والخطوط المرتبطة بها
    const { data: featuresData, error: featuresError } = await supabase
      .from('project_layer_features')
      .select('*');

    if (featuresError) throw featuresError;

    // 3. إعادة صياغة البيانات لتلائم واجهة التطبيق الجغرافي
    return layersData.map((layer: any) => {
      const layerFeatures = (featuresData || [])
        .filter((feat: any) => feat.layer_id === layer.id)
        .map((feat: any) => ({
          name: feat.name,
          description: feat.description || '',
          type: feat.feature_type as 'polygon' | 'polyline' | 'point',
          coordinates: feat.coordinates_json
        }));

      return {
        id: layer.id,
        name: layer.name,
        fileName: layer.file_name || 'ملف سحابي',
        visible: layer.is_visible,
        color: layer.color,
        projectId: layer.project_id || undefined,
        features: layerFeatures
      };
    });
  } catch (err) {
    console.error('Error fetching layers from Supabase:', err);
    throw err;
  }
}

/**
 * حفظ طبقة جديدة أو تعديل طبقة حالية مع معالمها في قاعدة بيانات سوبابيس
 */
export async function saveLayerToSupabase(layer: KMZLayer): Promise<string> {
  try {
    // 1. تحديث أو إدراج الطبقة الرئيسية
    const { data: savedLayer, error: layerError } = await supabase
      .from('project_layers')
      .upsert({
        id: layer.id.startsWith('layer-') ? undefined : layer.id, // توليد UUID جديد إن كانت محلية ومؤقتة
        name: layer.name,
        file_name: layer.fileName,
        color: layer.color,
        is_visible: layer.visible,
        project_id: layer.projectId || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (layerError) throw layerError;
    const layerUuid = savedLayer.id;

    // 2. حذف المعالم السابقة للطبقة قبل كتابة الجديدة لضمان تماسك البيانات
    await supabase
      .from('project_layer_features')
      .delete()
      .eq('layer_id', layerUuid);

    // 3. إدخال المعالم الجغرافية الجديدة
    if (layer.features.length > 0) {
      const featuresToInsert = layer.features.map(feat => ({
        layer_id: layerUuid,
        name: feat.name,
        description: feat.description,
        feature_type: feat.type,
        coordinates_json: feat.coordinates
      }));

      const { error: featError } = await supabase
        .from('project_layer_features')
        .insert(featuresToInsert);

      if (featError) throw featError;
    }

    return layerUuid;
  } catch (err) {
    console.error('Error saving layer to Supabase:', err);
    throw err;
  }
}

/**
 * حذف طبقة بالكامل من سوبابيس
 */
export async function deleteLayerFromSupabase(layerId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('project_layers')
      .delete()
      .eq('id', layerId);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting layer from Supabase:', err);
    throw err;
  }
}
```

---

### 3. مخرجات التكامل والمميزات:
1. **ربط تلقائي بالكامل**: عند تفعيل هذا المخطط واختيار مشروع جاري، سيتم ربط مضلعات أو خطوط الرقمنة مباشرة بجدول المشاريع عبر مفتاح `project_id`.
2. **PostGIS متكامل**: تفعيل امتداد الخرائط يضمن تفعيل الاستعلامات المكانية، مثل جلب كافة طبقات المشاريع التي تقع داخل نطاق حي معين تلقائياً على خادم سوبابيس.
3. **أمان معزز عبر سوبابيس**: سياسات RLS تحمي البيانات وتمنع الزوار غير المسجلين من تخريب أو تعديل طبقات الرسم الجغرافي.
