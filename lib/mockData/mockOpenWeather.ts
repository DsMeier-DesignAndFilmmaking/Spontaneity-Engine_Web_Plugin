export interface MockOpenWeatherReport {
  id: string;
  title: string;
  category: "weather";
  description: string;
  location: { lat: number; lng: number; address?: string };
  imageUrl: string;
  source: "OpenWeather";
  tags: string[];
  moods: string[];
  startTime: string;
  temperatureC: number;
  feelsLikeC: number;
  condition: "sunny" | "cloudy" | "rain" | "snow" | "windy";
  humidity: number;
}

export const mockOpenWeather: MockOpenWeatherReport[] = [
  {
    id: "ow1",
    title: "Golden Hour Skies",
    category: "weather",
    description: "Clear skies with warm temperatures — perfect for sunset rooftops.",
    location: { lat: 38.9072, lng: -77.0369, address: "Downtown Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    source: "OpenWeather",
    tags: ["outdoors", "sunset"],
    moods: ["romantic", "social"],
    startTime: "2025-11-08T18:00:00-05:00",
    temperatureC: 23,
    feelsLikeC: 24,
    condition: "sunny",
    humidity: 48,
  },
  {
    id: "ow2",
    title: "Chilly Morning Breeze",
    category: "weather",
    description: "Cool temperatures and light winds — ideal for park strolls.",
    location: { lat: 38.9301, lng: -77.0329, address: "Columbia Heights, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
    source: "OpenWeather",
    tags: ["morning", "outdoors"],
    moods: ["introspective", "relaxed"],
    startTime: "2025-11-09T07:00:00-05:00",
    temperatureC: 12,
    feelsLikeC: 10,
    condition: "cloudy",
    humidity: 60,
  },
  {
    id: "ow3",
    title: "Drizzle and Cozy Vibes",
    category: "weather",
    description: "Light rain expected — perfect excuse for museums and cafes.",
    location: { lat: 38.8895, lng: -77.0353, address: "National Mall, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1470115636492-6d2b56f9146e",
    source: "OpenWeather",
    tags: ["rainy", "indoor"],
    moods: ["cozy", "creative"],
    startTime: "2025-11-09T15:00:00-05:00",
    temperatureC: 16,
    feelsLikeC: 15,
    condition: "rain",
    humidity: 78,
  },
  {
    id: "ow4",
    title: "Crisp Evening Gusts",
    category: "weather",
    description: "Breezy evening with low humidity — great for night markets.",
    location: { lat: 38.9072, lng: -77.025, address: "Mount Vernon Square, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1431440869543-efaf3388c585",
    source: "OpenWeather",
    tags: ["evening", "outdoors"],
    moods: ["adventurous", "social"],
    startTime: "2025-11-08T21:00:00-05:00",
    temperatureC: 18,
    feelsLikeC: 17,
    condition: "windy",
    humidity: 52,
  },
  {
    id: "ow5",
    title: "Bluebird Afternoon",
    category: "weather",
    description: "Bright skies with comfortable temps — ideal for long walks.",
    location: { lat: 38.91, lng: -77.03, address: "Penn Quarter, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    source: "OpenWeather",
    tags: ["afternoon", "outdoors"],
    moods: ["energized", "curious"],
    startTime: "2025-11-09T13:00:00-05:00",
    temperatureC: 21,
    feelsLikeC: 22,
    condition: "sunny",
    humidity: 44,
  },
];


