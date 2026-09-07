/**
 * @file i18n.js — God's Eye View Internationalization (EN / ID)
 *
 * Architecture:
 * - Dictionaries: { locale: { key: 'text' } }
 * - `data-i18n="key"` on HTML elements → textContent replaced on locale change
 * - `data-i18n-aria="key"` → aria-label replaced
 * - `data-i18n-title="key"` → title replaced
 * - `data-i18n-placeholder="key"` → placeholder replaced
 * - Locale persisted in localStorage key `gev_locale`
 * - Auto-detect: navigator.language → match, default 'en'
 *
 * Usage:
 *   import { setLocale, getLocale, t } from './i18n.js';
 *   setLocale('id');          // switch to Indonesian
 *   setLocale('en');          // switch to English
 *   t('data_layers');         // get translation string
 */

const STORAGE_KEY = 'gev_locale';

export const SUPPORTED_LOCALES = ['en', 'id'];
export const DEFAULT_LOCALE = 'en';

/** @type {Record<string, Record<string, string>>} */
const dictionaries = {
  en: {
    // ── Page meta ──────────────────────────────────────
    'app_title': "God's Eye View",
    'app_subtitle': 'NO PLACE LEFT BEHIND',
    'active_style': 'ACTIVE STYLE',
    'loading_live_data': 'LOADING LIVE DATA',
    'globe_actions': 'Globe actions',
    'copy_share_link': 'Copy share link',
    'reset_globe_view': 'Reset camera and return to full globe view',
    'clear_selected_layers': 'Turn off all selected data layers',

    // ── Panels ─────────────────────────────────────────
    'data_layers': 'DATA LAYERS',
    'scenes': 'SCENES',
    'display': 'DISPLAY',
    'cctv': 'CCTV',
    'context': 'CONTEXT',
    'radio': 'RADIO',
    'location': 'LOCATION',

    // ── Data layers ─────────────────────────────────────
    'layer_flights': 'Flights',
    'layer_military_flights': 'Military Flights',
    'layer_satellites': 'Satellites',
    'layer_earthquakes': 'Earthquakes (USGS)',
    'layer_bmkg_earthquakes': 'Earthquakes (BMKG)',
    'layer_cctv_heatmap': 'CCTV Heatmap',
    'layer_traffic': 'Traffic',
    'layer_ais': 'AIS Live Vessels',
    'layer_rocket_launches': 'Rocket Launches',
    'layer_military_installations': 'Military Installations',
    'layer_bikeshare': 'Bike Share',
    'layer_radio': 'Radio Stations',
    'layer_cctv': 'CCTV Cameras',
    'layer_military_awareness': 'Military Awareness',
    'layer_fires': 'Fire Hotspots',

    // ── Sync chips ──────────────────────────────────────
    'syncing_road_network': 'syncing road network',
    'loading_frames': 'loading frames',

    // ── Cockpit HUD ──────────────────────────────────────
    'first_person': 'FIRST PERSON',
    'optical_plane': 'OPTICAL PLANE',
    'visor_lock_active': 'VISOR LOCK · ACTIVE',
    'ground_speed': 'GROUND SPEED',
    'altitude': 'ALTITUDE',
    'kts': 'KTS',
    'ft': 'FT',
    'contact': 'CONTACT',
    'context_only': 'CONTEXT ONLY',
    'aircraft': 'AIRCRAFT',
    'normal': 'NORMAL',
    'no_available_example': 'NO AVAILABLE EXAMPLE',
    'weather_off': 'OFF',
    'weather_on': 'ON',
    'estimated_flight_plan': 'ESTIMATED FLIGHT PLAN',
    'route_data_unavailable': 'ROUTE DATA UNAVAILABLE',
    'route_invalid': 'INVALID DESTINATION',
    'from': 'FROM',
    'to': 'TO',
    'unknown': 'UNKNOWN',
    'acquiring_regional_news': 'ACQUIRING REGIONAL NEWS',
    'cycle_off': 'CYCLE OFF',
    'dest': 'DEST',
    'militar': 'MILITARY',
    'commercial': 'COMMERCIAL',
    'feed_aligned': 'ALIGNED',
    'feed_searching': 'SEARCHING',
    'feed_locked': 'LOCKED',
    'prev': 'PREV',
    'next': 'NEXT',
    'current': 'CURRENT',

    // ── Cockpit vision styles ────────────────────────────
    'vision_optical': 'OPTICAL',
    'vision_night': 'NIGHT VISION',
    'vision_thermal': 'THERMAL',
    'vision_radar': 'RADAR',

    // ── Buttons ─────────────────────────────────────────
    'enable_cockpit_weather': 'Enable cockpit weather effects',
    'collapse_contact_panel': 'Collapse Contact panel',
    'expand_contact_panel': 'Expand Contact panel',
    'enable_cockpit_vision': 'Enable cockpit vision',

    // ── Toast ────────────────────────────────────────────
    'share_link_copied': 'Share link copied to clipboard',
    'error_occurred': 'An error occurred',
    'layer_enabled': 'Layer enabled',
    'layer_disabled': 'Layer disabled',

    // ── Alert levels ─────────────────────────────────────
    'alert_normal': 'NORMAL',
    'alert_warning': 'WARNING',
    'alert_critical': 'CRITICAL',

    // ── Misc ────────────────────────────────────────────
    'open_sky': 'OpenSky',
    'adsb_lol': 'adsb.lol',
    'ais_stream': 'AISStream',
    'openstreetmap': 'OpenStreetMap',
    'openai': 'OpenAI',
    'cesium': 'Cesium',
  },

  id: {
    // ── Page meta ──────────────────────────────────────
    'app_title': "God's Eye View",
    'app_subtitle': 'TIDAK ADA YANG TERTINGGAL',
    'active_style': 'GAYA AKTIF',
    'loading_live_data': 'MEMUAT DATA LANGSUNG',
    'globe_actions': 'Aksi globe',
    'copy_share_link': 'Salin tautan',
    'reset_globe_view': 'Reset tampilan globe',
    'clear_selected_layers': 'Matikan semua layer',
    'collapse_panel': 'Tutup panel',

    // ── Panels ─────────────────────────────────────────
    'data_layers': 'LAYER DATA',
    'scenes': 'ADEGAN',
    'display': 'TAMPILAN',
    'cctv': 'CCTV',
    'context': 'KONTEKS',
    'radio': 'RADIO',
    'location': 'LOKASI',

    // ── Data layers ─────────────────────────────────────
    'layer_flights': 'Penerbangan',
    'layer_military_flights': 'Penerbangan Militer',
    'layer_satellites': 'Satelit',
    'layer_earthquakes': 'Gempa (USGS)',
    'layer_bmkg_earthquakes': 'Gempa (BMKG)',
    'layer_cctv_heatmap': 'Peta Panas CCTV',
    'layer_traffic': 'Lalu Lintas',
    'layer_ais': 'Kapal AIS Langsung',
    'layer_rocket_launches': 'Peluncur Roket',
    'layer_military_installations': 'Instalasi Militer',
    'layer_bikeshare': 'Sepeda Sewa',
    'layer_radio': 'Stasiun Radio',
    'layer_cctv': 'Kamera CCTV',
    'layer_military_awareness': 'Kesadaran Militer',
    'layer_fires': 'Titik Panas Kebakaran',

    // ── Sync chips ──────────────────────────────────────
    'syncing_road_network': 'menyinkronkan jaringan jalan',
    'loading_frames': 'memuat bingkai',

    // ── Cockpit HUD ──────────────────────────────────────
    'first_person': 'ORANG PERTAMA',
    'optical_plane': 'BIDANG OPTIK',
    'visor_lock_active': 'PENGUNCI VISOR · AKTIF',
    'ground_speed': 'KECEPATAN TANAH',
    'altitude': 'KETINGGIAN',
    'kts': 'KTS',
    'ft': 'KAKI',
    'contact': 'KONTAK',
    'context_only': 'HANYA KONTEKS',
    'aircraft': 'PESAWAT',
    'normal': 'NORMAL',
    'no_available_example': 'TIDAK ADA CONTOH TERSEDIA',
    'weather_off': 'MATI',
    'weather_on': 'HIDUP',
    'estimated_flight_plan': 'RENCANA PENERBANGAN ESTIMASI',
    'route_data_unavailable': 'DATA RUTE TIDAK TERSEDIA',
    'route_invalid': 'TUJUAN TIDAK VALID',
    'from': 'DARI',
    'to': 'KE',
    'unknown': 'TIDAK DIKETAHUI',
    'acquiring_regional_news': 'MENDAPATKAN BERITA REGIONAL',
    'cycle_off': 'MATIKAN SIRKULASI',
    'dest': 'TUJUAN',
    'militar': 'MILITER',
    'commercial': 'KOMERSIAL',
    'feed_aligned': 'SEJAJAR',
    'feed_searching': 'MENCARI',
    'feed_locked': 'TERKUNCI',
    'prev': 'SEBELUM',
    'next': 'BERIKUTNYA',
    'current': 'SAAT INI',

    // ── Cockpit vision styles ────────────────────────────
    'vision_optical': 'OPTIK',
    'vision_night': 'PENGLIHATAN MALAM',
    'vision_thermal': 'INFRA MERAH',
    'vision_radar': 'RADAR',

    // ── Buttons ─────────────────────────────────────────
    'enable_cockpit_weather': 'Aktifkan efek cuaca kokpit',
    'collapse_contact_panel': 'Tutup panel Kontak',
    'expand_contact_panel': 'Buka panel Kontak',
    'enable_cockpit_vision': 'Aktifkan penglihatan kokpit',

    // ── Toast ────────────────────────────────────────────
    'share_link_copied': 'Tautan disalin ke clipboard',
    'error_occurred': 'Terjadi kesalahan',
    'layer_enabled': 'Layer diaktifkan',
    'layer_disabled': 'Layer dinonaktifkan',

    // ── Alert levels ─────────────────────────────────────
    'alert_normal': 'NORMAL',
    'alert_warning': 'PERINGATAN',
    'alert_critical': 'KRITIS',

    // ── Misc ────────────────────────────────────────────
    'open_sky': 'OpenSky',
    'adsb_lol': 'adsb.lol',
    'ais_stream': 'AISStream',
    'openstreetmap': 'OpenStreetMap',
    'openai': 'OpenAI',
    'cesium': 'Cesium',
  },
};

