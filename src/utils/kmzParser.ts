import JSZip from 'jszip';
import { KMZFeature } from '../types';

/**
 * Clean and parse coordinates string from KML format: "lng,lat,alt lng,lat,alt ..."
 * Returns array of [lat, lng] coordinates
 */
function parseKMLCoordinates(coordsStr: string): [number, number][] {
  const points: [number, number][] = [];
  const coordsArray = coordsStr.trim().split(/\s+/);

  for (const coord of coordsArray) {
    if (!coord) continue;
    const parts = coord.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push([lat, lng]);
      }
    }
  }
  return points;
}

/**
 * Extracts KMZ/KML layers and features
 */
export async function parseKMZFile(file: File): Promise<{ name: string; features: KMZFeature[] }> {
  let kmlText = '';
  const fileName = file.name;

  if (fileName.toLowerCase().endsWith('.kmz')) {
    // It's a zip file, extract doc.kml
    const zip = await JSZip.loadAsync(file);
    let kmlFile = zip.file('doc.kml');
    
    if (!kmlFile) {
      // Find any file ending with .kml inside zip
      const kmlFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.kml'));
      if (kmlFiles.length > 0) {
        kmlFile = zip.file(kmlFiles[0]);
      }
    }

    if (!kmlFile) {
      throw new Error('لم يتم العثور على ملف KML صالح داخل حزمة KMZ المضغوطة.');
    }
    kmlText = await kmlFile.async('text');
  } else {
    // It is raw KML text file
    kmlText = await file.text();
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
  const features: KMZFeature[] = [];

  const placemarks = xmlDoc.getElementsByTagName('Placemark');
  
  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName('name')[0];
    const descEl = pm.getElementsByTagName('description')[0];
    
    const name = nameEl ? nameEl.textContent || `معلم ${i + 1}` : `معلم ${i + 1}`;
    const description = descEl ? descEl.textContent || '' : '';

    // Check for Polygon
    const polygonEl = pm.getElementsByTagName('Polygon')[0];
    if (polygonEl) {
      const coordEl = polygonEl.getElementsByTagName('coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const coords = parseKMLCoordinates(coordEl.textContent);
        if (coords.length > 0) {
          features.push({
            type: 'polygon',
            name,
            description,
            coordinates: coords
          });
          continue;
        }
      }
    }

    // Check for LineString
    const lineEl = pm.getElementsByTagName('LineString')[0];
    if (lineEl) {
      const coordEl = lineEl.getElementsByTagName('coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const coords = parseKMLCoordinates(coordEl.textContent);
        if (coords.length > 0) {
          features.push({
            type: 'polyline',
            name,
            description,
            coordinates: coords
          });
          continue;
        }
      }
    }

    // Check for Point
    const pointEl = pm.getElementsByTagName('Point')[0];
    if (pointEl) {
      const coordEl = pointEl.getElementsByTagName('coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const coords = parseKMLCoordinates(coordEl.textContent);
        if (coords.length > 0) {
          features.push({
            type: 'point',
            name,
            description,
            coordinates: coords
          });
        }
      }
    }
  }

  // Fallback to Folder or Document name if available
  let layerName = fileName.replace(/\.[^/.]+$/, ""); // Strip extension
  const docNameEl = xmlDoc.getElementsByTagName('Document')[0]?.getElementsByTagName('name')[0];
  if (docNameEl && docNameEl.textContent) {
    layerName = docNameEl.textContent.trim();
  }

  return {
    name: layerName,
    features
  };
}
