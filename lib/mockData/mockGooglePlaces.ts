export interface MockGooglePlace {
  id: string;
  title: string;
  category: "place";
  description: string;
  location: { lat: number; lng: number; address?: string };
  imageUrl: string;
  source: "Google Places";
  tags: string[];
  moods: string[];
  bestTimeToVisit?: string;
}

export const mockGooglePlaces: MockGooglePlace[] = [
  {
    id: "gpl1",
    title: "Tidal Basin Paddle Boats",
    category: "place",
    description: "Paddle along the cherry blossoms for serene skyline views.",
    location: { lat: 38.8867, lng: -77.0431, address: "1501 Maine Ave SW, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1526481280695-3c46973ed145",
    source: "Google Places",
    tags: ["outdoors", "water", "views"],
    moods: ["romantic", "relaxed"],
    bestTimeToVisit: "Late afternoon",
  },
  {
    id: "gpl2",
    title: "Smithsonian After Hours",
    category: "place",
    description: "Exclusive evening access to exhibits with live DJs and drinks.",
    location: { lat: 38.8881, lng: -77.0261, address: "600 Independence Ave SW, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
    source: "Google Places",
    tags: ["culture", "nightlife", "museum"],
    moods: ["curious", "social"],
    bestTimeToVisit: "Evenings",
  },
  {
    id: "gpl3",
    title: "Georgetown Waterfront Stroll",
    category: "place",
    description: "Scenic boardwalk with cafes, fountains, and Potomac River breezes.",
    location: { lat: 38.9026, lng: -77.0608, address: "3300 Water St NW, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1491557345352-5929e343eb89",
    source: "Google Places",
    tags: ["outdoors", "food", "views"],
    moods: ["romantic", "relaxed"],
    bestTimeToVisit: "Sunset",
  },
  {
    id: "gpl4",
    title: "Union Market Tastemakers",
    category: "place",
    description: "Artisanal food hall with rotating chef pop-ups and craft goods.",
    location: { lat: 38.9072, lng: -76.9969, address: "1309 5th St NE, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17",
    source: "Google Places",
    tags: ["food", "shopping", "local"],
    moods: ["social", "curious"],
    bestTimeToVisit: "Weekend afternoons",
  },
  {
    id: "gpl5",
    title: "Rock Creek Park Outlook",
    category: "place",
    description: "Tree-lined park trails with quiet overlooks and picnic spots.",
    location: { lat: 38.942, lng: -77.053, address: "3545 Williamsburg Ln NW, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
    source: "Google Places",
    tags: ["outdoors", "nature", "hiking"],
    moods: ["adventurous", "introspective"],
    bestTimeToVisit: "Morning",
  },
  {
    id: "gpl6",
    title: "E Street Cinema Indie Showcase",
    category: "place",
    description: "Independent film screenings with curated selections and Q&As.",
    location: { lat: 38.8966, lng: -77.0283, address: "555 11th St NW, Washington, DC" },
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
    source: "Google Places",
    tags: ["film", "indoor", "culture"],
    moods: ["creative", "introspective"],
    bestTimeToVisit: "Evening showings",
  },
];


