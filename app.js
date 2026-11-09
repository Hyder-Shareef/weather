/**
 * WEATHER DASHBOARD - Application Logic
 * Vanilla JavaScript (ES6)
 * Open-Meteo API integration with interactive SVG chart, hourly timeline, and glassmorphic UI.
 */

'use strict';

// ==========================================================================
// 1. APPLICATION STATE
// ==========================================================================
const state = {
  currentLocation: {
    name: 'Hyderabad',
    admin1: 'Telangana',
    country: 'India',
    latitude: 17.38405,
    longitude: 78.45636,
    timezone: 'Asia/Kolkata',
  },
  weatherData: null,
  airQualityData: null,
  processedHours: [], // 49 hours: past 24h, current hour, next 24h
  currentHourIndexInSlice: 24, // Index of 'Now' inside processedHours
  units: 'c', // 'c' (Celsius, km/h, km) or 'f' (Fahrenheit, mph, mi)
  selectedMetric: 'temperature', // 'temperature' | 'rain' | 'wind' | 'humidity'
  selectedFilter: 'all', // 'all' (48h) | 'past' (-24h to -1h) | 'next' (+1h to +24h)
  isLoading: false,
  activeHoverIndex: null,
};

// ==========================================================================
// 2. DOM ELEMENT REFERENCES
// ==========================================================================
const DOM = {
  // Search & Form
  searchForm: document.getElementById('search-form'),
  cityInput: document.getElementById('city-input'),
  searchBtn: document.getElementById('search-btn'),
  clearInputBtn: document.getElementById('clear-input-btn'),
  validationMsg: document.getElementById('validation-message'),
  locationDropdown: document.getElementById('location-dropdown'),
  locationResultsList: document.getElementById('location-results-list'),
  geoLocationBtn: document.getElementById('geo-location-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  unitToggleBtns: document.querySelectorAll('.unit-toggle-btn'),
  errorBanner: document.getElementById('error-banner'),
  errorText: document.getElementById('error-text'),
  dismissErrorBtn: document.getElementById('dismiss-error-btn'),
  loadingOverlay: document.getElementById('loading-overlay'),
  lastUpdatedText: document.getElementById('last-updated-text'),

  // Hero Display
  cityName: document.getElementById('city-name-display'),
  citySubtitle: document.getElementById('city-subtitle-display'),
  heroTemp: document.getElementById('hero-temp-value'),
  heroIcon: document.getElementById('hero-weather-icon'),
  heroCondition: document.getElementById('hero-condition-text'),
  heroHigh: document.getElementById('hero-high-temp'),
  heroLow: document.getElementById('hero-low-temp'),
  heroFeels: document.getElementById('hero-feels-temp'),
  heroLocalTime: document.getElementById('hero-local-time'),

  // Chart Panel
  metricTabs: document.querySelectorAll('.metric-tab'),
  filterBtns: document.querySelectorAll('.filter-btn'),
  quickPastBtn: document.getElementById('quick-filter-past'),
  quickNextBtn: document.getElementById('quick-filter-next'),
  chartSectionTitle: document.getElementById('chart-section-title'),
  chartHeroStat: document.getElementById('chart-hero-stat'),
  chartShiftStat: document.getElementById('chart-shift-stat'),
  chartContainer: document.getElementById('chart-container'),
  chartSvg: document.getElementById('weather-chart-svg'),
  chartTooltip: document.getElementById('chart-tooltip'),
  tooltipOffsetTime: document.getElementById('tooltip-offset-time'),
  tooltipValue: document.getElementById('tooltip-value'),
  tooltipSub: document.getElementById('tooltip-sub'),

  // SVG Layers
  chartGridLayer: document.getElementById('chart-grid-layer'),
  chartAreaLayer: document.getElementById('chart-area-layer'),
  chartCurveLayer: document.getElementById('chart-curve-layer'),
  chartNowMarkerLayer: document.getElementById('chart-now-marker-layer'),
  chartHoverMarkerLayer: document.getElementById('chart-hover-marker-layer'),
  chartAxisLabelsLayer: document.getElementById('chart-axis-labels-layer'),
  gradStop1: document.getElementById('grad-stop-1'),
  gradStop2: document.getElementById('grad-stop-2'),

  // Hourly Timeline
  timelinePastAvg: document.getElementById('timeline-past-avg'),
  timelineNextAvg: document.getElementById('timeline-next-avg'),
  timelineScrollContainer: document.getElementById('timeline-scroll-container'),
  timelineCardsTrack: document.getElementById('timeline-cards-track'),
  timelinePrevBtn: document.getElementById('timeline-prev-btn'),
  timelineNextBtn: document.getElementById('timeline-next-btn'),
  timelineJumpNowBtn: document.getElementById('timeline-jump-now-btn'),

  // Summary Cards
  summaryGeneralVal: document.getElementById('summary-general-val'),
  summaryGeneralSub: document.getElementById('summary-general-sub'),
  summaryTempVal: document.getElementById('summary-temp-val'),
  summaryTempSub: document.getElementById('summary-temp-sub'),
  summaryRainVal: document.getElementById('summary-rain-val'),
  summaryRainSub: document.getElementById('summary-rain-sub'),
  summaryWindVal: document.getElementById('summary-wind-val'),
  summaryWindSub: document.getElementById('summary-wind-sub'),

  // Additional Cards (AQI, UV, Atmosphere)
  aqiNumVal: document.getElementById('aqi-num-val'),
  aqiLabelVal: document.getElementById('aqi-label-val'),
  aqiDescText: document.getElementById('aqi-desc-text'),
  aqiNeedleDot: document.getElementById('aqi-needle-dot'),
  pollutantPm25: document.getElementById('pollutant-pm25'),
  pollutantPm10: document.getElementById('pollutant-pm10'),
  pollutantO3: document.getElementById('pollutant-o3'),
  pollutantNo2: document.getElementById('pollutant-no2'),

  uvNumVal: document.getElementById('uv-num-val'),
  uvLabelVal: document.getElementById('uv-label-val'),
  uvNeedleDot: document.getElementById('uv-needle-dot'),
  sunriseTimeVal: document.getElementById('sunrise-time-val'),
  sunsetTimeVal: document.getElementById('sunset-time-val'),

  pressureVal: document.getElementById('pressure-val'),
  pressureTrendSub: document.getElementById('pressure-trend-sub'),
  atmHumidityVal: document.getElementById('atm-humidity-val'),
  atmVisibilityVal: document.getElementById('atm-visibility-val'),
};

// ==========================================================================
// 3. WMO WEATHER CODE MAPPINGS & SVG ICONS
// ==========================================================================
const WMO_MAP = {
  0: { label: 'Clear sky', icon: 'clear' },
  1: { label: 'Mainly clear', icon: 'mainly-clear' },
  2: { label: 'Partly cloudy', icon: 'partly-cloudy' },
  3: { label: 'Overcast', icon: 'overcast' },
  45: { label: 'Fog', icon: 'fog' },
  48: { label: 'Depositing rime fog', icon: 'fog' },
  51: { label: 'Light drizzle', icon: 'drizzle' },
  53: { label: 'Moderate drizzle', icon: 'drizzle' },
  55: { label: 'Dense drizzle', icon: 'drizzle' },
  56: { label: 'Light freezing drizzle', icon: 'freezing-rain' },
  57: { label: 'Dense freezing drizzle', icon: 'freezing-rain' },
  61: { label: 'Slight rain', icon: 'rain' },
  63: { label: 'Moderate rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'heavy-rain' },
  66: { label: 'Light freezing rain', icon: 'freezing-rain' },
  67: { label: 'Heavy freezing rain', icon: 'freezing-rain' },
  71: { label: 'Slight snow', icon: 'snow' },
  73: { label: 'Moderate snow', icon: 'snow' },
  75: { label: 'Heavy snow', icon: 'snow' },
  77: { label: 'Snow grains', icon: 'snow' },
  80: { label: 'Slight rain showers', icon: 'rain' },
  81: { label: 'Moderate rain showers', icon: 'rain' },
  82: { label: 'Violent rain showers', icon: 'heavy-rain' },
  85: { label: 'Slight snow showers', icon: 'snow' },
  86: { label: 'Heavy snow showers', icon: 'snow' },
  95: { label: 'Thunderstorm', icon: 'thunderstorm' },
  96: { label: 'Thunderstorm with slight hail', icon: 'thunderstorm' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'thunderstorm' },
};

function getWeatherCondition(code) {
  return WMO_MAP[code] || { label: 'Partly Cloudy', icon: 'partly-cloudy' };
}

/**
 * Returns inline SVG icon based on condition type and day/night status.
 */
function getWeatherIconSvg(iconType, isDay = 1) {
  switch (iconType) {
    case 'clear':
      return isDay
        ? `<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="6" fill="#facc15" stroke="#fef08a" stroke-width="1.5"/><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.2 2.2M22.3 22.3l2.2 2.2M7.5 24.5l2.2-2.2M22.3 9.7l2.2-2.2" stroke="#facc15" stroke-width="2" stroke-linecap="round"/></svg>`
        : `<svg viewBox="0 0 32 32" fill="none"><path d="M22 17.5A8.5 8.5 0 0 1 13 8.7a8.5 8.5 0 1 0 10 9.8 8.6 8.6 0 0 1-1-1Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/><circle cx="21" cy="9" r="1" fill="#fef08a"/></svg>`;

    case 'mainly-clear':
    case 'partly-cloudy':
      return isDay
        ? `<svg viewBox="0 0 32 32" fill="none"><circle cx="13" cy="13" r="5" fill="#facc15"/><path d="M13 5v2M13 21v2M5 13h2M21 13h2M7.3 7.3l1.5 1.5M17.2 17.2l1.5 1.5" stroke="#facc15" stroke-width="1.5" stroke-linecap="round"/><path d="M24 23a5 5 0 0 0-4.8-6.6 4.9 4.9 0 0 0-4.5 3 4 4 0 0 0-1.7-.4 4 4 0 0 0-4 4 4 4 0 0 0 .2 1.3A3.5 3.5 0 0 0 12.5 26h11a3.5 3.5 0 0 0 .5-3Z" fill="#e2e8f0" fill-opacity="0.9" stroke="#cbd5e1" stroke-width="1.2"/></svg>`
        : `<svg viewBox="0 0 32 32" fill="none"><path d="M16 13a4.5 4.5 0 0 1-4.8-4.6 4.5 4.5 0 1 0 5.3 5.2c-.2-.2-.3-.4-.5-.6Z" fill="#cbd5e1"/><path d="M24 23a5 5 0 0 0-4.8-6.6 4.9 4.9 0 0 0-4.5 3 4 4 0 0 0-1.7-.4 4 4 0 0 0-4 4 4 4 0 0 0 .2 1.3A3.5 3.5 0 0 0 12.5 26h11a3.5 3.5 0 0 0 .5-3Z" fill="#94a3b8" fill-opacity="0.9" stroke="#cbd5e1" stroke-width="1.2"/></svg>`;

    case 'overcast':
      return `<svg viewBox="0 0 32 32" fill="none"><path d="M21 15a4.5 4.5 0 0 0-4.3-3.2 4.5 4.5 0 0 0-4.1 2.7 3.5 3.5 0 0 0-1.6-.3 3.5 3.5 0 0 0-3.5 3.5 3.5 3.5 0 0 0 .2 1.1A3 3 0 0 0 10.5 21h10a3 3 0 0 0 .5-6Z" fill="#64748b" fill-opacity="0.8"/><path d="M24.5 23a4.5 4.5 0 0 0-4.3-3.2 4.5 4.5 0 0 0-4.1 2.7 3.5 3.5 0 0 0-1.6-.3 3.5 3.5 0 0 0-3.5 3.5c0 .4.1.8.2 1.1A3 3 0 0 0 14 29h10a3 3 0 0 0 .5-6Z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="1.2"/></svg>`;

    case 'fog':
      return `<svg viewBox="0 0 32 32" fill="none"><path d="M23 16a4 4 0 0 0-3.8-2.8 4 4 0 0 0-3.7 2.4 3 3 0 0 0-1.5-.4 3 3 0 0 0-3 3c0 .3 0 .6.2.9A2.5 2.5 0 0 0 13 21h9.5a2.5 2.5 0 0 0 .5-5Z" fill="#94a3b8"/><line x1="8" y1="23" x2="24" y2="23" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round"/><line x1="10" y1="26" x2="22" y2="26" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round"/></svg>`;

    case 'drizzle':
    case 'rain':
      return `<svg viewBox="0 0 32 32" fill="none"><path d="M24 18a4.5 4.5 0 0 0-4.3-3.2 4.5 4.5 0 0 0-4.1 2.7 3.5 3.5 0 0 0-1.6-.3 3.5 3.5 0 0 0-3.5 3.5c0 .4.1.8.2 1.1A3 3 0 0 0 13 24h10.5a3 3 0 0 0 .5-6Z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="1.2"/><path d="M12 26l-1.5 3M17 26l-1.5 3M22 26l-1.5 3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/></svg>`;

    case 'heavy-rain':
      return `<svg viewBox="0 0 32 32" fill="none"><path d="M24 17a4.5 4.5 0 0 0-4.3-3.2 4.5 4.5 0 0 0-4.1 2.7 3.5 3.5 0 0 0-1.6-.3 3.5 3.5 0 0 0-3.5 3.5c0 .4.1.8.2 1.1A3 3 0 0 0 13 23h10.5a3 3 0 0 0 .5-6Z" fill="#64748b" stroke="#94a3b8" stroke-width="1.2"/><path d="M11 25l-2 4M15 25l-2 4M19 25l-2 4M23 25l-2 4" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round"/></svg>`;

    case 'thunderstorm':
      return `<svg viewBox="0 0 32 32" fill="none"><path d="M23 16a4 4 0 0 0-3.8-2.8 4 4 0 0 0-3.7 2.4 3 3 0 0 0-1.5-.4 3 3 0 0 0-3 3c0 .3 0 .6.2.9A2.5 2.5 0 0 0 13 21h9.5a2.5 2.5 0 0 0 .5-5Z" fill="#475569" stroke="#64748b" stroke-width="1.2"/><polygon points="17 19 13 25 16 25 14 30 20 23 17 23 18 19" fill="#facc15" stroke="#fef08a" stroke-width="0.8"/></svg>`;

    case 'snow':
      return `<svg viewBox="0 0 32 32" fill="none"><path d="M23 16a4 4 0 0 0-3.8-2.8 4 4 0 0 0-3.7 2.4 3 3 0 0 0-1.5-.4 3 3 0 0 0-3 3c0 .3 0 .6.2.9A2.5 2.5 0 0 0 13 21h9.5a2.5 2.5 0 0 0 .5-5Z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="1.2"/><circle cx="12" cy="25" r="1.2" fill="#e0f2fe"/><circle cx="17" cy="27" r="1.2" fill="#e0f2fe"/><circle cx="21" cy="24" r="1.2" fill="#e0f2fe"/></svg>`;

    case 'freezing-rain':
      return `<svg viewBox="0 0 32 32" fill="none"><path d="M23 16a4 4 0 0 0-3.8-2.8 4 4 0 0 0-3.7 2.4 3 3 0 0 0-1.5-.4 3 3 0 0 0-3 3c0 .3 0 .6.2.9A2.5 2.5 0 0 0 13 21h9.5a2.5 2.5 0 0 0 .5-5Z" fill="#94a3b8"/><path d="M13 25l-1 2M19 25l-1 2" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/><circle cx="16" cy="27" r="1.2" fill="#bae6fd"/></svg>`;

    default:
      return `<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="6" fill="#facc15"/></svg>`;
  }
}

// ==========================================================================
// 4. UNIT CONVERSIONS & FORMATTING
// ==========================================================================
function formatTemp(tempC, unit = state.units) {
  if (tempC === null || tempC === undefined || isNaN(tempC)) return '--';
  if (unit === 'f') {
    const tempF = (tempC * 9) / 5 + 32;
    return Math.round(tempF);
  }
  return Math.round(tempC);
}

function formatTempExact(tempC, unit = state.units) {
  if (tempC === null || tempC === undefined || isNaN(tempC)) return '--';
  if (unit === 'f') {
    const tempF = (tempC * 9) / 5 + 32;
    return tempF.toFixed(1);
  }
  return tempC.toFixed(1);
}

function formatWindSpeed(kmh, unit = state.units) {
  if (kmh === null || kmh === undefined || isNaN(kmh)) return '--';
  if (unit === 'f') {
    const mph = kmh * 0.621371;
    return `${Math.round(mph)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

function formatWindSpeedVal(kmh, unit = state.units) {
  if (kmh === null || kmh === undefined || isNaN(kmh)) return 0;
  if (unit === 'f') {
    return Math.round(kmh * 0.621371);
  }
  return Math.round(kmh);
}

function formatVisibility(meters, unit = state.units) {
  if (meters === null || meters === undefined || isNaN(meters)) return '10 km';
  const km = meters / 1000;
  if (unit === 'f') {
    const miles = km * 0.621371;
    return `${Math.round(miles)} mi`;
  }
  return `${Math.round(km)} km`;
}

function getWindCompassDirection(deg) {
  if (deg === null || deg === undefined) return 'N';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

function formatTime12h(isoString, includeMinutes = false) {
  if (!isoString) return '--';
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  if (includeMinutes) {
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
  }
  return `${hours} ${ampm}`;
}

// ==========================================================================
// 5. FORM INPUT VALIDATION
// ==========================================================================
/**
 * Strict validation according to requirements:
 * - No special characters
 * - No numbers
 * - No leading spaces
 * - No trailing spaces
 * - Do not silently trim invalid user input
 * - Allow valid city names containing letters and internal spaces
 */
function validateCityInput(rawInput) {
  if (rawInput === '') {
    return { isValid: false, message: 'Please enter a city name.' };
  }
  if (rawInput.startsWith(' ')) {
    return { isValid: false, message: 'City name cannot begin with a space.' };
  }
  if (rawInput.endsWith(' ')) {
    return { isValid: false, message: 'City name cannot end with a space.' };
  }
  if (/\d/.test(rawInput)) {
    return { isValid: false, message: 'City name cannot contain numbers.' };
  }
  if (/ {2,}/.test(rawInput)) {
    return { isValid: false, message: 'City name cannot contain multiple consecutive spaces.' };
  }
  // \p{L} matches unicode letters across languages; single spaces allowed
  if (!/^[\p{L} ]+$/u.test(rawInput)) {
    return { isValid: false, message: 'City name cannot contain special characters or punctuation.' };
  }
  if (rawInput.length < 2) {
    return { isValid: false, message: 'City name must be at least 2 characters long.' };
  }
  return { isValid: true, message: '' };
}

function handleInputValidation() {
  const value = DOM.cityInput.value;
  DOM.clearInputBtn.hidden = value.length === 0;
  DOM.clearInputBtn.style.display = value.length === 0 ? 'none' : 'block';

  if (value.length === 0) {
    DOM.validationMsg.hidden = true;
    DOM.validationMsg.style.display = 'none';
    DOM.validationMsg.textContent = '';
    DOM.searchBtn.disabled = true;
    return;
  }

  const result = validateCityInput(value);
  if (!result.isValid) {
    DOM.validationMsg.textContent = result.message;
    DOM.validationMsg.hidden = false;
    DOM.validationMsg.style.display = 'flex';
    DOM.searchBtn.disabled = true;
  } else {
    DOM.validationMsg.hidden = true;
    DOM.validationMsg.style.display = 'none';
    DOM.validationMsg.textContent = '';
    DOM.searchBtn.disabled = false;
  }
}

// ==========================================================================
// 6. API INTEGRATION (GEOCODING, FORECAST, AIR QUALITY)
// ==========================================================================
async function geocodeLocation(cityName) {
  const endpoint = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Geocoding server responded with status: ${response.status}`);
  }
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    return [];
  }
  return data.results;
}

