export default function HomePage() {
  return (
    <section className="flex flex-col items-center justify-center h-screen text-center pt-16">
      <h1 className="text-4xl font-bold mb-4 text-gray-900">Travel AI Platform</h1>
      <p className="text-gray-800 mb-8 max-w-xl">
        Discover spontaneous events and experiences powered by AI and real travelers.
      </p>
      <a href="/explore" className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:bg-blue-700">
        Explore Now
      </a>
    </section>
  );
}
