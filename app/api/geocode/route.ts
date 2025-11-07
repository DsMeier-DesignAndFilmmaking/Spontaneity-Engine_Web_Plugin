import { NextResponse } from "next/server";

/**
 * Server-side geocoding API to protect Mapbox key
 * Frontend should use this instead of calling Mapbox directly
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lng = searchParams.get("lng");
    const lat = searchParams.get("lat");

    if (!lng || !lat) {
      return NextResponse.json(
        { error: "Missing longitude or latitude" },
        { status: 400 }
      );
    }

    const mapboxToken = process.env.MAPBOX_KEY || process.env.NEXT_PUBLIC_MAPBOX_KEY;

    if (!mapboxToken) {
      console.error("Mapbox API key not configured");
      // Return coordinates as fallback instead of error
      return NextResponse.json({
        placeName: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      });
    }

    try {
      // Reverse geocode using Mapbox (server-side only)
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=place`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Mapbox API error:", response.status, errorText);
        // Fallback to coordinates instead of throwing error
        return NextResponse.json({
          placeName: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
          coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
        });
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const placeName = data.features[0].text || data.features[0].place_name;
        return NextResponse.json({ 
          placeName, 
          coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) } 
        });
      }

      // Fallback to coordinates if no features found
      return NextResponse.json({
        placeName: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      });
    } catch (fetchError: any) {
      console.error("Geocoding fetch error:", fetchError);
      // Return coordinates as fallback instead of error
      return NextResponse.json({
        placeName: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      });
    }
  } catch (error: any) {
    console.error("Geocoding error:", error);
    // Try to extract coordinates from error context if available
    const lat = new URL(req.url).searchParams.get("lat");
    const lng = new URL(req.url).searchParams.get("lng");
    
    if (lat && lng) {
      return NextResponse.json({
        placeName: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      });
    }
    
    return NextResponse.json(
      { error: "Failed to geocode location", message: error.message },
      { status: 500 }
    );
  }
}