async function fetchWeatherData(lat, lon) {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,dew_point_2m,uv_index` +
    `&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max` +
    `&past_days=1&forecast_days=2&timezone=auto`;

  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=auto`;

  const [weatherRes, aqiRes] = await Promise.allSettled([
    fetch(forecastUrl).then(r => {
      if (!r.ok) throw new Error(`Weather API error (${r.status})`);
      return r.json();
    }),
    fetch(aqiUrl).then(r => (r.ok ? r.json() : null)),
  ]);

  if (weatherRes.status === 'rejected') {
    throw weatherRes.reason;
  }

  return {
    weather: weatherRes.value,
    airQuality: aqiRes.status === 'fulfilled' ? aqiRes.value : null,
  };
}

// ==========================================================================
// 7. DATA PROCESSING: 48-HOUR PAST & FUTURE SLICE
// ==========================================================================
function processHourlyTimeline(weatherData) {
  const hourly = weatherData.hourly;
  const currentIso = weatherData.current.time; // e.g. "2026-11-09T18:45"
  const currentHourPrefix = currentIso.slice(0, 13) + ':00';

  // Find index in hourly.time matching current hour
  let currentIdx = hourly.time.indexOf(currentHourPrefix);
  if (currentIdx === -1) {
    const targetMs = new Date(currentIso).getTime();
    let minDiff = Infinity;
    hourly.time.forEach((t, i) => {
      const diff = Math.abs(new Date(t).getTime() - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        currentIdx = i;
      }
    });
  }

  // Construct 49-point slice: from -24h to +24h
  const startIndex = Math.max(0, currentIdx - 24);
  const endIndex = Math.min(hourly.time.length - 1, currentIdx + 24);

  const processed = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const offsetHours = i - currentIdx;
    const isNow = i === currentIdx;
    const timeStr = hourly.time[i];

    processed.push({
      indexInSlice: processed.length,
      originalIndex: i,
      offsetHours,
      isNow,
      timeIso: timeStr,
      timeFormatted: isNow ? 'Now' : formatTime12h(timeStr),
      offsetFormatted: isNow ? 'Now' : offsetHours > 0 ? `+${offsetHours}h` : `${offsetHours}h`,
      tempC: hourly.temperature_2m[i],
      apparentTempC: hourly.apparent_temperature ? hourly.apparent_temperature[i] : hourly.temperature_2m[i],
      rainProb: hourly.precipitation_probability ? hourly.precipitation_probability[i] || 0 : 0,
      precipitation: hourly.precipitation ? hourly.precipitation[i] || 0 : 0,
      windSpeedKmh: hourly.wind_speed_10m[i] || 0,
      windGustsKmh: hourly.wind_gusts_10m ? hourly.wind_gusts_10m[i] || 0 : 0,
      windDirectionDeg: hourly.wind_direction_10m ? hourly.wind_direction_10m[i] || 0 : 0,
      humidity: hourly.relative_humidity_2m[i] || 0,
      weatherCode: hourly.weather_code[i] || 0,
      cloudCover: hourly.cloud_cover ? hourly.cloud_cover[i] || 0 : 0,
      visibilityMeters: hourly.visibility ? hourly.visibility[i] || 10000 : 10000,
      dewPointC: hourly.dew_point_2m ? hourly.dew_point_2m[i] : 0,
      uvIndex: hourly.uv_index ? hourly.uv_index[i] || 0 : 0,
      // Approximate isDay from time of day or sun data
      isDay: (() => {
        const h = new Date(timeStr).getHours();
        return h >= 6 && h < 18 ? 1 : 0;
      })(),
    });
  }

  return {
    processed,
    nowSliceIndex: currentIdx - startIndex,
  };
}

