export interface MockFoursquareVenue {
  id: string;
  title: string;
  category: "venue";
  description: string;
  location: { lat: number; lng: number; address?: string };
  imageUrl: string;
  source: "Foursquare";
  tags: string[];
  moods: string[];
  hours?: string;
}

export const mockFoursquare: MockFoursquareVenue[] = [
  {
    id: "fsq1",
    title: "Shaw Art Walk",
    category: "venue",
    description: "Vibrant alleyway of murals and local pop-up galleries.",
    location: { lat: 38.9135, lng: -77.0236, address: "1547 9th St NW, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
    source: "Foursquare",
    tags: ["art", "outdoors", "photography"],
    moods: ["creative", "adventurous"],
    hours: "Open 24 hours",
  },
  {
    id: "fsq2",
    title: "Bluebird Cocktail Lounge",
    category: "venue",
    description: "Craft cocktails, vinyl spins, and a relaxed evening vibe.",
    location: { lat: 38.9192, lng: -77.0425, address: "3300 Georgia Ave NW, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
    source: "Foursquare",
    tags: ["nightlife", "cocktails", "music"],
    moods: ["social", "romantic"],
    hours: "5:00 PM – 1:00 AM",
  },
  {
    id: "fsq3",
    title: "District Game Vault",
    category: "venue",
    description: "Arcade and board-game lounge with craft sodas and local beers.",
    location: { lat: 38.8963, lng: -77.0283, address: "601 F St NW, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
    source: "Foursquare",
    tags: ["games", "indoor", "retro"],
    moods: ["playful", "social"],
    hours: "12:00 PM – 12:00 AM",
  },
  {
    id: "fsq4",
    title: "Anacostia Riverwalk Trail",
    category: "venue",
    description: "Scenic riverside trail perfect for walking, biking, or picnics.",
    location: { lat: 38.8704, lng: -77.0007, address: "1500 M St SE, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
    source: "Foursquare",
    tags: ["outdoors", "fitness", "nature"],
    moods: ["adventurous", "relaxed"],
    hours: "Sunrise to sunset",
  },
  {
    id: "fsq5",
    title: "Capitol Crust Pizza Lab",
    category: "venue",
    description: "Inventive pizzas with seasonal toppings in a lively setting.",
    location: { lat: 38.8816, lng: -76.9905, address: "401 8th St SE, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    source: "Foursquare",
    tags: ["food", "casual", "comfort"],
    moods: ["social", "comfort"],
    hours: "11:00 AM – 11:00 PM",
  },
  {
    id: "fsq6",
    title: "Zen Float Studio",
    category: "venue",
    description: "Sensory deprivation tanks for deep relaxation and reset.",
    location: { lat: 38.9301, lng: -77.0329, address: "2101 14th St NW, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef",
    source: "Foursquare",
    tags: ["wellness", "spa", "mindfulness"],
    moods: ["introspective", "relaxed"],
    hours: "10:00 AM – 10:00 PM",
  },
];


