import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, IndianRupee, Car, Loader2, LocateFixed, Pencil, Trash2, AlertCircle, TrendingUp, CalendarDays, ParkingCircle, Search, ChevronLeft, ChevronRight, Clock, QrCode, ScanLine } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LocationPreviewMap from "@/components/LocationPreviewMap";
import AIPeakRecommendation from "@/components/AIPeakRecommendation";
import LocationQRCode from "@/components/LocationQRCode";
import { motion } from "framer-motion";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const emptyForm = { name: "", address: "", city: "", totalSlots: "10", pricePerHour: "50", latitude: "", longitude: "", peakHourStart: "", peakHourEnd: "", peakPricePerHour: "" };

export default function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [locations, setLocations] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [bookingSearch, setBookingSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingsPage, setBookingsPage] = useState(1);
  const ROWS_PER_PAGE = 8;

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Your browser doesn't support geolocation.", variant: "destructive" });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((p) => ({ ...p, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setGeoLoading(false);
        toast({ title: "Location detected", description: "Coordinates filled automatically." });
      },
      () => {
        setGeoLoading(false);
        toast({ title: "Location access denied", description: "Please allow location access or enter coordinates manually.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (user) fetchLocations();
    else setLoading(false);
  }, [user]);

  const fetchLocations = async () => {
    const { data } = await supabase.from("parking_locations").select("*").eq("owner_id", user!.id);
    setLocations(data || []);

    // Fetch bookings for owner's locations
    if (data && data.length > 0) {
      const ids = data.map((l: any) => l.id);
      const { data: bk } = await supabase
        .from("bookings")
        .select("*, parking_locations(name), profiles(full_name, email)")
        .in("parking_id", ids)
        .order("created_at", { ascending: false });
      setBookings(bk || []);
    }
    setLoading(false);
  };

  const totalSlots = locations.reduce((s, l) => s + (l.total_slots || 0), 0);
  const totalRevenue = bookings.reduce((s, b) => s + (Number(b.total_price) || 0), 0);
  const platformFee = Math.round(totalRevenue * 0.05 * 100) / 100;
  const netRevenue = Math.round((totalRevenue - platformFee) * 100) / 100;
  const activeBookings = bookings.filter(b => b.booking_status === "confirmed").length;

  const chartData = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 6 - i));
      return { date, label: format(date, "EEE"), bookings: 0, revenue: 0 };
    });
    bookings.forEach(b => {
      const bDate = startOfDay(new Date(b.created_at));
      const entry = last7.find(d => d.date.getTime() === bDate.getTime());
      if (entry) {
        entry.bookings += 1;
        entry.revenue += Number(b.total_price) || 0;
      }
    });
    return last7;
  }, [bookings]);

  const chartConfig = {
    bookings: { label: "Bookings", color: "hsl(var(--primary))" },
    revenue: { label: "Revenue (₹)", color: "hsl(var(--accent-foreground))" },
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (loc: any) => {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      address: loc.address,
      city: loc.city,
      totalSlots: String(loc.total_slots),
      pricePerHour: String(loc.price_per_hour),
      latitude: loc.latitude ? String(loc.latitude) : "",
      longitude: loc.longitude ? String(loc.longitude) : "",
      peakHourStart: loc.peak_hour_start != null ? String(loc.peak_hour_start) : "",
      peakHourEnd: loc.peak_hour_end != null ? String(loc.peak_hour_end) : "",
      peakPricePerHour: loc.peak_price_per_hour != null ? String(loc.peak_price_per_hour) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address || !form.city) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name,
      address: form.address,
      city: form.city,
      total_slots: parseInt(form.totalSlots),
      price_per_hour: parseFloat(form.pricePerHour),
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      peak_hour_start: form.peakHourStart ? parseInt(form.peakHourStart) : null,
      peak_hour_end: form.peakHourEnd ? parseInt(form.peakHourEnd) : null,
      peak_price_per_hour: form.peakPricePerHour ? parseFloat(form.peakPricePerHour) : null,
    };

    if (editingId) {
      const { error } = await supabase.from("parking_locations").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Location updated!" });
        setDialogOpen(false);
        fetchLocations();
      }
    } else {
      const { data: loc, error } = await supabase.from("parking_locations").insert({
        ...payload,
        owner_id: user!.id,
      }).select().single();

      if (error) {
        toast({ title: "Failed to create", description: error.message, variant: "destructive" });
      } else {
        const slots = Array.from({ length: parseInt(form.totalSlots) }, (_, i) => ({
          parking_id: loc.id,
          slot_number: `S${String(i + 1).padStart(3, "0")}`,
          status: "available",
        }));
        await supabase.from("parking_slots").insert(slots);
        toast({ title: "Parking location created!", description: "It will appear to users after admin approval." });
        setDialogOpen(false);
        setForm(emptyForm);
        fetchLocations();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("parking_slots").delete().eq("parking_id", id);
    const { error } = await supabase.from("parking_locations").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Location deleted" });
      fetchLocations();
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Owner <span className="text-gradient">Dashboard</span></h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your parking locations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/scan-qr")}><ScanLine className="mr-2 h-4 w-4" /> Scan QR</Button>
            <Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" /> Add Location</Button>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Locations", value: locations.length, icon: ParkingCircle },
            { label: "Total Slots", value: totalSlots, icon: Car },
            { label: "Active Bookings", value: activeBookings, icon: CalendarDays },
            { label: "Gross Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp },
            { label: "Net Revenue (after 5% fee)", value: `₹${netRevenue.toLocaleString()}`, icon: IndianRupee },
          ].map((stat) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-accent p-2.5">
                    <stat.icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-display font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {bookings.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold mb-4">Last 7 Days</h3>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} className="stroke-border" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}


        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? "Edit" : "Add"} Parking Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 overflow-y-auto flex-1 pr-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="City Center Parking" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input placeholder="123 Main St" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input placeholder="Mumbai" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Slots</Label>
                  <Input type="number" value={form.totalSlots} onChange={e => setForm(p => ({ ...p, totalSlots: e.target.value }))} disabled={!!editingId} />
                </div>
                <div className="space-y-2">
                  <Label>Price/Hour (₹)</Label>
                  <Input type="number" value={form.pricePerHour} onChange={e => setForm(p => ({ ...p, pricePerHour: e.target.value }))} />
                </div>
              </div>
              {/* Peak Hour Pricing Section */}
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <Label className="font-semibold text-sm">Peak Hour Pricing <span className="text-muted-foreground font-normal">(optional)</span></Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Peak Start (0-23)</Label>
                    <Input type="number" min="0" max="23" placeholder="e.g. 9" value={form.peakHourStart} onChange={e => setForm(p => ({ ...p, peakHourStart: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Peak End (0-23)</Label>
                    <Input type="number" min="0" max="23" placeholder="e.g. 18" value={form.peakHourEnd} onChange={e => setForm(p => ({ ...p, peakHourEnd: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Peak Price/Hour (₹)</Label>
                  <Input type="number" placeholder="e.g. 80" value={form.peakPricePerHour} onChange={e => setForm(p => ({ ...p, peakPricePerHour: e.target.value }))} />
                </div>
                {editingId && (
                  <AIPeakRecommendation
                    parkingId={editingId}
                    locationName={form.name}
                    currentPeakStart={form.peakHourStart ? parseInt(form.peakHourStart) : null}
                    currentPeakEnd={form.peakHourEnd ? parseInt(form.peakHourEnd) : null}
                    currentPeakPrice={form.peakPricePerHour ? parseFloat(form.peakPricePerHour) : null}
                    onApply={(start, end, price) => {
                      setForm(p => ({
                        ...p,
                        peakHourStart: String(start),
                        peakHourEnd: String(end),
                        peakPricePerHour: String(price),
                      }));
                    }}
                  />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Coordinates <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} disabled={geoLoading}>
                    {geoLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="mr-1.5 h-3.5 w-3.5" />}
                    Get My Location
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} />
                  <Input type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} />
                </div>
                <LocationPreviewMap latitude={form.latitude} longitude={form.longitude} />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Update Location" : "Create Location"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {locations.length === 0 ? (
          <div className="text-center py-20">
            <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold mb-2">No locations yet</h3>
            <p className="text-muted-foreground">Add your first parking location to get started.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((loc, i) => (
              <motion.div key={loc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-elevated transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-display font-semibold">{loc.name}</h3>
                      <Badge variant={loc.is_approved ? "default" : "secondary"}>
                        {loc.is_approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                    {!loc.is_approved && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 bg-accent/50 rounded-md px-2.5 py-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Awaiting admin approval before visible to users
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-3.5 w-3.5" /> {loc.address}, {loc.city}
                    </div>
                    <div className="flex gap-4 text-sm mb-4">
                      <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5 text-primary" /> {loc.total_slots} slots</span>
                      <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5 text-primary" /> ₹{loc.price_per_hour}/hr</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <LocationQRCode locationId={loc.id} locationName={loc.name} baseUrl={window.location.origin} />
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(loc)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{loc.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete this parking location and all its slots. This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(loc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Booking History Table */}
        {bookings.length > 0 && (
          <Card className="mt-8">
            <CardContent className="p-5">
              <h3 className="font-display font-semibold mb-4">Booking History</h3>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user or location..."
                    className="pl-9"
                    value={bookingSearch}
                    onChange={e => { setBookingSearch(e.target.value); setBookingsPage(1); }}
                  />
                </div>
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setBookingsPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(() => {
                const filtered = bookings.filter(b => {
                  const matchesSearch = !bookingSearch ||
                    (b.profiles as any)?.full_name?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
                    (b.profiles as any)?.email?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
                    (b.parking_locations as any)?.name?.toLowerCase().includes(bookingSearch.toLowerCase());
                  const matchesStatus = statusFilter === "all" || b.booking_status === statusFilter;
                  return matchesSearch && matchesStatus;
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
                const paged = filtered.slice((bookingsPage - 1) * ROWS_PER_PAGE, bookingsPage * ROWS_PER_PAGE);

                return (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paged.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bookings found</TableCell>
                            </TableRow>
                          ) : paged.map(b => (
                            <TableRow key={b.id}>
                              <TableCell>
                                <div className="font-medium text-sm">{(b.profiles as any)?.full_name || "—"}</div>
                                <div className="text-xs text-muted-foreground">{(b.profiles as any)?.email}</div>
                              </TableCell>
                              <TableCell className="text-sm">{(b.parking_locations as any)?.name || "—"}</TableCell>
                              <TableCell className="text-sm">{format(new Date(b.start_time), "dd MMM yyyy")}</TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(b.start_time), "HH:mm")} – {format(new Date(b.end_time), "HH:mm")}
                              </TableCell>
                              <TableCell className="text-sm font-medium">₹{Number(b.total_price).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={b.booking_status === "confirmed" ? "default" : b.booking_status === "completed" ? "secondary" : "destructive"} className="text-xs capitalize">
                                  {b.booking_status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-muted-foreground">Page {bookingsPage} of {totalPages}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setBookingsPage(p => p - 1)} disabled={bookingsPage <= 1}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setBookingsPage(p => p + 1)} disabled={bookingsPage >= totalPages}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