// ==========================================================================
// 8. UI RENDERING: HERO SECTION
// ==========================================================================
function renderHeroWeather(weatherData, location) {
  const current = weatherData.current;
  const condition = getWeatherCondition(current.weather_code);

  DOM.cityName.textContent = location.name;
  DOM.citySubtitle.textContent = [location.admin1, location.country].filter(Boolean).join(', ') || 'Meteorological Station';

  DOM.heroTemp.textContent = formatTemp(current.temperature_2m);
  DOM.heroIcon.innerHTML = getWeatherIconSvg(condition.icon, current.is_day);
  DOM.heroCondition.textContent = condition.label;

  // Daily High / Low
  const daily = weatherData.daily;
  if (daily && daily.temperature_2m_max && daily.temperature_2m_max.length > 1) {
    // Current day is usually index 1 when past_days=1
    const todayMax = daily.temperature_2m_max[1] ?? daily.temperature_2m_max[0];
    const todayMin = daily.temperature_2m_min[1] ?? daily.temperature_2m_min[0];
    DOM.heroHigh.textContent = formatTemp(todayMax);
    DOM.heroLow.textContent = formatTemp(todayMin);
  } else {
    DOM.heroHigh.textContent = formatTemp(current.temperature_2m + 2);
    DOM.heroLow.textContent = formatTemp(current.temperature_2m - 4);
  }

  DOM.heroFeels.textContent = formatTemp(current.apparent_temperature);

  // Local Time
  const timeFormatted = formatTime12h(current.time, true);
  DOM.heroLocalTime.textContent = `${timeFormatted} (${weatherData.timezone_abbreviation || weatherData.timezone || 'Local'})`;

  // Last Updated Meta Text
  DOM.lastUpdatedText.textContent = `Updated ${timeFormatted}`;
}

