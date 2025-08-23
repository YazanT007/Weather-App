const weatherAPI = "2c05143f2f800800849b31b5ad818e8f";
const search = document.querySelector(".search-box");
const enterCity = document.getElementById("enter-city");

search.addEventListener("submit", async event => {
    event.preventDefault();
    const city = enterCity.value.trim();
    if (city) {
        try {
            const coords = await getCoordinates(city);
            const weatherData = await getWeatherData(coords.lat, coords.lon);
            displayWeatherInfo(weatherData, city);
        } catch (error) {
            console.error(error);
            alert("City not found or error fetching data.");
        }
    }
});

async function getCoordinates(city) {
    const geoURL = `https://nominatim.openstreetmap.org/search?format=json&q=${city}`;
    const response = await fetch(geoURL);
    const data = await response.json();
    if (data.length === 0) {
        throw new Error("City not found");
    }
    return { lat: data[0].lat, lon: data[0].lon };
}

async function getWeatherData(lat, lon) {
    const weatherURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,wind_speed_10m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto`;
    const response = await fetch(weatherURL);
    if (!response.ok) throw new Error("Weather data fetch failed");
    const data = await response.json();
    console.log(data);
    displayForecast(data);
    return data;
}

function displayWeatherInfo(data, city) {
    document.getElementById("city-display").textContent = capitalizeFirstLetter(city);

    const todayTemp = Math.round(data.current.temperature_2m);
    document.getElementById("temp").textContent = `${todayTemp}° C`;

    const cityDate = getCityDate(data.timezone);
    document.getElementById("date").textContent = getFormatDate(cityDate);

    const realFeel = Math.round(data.current.apparent_temperature);
    document.getElementById("real-feel").textContent = realFeel;

    const windSpeed = Math.round(data.current.wind_speed_10m);
    document.getElementById("wind").textContent = `${windSpeed} km/h`;

    const sunRise = new Date(data.daily.sunrise[0]).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
    document.getElementById("sunrise").textContent = sunRise;

    const sunSet = new Date(data.daily.sunset[0]).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
    document.getElementById("sunset").textContent = sunSet;

    const uvIndex = Math.round(data.daily.uv_index_max[0]);
    document.getElementById("uv").textContent = uvIndex;

    const rainChance = data.daily.precipitation_probability_max[0];
    document.getElementById("chance-of-rain").textContent = `${rainChance}%`;


}

function capitalizeFirstLetter(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getCityDate(timezone) {
    const now = new Date();

    const cityTimeStr = now.toLocaleString("en-US", { timeZone: timezone });
    const cityDate = new Date(cityTimeStr);

    return cityDate;
}

function getFormatDate(date) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const AMPM = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12

    return `${dayName}, ${day} ${monthName} ${year} | ${hours}:${minutes} ${AMPM}`;
}

const weatherIcons = {
    // Clear sky
    0: { icon: "☀️", desc: "Clear sky" },

    // Mainly clear, partly cloudy, overcast
    1: { icon: "🌤️", desc: "Mainly clear" },
    2: { icon: "⛅", desc: "Partly cloudy" },
    3: { icon: "☁️", desc: "Overcast" },

    // Fog
    45: { icon: "🌫️", desc: "Fog" },
    48: { icon: "🌫️", desc: "Depositing rime fog" },

    // Drizzle
    51: { icon: "🌦️", desc: "Light drizzle" },
    53: { icon: "🌦️", desc: "Moderate drizzle" },
    55: { icon: "🌦️", desc: "Dense drizzle" },
    56: { icon: "🌧️", desc: "Light freezing drizzle" },
    57: { icon: "🌧️", desc: "Dense freezing drizzle" },

    // Rain
    61: { icon: "🌧️", desc: "Slight rain" },
    63: { icon: "🌧️", desc: "Moderate rain" },
    65: { icon: "🌧️", desc: "Heavy rain" },
    66: { icon: "🌧️❄️", desc: "Light freezing rain" },
    67: { icon: "🌧️❄️", desc: "Heavy freezing rain" },

    // Snowfall
    71: { icon: "🌨️", desc: "Slight snow" },
    73: { icon: "🌨️", desc: "Moderate snow" },
    75: { icon: "❄️", desc: "Heavy snow" },
    77: { icon: "🌨️", desc: "Snow grains" },

    // Rain showers
    80: { icon: "🌦️", desc: "Slight rain showers" },
    81: { icon: "🌦️", desc: "Moderate rain showers" },
    82: { icon: "🌧️🌧️", desc: "Violent rain showers" },

    // Snow showers
    85: { icon: "🌨️", desc: "Slight snow showers" },
    86: { icon: "❄️", desc: "Heavy snow showers" },

    // Thunderstorm
    95: { icon: "⛈️", desc: "Thunderstorm" },
    96: { icon: "⛈️🌨️", desc: "Thunderstorm with slight hail" },
    99: { icon: "⛈️❄️", desc: "Thunderstorm with heavy hail" }
};

function displayForecast(data) {
    const forecastContainer = document.getElementById("forecast");
    forecastContainer.innerHTML = "";

    const days = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];

    for (let i = 0; i < 7; i++) {
        const date = new Date(data.daily.time[i]);
        const dayName = i === 0 ? "Today" : days[date.getDay()];
        const temp = Math.round(data.daily.temperature_2m_max[i]);
        const code = data.daily.weathercode[i];
        const weather = weatherIcons[code] || { icon: "❓", desc: "Unknown" };

        const iconInfo = weatherIcons[code] || { icon: "❓" };
        document.getElementById("weather-icon").textContent = iconInfo.icon;

        const forecastItem = document.createElement("div");
        forecastItem.classList.add("stat2");
        forecastItem.innerHTML = `
            <span>${dayName}</span>
            <span>${weather.icon} ${weather.desc}</span>
            <span>${temp}°</span>`;
        forecastContainer.appendChild(forecastItem);

        if (i < 6) {
            const hr = document.createElement("hr");
            forecastContainer.appendChild(hr);
        }
    }
}

window.onload = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    // Fetch weather data for current location
                    const weatherData = await getWeatherData(lat, lon);

                    const geoURL = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
                    const response = await fetch(geoURL);
                    const locationData = await response.json();
                    const city = locationData.address.city ||
                        locationData.address.town ||
                        locationData.address.village ||
                        locationData.address.state || "Your Location";

                    displayWeatherInfo(weatherData, city);

                } catch (err) {
                    console.error("Error fetching location weather:", err);
                }
            },
            () => {
                // If user denies location, default to Sydney just because I live here :)
                getCoordinates("Sydney").then(coords => {
                    getWeatherData(coords.lat, coords.lon).then(data => {
                        displayWeatherInfo(data, "Sydney");
                    });
                });
            }
        );
    } else {
        alert("Geolocation not supported by your browser.");
    }
};

