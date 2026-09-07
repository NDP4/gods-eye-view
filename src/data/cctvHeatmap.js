/**
 * @module cctvHeatmap
 *
 * Grid-based CCTV camera density heatmap layer for God's Eye View.
 *
 * Divides the Indonesia region (-11 to 6 lat, 95 to 141 lon) into ~1-degree
 * cells and renders each cell as a Cesium Rectangle entity with a fill color
 * encoding camera count:
 *   transparent  → 0 cameras
 *   yellow       → 1–10 cameras
 *   orange       → 11–50 cameras
 *   red          → 51+ cameras
 *
 * The layer is toggled independently from the main CCTV layer (cctv.js).
 * All 4624 cameras from config/cctv_sources.indonesia.json are read at init
 * time; no live API fetch is needed.
 */
import * as Cesium from 'cesium';
import cctvSources from '../../config/cctv_sources.indonesia.json';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Layer identifier — registered in src/main.js */
export const LAYER_ID = 'cctv-heatmap';

/** Indonesia bounding box */
const LAT_MIN = -11;
const LAT_MAX = 6;
const LON_MIN = 95;
const LON_MAX = 141;

/** Grid resolution: ~1 degree */
const CELL_DEG = 1;

/** Color stops (Cesium.ColorMembers = [r, g, b, a] 0-1) */
const COLOR_TRANSPARENT = [0, 0, 0, 0];
const COLOR_YELLOW     = [1.0, 0.9, 0.2, 0.55];
const COLOR_ORANGE     = [1.0, 0.5, 0.0, 0.65];
const COLOR_RED        = [0.95, 0.1, 0.1, 0.75];

/** Count thresholds */
const THRESH_ORANGE = 11; // ≥11 → orange
const THRESH_RED    = 51; // ≥51 → red

// ---------------------------------------------------------------------------
// Grid computation
// ---------------------------------------------------------------------------

/**
 * Build a camera-count grid over Indonesia.
 * @returns {Map<string, number>} key "latIdx,lonIdx" → camera count
 */
function buildGrid() {
  const grid = new Map();
  const numLat = Math.ceil((LAT_MAX - LAT_MIN) / CELL_DEG);
  const numLon = Math.ceil((LON_MAX - LON_MIN) / CELL_DEG);

  for (const cam of cctvSources) {
    const lat = cam.lat;
    const lon = cam.lon;
    if (lat == null || lon == null) continue;
    if (lat < LAT_MIN || lat > LAT_MAX || lon < LON_MIN || lon > LON_MAX) continue;

    const latIdx = Math.floor((lat - LAT_MIN) / CELL_DEG);
    const lonIdx = Math.floor((lon - LON_MIN) / CELL_DEG);
    if (latIdx < 0 || latIdx >= numLat || lonIdx < 0 || lonIdx >= numLon) continue;

    const key = `${latIdx},${lonIdx}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }

  return grid;
}

/**
 * Map a camera count to a Cesium ColorMembers array.
 * @param {number} count
 * @returns {[number, number, number, number]}
 */
function countToColor(count) {
  if (count >= THRESH_RED)    return COLOR_RED;
  if (count >= THRESH_ORANGE) return COLOR_ORANGE;
  if (count > 0)             return COLOR_YELLOW;
  return COLOR_TRANSPARENT;
}

// ---------------------------------------------------------------------------
// Layer object
// ---------------------------------------------------------------------------

const cctvHeatmapLayer = {
  id: LAYER_ID,
  enabled: false,

  /** Cesium DataSource holding all heatmap rectangle entities */
  _dataSource: null,
  _entityIds: /** @type {string[]} */ ([]),

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  /**
   * Build the static DataSource once; entities are added immediately so the
   * layer is ready on first enable without a frame delay.
   */
  init() {
    this._dataSource = new Cesium.CustomDataSource(LAYER_ID);

    const grid = buildGrid();
    const numLat = Math.ceil((LAT_MAX - LAT_MIN) / CELL_DEG);
    const numLon = Math.ceil((LON_MAX - LON_MIN) / CELL_DEG);

    for (let latIdx = 0; latIdx < numLat; latIdx++) {
      for (let lonIdx = 0; lonIdx < numLon; lonIdx++) {
        const count = grid.get(`${latIdx},${lonIdx}`) ?? 0;
        const color = countToColor(count);

        // Skip fully transparent cells — nothing to render
        if (color === COLOR_TRANSPARENT) continue;

        const south = LAT_MIN + latIdx * CELL_DEG;
        const north = Math.min(south + CELL_DEG, LAT_MAX);
        const west  = LON_MIN + lonIdx * CELL_DEG;
        const east  = Math.min(west + CELL_DEG, LON_MAX);

        const rectId = `${LAYER_ID}-${latIdx}-${lonIdx}`;
        const rect = Cesium.Rectangle.fromDegrees(west, south, east, north);

        const entity = this._dataSource.entities.add({
          id: rectId,
          rectangle: {
            coordinates: rect,
            height: 100,      // lift slightly above terrain to avoid z-fighting
            extrudedHeight: 200,
            material: Cesium.Color.fromBytes(
              Math.round(color[0] * 255),
              Math.round(color[1] * 255),
              Math.round(color[2] * 255),
              Math.round(color[3] * 255),
            ),
            fill: true,
            outline: false,
            closeTop: true,
            closeBottom: true,
          },
          properties: {
            cameraCount: count,
            latIdx,
            lonIdx,
          },
        });

        this._entityIds.push(rectId);
      }
    }
  },

  /**
   * Add the DataSource to the viewer data source collection.
   * @param {import('@cesium/engine').Viewer} viewer
   */
  enable(viewer) {
    if (!this._dataSource) return;
    if (this.enabled) return;
    viewer.dataSources.add(this._dataSource);
    this.enabled = true;
  },

  /**
   * Remove the DataSource from the viewer data source collection.
   * @param {import('@cesium/engine').Viewer} viewer
   */
  disable(viewer) {
    if (!this._dataSource || !this.enabled) return;
    viewer.dataSources.remove(this._dataSource, false);
    this.enabled = false;
  },

  /**
   * No-op: all geometry is static (computed at init time).
   */
  update() {},

  /**
   * Clean up the DataSource and release all entity references.
   * @param {import('@cesium/engine').Viewer} viewer
   */
  destroy(viewer) {
    if (this._dataSource) {
      if (this.enabled) viewer.dataSources.remove(this._dataSource, false);
      this._dataSource.entities.removeAll();
      this._dataSource = null;
    }
    this._entityIds = [];
    this.enabled = false;
  },
};

export default cctvHeatmapLayer;