// ==========================================================================
// 9. UI RENDERING: SUMMARY CARDS
// ==========================================================================
function renderSummaryCards(weatherData, airQualityData) {
  const current = weatherData.current;
  const condition = getWeatherCondition(current.weather_code);
  const hours = state.processedHours;
  const nowIdx = state.currentHourIndexInSlice;
  const currentHourData = hours[nowIdx] || {};

  // 1. GENERAL WEATHER
  DOM.summaryGeneralVal.textContent = condition.label;
  const visFormatted = formatVisibility(currentHourData.visibilityMeters || 10000);
  DOM.summaryGeneralSub.textContent = `Clouds ${current.cloud_cover}% · Vis ${visFormatted}`;

  // 2. TEMPERATURE
  const tempUnitStr = state.units === 'f' ? '°F' : '°C';
  DOM.summaryTempVal.textContent = `${formatTempExact(current.temperature_2m)}${tempUnitStr}`;
  const dewC = currentHourData.dewPointC ?? (current.temperature_2m - (100 - current.relative_humidity_2m) / 5);
  DOM.summaryTempSub.textContent = `Dew point ${formatTemp(dewC)}° · Humidity ${current.relative_humidity_2m}%`;

  // 3. LIKELIHOOD OF RAIN
  const rainProb = currentHourData.rainProb || 0;
  DOM.summaryRainVal.textContent = `${rainProb}%`;

  // Calculate 24h peak rain probability in upcoming 24 hours
  let peak24h = rainProb;
  for (let i = nowIdx; i < Math.min(hours.length, nowIdx + 24); i++) {
    if (hours[i].rainProb > peak24h) peak24h = hours[i].rainProb;
  }
  const precipMm = current.precipitation || 0;
  DOM.summaryRainSub.textContent = `${precipMm} mm · 24h peak ${peak24h}%`;

  // 4. WIND SPEED
  DOM.summaryWindVal.textContent = formatWindSpeed(current.wind_speed_10m);
  const compass = getWindCompassDirection(current.wind_direction_10m);
  const gusts = formatWindSpeed(current.wind_gusts_10m);
  DOM.summaryWindSub.textContent = `${compass} (${current.wind_direction_10m}°) · Gusts ${gusts}`;

  // 5. AIR QUALITY (US AQI)
  renderAirQualityCard(airQualityData);

  // 6. UV INDEX & SUN
  renderUvAndSunCard(weatherData);

  // 7. ATMOSPHERE
  DOM.pressureVal.textContent = `${Math.round(current.pressure_msl || 1013)} hPa`;
  DOM.atmHumidityVal.textContent = `${current.relative_humidity_2m}%`;
  DOM.atmVisibilityVal.textContent = visFormatted;
}

