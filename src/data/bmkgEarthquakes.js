import * as Cesium from 'cesium';
import {
  clearOverlaySource,
  setOverlayEntries,
  setOverlaySourceVisible,
} from '../overlays/worldOverlay.js';

/**
 * BMKG Indonesia earthquake data — last 15 felt events.
 * CORS: data.bmkg.go.id supports access-control-allow-origin: *
 * No API key required. Completely free.
 *
 * Endpoints:
 *   autogempa.json          → latest significant earthquake
 *   gempadirasakan.json     → last 15 felt earthquakes (M2.5+, shaking reported)
 *   gempaterkini.json       → recent M5.0+ earthquakes
 */

const API_GEMPADIRASAKAN = 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json';
const API_GEMPATERKINI   = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json';

export const BMKG_EARTHQUAKE_OVERLAY_SOURCE_ID = 'bmkg-earthquakes';
export const BMKG_EARTHQUAKE_OVERLAY_COHORT_LIMIT = 64;
export const BMKG_EARTHQUAKE_OVERLAY_COLLISION_CAPACITY = 32;

const DEFAULT_OVERLAY_HOST = Object.freeze({
  setEntries:  setOverlayEntries,
  setVisible:  setOverlaySourceVisible,
  clearSource: clearOverlaySource,
});

/**
 * Color by magnitude (MMI scale approximation):
 *   M < 3.0  → cyan   (light shaking)
 *   M 3.0-4.9 → yellow (moderate)
 *   M 5.0-5.9 → orange (strong)
 *   M >= 6.0  → red    (damaging)
 */
function magnitudeColor(mag) {
  if (mag >= 6.0) return Cesium.Color.RED;
  if (mag >= 5.0) return Cesium.Color.ORANGE;
  if (mag >= 3.0) return Cesium.Color.YELLOW;
  return Cesium.Color.CYAN;
}

/**
 * Color by depth:
 *   < 70 km   → shallow (bright)
 *   70-300 km → intermediate
 *   > 300 km  → deep (dim)
 */
function depthShade(color, depthKm) {
  if (depthKm > 300) return color.withAlpha(0.25);
  if (depthKm > 70)  return color.withAlpha(0.35);
  return color.withAlpha(0.45);
}

/** Build an ambient overlay label entry. */
export function createBmkgEarthquakeOverlayEntry({ id, position, magnitude, accent }) {
  const mag = Number(magnitude);
  return {
    id: String(id),
    position,
    variant: 'label',
    title: `M${mag.toFixed(1)}`,
    accent,
    priority: Math.round(mag * 1000),
    collisionGroup: 'ambient-label',
    paintLane:   'ambient-label',
    interactive:  false,
    edgeFade:     'keyhole',
    horizonCull:  true,
    terrainOcclusion: false,
    gapPx: 12,
    verticalOnly: true,
    placement:    'above',
  };
}

/** Keep largest events. */
export function selectBmkgEarthquakeCohort(entries, limit = BMKG_EARTHQUAKE_OVERLAY_COHORT_LIMIT) {
  const cap = Math.max(0, Math.min(BMKG_EARTHQUAKE_OVERLAY_COHORT_LIMIT, Math.floor(Number(limit) || 0)));
  if (!Array.isArray(entries) || cap === 0) return [];
  return entries.slice().sort((a, b) =>
    b.priority - a.priority || String(a.id).localeCompare(String(b.id))
  ).slice(0, cap);
}

/**
 * Parse BMKG JSON into a normalised array.
 * Handles both "gempadirasakan" and "gempaterkini" formats.
 */
