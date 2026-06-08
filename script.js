const CACHE_TTL = 10 * 60 * 1000;
const RECENT_KEY = 'atmos_recent';
const UNIT_KEY = 'atmos_unit';
const MAX_RECENT = 5;

const $ = (id) => document.getElementById(id);

const els = {
    searchForm: document.querySelector('.search-box'),
    cityInput: $('enter-city'),
    recentList: $('recent-searches'),
    unitToggle: $('unit-toggle'),
    unitLabel: $('unit-label'),
    loading: $('loading'),
    toast: $('toast'),
    heroContent: $('hero-content'),
};

let state = {
    unit: localStorage.getItem(UNIT_KEY) || 'C',
    abortController: null,
    cache: new Map(),
};

const weatherIcons = {
    0:  { icon: '☀️', desc: 'Clear sky',       theme: 'clear' },
    1:  { icon: '🌤️', desc: 'Mainly clear',    theme: 'clear' },
    2:  { icon: '⛅', desc: 'Partly cloudy',   theme: 'cloudy' },
    3:  { icon: '☁️', desc: 'Overcast',        theme: 'cloudy' },
    45: { icon: '🌫️', desc: 'Fog',             theme: 'fog' },
    48: { icon: '🌫️', desc: 'Rime fog',        theme: 'fog' },
    51: { icon: '🌦️', desc: 'Light drizzle',   theme: 'rain' },
    53: { icon: '🌦️', desc: 'Drizzle',         theme: 'rain' },
    55: { icon: '🌦️', desc: 'Heavy drizzle',   theme: 'rain' },
    56: { icon: '🌧️', desc: 'Freezing drizzle', theme: 'rain' },
    57: { icon: '🌧️', desc: 'Freezing drizzle', theme: 'rain' },
    61: { icon: '🌧️', desc: 'Light rain',      theme: 'rain' },
    63: { icon: '🌧️', desc: 'Rain',            theme: 'rain' },
    65: { icon: '🌧️', desc: 'Heavy rain',      theme: 'rain' },
    66: { icon: '🌧️', desc: 'Freezing rain',   theme: 'rain' },
    67: { icon: '🌧️', desc: 'Freezing rain',   theme: 'rain' },
    71: { icon: '🌨️', desc: 'Light snow',      theme: 'snow' },
    73: { icon: '🌨️', desc: 'Snow',            theme: 'snow' },
    75: { icon: '❄️', desc: 'Heavy snow',      theme: 'snow' },
    77: { icon: '🌨️', desc: 'Snow grains',     theme: 'snow' },
    80: { icon: '🌦️', desc: 'Rain showers',    theme: 'rain' },
    81: { icon: '🌦️', desc: 'Rain showers',    theme: 'rain' },
    82: { icon: '🌧️', desc: 'Heavy showers',   theme: 'rain' },
    85: { icon: '🌨️', desc: 'Snow showers',    theme: 'snow' },
    86: { icon: '❄️', desc: 'Heavy snow',      theme: 'snow' },
    95: { icon: '⛈️', desc: 'Thunderstorm',    theme: 'storm' },
    96: { icon: '⛈️', desc: 'Thunderstorm',    theme: 'storm' },
    99: { icon: '⛈️', desc: 'Thunderstorm',    theme: 'storm' },
};

