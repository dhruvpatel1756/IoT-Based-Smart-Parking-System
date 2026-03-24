import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Clock, MapPin } from "lucide-react";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom green marker for available parking
const createParkingIcon = (available: number) => {
  const color = available > 0 ? "#10b981" : "#ef4444";
  return L.divIcon({
    className: "custom-parking-marker",
    html: `
      <div style="
        background: ${color};
        color: white;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">${available}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

interface ParkingLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  total_slots: number;
  price_per_hour: number;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  available_count?: number;
}

interface ParkingMapProps {
  locations: ParkingLocation[];
}

function FitBounds({ locations }: { locations: ParkingLocation[] }) {
  const map = useMap();

  useEffect(() => {
    const validLocations = locations.filter((l) => l.latitude && l.longitude);
    if (validLocations.length > 0) {
      const bounds = L.latLngBounds(
        validLocations.map((l) => [l.latitude!, l.longitude!] as L.LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [locations, map]);

  return null;
}

export default function ParkingMap({ locations }: ParkingMapProps) {
  const validLocations = locations.filter((l) => l.latitude && l.longitude);

  if (validLocations.length === 0) {
    return (
      <div className="w-full h-[500px] rounded-xl bg-muted flex items-center justify-center border border-border">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No locations with coordinates available</p>
          <p className="text-muted-foreground text-sm">Parking owners need to add coordinates to their locations.</p>
        </div>
      </div>
    );
  }

  const center: L.LatLngTuple = [
    validLocations.reduce((sum, l) => sum + l.latitude!, 0) / validLocations.length,
    validLocations.reduce((sum, l) => sum + l.longitude!, 0) / validLocations.length,
  ];

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-border shadow-card">
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds locations={validLocations} />
        {validLocations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.latitude!, loc.longitude!]}
            icon={createParkingIcon(loc.available_count || 0)}
          >
            <Popup>
              <div className="min-w-[200px] p-1">
                <Link
                  to={`/parking/${loc.id}`}
                  className="font-semibold text-base hover:underline text-primary"
                >
                  {loc.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {loc.address}, {loc.city}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium flex items-center gap-0.5">
                    ₹{loc.price_per_hour}/hr
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {loc.available_count || 0}/{loc.total_slots} free
                  </span>
                </div>
                <Link
                  to={`/parking/${loc.id}`}
                  className="block mt-2 text-center text-xs bg-primary text-primary-foreground rounded px-3 py-1.5 hover:opacity-90 transition-opacity"
                >
                  Book Now
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