function parseBmkgQuakes(data) {
  const raw = data?.Infogempa?.gempa;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((q, i) => {
    // Parse lat/lon from "8.34 LS" / "121.30 BT"
    const lintangRaw = String(q.Lintang || '0').trim();
    const bujurRaw   = String(q.Bujur   || '0').trim();
    const latSign    = lintangRaw.includes('LS') || lintangRaw.includes('South') ? -1 : 1;
    const lonSign    = bujurRaw.includes('BB')  || bujurRaw.includes('East')   ?  1 : 1;
    const lat        = latSign * parseFloat(lintangRaw.replace(/[^\d.]/g, ''));
    const lon        = lonSign * parseFloat(bujurRaw.replace(/[^\d.]/g, ''));

    const depthRaw   = String(q.Kedalaman || '0').replace(/[^\d.]/g, '');
    const depth      = parseFloat(depthRaw) || 0;
    const magnitude  = parseFloat(q.Magnitude) || 0;
    const wilayah    = String(q.Wilayah || '');
    const dirasakan  = String(q.Dirasakan || '');
    const tanggal    = String(q.Tanggal || '');
    const jam        = String(q.Jam || '');
    const shakemap   = q.Shakemap
      ? `https://data.bmkg.go.id/DataMKG/TEWS/${q.Shakemap}`
      : null;

    // Convert "07 Sep 2026" + "19:50:39 WIB" → epoch ms
    let timeMs = null;
    try {
      const parts = `${tanggal} ${jam}`.replace(/WIB/gi, '+0700').trim();
      timeMs = new Date(parts).getTime();
    } catch (_) {}

    return {
      id:        `bmkg-${i}`,
      magnitude,
      depth,
      lat:       isFinite(lat) ? lat : null,
      lon:       isFinite(lon) ? lon : null,
      wilayah,
      dirasakan,
      tanggal,
      jam,
      timeMs,
      shakemap,
    };
  }).filter(q => q.lat != null && q.lon != null && q.magnitude > 0);
}

