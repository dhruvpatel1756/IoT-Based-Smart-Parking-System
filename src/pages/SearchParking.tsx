import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Clock, Car, IndianRupee, Map, LayoutGrid, X, ArrowUpDown, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import ParkingMap from "@/components/ParkingMap";
import { isCurrentlyPeak, formatPeakHours } from "@/lib/peak-hours";

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
  peak_hour_start: number | null;
  peak_hour_end: number | null;
  peak_price_per_hour: number | null;
}

export default function SearchParking() {
  const [search, setSearch] = useState("");
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of locations) {
      counts[l.city] = (counts[l.city] || 0) + 1;
    }
    return counts;
  }, [locations]);

  const cities = useMemo(() => Object.keys(cityCounts).sort(), [cityCounts]);

  useEffect(() => {
    fetchLocations();

    // Realtime slot availability updates
    const channel = supabase
      .channel("search-slots-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_slots" },
        () => {
          // Re-fetch slot counts when any slot changes
          supabase.from("parking_slots").select("parking_id, status").then(({ data }) => {
            if (!data) return;
            const countMap: Record<string, number> = {};
            for (const slot of data) {
              if (slot.status === "available") {
                countMap[slot.parking_id] = (countMap[slot.parking_id] || 0) + 1;
              }
            }
            setLocations((prev) =>
              prev.map((loc) => ({ ...loc, available_count: countMap[loc.id] || 0 }))
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      // Fetch locations and slot counts in parallel
      const [locationsRes, slotsRes] = await Promise.all([
        supabase.from("parking_locations").select("*").eq("is_approved", true),
        supabase.from("parking_slots").select("parking_id, status"),
      ]);

      if (locationsRes.error) {
        console.error("Error fetching locations:", locationsRes.error);
        setLocations([]);
        return;
      }

      // Build available count map
      const countMap: Record<string, number> = {};
      if (slotsRes.data) {
        for (const slot of slotsRes.data) {
          if (slot.status === "available") {
            countMap[slot.parking_id] = (countMap[slot.parking_id] || 0) + 1;
          }
        }
      }

      const withCounts = (locationsRes.data || []).map((loc) => ({
        ...loc,
        available_count: countMap[loc.id] || 0,
      }));
      setLocations(withCounts);
    } catch (err) {
      console.error("Fetch error:", err);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const result = locations.filter(
      (l) =>
        (selectedCity === "all" || l.city === selectedCity) &&
        (l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.city.toLowerCase().includes(search.toLowerCase()) ||
          l.address.toLowerCase().includes(search.toLowerCase()))
    );
    return result.sort((a, b) => {
      switch (sortBy) {
        case "price-low": return a.price_per_hour - b.price_per_hour;
        case "price-high": return b.price_per_hour - a.price_per_hour;
        case "availability": return (b.available_count || 0) - (a.available_count || 0);
        case "name":
        default: return a.name.localeCompare(b.name);
      }
    });
  }, [locations, selectedCity, search, sortBy]);

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Find <span className="text-gradient">Parking</span>
          </h1>
          <p className="text-muted-foreground mb-6">Search by location, city, or parking name</p>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
            <div className="relative flex-1 min-w-0 w-full sm:max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search city, area, or parking name..."
                className="pl-10 h-12 text-base"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="h-12 w-full sm:w-[160px] text-base">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Cities ({locations.length})</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city} ({cityCounts[city]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-12 w-full sm:w-[180px] text-base">
                  <ArrowUpDown className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="price-low">Price: Low → High</SelectItem>
                  <SelectItem value="price-high">Price: High → Low</SelectItem>
                  <SelectItem value="availability">Most Available</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                {(search || selectedCity !== "all" || sortBy !== "name") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => { setSearch(""); setSelectedCity("all"); setSortBy("name"); }}
                    title="Reset filters"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    className="rounded-none h-12 w-12"
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-5 w-5" />
                  </Button>
                  <Button
                    variant={viewMode === "map" ? "default" : "ghost"}
                    size="icon"
                    className="rounded-none h-12 w-12"
                    onClick={() => setViewMode("map")}
                    title="Map view"
                  >
                    <Map className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold mb-2">No parking found</h3>
            <p className="text-muted-foreground">
              {locations.length === 0 ? "No parking locations available yet." : "Try a different search term."}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === "map" ? (
              <motion.div
                key="map"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <ParkingMap locations={filtered} />
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Showing {filtered.filter(l => l.latitude && l.longitude).length} of {filtered.length} locations on map
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filtered.map((loc, i) => (
                  <motion.div
                    key={loc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/parking/${loc.id}`}>
                      <Card className="overflow-hidden hover:shadow-elevated transition-all duration-300 group cursor-pointer border-border hover:border-primary/30">
                        <div className="h-48 bg-muted relative overflow-hidden">
                          {loc.image_url ? (
                            <img src={loc.image_url} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-accent">
                              <Car className="h-16 w-16 text-accent-foreground/30" />
                            </div>
                          )}
                          <Badge className="absolute top-3 right-3" variant={loc.available_count && loc.available_count > 0 ? "default" : "destructive"}>
                            {loc.available_count || 0} available
                          </Badge>
                        </div>
                        <CardContent className="p-5">
                          <h3 className="font-display font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{loc.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                            <MapPin className="h-3.5 w-3.5" />
                            {loc.address}, {loc.city}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-sm">
                              <IndianRupee className="h-3.5 w-3.5 text-primary" />
                              <span className="font-semibold">₹{loc.price_per_hour}</span>
                              <span className="text-muted-foreground">/hr</span>
                              {loc.peak_price_per_hour != null && loc.peak_hour_start != null && loc.peak_hour_end != null && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  (₹{loc.peak_price_per_hour} peak)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {loc.peak_hour_start != null && loc.peak_hour_end != null && (
                                <Badge variant={isCurrentlyPeak(loc) ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0.5">
                                  {isCurrentlyPeak(loc) ? (
                                    <><TrendingUp className="h-3 w-3 mr-0.5" /> Peak</>
                                  ) : "Off-Peak"}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {loc.total_slots} slots
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