const uvLevels = [
    { max: 2,  label: 'Low' },
    { max: 5,  label: 'Moderate' },
    { max: 7,  label: 'High' },
    { max: 10, label: 'Very High' },
    { max: Infinity, label: 'Extreme' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function cacheKey(lat, lon) {
    return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function getCached(lat, lon) {
    const entry = state.cache.get(cacheKey(lat, lon));
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
}

function setCache(lat, lon, data) {
    state.cache.set(cacheKey(lat, lon), { data, ts: Date.now() });
}

function cToF(c) {
    return Math.round(c * 9 / 5 + 32);
}

function formatTemp(celsius) {
    if (state.unit === 'F') return `${cToF(celsius)}°`;
    return `${Math.round(celsius)}°`;
}

function formatTempWithUnit(celsius) {
    return `${formatTemp(celsius)}${state.unit === 'F' ? 'F' : 'C'}`;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getUvLabel(index) {
    return uvLevels.find((l) => index <= l.max)?.label ?? '—';
}

function windDirection(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

function getCityDate(timezone) {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
}

function formatDate(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} · ${h}:${minutes} ${ampm}`;
}

function isNightTime(data) {
    const now = Date.now();
    const sunrise = new Date(data.daily.sunrise[0]).getTime();
    const sunset = new Date(data.daily.sunset[0]).getTime();
    return now < sunrise || now > sunset;
}

function applyTheme(code, data) {
    const info = weatherIcons[code] || { theme: 'cloudy' };
    let theme = info.theme;
    if (isNightTime(data) && (theme === 'clear' || theme === 'cloudy')) {
        theme = 'night';
    }
    document.body.className = `theme-${theme}`;
}

function showLoading(show) {
    els.loading.hidden = !show;
    document.querySelector('.dashboard')?.classList.toggle('is-loading', show);
}

let toastTimer;
function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3500);
}

function getRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch {
        return [];
    }
}

function saveRecentSearch(city) {
    const normalized = capitalize(city.trim());
    if (!normalized) return;
    const recent = getRecentSearches().filter((c) => c.toLowerCase() !== normalized.toLowerCase());
    recent.unshift(normalized);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function renderRecentSearches() {
    const recent = getRecentSearches();
    if (!recent.length) {
        els.recentList.hidden = true;
        return;
    }
    els.recentList.innerHTML = recent.map((city) =>
        `<li><button type="button" data-city="${city}">${city}</button></li>`
    ).join('');
    els.recentList.hidden = false;
}

async function fetchJSON(url, signal) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
}

async function getCoordinates(city, signal) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;
    const data = await fetchJSON(url, signal);
    if (!data.length) throw new Error('City not found');
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: city };
}

async function reverseGeocode(lat, lon, signal) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const data = await fetchJSON(url, signal);
    const addr = data.address || {};
    return addr.city || addr.town || addr.village || addr.state || 'Your Location';
}

const WEATHER_PARAMS = [
    'current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weathercode',
    'daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,uv_index_max,sunrise,sunset',
    'hourly=temperature_2m,weathercode',
    'timezone=auto',
    'forecast_days=7',
].join('&');

async function getWeatherData(lat, lon, signal) {
    const cached = getCached(lat, lon);
    if (cached) return cached;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${WEATHER_PARAMS}`;
    const data = await fetchJSON(url, signal);
    setCache(lat, lon, data);
    return data;
}

async function loadWeather({ lat, lon, city }) {
    if (state.abortController) state.abortController.abort();
    state.abortController = new AbortController();
    const { signal } = state.abortController;

    showLoading(true);
    try {
        const data = await getWeatherData(lat, lon, signal);
        displayAll(data, city, { lat, lon });
        if (city) saveRecentSearch(city);
    } catch (err) {
        if (err.name !== 'AbortError') {
            showToast(err.message === 'City not found' ? 'City not found. Try another name.' : 'Could not fetch weather. Try again.');
        }
    } finally {
        showLoading(false);
    }
}

async function searchCity(city) {
    const trimmed = city.trim();
    if (!trimmed) return;

    if (state.abortController) state.abortController.abort();
    state.abortController = new AbortController();
    const { signal } = state.abortController;

    showLoading(true);
    els.recentList.hidden = true;

    try {
        const coords = await getCoordinates(trimmed, signal);
        const data = await getWeatherData(coords.lat, coords.lon, signal);
        displayAll(data, trimmed, coords);
        saveRecentSearch(trimmed);
        els.cityInput.value = '';
    } catch (err) {
        if (err.name !== 'AbortError') {
            showToast(err.message === 'City not found' ? 'City not found. Try another name.' : 'Could not fetch weather. Try again.');
        }
    } finally {
        showLoading(false);
    }
}

function displayAll(data, city, coords = {}) {
    if (coords.lat != null) state.lastLat = coords.lat;
    if (coords.lon != null) state.lastLon = coords.lon;
    state.lastCity = city;

    displayCurrent(data, city);
    displayStats(data);
    displayHourly(data);
    displayForecast(data);
    applyTheme(data.current.weathercode, data);
}

function displayCurrent(data, city) {
    $('city-display').textContent = capitalize(city);
    $('date').textContent = formatDate(getCityDate(data.timezone));

    const code = data.current.weathercode;
    const info = weatherIcons[code] || { icon: '❓', desc: 'Unknown' };
    $('weather-desc').textContent = info.desc;
    $('weather-icon').textContent = info.icon;
    $('weather-icon').setAttribute('aria-label', info.desc);

    $('temp').textContent = formatTemp(data.current.temperature_2m);

    const hi = formatTemp(data.daily.temperature_2m_max[0]);
    const lo = formatTemp(data.daily.temperature_2m_min[0]);
    $('temp-range').textContent = `H: ${hi}  L: ${lo}`;
}

function displayStats(data) {
    $('real-feel').textContent = formatTempWithUnit(data.current.apparent_temperature);

    const wind = Math.round(data.current.wind_speed_10m);
    const dir = windDirection(data.current.wind_direction_10m);
    $('wind').textContent = `${wind} km/h ${dir}`;

    const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
    $('sunrise').textContent = new Date(data.daily.sunrise[0]).toLocaleTimeString('en-US', timeOpts);
    $('sunset').textContent = new Date(data.daily.sunset[0]).toLocaleTimeString('en-US', timeOpts);

    const uv = Math.round(data.daily.uv_index_max[0]);
    $('uv').textContent = `${uv} · ${getUvLabel(uv)}`;

    $('chance-of-rain').textContent = `${data.daily.precipitation_probability_max[0]}%`;
}

function displayHourly(data) {
    const container = $('hourly-forecast');
    const hours = data.hourly.time;
    const now = Date.now();

    let startIndex = 0;
    for (let i = 0; i < hours.length; i++) {
        if (new Date(hours[i]).getTime() >= now - 30 * 60 * 1000) {
            startIndex = i;
            break;
        }
    }

    const fragment = document.createDocumentFragment();
    const end = Math.min(startIndex + 24, hours.length);

    for (let i = startIndex; i < end; i++) {
        const hourDate = new Date(hours[i]);
        const code = data.hourly.weathercode[i];
        const info = weatherIcons[code] || { icon: '❓' };
        const isNow = i === startIndex;

        const item = document.createElement('div');
        item.className = 'hourly-item';
        item.style.animationDelay = `${(i - startIndex) * 0.03}s`;
        item.innerHTML = `
            <span class="hourly-time">${isNow ? 'Now' : hourDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}</span>
            <span class="hourly-icon">${info.icon}</span>
            <span class="hourly-temp">${formatTemp(data.hourly.temperature_2m[i])}</span>`;
        fragment.appendChild(item);
    }

    container.replaceChildren(fragment);
}

function displayForecast(data) {
    const container = $('forecast');
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 7; i++) {
        const date = new Date(data.daily.time[i]);
        const dayName = i === 0 ? 'Today' : DAYS_SHORT[date.getDay()];
        const code = data.daily.weathercode[i];
        const info = weatherIcons[code] || { icon: '❓', desc: 'Unknown' };
        const hi = formatTemp(data.daily.temperature_2m_max[i]);
        const lo = formatTemp(data.daily.temperature_2m_min[i]);

        const item = document.createElement('div');
        item.className = 'forecast-item';
        item.style.animationDelay = `${i * 0.05}s`;
        item.innerHTML = `
            <span class="forecast-day">${dayName}</span>
            <span class="forecast-desc">${info.icon} ${info.desc}</span>
            <span class="forecast-temps">${hi}<span class="low"> / ${lo}</span></span>`;
        fragment.appendChild(item);

        if (i < 6) {
            const hr = document.createElement('hr');
            hr.className = 'forecast-divider';
            fragment.appendChild(hr);
        }
    }

    container.replaceChildren(fragment);
}

function useGeolocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser.');
        return;
    }

    showLoading(true);
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            try {
                if (state.abortController) state.abortController.abort();
                state.abortController = new AbortController();
                const { signal } = state.abortController;

                const [data, city] = await Promise.all([
                    getWeatherData(lat, lon, signal),
                    reverseGeocode(lat, lon, signal),
                ]);
                displayAll(data, city, { lat, lon });
            } catch (err) {
                if (err.name !== 'AbortError') showToast('Could not fetch weather for your location.');
            } finally {
                showLoading(false);
            }
        },
        () => {
            showLoading(false);
            searchCity('Sydney');
        },
        { enableHighAccuracy: false, timeout: 10000 }
    );
}

function toggleUnit() {
    state.unit = state.unit === 'C' ? 'F' : 'C';
    localStorage.setItem(UNIT_KEY, state.unit);
    els.unitLabel.textContent = state.unit;

    const lat = state.lastLat;
    const lon = state.lastLon;
    const city = state.lastCity;
    if (lat != null && lon != null && city) {
        const cached = getCached(lat, lon);
        if (cached) displayAll(cached, city);
    }
}

els.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    searchCity(els.cityInput.value);
});

$('gps').addEventListener('click', useGeolocation);

els.unitToggle.addEventListener('click', toggleUnit);

els.cityInput.addEventListener('focus', renderRecentSearches);

els.recentList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-city]');
    if (!btn) return;
    searchCity(btn.dataset.city);
    els.recentList.hidden = true;
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-wrap')) {
        els.recentList.hidden = true;
    }
});

els.unitLabel.textContent = state.unit;

window.addEventListener('DOMContentLoaded', useGeolocation);
