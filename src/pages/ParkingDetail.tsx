import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, IndianRupee, Car, ArrowLeft, Loader2, TrendingUp, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import { isCurrentlyPeak, formatPeakHours, calculateTotalPrice, isPeakHour } from "@/lib/peak-hours";
import HourlyPriceChart from "@/components/HourlyPriceChart";
import PaymentGateway from "@/components/PaymentGateway";

interface Slot {
  id: string;
  slot_number: string;
  status: string;
}

export default function ParkingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [location, setLocation] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [booking, setBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingPrice, setPendingPrice] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetchData();

    // Realtime slot updates
    const channel = supabase
      .channel("slots-" + id)
      .on("postgres_changes", { event: "*", schema: "public", table: "parking_slots", filter: `parking_id=eq.${id}` },
        () => fetchSlots()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchData = async () => {
    const { data: loc } = await supabase.from("parking_locations").select("*").eq("id", id!).single();
    setLocation(loc);
    await fetchSlots();
    setLoading(false);
  };

  const fetchSlots = async () => {
    const { data } = await supabase.from("parking_slots").select("*").eq("parking_id", id!).order("slot_number");
    setSlots(data || []);
  };

  const handleBook = () => {
    if (!user) { navigate("/auth"); return; }
    if (!selectedSlot || !startTime || !endTime) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    const totalPrice = calculateTotalPrice(start, end, location);
    setPendingPrice(totalPrice);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setBooking(true);
    const start = new Date(startTime);
    const end = new Date(endTime);

    const { data: bookingData, error } = await supabase.from("bookings").insert({
      user_id: user!.id,
      parking_id: id!,
      slot_id: selectedSlot!,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      total_price: pendingPrice,
      booking_status: "confirmed",
      qr_code: `PARK-${crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase()}`,
    }).select().single();

    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("parking_slots").update({ status: "booked" }).eq("id", selectedSlot!);
      const platformFee = Math.round(pendingPrice * 0.05 * 100) / 100;
      const ownerRevenue = Math.round((pendingPrice - platformFee) * 100) / 100;
      await supabase.from("payments").insert({
        booking_id: bookingData.id,
        amount: pendingPrice,
        payment_method: "card",
        status: "completed",
        transaction_id: `TXN-${Date.now().toString(36).toUpperCase()}`,
        platform_fee: platformFee,
        owner_revenue: ownerRevenue,
      });

      supabase.functions.invoke("send-booking-email", {
        body: { booking_id: bookingData.id },
      }).then(({ error: emailErr }) => {
        if (emailErr) console.error("Email notification failed:", emailErr);
        else console.log("✅ Booking email sent");
      });

      toast({ title: "Booking confirmed!", description: `Slot booked for ₹${pendingPrice}` });
      navigate("/bookings");
    }
    setBooking(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!location) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <p>Parking location not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Info */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-display font-bold mb-2">{location.name}</h1>
              <div className="flex items-center gap-1 text-muted-foreground mb-6">
                <MapPin className="h-4 w-4" />
                {location.address}, {location.city}
                {location.latitude && location.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 ml-2 text-primary hover:underline font-medium text-sm"
                  >
                    <Navigation className="h-3.5 w-3.5" /> Directions
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  <span className="font-semibold">₹{location.price_per_hour}/hr</span>
                </div>
                {location.peak_price_per_hour != null && location.peak_hour_start != null && location.peak_hour_end != null && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg">
                    <TrendingUp className="h-4 w-4 text-destructive" />
                    <span className="font-semibold">₹{location.peak_price_per_hour}/hr <span className="text-xs text-muted-foreground font-normal">peak ({formatPeakHours(location.peak_hour_start, location.peak_hour_end)})</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg">
                  <Car className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{location.total_slots} slots</span>
                </div>
                {location.peak_hour_start != null && location.peak_hour_end != null && (
                  <Badge variant={isCurrentlyPeak(location) ? "destructive" : "secondary"} className="self-center">
                    {isCurrentlyPeak(location) ? "🔥 Peak Hours Now" : "Off-Peak Now"}
                  </Badge>
                )}
              </div>

              {/* Hourly Price Chart */}
              {location.peak_hour_start != null && location.peak_hour_end != null && location.peak_price_per_hour != null && (
                <Card className="mb-8">
                  <CardContent className="p-4">
                    <HourlyPriceChart config={location} />
                  </CardContent>
                </Card>
              )}

              {/* Slot Grid */}
              <h2 className="text-xl font-display font-semibold mb-4">Select a Slot</h2>
              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 sm:gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    disabled={slot.status !== "available"}
                    onClick={() => setSelectedSlot(slot.id === selectedSlot ? null : slot.id)}
                    className={`
                      p-3 rounded-lg text-center text-sm font-medium border-2 transition-all
                      ${slot.status !== "available"
                        ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
                        : slot.id === selectedSlot
                        ? "bg-primary text-primary-foreground border-primary shadow-glow"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                      }
                    `}
                  >
                    {slot.slot_number}
                  </button>
                ))}
                {slots.length === 0 && (
                  <p className="col-span-full text-muted-foreground text-center py-8">No slots configured yet.</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Booking Card */}
          <div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card className="shadow-elevated lg:sticky lg:top-24">
                <CardHeader>
                  <CardTitle className="font-display">Book Your Spot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSlot && (
                    <Badge variant="outline" className="mb-2">
                      Slot: {slots.find(s => s.id === selectedSlot)?.slot_number}
                    </Badge>
                  )}
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                  {startTime && endTime && (
                    <div className="p-3 bg-accent rounded-lg text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">
                          {Math.max(1, Math.ceil((new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000))} hrs
                        </span>
                      </div>
                      {location.peak_price_per_hour != null && location.peak_hour_start != null && location.peak_hour_end != null && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Peak hours</span>
                          <span>{formatPeakHours(location.peak_hour_start, location.peak_hour_end)}</span>
                        </div>
                      )}
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-bold text-primary">
                          ₹{calculateTotalPrice(new Date(startTime), new Date(endTime), location)}
                        </span>
                      </div>
                    </div>
                  )}
                  <Button className="w-full" onClick={handleBook} disabled={!selectedSlot || !startTime || !endTime || booking}>
                    {booking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {user ? "Confirm Booking" : "Sign In to Book"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        <PaymentGateway
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          amount={pendingPrice}
          locationName={location.name}
          slotNumber={slots.find(s => s.id === selectedSlot)?.slot_number || ""}
        />
      </div>
    </div>
  );
}
