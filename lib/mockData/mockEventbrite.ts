export interface MockEventbriteEvent {
  id: string;
  title: string;
  category: "event";
  description: string;
  location: { lat: number; lng: number; address?: string };
  startTime: string;
  imageUrl: string;
  source: "Eventbrite";
  tags: string[];
  moods: string[];
}

export const mockEventbrite: MockEventbriteEvent[] = [
  {
    id: "evt1",
    title: "Sunset Rooftop Mixer",
    category: "event",
    description: "Enjoy cocktails and live music with locals overlooking the skyline.",
    location: { lat: 38.908, lng: -77.04, address: "123 Main St NW, Washington, DC" },
    startTime: "2025-11-08T19:00:00-05:00",
    imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
    source: "Eventbrite",
    tags: ["live music", "food", "nightlife"],
    moods: ["social", "romantic"],
  },
  {
    id: "evt2",
    title: "District Street Food Festival",
    category: "event",
    description: "Sample global flavors from DC's best street food vendors.",
    location: { lat: 38.91, lng: -77.03, address: "600 5th St NW, Washington, DC" },
    startTime: "2025-11-09T12:00:00-05:00",
    imageUrl: "https://images.unsplash.com/photo-1504753793650-d4a2b783c15e",
    source: "Eventbrite",
    tags: ["food", "outdoors", "family"],
    moods: ["social", "adventurous"],
  },
  {
    id: "evt3",
    title: "Late Night Jazz Sessions",
    category: "event",
    description: "Immerse in smooth jazz with guest performers from the local scene.",
    location: { lat: 38.915, lng: -77.045, address: "800 16th St NW, Washington, DC" },
    startTime: "2025-11-08T22:00:00-05:00",
    imageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063",
    source: "Eventbrite",
    tags: ["live music", "nightlife"],
    moods: ["social", "creative"],
  },
  {
    id: "evt4",
    title: "Weekend Wellness Retreat",
    category: "event",
    description: "Yoga, meditation, and mindfulness workshops in a serene garden.",
    location: { lat: 38.921, lng: -77.05, address: "2501 Calvert St NW, Washington, DC" },
    startTime: "2025-11-09T09:00:00-05:00",
    imageUrl: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70",
    source: "Eventbrite",
    tags: ["wellness", "outdoors", "mindfulness"],
    moods: ["relaxed", "introspective"],
  },
  {
    id: "evt5",
    title: "Capital Tech Demo Day",
    category: "event",
    description: "Discover emerging startups showcasing prototypes and ideas.",
    location: { lat: 38.8977, lng: -77.0365, address: "1451 Pennsylvania Ave NW, Washington, DC" },
    startTime: "2025-11-10T14:00:00-05:00",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
    source: "Eventbrite",
    tags: ["tech", "networking", "innovation"],
    moods: ["curious", "ambitious"],
  },
  {
    id: "evt6",
    title: "Farm-to-Table Chef's Table",
    category: "event",
    description: "Chef-led tasting featuring seasonal ingredients from local farms.",
    location: { lat: 38.9072, lng: -77.025, address: "501 K St NW, Washington, DC" },
    startTime: "2025-11-08T18:30:00-05:00",
    imageUrl: "https://images.unsplash.com/photo-1421622548261-c45bfe178854",
    source: "Eventbrite",
    tags: ["food", "fine dining", "local"],
    moods: ["romantic", "celebratory"],
  },
];


