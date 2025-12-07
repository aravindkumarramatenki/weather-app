import React, { useState, useEffect, useCallback } from 'react';

const DEFAULT_CITY = 'New Delhi';
const NEW_DELHI_COORDS = { lat: 28.65195, lon: 77.22896 }; // Hardcoded coordinates for New Delhi

// Helper function to convert Unix timestamp (seconds) to Day of the week
const getDayName = (dtSeconds) => {
  return new Date(dtSeconds * 1000).toLocaleDateString('en-US', { weekday: 'short' });
};

// Helper function to format temperature
const formatTemp = (temp) => {
  if (temp === null || temp === undefined || Number.isNaN(temp)) return '--';
  return `${Math.round(temp)}°C`;
};

// Map Open-Meteo weather codes to human readable text
const weatherCodeToDescription = (code) => {
  // Reference mapping based on Open-Meteo/WMO common codes
  const c = Number(code);
  if (c === 0) return 'Clear sky';
  if (c === 1) return 'Mainly clear';
  if (c === 2) return 'Partly cloudy';
  if (c === 3) return 'Overcast';
  if (c === 45 || c === 48) return 'Fog';
  if (c >= 51 && c <= 57) return 'Drizzle';
  if (c >= 61 && c <= 67) return 'Rain';
  if (c >= 71 && c <= 77) return 'Snow';
  if (c >= 80 && c <= 82) return 'Showers';
  if (c >= 95 && c <= 99) return 'Thunderstorm';
  return 'Unknown';
};

// Map Open-Meteo weather codes to icon names used by LucideIcon (string keys)
const weatherCodeToIcon = (code) => {
  const c = Number(code);
  if (c === 0) return 'sun';
  if (c === 1 || c === 2) return 'cloud';
  if (c === 3) return 'cloud';
  if (c === 45 || c === 48) return 'fog';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'cloud-rain';
  if (c >= 71 && c <= 77) return 'cloud-snow';
  if (c >= 95 && c <= 99) return 'cloud-lightning';
  return 'thermometer-sun';
};