export function createBmkgEarthquakesLayer({ overlayHost = DEFAULT_OVERLAY_HOST } = {}) {
  let _dataSource  = null;
  let _count       = 0;
  let _lastUpdate  = null;
  let _lastError   = null;
  let _enabled     = false;

  const layer = {
    id:            'bmkg-earthquakes',
    name:          'Gempa Indonesia (BMKG)',
    icon:          '🌋',
    source:        'BMKG',
    updateInterval: 60000,

    init(viewer) {
      _dataSource = new Cesium.CustomDataSource('bmkg-earthquakes');
      _dataSource.show = false;
      viewer.dataSources.add(_dataSource);
      _count      = 0;
      _lastUpdate = null;
      _lastError  = null;
      _enabled    = false;
      overlayHost.setVisible(BMKG_EARTHQUAKE_OVERLAY_SOURCE_ID, false);
      console.log('[Data:BMKG-Earthquakes] Initialized');
    },

    enable(viewer) {
      _enabled = true;
      if (_dataSource) _dataSource.show = true;
      overlayHost.setVisible(BMKG_EARTHQUAKE_OVERLAY_SOURCE_ID, true);
    },

    disable(viewer) {
      _enabled = false;
      if (_dataSource) _dataSource.show = false;
      overlayHost.clearSource(BMKG_EARTHQUAKE_OVERLAY_SOURCE_ID);
      overlayHost.setVisible(BMKG_EARTHQUAKE_OVERLAY_SOURCE_ID, false);
    },

    async update(viewer) {
      try {
        // Fetch both endpoints in parallel
        const [feltRes, recentRes] = await Promise.allSettled([
          fetch(API_GEMPADIRAKAN),
          fetch(API_GEMPATERKINI),
        ]);

        const feltQuakes = feltRes.status === 'fulfilled' && feltRes.value.ok
          ? parseBmkgQuakes(await feltRes.value.json())
          : [];

        const recentQuakes = recentRes.status === 'fulfilled' && recentRes.value.ok
          ? parseBmkgQuakes(await recentRes.value.json())
          : [];

        // Merge, dedupe by lat/lon/magnitude (within 0.01°)
        const seen = new Map();
        const allQuakes = [...feltQuakes, ...recentQuakes].filter(q => {
          const key = `${q.magnitude.toFixed(1)}_${q.lat.toFixed(2)}_${q.lon.toFixed(2)}`;
          if (seen.has(key)) return false;
          seen.set(key, true);
          return true;
        });

        _dataSource.entities.removeAll();
        let count = 0;
        const overlayEntries = [];

        for (const q of allQuakes) {
          const baseRadius = Math.pow(2, q.magnitude) * 1500;
          const color      = magnitudeColor(q.magnitude);
          const alphaColor = depthShade(color, q.depth);
          const isStrong   = q.magnitude >= 5.0;
          const fillAlpha  = isStrong ? 0.4 : 0.3;
          const outlineAlpha = isStrong ? 1.0 : 0.8;

          const position = Cesium.Cartesian3.fromDegrees(q.lon, q.lat);

          const entity = _dataSource.entities.add({
            id:       `bmkg-earthquake:${q.id}`,
            position,
            ellipse: {
              semiMajorAxis: baseRadius,
              semiMinorAxis: baseRadius,
              material: new Cesium.ColorMaterialProperty(alphaColor),
              outline:    true,
              outlineColor: color.withAlpha(outlineAlpha),
              outlineWidth: isStrong ? 3 : 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            properties: {
              bmkgId:      q.id,
              magnitude:   q.magnitude,
              depth:       q.depth,
              wilayah:     q.wilayah,
              dirasakan:   q.dirasakan,
              tanggal:     q.tanggal,
              jam:         q.jam,
              timeMs:      q.timeMs,
              shakemap:    q.shakemap,
            },
          });

          // Description popup
          entity.description = new Cesium.ConstantProperty(
            `<table style="width:100%;font-family:monospace;font-size:13px">
            <tr><td><b>Magnitudo</b></td><td><b>M${q.magnitude.toFixed(1)}</b></td></tr>
            <tr><td>Kedalaman</td><td>${q.depth} km</td></tr>
            <tr><td>Lokasi</td><td>${q.wilayah}</td></tr>
            <tr><td>Dirasakan</td><td>${q.dirasakan || '-'}</td></tr>
            <tr><td>Waktu</td><td>${q.tanggal} ${q.jam}</td></tr>
            ${q.shakemap ? `<tr><td>Shakemap</td><td><a href="${q.shakemap}" target="_blank">Lihat Shakemap</a></td></tr>` : ''}
            </table>`
          );

          overlayEntries.push(createBmkgEarthquakeOverlayEntry({
            id:        q.id,
            position,
            magnitude: q.magnitude,
            accent:    color.toCssColorString(),
          }));

          count++;
        }

        if (_enabled) {
          overlayHost.setEntries(
            BMKG_EARTHQUAKE_OVERLAY_SOURCE_ID,
            selectBmkgEarthquakeCohort(overlayEntries),
            {
              cohortLimit:     BMKG_EARTHQUAKE_OVERLAY_COHORT_LIMIT,
              collisionCapacity: BMKG_EARTHQUAKE_OVERLAY_COLLISION_CAPACITY,
              moving: false,
            },
          );
        }

        _count      = count;
        _lastUpdate = Date.now();
        _lastError  = null;
        console.log(`[Data:BMKG-Earthquakes] Updated: ${_count} events`);
        return true;

      } catch (e) {
        console.warn('[Data:BMKG-Earthquakes] Fetch error:', e);
        _lastError = 'BMKG network error';
        return false;
      }
    },

    destroy(viewer) {
      _enabled = false;
      overlayHost.clearSource(BMKG_EARTHQUAKE_OVERLAY_SOURCE_ID);
      overlayHost.setVisible(BMKG_EARTHQUAKE_OVERLAY_SOURCE_ID, false);
      if (_dataSource) {
        viewer.dataSources.remove(_dataSource, true);
        _dataSource = null;
      }
      _count      = 0;
      _lastUpdate = null;
      _lastError  = null;
    },

    getStats() {
      return { count: _count, lastUpdate: _lastUpdate, error: _lastError };
    },
  };

  return layer;
}

const bmkgEarthquakesLayer = createBmkgEarthquakesLayer();
export default bmkgEarthquakesLayer;
