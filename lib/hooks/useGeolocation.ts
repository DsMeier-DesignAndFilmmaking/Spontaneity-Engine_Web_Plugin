import { useState, useEffect } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * Custom hook to get user's current geolocation
 * Works on both mobile and desktop browsers
 */
export function useGeolocation(options: GeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000, // Cache for 1 minute
  } = options;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setState({
        latitude: null,
        longitude: null,
        accuracy: null,
        error: "Geolocation is not supported by your browser",
        loading: false,
      });
      return;
    }

    // Get current position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMessage = "Unknown error occurred";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
          default:
            errorMessage = `An unknown error occurred: ${error.message}`;
            break;
        }

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );

    // Cleanup: clear watch on unmount
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enableHighAccuracy, timeout, maximumAge]);

  return state;
}

/**
 * Get user's current location once (non-watching)
 * Returns a promise with the location or error
 */
export async function getCurrentLocation(
  options: GeolocationOptions = {}
): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage = "Unknown error occurred";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
          default:
            errorMessage = error.message || "Unknown error";
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 60000,
      }
    );
  });
}