// Dynamic Icon Component using inline SVG for minimal dependencies
const LucideIcon = ({ name, size = 24, className = '' }) => {
  const icons = {
    'cloud': `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h.79a4.5 4.5 0 1 1 0 9Z"/><path d="M22 10a4 4 0 0 0-3.32-5.91l-.22-.05"/><path d="M18 10a4 4 0 0 0-3.32-5.91l-.22-.05"/>`,
    'sun': `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`,
    'cloud-rain': `<path d="M4 14.5a3.5 3.5 0 0 1 3.28-3.34 5.5 5.5 0 0 1 10.32-1.22 3.5 3.5 0 0 1 1.28 6.55"/><path d="m16 21-4-4-4 4"/>`,
    'cloud-lightning': `<path d="M6 10a7 7 0 1 1 6.71 9H17a4 4 0 0 1 0 8H7a4 4 0 0 1-.72-7.28"/><path d="m13 15-4-8 5 4 4-8"/>`,
    'cloud-snow': `<path d="M4 14.5a3.5 3.5 0 0 1 3.28-3.34 5.5 5.5 0 0 1 10.32-1.22 3.5 3.5 0 0 1 1.28 6.55"/><path d="M10 20h.01"/><path d="M14 20h.01"/><path d="M12 18h.01"/><path d="M16 20h.01"/>`,
    'fog': `<path d="M3 11s2 3 7 3 7-3 7-3"/><path d="M3 15s2 3 7 3 7-3 7-3"/><path d="M17 11s2 3 7 3 7-3 7-3"/><path d="M17 15s2 3 7 3 7-3 7-3"/><path d="M7 11s2 3 7 3 7-3 7-3"/><path d="M7 15s2 3 7 3 7-3 7-3"/>`,
    'thermometer-sun': `<path d="M14 4a2 2 0 1 0 0 4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`,
    'search': `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,
  };
  const svgContent = icons[name] || icons.sun;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: svgContent }}
      className={className}
    />
  );
};

export default function App() {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [searchTerm, setSearchTerm] = useState(DEFAULT_CITY);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeather = useCallback(async (location) => {
    if (!location) return;

    setLoading(true);
    setError(null);

    let lat, lon, place;
    let initialLoadFallback = false;

    // We rely on the hardcoded coordinates for the default city to ensure startup success.
    if (location.toLowerCase() === DEFAULT_CITY.toLowerCase()) {
      lat = NEW_DELHI_COORDS.lat;
      lon = NEW_DELHI_COORDS.lon;
      place = { name: DEFAULT_CITY, country: 'India' };
      initialLoadFallback = true;
    } else {
      // 1b. Geocoding attempt for all other searches
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en`
        );

        if (!geoRes.ok) {
          throw new Error('Failed to geocode location due to network error.');
        }

        const geoData = await geoRes.json();

        if (geoData.results && geoData.results.length > 0) {
          place = geoData.results[0];
          lat = place.latitude;
          lon = place.longitude;
        } else {
          throw new Error('Location not found. Please try a different city name.');
        }
      } catch (err) {
        throw err; 
      }
    }

    // 2. Fetch weather: current + daily forecast + hourly humidity
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&hourly=relativehumidity_2m&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);

      if (!weatherRes.ok) {
        throw new Error('Failed to fetch weather data.');
      }

      const weatherData = await weatherRes.json();

      // Extract current weather
      const cw = weatherData.current_weather || null;
      if (!cw) {
        throw new Error('Current weather data not available.');
      }

      // Find humidity for the current hour from hourly data (if available)
      let humidity = '--';
      if (weatherData.hourly && Array.isArray(weatherData.hourly.time) && weatherData.hourly.relativehumidity_2m) {
        const currentTimeISO = cw.time;
        const idx = weatherData.hourly.time.indexOf(currentTimeISO);
        if (idx !== -1) {
          humidity = weatherData.hourly.relativehumidity_2m[idx];
        } else {
          // fallback: try matching by hour string
          const hourOnly = currentTimeISO.slice(0, 13); // YYYY-MM-DDTHH
          const idx2 = weatherData.hourly.time.findIndex(t => t.slice(0,13) === hourOnly);
          if (idx2 !== -1) humidity = weatherData.hourly.relativehumidity_2m[idx2];
        }
      }

      // Prepare currentWeather object
      setCurrentWeather({
        temp: cw.temperature,
        feelsLike: cw.temperature, 
        description: weatherCodeToDescription(cw.weathercode),
        main: weatherCodeToDescription(cw.weathercode),
        humidity: humidity === '--' ? '--' : `${humidity}%`,
        windSpeed: cw.windspeed,
        city: initialLoadFallback ? DEFAULT_CITY : place.name,
        country: place.country,
        weatherCode: cw.weathercode,
      });

      // Prepare 5-day forecast from daily arrays
      const daily = weatherData.daily || {};
      const times = daily.time || [];
      const tempMax = daily.temperature_2m_max || [];
      const tempMin = daily.temperature_2m_min || [];
      const codes = daily.weathercode || [];

      // Build forecast list: skip today's entry (index 0) and take next 5 days
      const forecastList = [];
      for (let i = 1; i < times.length && forecastList.length < 5; i++) {
        const dateStr = times[i]; 
        const dtSeconds = Math.floor(new Date(dateStr).getTime() / 1000); 
        forecastList.push({
          dt: dtSeconds,
          temp: tempMax[i] ?? tempMin[i] ?? null,
          tempMax: tempMax[i] ?? null,
          tempMin: tempMin[i] ?? null,
          description: weatherCodeToDescription(codes[i]),
          main: weatherCodeToDescription(codes[i]),
          weatherCode: codes[i],
        });
      }

      setForecast(forecastList);
      setCity(initialLoadFallback ? DEFAULT_CITY : place.name);
    } catch (err) {
        console.error("Weather data fetch error:", err);
        setError(err.message || 'An unknown error occurred while fetching weather data.');
        setCurrentWeather(null);
        setForecast([]);
    } finally {
      setLoading(false);
    }
  }, []); 

  // Effect to trigger API call whenever the 'city' state changes
  useEffect(() => {
    if (city) {
        fetchWeather(city);
    }
  }, [city, fetchWeather]); 

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim() !== '' && searchTerm.trim().toLowerCase() !== city.toLowerCase()) {
      setCity(searchTerm.trim());
    }
  };

  const getWeatherIcon = (code) => {
    return weatherCodeToIcon(code);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 p-4 sm:p-8 flex items-start justify-center text-white font-sans">
      <div className="w-full max-w-4xl bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-10 space-y-8">
                
        {/* Header and Search */}
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Aravind
          </h1>
          <p className="text-indigo-200 mt-2 text-lg">Real-time & 5-Day Forecast for India</p>
        </header>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter City Name (e.g., Mumbai, Chennai, Kolkata)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow p-3 bg-white/20 border border-white/30 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none transition duration-200 placeholder-indigo-100/80 text-white"
            aria-label="City Search Input"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 transition duration-200 rounded-xl font-semibold shadow-lg shadow-indigo-500/50 transform active:scale-95"
            disabled={loading}
          >
            {loading ? 'Searching...' : (
              <>
                <LucideIcon name="search" size={20} />
                Search
              </>
            )}
          </button>
        </form>

        {/* Loading and Error States */}
        {loading && (
          <div className="text-center p-8 bg-white/10 rounded-xl">
            <div className="animate-spin h-6 w-6 border-4 border-indigo-400 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-lg">Fetching weather data...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-600/70 border border-red-400 rounded-xl text-center shadow-lg">
            <p className="font-bold text-xl mb-1">Error:</p>
            <p>{error}</p>
            <p className="mt-2 text-sm text-red-100">Hint: Try a different city spelling or check your connection.</p>
          </div>
        )}

        {/* Main Content (Current Weather) */}
        {!loading && !error && currentWeather && (
          <>
            <div className="flex flex-col md:flex-row items-center justify-between bg-white/20 p-6 sm:p-8 rounded-3xl shadow-inner border border-white/30">
              {/* Left: Location and Main Temp */}
              <div className="text-center md:text-left mb-6 md:mb-0">
                <h2 className="text-3xl font-bold mb-1">
                  {currentWeather.city}{currentWeather.country ? `, ${currentWeather.country}` : ''}
                </h2>
                <p className="text-8xl font-black text-white/90">
                  {formatTemp(currentWeather.temp)}
                </p>
                <p className="text-2xl font-semibold text-indigo-200 capitalize">
                  {currentWeather.description}
                </p>
              </div>

              {/* Right: Details */}
              <div className="grid grid-cols-2 gap-4 text-left text-lg w-full md:w-auto md:max-w-xs">
                <div className="p-3 bg-white/10 rounded-lg">
                  <p className="text-indigo-200 text-sm">Feels Like</p>
                  <p className="font-bold">{formatTemp(currentWeather.feelsLike)}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-lg">
                  <p className="text-indigo-200 text-sm">Humidity</p>
                  <p className="font-bold">{currentWeather.humidity ?? '--'}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-lg">
                  <p className="text-indigo-200 text-sm">Wind Speed</p>
                  <p className="font-bold">{currentWeather.windSpeed} m/s</p>
                </div>
                <div className="p-3 bg-white/10 rounded-lg">
                  <p className="text-indigo-200 text-sm">Today</p>
                  <p className="font-bold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* 5-Day Forecast */}
            <h3 className="text-2xl font-bold mt-10 mb-4 pt-4 border-t border-white/30">
              5-Day Forecast
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {forecast.map((day, index) => (
                <div
                  key={day.dt}
                  className="p-4 bg-white/15 rounded-xl text-center shadow-md transform hover:scale-[1.02] transition duration-200 border border-white/20"
                >
                  <p className="font-semibold text-indigo-100 text-sm uppercase mb-2">
                    {getDayName(day.dt)}
                  </p>
                  <div className="mx-auto" style={{ width: 56, height: 56 }}>
                    <LucideIcon name={getWeatherIcon(day.weatherCode)} size={36} className="mx-auto text-indigo-300" />
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {/* Display max temp for forecast day */}
                    {formatTemp(day.tempMax)}
                  </p>
                  <p className="text-xs capitalize text-indigo-200 mt-1">
                    {day.description}
                  </p>
                </div>
              ))}
            </div>
            
            {/* API Note */}
            <p className="text-sm text-center text-white/50 pt-8">
              Data provided by Open-Meteo (no API key required).
            </p>
          </>
        )}
      </div>
    </div>
  );
}