/** Current locale code */
let currentLocale = DEFAULT_LOCALE;

/**
 * Detect best locale: localStorage → navigator.language → default.
 * @returns {string}
 */
export function detectLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch (_) { /* localStorage unavailable */ }
  const nav = navigator.language || navigator.userLanguage || '';
  if (nav.startsWith('id')) return 'id';
  return DEFAULT_LOCALE;
}

/**
 * Initialise i18n. Call once on app boot.
 * Applies locale detection and translates all `data-i18n` elements.
 */
export function initI18n() {
  currentLocale = detectLocale();
  translatePage();
}

/**
 * Set the active locale, persist to localStorage, re-translate.
 * @param {string} locale
 */
export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  currentLocale = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) { /* */ }
  translatePage();
}

/**
 * Get the current locale code.
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Translate a single key using the current locale.
 * Falls back to English if key not found.
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  const dict = dictionaries[currentLocale] || dictionaries[DEFAULT_LOCALE];
  return dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
}

/**
 * Translate all `data-i18n*` elements in the document.
 * Also translates dynamically created elements if called after insertion.
 * @param {Element|Document} root
 */
export function translatePage(root = document) {
  const el = root === document ? root : (root instanceof Element ? root : document);
  // textContent swaps
  el.querySelectorAll('[data-i18n]').forEach((elem) => {
    const key = elem.getAttribute('data-i18n');
    const text = t(key);
    if (elem.textContent !== text) elem.textContent = text;
  });
  // aria-label swaps
  el.querySelectorAll('[data-i18n-aria]').forEach((elem) => {
    const key = elem.getAttribute('data-i18n-aria');
    elem.setAttribute('aria-label', t(key));
  });
  // title attribute swaps
  el.querySelectorAll('[data-i18n-title]').forEach((elem) => {
    const key = elem.getAttribute('data-i18n-title');
    elem.setAttribute('title', t(key));
  });
  // placeholder swaps
  el.querySelectorAll('[data-i18n-placeholder]').forEach((elem) => {
    const key = elem.getAttribute('data-i18n-placeholder');
    elem.setAttribute('placeholder', t(key));
  });
}
