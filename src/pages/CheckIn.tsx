import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogIn, LogOut, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function CheckIn() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parkingId = searchParams.get("parking_id");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [result, setResult] = useState<{ success: boolean; action?: string; message: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!parkingId) { setLoading(false); return; }
    findBooking();
  }, [user, authLoading, parkingId]);

  const findBooking = async () => {
    // Find the user's active (confirmed or checked_in) booking at this parking location
    const { data, error } = await supabase
      .from("bookings")
      .select("*, parking_locations(name, address, city), parking_slots(slot_number)")
      .eq("user_id", user!.id)
      .eq("parking_id", parkingId!)
      .in("booking_status", ["confirmed", "checked_in"])
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    setBooking(data);
    setLoading(false);
  };

  const handleAction = async () => {
    if (!booking) return;
    setProcessing(true);

    if (!booking.checked_in_at) {
      const { error } = await supabase
        .from("bookings")
        .update({ checked_in_at: new Date().toISOString(), booking_status: "checked_in" })
        .eq("id", booking.id);
      if (error) {
        setResult({ success: false, message: "Check-in failed: " + error.message });
      } else {
        setResult({ success: true, action: "check_in", message: "You're checked in! Enjoy your parking." });
        toast({ title: "Checked in successfully!" });
      }
    } else {
      const { error } = await supabase
        .from("bookings")
        .update({ checked_out_at: new Date().toISOString(), booking_status: "completed" })
        .eq("id", booking.id);
      if (!error) {
        await supabase.from("parking_slots").update({ status: "available" }).eq("id", booking.slot_id);
      }
      if (error) {
        setResult({ success: false, message: "Check-out failed: " + error.message });
      } else {
        setResult({ success: true, action: "check_out", message: "Checked out! Your slot is now free." });
        toast({ title: "Checked out successfully!" });
      }
    }
    setProcessing(false);
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <h1 className="text-3xl font-display font-bold mb-8">
          Self <span className="text-gradient">Check-in</span>
        </h1>

        {!booking ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No active booking found at this parking location.</p>
              <Button className="mt-4" onClick={() => navigate("/bookings")}>View My Bookings</Button>
            </CardContent>
          </Card>
        ) : result ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-primary/50">
              <CardContent className="p-8 text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-primary mx-auto" />
                <p className="font-display font-semibold text-xl">{result.message}</p>
                <div className="text-sm text-muted-foreground">
                  <p>{booking.parking_locations?.name}</p>
                  <p>Slot {booking.parking_slots?.slot_number}</p>
                  <p>{format(new Date(), "MMM d, h:mm a")}</p>
                </div>
                <Badge variant={result.action === "check_in" ? "default" : "secondary"}>
                  {result.action === "check_in" ? "Checked In" : "Checked Out"}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="font-display font-semibold text-lg">{booking.parking_locations?.name}</h2>
                <p className="text-sm text-muted-foreground">{booking.parking_locations?.address}, {booking.parking_locations?.city}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge variant="outline">Slot {booking.parking_slots?.slot_number}</Badge>
                <Badge variant="outline">₹{booking.total_price}</Badge>
                <Badge variant={booking.checked_in_at ? "default" : "secondary"}>
                  {booking.checked_in_at ? "Checked In" : "Confirmed"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{format(new Date(booking.start_time), "MMM d, h:mm a")} — {format(new Date(booking.end_time), "h:mm a")}</p>
              </div>
              <Button className="w-full" size="lg" onClick={handleAction} disabled={processing}>
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!booking.checked_in_at ? (
                  <><LogIn className="mr-2 h-5 w-5" /> Check In</>
                ) : (
                  <><LogOut className="mr-2 h-5 w-5" /> Check Out</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
