import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15, { animate: true });
  }, [lat, lng, map]);
  return null;
}

interface LocationPreviewMapProps {
  latitude: string;
  longitude: string;
}

export default function LocationPreviewMap({ latitude, longitude }: LocationPreviewMapProps) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const isValid = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  if (!isValid) {
    return (
      <div className="w-full h-[160px] rounded-lg bg-muted flex items-center justify-center border border-border">
        <p className="text-xs text-muted-foreground">Enter valid coordinates to see map preview</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[160px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        className="w-full h-full z-0"
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} />
        <RecenterMap lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