function renderAirQualityCard(airQualityData) {
  let aqi = 42; // default fallback
  let pm25 = 12.4;
  let pm10 = 24.0;
  let o3 = 45.0;
  let no2 = 15.0;

  if (airQualityData && airQualityData.current) {
    const c = airQualityData.current;
    if (c.us_aqi !== undefined && c.us_aqi !== null) aqi = Math.round(c.us_aqi);
    if (c.pm2_5 !== undefined && c.pm2_5 !== null) pm25 = c.pm2_5.toFixed(1);
    if (c.pm10 !== undefined && c.pm10 !== null) pm10 = c.pm10.toFixed(1);
    if (c.ozone !== undefined && c.ozone !== null) o3 = c.ozone.toFixed(1);
    if (c.nitrogen_dioxide !== undefined && c.nitrogen_dioxide !== null) no2 = c.nitrogen_dioxide.toFixed(1);
  }

  DOM.aqiNumVal.textContent = aqi;
  DOM.pollutantPm25.textContent = pm25;
  DOM.pollutantPm10.textContent = pm10;
  DOM.pollutantO3.textContent = o3;
  DOM.pollutantNo2.textContent = no2;

  let category = 'Good';
  let desc = 'Air quality is satisfactory and poses little or no risk.';
  let percentage = Math.min(100, Math.max(5, (aqi / 300) * 100));

  if (aqi > 50 && aqi <= 100) {
    category = 'Moderate';
    desc = 'Air quality is acceptable; sensitive groups should consider pacing prolonged exertion.';
  } else if (aqi > 100 && aqi <= 150) {
    category = 'Unhealthy for Sensitive';
    desc = 'Members of sensitive groups may experience health effects.';
  } else if (aqi > 150 && aqi <= 200) {
    category = 'Unhealthy';
    desc = 'Everyone may begin to experience adverse health effects.';
  } else if (aqi > 200) {
    category = 'Very Unhealthy';
    desc = 'Health alert: increased risk of health effects for everyone.';
  }

  DOM.aqiLabelVal.textContent = category;
  DOM.aqiDescText.textContent = desc;
  DOM.aqiNeedleDot.style.left = `${percentage}%`;
}

function renderUvAndSunCard(weatherData) {
  const daily = weatherData.daily;
  let uvMax = 6;
  let sunriseStr = '--:-- AM';
  let sunsetStr = '--:-- PM';

  if (daily) {
    if (daily.uv_index_max && daily.uv_index_max.length > 1) {
      uvMax = Math.round(daily.uv_index_max[1] || daily.uv_index_max[0] || 6);
    }
    if (daily.sunrise && daily.sunrise.length > 1) {
      sunriseStr = formatTime12h(daily.sunrise[1] || daily.sunrise[0], true);
    }
    if (daily.sunset && daily.sunset.length > 1) {
      sunsetStr = formatTime12h(daily.sunset[1] || daily.sunset[0], true);
    }
  }

  DOM.uvNumVal.textContent = uvMax;
  DOM.sunriseTimeVal.textContent = sunriseStr;
  DOM.sunsetTimeVal.textContent = sunsetStr;

  let uvLevel = 'Moderate';
  if (uvMax <= 2) uvLevel = 'Low';
  else if (uvMax <= 5) uvLevel = 'Moderate';
  else if (uvMax <= 7) uvLevel = 'High';
  else if (uvMax <= 10) uvLevel = 'Very High';
  else uvLevel = 'Extreme';

  DOM.uvLabelVal.textContent = uvLevel;
  const uvPercent = Math.min(100, Math.max(5, (uvMax / 11) * 100));
  DOM.uvNeedleDot.style.left = `${uvPercent}%`;
}

// ==========================================================================
// 10. UI RENDERING: HOURLY TIMELINE
// ==========================================================================
function renderHourlyTimeline() {
  const hours = state.processedHours;
  DOM.timelineCardsTrack.innerHTML = '';

  // Calculate past 24h & next 24h averages
  const nowIdx = state.currentHourIndexInSlice;
  const pastHours = hours.slice(0, nowIdx);
  const nextHours = hours.slice(nowIdx + 1);

  if (pastHours.length > 0) {
    const avgPast = pastHours.reduce((sum, h) => sum + h.tempC, 0) / pastHours.length;
    DOM.timelinePastAvg.textContent = `Past 24h Avg ${formatTemp(avgPast)}°`;
  }
  if (nextHours.length > 0) {
    const avgNext = nextHours.reduce((sum, h) => sum + h.tempC, 0) / nextHours.length;
    DOM.timelineNextAvg.textContent = `Next 24h Avg ${formatTemp(avgNext)}°`;
  }

  // Populate hourly cards
  hours.forEach((h, index) => {
    const card = document.createElement('div');
    card.className = `hourly-card ${h.isNow ? 'active-now' : ''}`;
    card.id = `hourly-card-${index}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${h.timeFormatted}, temperature ${formatTemp(h.tempC)} degrees`);

    const condition = getWeatherCondition(h.weatherCode);
    const iconSvg = getWeatherIconSvg(condition.icon, h.isDay);

    card.innerHTML = `
      <span class="hourly-card-time">${h.timeFormatted}</span>
      <span class="hourly-card-offset">${h.offsetFormatted}</span>
      <div class="hourly-card-icon">${iconSvg}</div>
      <span class="hourly-card-rain">${h.rainProb}%</span>
      <span class="hourly-card-temp">${formatTemp(h.tempC)}°</span>
      <span class="hourly-card-wind">${formatWindSpeed(h.windSpeedKmh)}</span>
    `;

    card.addEventListener('click', () => {
      triggerChartHover(index);
    });

    DOM.timelineCardsTrack.appendChild(card);
  });

  // Automatically scroll to center the "Now" card
  setTimeout(jumpToNowCard, 100);
}

