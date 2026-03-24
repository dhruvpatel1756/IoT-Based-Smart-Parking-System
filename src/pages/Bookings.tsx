import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Loader2, LogIn, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import BookingQRCode from "@/components/BookingQRCode";

export default function Bookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, parking_locations(name, address, city), parking_slots(slot_number)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Bookings fetch error:", error);
        toast({ title: "Failed to load bookings", description: error.message, variant: "destructive" });
      }
      setBookings(data || []);
    } catch (err) {
      console.error("Bookings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string, slotId: string) => {
    await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", bookingId);
    await supabase.from("parking_slots").update({ status: "available" }).eq("id", slotId);
    toast({ title: "Booking cancelled" });
    fetchBookings();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "confirmed": return "default";
      case "checked_in": return "default";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
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
        <h1 className="text-3xl font-display font-bold mb-8">
          My <span className="text-gradient">Bookings</span>
        </h1>

        {bookings.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground">Find and book your first parking spot!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-elevated transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-display font-semibold text-sm sm:text-base">{b.parking_locations?.name}</h3>
                          <Badge variant={statusColor(b.booking_status) as any}>{b.booking_status}</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{b.parking_locations?.address}, {b.parking_locations?.city}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                            {format(new Date(b.start_time), "MMM d, h:mm a")} — {format(new Date(b.end_time), "h:mm a")}
                          </span>
                          <span className="font-medium">Slot: {b.parking_slots?.slot_number}</span>
                          <span className="font-semibold text-primary">₹{b.total_price}</span>
                        </div>
                        {/* Check-in/out timestamps */}
                        {(b.checked_in_at || b.checked_out_at) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            {b.checked_in_at && (
                              <span className="flex items-center gap-1">
                                <LogIn className="h-3 w-3" /> In: {format(new Date(b.checked_in_at), "h:mm a")}
                              </span>
                            )}
                            {b.checked_out_at && (
                              <span className="flex items-center gap-1">
                                <LogOut className="h-3 w-3" /> Out: {format(new Date(b.checked_out_at), "h:mm a")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {b.qr_code && (
                          <BookingQRCode
                            qrCode={b.qr_code}
                            bookingStatus={b.booking_status}
                            checkedInAt={b.checked_in_at}
                            checkedOutAt={b.checked_out_at}
                          />
                        )}
                        {b.booking_status === "confirmed" && (
                          <Button variant="destructive" size="sm" onClick={() => cancelBooking(b.id, b.slot_id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
