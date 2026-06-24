-- -----------------------------------------------------------------------------
-- SQL Database Schema for Storing Project Map Layers (KMZ / KML Polygons & Features)
-- Compatible with PostgreSQL (PostGIS enabled) or standard Relational Databases
-- -----------------------------------------------------------------------------

-- Enable PostGIS extension for spatial queries (optional but highly recommended for high performance GIS)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Table to store the main Layers (e.g. uploaded KMZ/KML files)
CREATE TABLE IF NOT EXISTS project_layers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,            -- Name of the layer (e.g. "مستقبلي", "شبكة مياه الرياض")
    file_name VARCHAR(255),               -- Original name of the uploaded KMZ/KML file
    color VARCHAR(7) DEFAULT '#3b82f6',   -- Primary HEX color representing the layer on the map
    is_visible BOOLEAN DEFAULT TRUE,      -- Default visibility toggle state
    project_id INT,                       -- ID of the linked project (from the projects table) if applicable
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table to store individual features (Polygons, Polylines, Points) inside each layer
-- This schema supports both standard JSON data storage (easy parsing) and PostGIS spatial columns
CREATE TABLE IF NOT EXISTS project_layer_features (
    id SERIAL PRIMARY KEY,
    layer_id INT NOT NULL REFERENCES project_layers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,           -- Feature name (e.g. "نطاق حي الياسمين", "خط ناقل 1000ملم")
    description TEXT,                     -- Description or metadata embedded in the placemark
    feature_type VARCHAR(50) NOT NULL,    -- 'polygon' | 'polyline' | 'point'
    
    -- Option A: Standard JSON coordinates representation (Great for client-side rendering directly)
    -- Format: [[lat, lng], [lat, lng], ...]
    coordinates_json JSONB NOT NULL,
    
    -- Option B: PostGIS Spatial Geometry representation (Highly optimized for spatial indices & intersections)
    geom GEOMETRY,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on foreign key for high performance joining
CREATE INDEX IF NOT EXISTS idx_layer_features_layer_id ON project_layer_features(layer_id);

-- Create a spatial index on the geometry column for extremely fast search queries
CREATE INDEX IF NOT EXISTS idx_layer_features_geom ON project_layer_features USING GIST (geom);

-- -----------------------------------------------------------------------------
-- Example Insert Query (Standard JSON-based approach):
-- -----------------------------------------------------------------------------
-- INSERT INTO project_layers (name, file_name, color) 
-- VALUES ('المشاريع الجاري تنفيذها', 'ongoing_projects_layer.kmz', '#ff9900') 
-- RETURNING id;
--
-- INSERT INTO project_layer_features (layer_id, name, description, feature_type, coordinates_json) 
-- VALUES (1, 'خط مياه حي الملقا الرئيسي', 'خط ناقل رئيسي قطر 600 ملم مياه شرب', 'polyline', '[[24.8105, 46.6124], [24.8150, 46.6200]]');

-- -----------------------------------------------------------------------------
-- Helper function to automatically populate PostGIS Geometry column from coordinates_json
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_geometry_from_json() 
RETURNS TRIGGER AS $$
DECLARE
    coords TEXT;
    geom_wkt TEXT;
BEGIN
    -- If geometries are points
    IF NEW.feature_type = 'point' THEN
        -- JSON coordinate format: [lat, lng]
        geom_wkt := 'POINT(' || (NEW.coordinates_json->>1)::DOUBLE PRECISION || ' ' || (NEW.coordinates_json->>0)::DOUBLE PRECISION || ')';
        NEW.geom := ST_GeomFromText(geom_wkt, 4326);
        
    -- If geometries are polylines
    ELSIF NEW.feature_type = 'polyline' THEN
        -- JSON coordinate format: [[lat, lng], [lat, lng]]
        -- Convert JSON array to WKT LINESTRING(lng lat, lng lat, ...)
        SELECT 'LINESTRING(' || string_agg((elem->>1)::TEXT || ' ' || (elem->>0)::TEXT, ', ') || ')'
        INTO geom_wkt
        FROM jsonb_array_elements(NEW.coordinates_json) AS elem;
        
        NEW.geom := ST_GeomFromText(geom_wkt, 4326);
        
    -- If geometries are polygons
    ELSIF NEW.feature_type = 'polygon' THEN
        -- JSON coordinate format: [[lat, lng], [lat, lng], [lat, lng]]
        -- Convert JSON array to WKT POLYGON((lng lat, lng lat, ..., lng lat))
        -- Polygons in PostGIS must end at the starting coordinate to be closed
        SELECT 'POLYGON((' || string_agg((elem->>1)::TEXT || ' ' || (elem->>0)::TEXT, ', ') || '))'
        INTO geom_wkt
        FROM jsonb_array_elements(NEW.coordinates_json) AS elem;
        
        -- Try to close polygon if starting and ending coords differ
        -- Standard KML export usually has the first and last coords matching
        NEW.geom := ST_GeomFromText(geom_wkt, 4326);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically sync geometry prior to insertion or updating
DROP TRIGGER IF EXISTS trigger_update_geom_from_json ON project_layer_features;
CREATE TRIGGER trigger_update_geom_from_json
BEFORE INSERT OR UPDATE ON project_layer_features
FOR EACH ROW
EXECUTE FUNCTION update_geometry_from_json();