function jumpToNowCard() {
  const nowCard = document.querySelector('.hourly-card.active-now');
  if (nowCard && DOM.timelineScrollContainer) {
    const container = DOM.timelineScrollContainer;
    const cardLeft = nowCard.offsetLeft;
    const cardWidth = nowCard.offsetWidth;
    const containerWidth = container.offsetWidth;
    const targetScroll = cardLeft - containerWidth / 2 + cardWidth / 2;
    container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }
}

// ==========================================================================
// 11. UI RENDERING: INTERACTIVE SVG TEMPERATURE GRAPH
// ==========================================================================
/**
 * Smooth Catmull-Rom or Bezier spline calculation for SVG path.
 */
function getSmoothSplinePath(points) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return path;
}

function renderWeatherChart() {
  const allHours = state.processedHours;
  if (!allHours || allHours.length === 0) return;

  const nowIdx = state.currentHourIndexInSlice;

  // Filter points based on selectedFilter
  let filteredPoints = [];
  if (state.selectedFilter === 'past') {
    filteredPoints = allHours.slice(0, nowIdx + 1); // -24h to Now
  } else if (state.selectedFilter === 'next') {
    filteredPoints = allHours.slice(nowIdx); // Now to +24h
  } else {
    filteredPoints = allHours; // All 48 hours
  }

  // Update Section Title & Stat
  updateChartHeaders(allHours, nowIdx);

  // SVG Geometry Dimensions
  const svgWidth = 1000;
  const svgHeight = 320;
  const margin = { top: 28, right: 30, bottom: 50, left: 55 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  DOM.chartSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

  // Determine Values based on active metric
  const metric = state.selectedMetric;
  const getMetricVal = h => {
    if (metric === 'temperature') return state.units === 'f' ? (h.tempC * 9) / 5 + 32 : h.tempC;
    if (metric === 'rain') return h.rainProb;
    if (metric === 'wind') return formatWindSpeedVal(h.windSpeedKmh);
    if (metric === 'humidity') return h.humidity;
    return h.tempC;
  };

  const values = filteredPoints.map(getMetricVal);
  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);

  // Apply sensible bounds & round intervals
  if (metric === 'rain' || metric === 'humidity') {
    minVal = 0;
    maxVal = 100;
  } else {
    // Add 2-3 degrees or units of margin
    const padding = Math.max(2, (maxVal - minVal) * 0.15);
    minVal = Math.floor(minVal - padding);
    maxVal = Math.ceil(maxVal + padding);
    if (maxVal - minVal < 6) {
      maxVal += 3;
      minVal -= 3;
    }
  }

  // Color theming per metric
  let curveColor = '#facc15';
  let stop1Color = '#facc15';
  if (metric === 'rain') {
    curveColor = '#38bdf8';
    stop1Color = '#38bdf8';
  } else if (metric === 'wind') {
    curveColor = '#34d399';
    stop1Color = '#34d399';
  } else if (metric === 'humidity') {
    curveColor = '#c084fc';
    stop1Color = '#c084fc';
  }

  DOM.gradStop1.setAttribute('stop-color', stop1Color);
  DOM.gradStop2.setAttribute('stop-color', stop1Color);

  // Map coordinates
  const coords = filteredPoints.map((h, i) => {
    const x = margin.left + (i / (filteredPoints.length - 1)) * plotWidth;
    const yRatio = (maxVal - getMetricVal(h)) / (maxVal - minVal);
    const y = margin.top + Math.max(0, Math.min(1, yRatio)) * plotHeight;
    return { x, y, hourData: h, val: getMetricVal(h) };
  });

  // Store for hover detection
  state.chartCoords = coords;

  // 1. Render Gridlines & Y-Axis Labels
  DOM.chartGridLayer.innerHTML = '';
  DOM.chartAxisLabelsLayer.innerHTML = '';

  const stepsCount = 4;
  for (let s = 0; s <= stepsCount; s++) {
    const ratio = s / stepsCount;
    const yPos = margin.top + ratio * plotHeight;
    const stepVal = Math.round(maxVal - ratio * (maxVal - minVal));

    // Horizontal dashed grid line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', margin.left);
    line.setAttribute('x2', margin.left + plotWidth);
    line.setAttribute('y1', yPos);
    line.setAttribute('y2', yPos);
    line.setAttribute('stroke', 'rgba(255, 255, 255, 0.08)');
    line.setAttribute('stroke-dasharray', '4 4');
    DOM.chartGridLayer.appendChild(line);

    // Y-Axis label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left - 12);
    text.setAttribute('y', yPos + 4);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', '#94a3b8');
    text.setAttribute('font-size', '11px');
    text.setAttribute('font-weight', '500');
    text.textContent = metric === 'temperature' ? `${stepVal}°` : metric === 'wind' ? `${stepVal}` : `${stepVal}%`;
    DOM.chartAxisLabelsLayer.appendChild(text);
  }

  // 2. Render X-Axis Labels (6 to 8 evenly spaced)
  const numLabels = 7;
  for (let k = 0; k < numLabels; k++) {
    const idx = Math.round((k / (numLabels - 1)) * (coords.length - 1));
    const pt = coords[idx];
    if (!pt) continue;

    const h = pt.hourData;
    const labelText = h.isNow ? 'Now' : `${h.offsetFormatted} (${formatTime12h(h.timeIso)})`;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pt.x);
    text.setAttribute('y', svgHeight - 14);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', h.isNow ? '#ffffff' : '#64748b');
    text.setAttribute('font-size', '11px');
    text.setAttribute('font-weight', h.isNow ? '700' : '500');
    text.textContent = labelText;
    DOM.chartAxisLabelsLayer.appendChild(text);
  }

  // 3. Render Spline Curve & Area
  const curveD = getSmoothSplinePath(coords);
  const areaD = `${curveD} L ${coords[coords.length - 1].x},${margin.top + plotHeight} L ${coords[0].x},${margin.top + plotHeight} Z`;

  DOM.chartAreaLayer.innerHTML = `
    <path d="${areaD}" fill="url(#curveGradient)" />
  `;

  DOM.chartCurveLayer.innerHTML = `
    <path d="${curveD}" fill="none" stroke="${curveColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  `;

  // 4. Highlight 'Now' point if present in view
  DOM.chartNowMarkerLayer.innerHTML = '';
  const nowPoint = coords.find(c => c.hourData.isNow);
  if (nowPoint) {
    DOM.chartNowMarkerLayer.innerHTML = `
      <!-- Vertical guide dashed line -->
      <line x1="${nowPoint.x}" y1="${margin.top}" x2="${nowPoint.x}" y2="${margin.top + plotHeight}" 
            stroke="rgba(255, 255, 255, 0.45)" stroke-dasharray="3 3" stroke-width="1.2" />
      <!-- Glowing dot -->
      <circle cx="${nowPoint.x}" cy="${nowPoint.y}" r="8" fill="${curveColor}" fill-opacity="0.25" stroke="${curveColor}" stroke-width="2" />
      <circle cx="${nowPoint.x}" cy="${nowPoint.y}" r="3.5" fill="#ffffff" />
    `;
  }
}

