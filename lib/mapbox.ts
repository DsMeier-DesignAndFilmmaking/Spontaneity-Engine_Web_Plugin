import mapboxgl from "mapbox-gl";
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY || "";
export default mapboxgl;

