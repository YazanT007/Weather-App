# Atmos (Weather App) 🌦️

A modern, responsive **weather dashboard** that delivers real-time conditions and forecasts using the [Open-Meteo API](https://open-meteo.com/).  
Search any city, use your current location, and instantly view live weather with a clean, glassmorphic UI.

---

## Features

- **Search by city** → geocoded via [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- **Geolocation** → auto-detect your location on load, or tap the GPS button anytime
- **Recent searches** → last 5 cities saved locally for quick access
- **°C / °F toggle** → unit preference saved in `localStorage`

### Current Weather
- City name & local date/time
- Current temperature with daily high/low
- Weather icon & description (clear, cloudy, rainy, etc.)
- Dynamic background theme based on conditions and time of day

### Air Conditions
- Real Feel (apparent temperature)
- Wind speed & direction (km/h)
- UV Index with risk level (Low, Moderate, High, etc.)
- Chance of rain
- Sunrise & sunset (location timezone)

### Hourly Forecast
- Scrollable **24-hour** outlook with icons and temperatures

### 7-Day Forecast
- Daily high/low temperatures
- Weather icons & short descriptions
- Day of the week

---

## Tech Stack

- **HTML5** — semantic structure
- **CSS3** — glassmorphism, CSS variables, responsive grid, dynamic themes
- **JavaScript (Vanilla JS)** — API fetching, caching, and DOM updates
- **Google Fonts** — [Outfit](https://fonts.google.com/specimen/Outfit)

### APIs
| Service | Purpose |
|---------|---------|
| [Open-Meteo](https://open-meteo.com/) | Weather data (current, hourly, daily) |
| [Nominatim](https://nominatim.openstreetmap.org/) | City search & reverse geocoding |

---

## App Preview

<img width="1219" height="826" alt="image" src="https://github.com/user-attachments/assets/f2130f37-339e-497b-8262-fb0fdf02ada2" />


---

## Try It Out

👉 [Click here to try the Weather App](https://weatherapp-made-by-yazant007.netlify.app/)  

---