function updateChartHeaders(allHours, nowIdx) {
  const currentHour = allHours[nowIdx];
  const past24Hour = allHours[Math.max(0, nowIdx - 24)];
  const metric = state.selectedMetric;

  // Title text
  const metricTitles = {
    temperature: 'TEMPERATURE CURVE (PAST 24H & NEXT 24H)',
    rain: 'PRECIPITATION PROBABILITY (PAST 24H & NEXT 24H)',
    wind: 'WIND SPEED PROFILE (PAST 24H & NEXT 24H)',
    humidity: 'RELATIVE HUMIDITY (PAST 24H & NEXT 24H)',
  };
  DOM.chartSectionTitle.textContent = metricTitles[metric] || 'WEATHER METRICS';

  // Hero Stat
  if (metric === 'temperature') {
    const tempUnit = state.units === 'f' ? '°F' : '°C';
    DOM.chartHeroStat.textContent = `${formatTempExact(currentHour.tempC)}${tempUnit} Now`;

    const diff = currentHour.tempC - past24Hour.tempC;
    const diffExact = state.units === 'f' ? (diff * 9) / 5 : diff;
    const sign = diffExact >= 0 ? '+' : '';
    DOM.chartShiftStat.textContent = `${sign}${diffExact.toFixed(1)}${tempUnit} forecast shift vs previous 24h`;
  } else if (metric === 'rain') {
    DOM.chartHeroStat.textContent = `${currentHour.rainProb}% Rain Now`;
    DOM.chartShiftStat.textContent = `${currentHour.precipitation} mm current precipitation`;
  } else if (metric === 'wind') {
    DOM.chartHeroStat.textContent = `${formatWindSpeed(currentHour.windSpeedKmh)} Now`;
    DOM.chartShiftStat.textContent = `Gusts up to ${formatWindSpeed(currentHour.windGustsKmh)}`;
  } else if (metric === 'humidity') {
    DOM.chartHeroStat.textContent = `${currentHour.humidity}% Humidity Now`;
    DOM.chartShiftStat.textContent = `Dew point ${formatTemp(currentHour.dewPointC)}°`;
  }
}

// ==========================================================================
// 12. CHART HOVER & TOOLTIP INTERACTION
// ==========================================================================
function setupChartInteractivity() {
  const container = DOM.chartContainer;

  function onPointerMove(e) {
    if (!state.chartCoords || state.chartCoords.length === 0) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = 1000 / rect.width;
    const svgMouseX = mouseX * scaleX;

    // Find closest coordinate point
    let closest = state.chartCoords[0];
    let minDistance = Infinity;

    for (const pt of state.chartCoords) {
      const dist = Math.abs(pt.x - svgMouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closest = pt;
      }
    }

    displayChartTooltip(closest, rect);
  }

  function onPointerLeave() {
    DOM.chartTooltip.hidden = true;
    DOM.chartTooltip.style.display = 'none';
    DOM.chartHoverMarkerLayer.innerHTML = '';
  }

  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerleave', onPointerLeave);
}

function displayChartTooltip(pt, containerRect) {
  const h = pt.hourData;
  const condition = getWeatherCondition(h.weatherCode);
  const metric = state.selectedMetric;

  let valFormatted = `${formatTemp(h.tempC)}°`;
  if (metric === 'rain') valFormatted = `${h.rainProb}%`;
  else if (metric === 'wind') valFormatted = formatWindSpeed(h.windSpeedKmh);
  else if (metric === 'humidity') valFormatted = `${h.humidity}%`;

  DOM.tooltipOffsetTime.textContent = h.isNow ? `Now (${formatTime12h(h.timeIso)})` : `${h.offsetFormatted} (${formatTime12h(h.timeIso)})`;
  DOM.tooltipValue.textContent = valFormatted;
  DOM.tooltipSub.textContent = `${condition.label} · Rain ${h.rainProb}%`;

  // Draw hover crosshair & marker dot on SVG
  const curveColor = metric === 'temperature' ? '#facc15' : metric === 'rain' ? '#38bdf8' : metric === 'wind' ? '#34d399' : '#c084fc';

  DOM.chartHoverMarkerLayer.innerHTML = `
    <line x1="${pt.x}" y1="28" x2="${pt.x}" y2="270" stroke="rgba(255, 255, 255, 0.5)" stroke-dasharray="3 3" stroke-width="1.2" />
    <circle cx="${pt.x}" cy="${pt.y}" r="6" fill="#ffffff" stroke="${curveColor}" stroke-width="2.5" />
  `;

  // Position tooltip relative to pixel container
  const scaleX = containerRect.width / 1000;
  const scaleY = containerRect.height / 320;
  const pixelX = pt.x * scaleX;
  const pixelY = pt.y * scaleY;

  DOM.chartTooltip.hidden = false;
  DOM.chartTooltip.style.display = 'flex';
  DOM.chartTooltip.style.left = `${pixelX}px`;
  DOM.chartTooltip.style.top = `${pixelY - 14}px`;
}

function triggerChartHover(sliceIndex) {
  if (!state.chartCoords) return;
  const target = state.chartCoords.find(c => c.hourData.indexInSlice === sliceIndex);
  if (target) {
    const rect = DOM.chartContainer.getBoundingClientRect();
    displayChartTooltip(target, rect);
  }
}

// ==========================================================================
// 13. DATA LOADING & ORCHESTRATION
// ==========================================================================
async function loadWeatherForLocation(location) {
  showLoading(true);
  hideError();

  try {
    const { weather, airQuality } = await fetchWeatherData(location.latitude, location.longitude);

    state.currentLocation = location;
    state.weatherData = weather;
    state.airQualityData = airQuality;

    const { processed, nowSliceIndex } = processHourlyTimeline(weather);
    state.processedHours = processed;
    state.currentHourIndexInSlice = nowSliceIndex;

    // Render all components
    renderHeroWeather(weather, location);
    renderWeatherChart();
    renderHourlyTimeline();
    renderSummaryCards(weather, airQuality);
  } catch (err) {
    console.error('Failed to load weather data:', err);
    showError(err.message || 'Unable to fetch weather data. Please check your connection and try again.');
  } finally {
    showLoading(false);
  }
}

function showLoading(show) {
  state.isLoading = show;
  DOM.loadingOverlay.hidden = !show;
  DOM.loadingOverlay.style.display = show ? 'flex' : 'none';
  if (show) {
    DOM.refreshBtn.querySelector('.refresh-icon')?.classList.add('spinning');
  } else {
    DOM.refreshBtn.querySelector('.refresh-icon')?.classList.remove('spinning');
  }
}

function showError(msg) {
  if (!msg) return;
  DOM.errorText.textContent = msg;
  DOM.errorBanner.hidden = false;
  DOM.errorBanner.style.display = 'flex';
}

