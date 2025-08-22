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
    const weatherURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;
    const response = await fetch(weatherURL);
    if (!response.ok) throw new Error("Weather data fetch failed");
    const data = await response.json();
    console.log(data);
    return data;
}

function displayWeatherInfo(data, city) {
    document.getElementById("city-display").textContent = capitalizeFirstLetter(city);

    const todayTemp = Math.round(data.daily.temperature_2m_max[0]);
    document.getElementById("temp").textContent = `${todayTemp}° C`;

    const cityDate = getCityDate(data.timezone);
    document.getElementById("date").textContent = getFormatDate(cityDate);
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

function getFormatDate(date){
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2,"0");
    const AMPM = hours >=12 ? "PM" : "AM";
    hours = hours % 12 || 12 

    return `${dayName}, ${day} ${monthName} ${year} | ${hours}:${minutes} ${AMPM}`;
}

