"use client";

import { memo } from "react";

interface WeatherData {
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
    };
    humidity: number;
    wind_kph: number;
    wind_dir: string;
    vis_km: number;
    uv: number;
    feelslike_c: number;
    pressure_mb: number;
  };
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
  };
}

interface WeatherResultsProps {
  data: WeatherData;
}

export const WeatherResults = memo(({ data }: WeatherResultsProps) => {
  if (!data || !data.current || !data.location) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          🌤️ Weather Information
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Weather data not available.
        </p>
      </div>
    );
  }

  const { current, location } = data;
  
  // Get weather icon
  const weatherIcon = current.condition.icon.startsWith('//')
    ? `https:${current.condition.icon}`
    : current.condition.icon;

  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        🌤️ Weather in {location.name}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main weather info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <img 
              src={weatherIcon} 
              alt={current.condition.text}
              className="w-12 h-12"
            />
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {current.temp_c}°C
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {current.temp_f}°F
              </div>
            </div>
          </div>
          
          <div className="text-gray-700 dark:text-gray-300 mb-2">
            {current.condition.text}
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Feels like {current.feelslike_c}°C
          </div>
        </div>

        {/* Additional details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">
            Details
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">💧 Humidity:</span>
              <span className="text-gray-800 dark:text-gray-200">{current.humidity}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">💨 Wind:</span>
              <span className="text-gray-800 dark:text-gray-200">
                {current.wind_kph} km/h {current.wind_dir}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">👁️ Visibility:</span>
              <span className="text-gray-800 dark:text-gray-200">{current.vis_km} km</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">☀️ UV Index:</span>
              <span className="text-gray-800 dark:text-gray-200">{current.uv}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">🌡️ Pressure:</span>
              <span className="text-gray-800 dark:text-gray-200">{current.pressure_mb} mb</span>
            </div>
          </div>
        </div>
      </div>

      {/* Location and time info */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>📍 {location.name}, {location.region}, {location.country}</span>
          <span>🕒 {new Date(location.localtime).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
});

WeatherResults.displayName = "WeatherResults";