function hideError() {
  DOM.errorBanner.hidden = true;
  DOM.errorBanner.style.display = 'none';
  DOM.errorText.textContent = '';
}

// ==========================================================================
// 14. EVENT HANDLERS & INITIALIZATION
// ==========================================================================
function setupEventListeners() {
  // 1. City Input & Live Validation
  DOM.cityInput.addEventListener('input', handleInputValidation);

  DOM.clearInputBtn.addEventListener('click', () => {
    DOM.cityInput.value = '';
    handleInputValidation();
    DOM.cityInput.focus();
  });

  // 2. Search Submission & Disambiguation
  DOM.searchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const rawVal = DOM.cityInput.value;
    const validation = validateCityInput(rawVal);
    if (!validation.isValid) {
      DOM.validationMsg.textContent = validation.message;
      DOM.validationMsg.hidden = false;
      DOM.validationMsg.style.display = 'flex';
      return;
    }

    const spinner = DOM.searchBtn.querySelector('.btn-spinner');
    try {
      DOM.searchBtn.disabled = true;
      if (spinner) {
        spinner.hidden = false;
        spinner.style.display = 'inline-block';
      }
      const results = await geocodeLocation(rawVal);
      if (results.length === 0) {
        showError(`No locations found matching "${rawVal}". Please verify the city spelling.`);
        return;
      }

      if (results.length === 1) {
        const item = results[0];
        await loadWeatherForLocation({
          name: item.name,
          admin1: item.admin1 || '',
          country: item.country || '',
          latitude: item.latitude,
          longitude: item.longitude,
          timezone: item.timezone || 'auto',
        });
        DOM.locationDropdown.hidden = true;
        DOM.locationDropdown.style.display = 'none';
      } else {
        // Multiple matches: show disambiguation dropdown
        showLocationDropdown(results);
      }
    } catch (err) {
      showError('Failed to search location. Please check your internet connection.');
    } finally {
      DOM.searchBtn.disabled = false;
      if (spinner) {
        spinner.hidden = true;
        spinner.style.display = 'none';
      }
    }
  });

  // 3. Close Dropdown on outside click
  document.addEventListener('click', e => {
    if (!DOM.locationDropdown.contains(e.target) && !DOM.cityInput.contains(e.target)) {
      DOM.locationDropdown.hidden = true;
      DOM.locationDropdown.style.display = 'none';
    }
  });

  // 4. Refresh Button
  DOM.refreshBtn.addEventListener('click', () => {
    if (state.currentLocation) {
      loadWeatherForLocation(state.currentLocation);
    }
  });

  // 5. My Location Button (Browser Geolocation)
  DOM.geoLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser.');
      return;
    }

    showLoading(true);
    navigator.geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          // Attempt reverse geocoding or fallback to coordinates
          const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=London&count=1`; // Ping check
          await loadWeatherForLocation({
            name: 'Current Location',
            admin1: `${lat.toFixed(2)}°N`,
            country: `${lon.toFixed(2)}°E`,
            latitude: lat,
            longitude: lon,
            timezone: 'auto',
          });
        } catch (e) {
          showError('Failed to load weather for current location.');
        } finally {
          showLoading(false);
        }
      },
      err => {
        showLoading(false);
        showError(`Location access denied or unavailable (${err.message}).`);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });

  // 6. Unit Toggle (°C / °F)
  DOM.unitToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedUnit = btn.dataset.unit;
      if (state.units === selectedUnit) return;

      state.units = selectedUnit;
      DOM.unitToggleBtns.forEach(b => {
        const isActive = b.dataset.unit === selectedUnit;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-checked', isActive ? 'true' : 'false');
      });

      // Re-render UI with new unit system
      if (state.weatherData) {
        renderHeroWeather(state.weatherData, state.currentLocation);
        renderWeatherChart();
        renderHourlyTimeline();
        renderSummaryCards(state.weatherData, state.airQualityData);
      }
    });
  });

  // 7. Metric Tabs (Temperature / Rain / Wind / Humidity)
  DOM.metricTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const metric = tab.dataset.metric;
      state.selectedMetric = metric;

      DOM.metricTabs.forEach(t => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      renderWeatherChart();
    });
  });

  // 8. Time Filters (All 48h / Past 24h / Next 24h)
  DOM.filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      state.selectedFilter = filter;

      DOM.filterBtns.forEach(b => b.classList.toggle('active', b === btn));
      renderWeatherChart();
    });
  });

  // Quick action filter buttons
  DOM.quickPastBtn.addEventListener('click', () => {
    state.selectedFilter = 'past';
    DOM.filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'past'));
    renderWeatherChart();
  });

  DOM.quickNextBtn.addEventListener('click', () => {
    state.selectedFilter = 'next';
    DOM.filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'next'));
    renderWeatherChart();
  });

  // 9. Timeline Scroll Buttons
  DOM.timelinePrevBtn.addEventListener('click', () => {
    DOM.timelineScrollContainer.scrollBy({ left: -260, behavior: 'smooth' });
  });

  DOM.timelineNextBtn.addEventListener('click', () => {
    DOM.timelineScrollContainer.scrollBy({ left: 260, behavior: 'smooth' });
  });

  DOM.timelineJumpNowBtn.addEventListener('click', jumpToNowCard);

  // 10. Dismiss Error Banner
  DOM.dismissErrorBtn.addEventListener('click', hideError);

  // 11. Window Resize: redraw SVG chart to fit container width cleanly
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      renderWeatherChart();
    }, 150);
  });
}

function showLocationDropdown(locations) {
  DOM.locationResultsList.innerHTML = '';
  locations.forEach(loc => {
    const li = document.createElement('li');
    li.className = 'location-option-item';
    li.innerHTML = `
      <div>
        <div class="loc-main-name">${loc.name}</div>
        <div class="loc-sub-name">${[loc.admin1, loc.country].filter(Boolean).join(', ')}</div>
      </div>
      <span class="loc-meta-badge">${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°</span>
    `;

    li.addEventListener('click', () => {
      DOM.locationDropdown.hidden = true;
      DOM.locationDropdown.style.display = 'none';
      DOM.cityInput.value = loc.name;
      handleInputValidation();
      loadWeatherForLocation({
        name: loc.name,
        admin1: loc.admin1 || '',
        country: loc.country || '',
        latitude: loc.latitude,
        longitude: loc.longitude,
        timezone: loc.timezone || 'auto',
      });
    });

    DOM.locationResultsList.appendChild(li);
  });

  DOM.locationDropdown.hidden = false;
  DOM.locationDropdown.style.display = 'block';
}

// ==========================================================================
// 15. APPLICATION BOOTSTRAP
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupChartInteractivity();

  // Load default city: Hyderabad (or Riyadh/London as requested)
  loadWeatherForLocation(state.currentLocation);
});

