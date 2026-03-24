import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Camera, CheckCircle, LogIn, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function ScanQR() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleQRCode(decodedText);
          scanner.stop().catch(() => {});
          setScanning(false);
        },
        () => {}
      );
    } catch (err) {
      console.error("Scanner error:", err);
      toast({ title: "Camera access denied", description: "Please allow camera access or enter the code manually.", variant: "destructive" });
      setScanning(false);
    }
  };

  const stopScanner = () => {
    scannerRef.current?.stop().catch(() => {});
    setScanning(false);
  };

  useEffect(() => {
    return () => { scannerRef.current?.stop().catch(() => {}); };
  }, []);

  const handleQRCode = async (code: string) => {
    setProcessing(true);
    setResult(null);

    if (!user) {
      setResult({ success: false, message: "You must be logged in to scan QR codes." });
      setProcessing(false);
      return;
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*, parking_locations(name, address, city, owner_id), parking_slots(slot_number)")
      .eq("qr_code", code)
      .maybeSingle();

    if (error || !booking) {
      setResult({ success: false, message: "No booking found for this QR code." });
      setProcessing(false);
      return;
    }

    // Ownership check: only booking owner or parking owner can scan
    const isBookingOwner = booking.user_id === user.id;
    const isParkingOwner = booking.parking_locations?.owner_id === user.id;
    if (!isBookingOwner && !isParkingOwner) {
      setResult({ success: false, message: "You are not authorized to check in/out this booking." });
      setProcessing(false);
      return;
    }

    if (booking.booking_status === "cancelled") {
      setResult({ success: false, message: "This booking has been cancelled." });
      setProcessing(false);
      return;
    }

    // Determine action: check-in or check-out
    if (!booking.checked_in_at) {
      // Check in
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({ checked_in_at: new Date().toISOString(), booking_status: "checked_in" })
        .eq("id", booking.id);

      if (updateErr) {
        setResult({ success: false, message: "Failed to check in: " + updateErr.message });
      } else {
        setResult({
          success: true,
          action: "check_in",
          booking,
          message: `✅ Checked in! Slot ${booking.parking_slots?.slot_number} at ${booking.parking_locations?.name}`,
        });
      }
    } else if (!booking.checked_out_at) {
      // Check out
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({ checked_out_at: new Date().toISOString(), booking_status: "completed" })
        .eq("id", booking.id);

      // Free up the slot
      if (!updateErr) {
        await supabase.from("parking_slots").update({ status: "available" }).eq("id", booking.slot_id);
      }

      if (updateErr) {
        setResult({ success: false, message: "Failed to check out: " + updateErr.message });
      } else {
        setResult({
          success: true,
          action: "check_out",
          booking,
          message: `✅ Checked out! Slot ${booking.parking_slots?.slot_number} is now free.`,
        });
      }
    } else {
      setResult({ success: false, message: "This booking has already been checked out." });
    }

    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <h1 className="text-3xl font-display font-bold mb-2">
          QR <span className="text-gradient">Check-in/out</span>
        </h1>
        <p className="text-muted-foreground mb-8">Scan a booking QR code or enter it manually.</p>

        {/* Scanner */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Camera Scanner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div id="qr-reader" ref={containerRef} className="rounded-lg overflow-hidden mb-4" />
            {!scanning ? (
              <Button className="w-full" onClick={startScanner}>
                <Camera className="mr-2 h-4 w-4" /> Start Scanning
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" onClick={stopScanner}>
                Stop Scanner
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg">Manual Entry</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              placeholder="Enter QR code (e.g. PARK-ABC123)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <Button
              onClick={() => handleQRCode(manualCode)}
              disabled={!manualCode || processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={result.success ? "border-primary/50" : "border-destructive/50"}>
              <CardContent className="p-5 text-center">
                {result.success ? (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      {result.action === "check_in" ? (
                        <LogIn className="h-12 w-12 text-primary" />
                      ) : (
                        <LogOut className="h-12 w-12 text-primary" />
                      )}
                    </div>
                    <p className="font-display font-semibold text-lg">{result.message}</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>User: {result.booking.user_id?.slice(0, 8)}...</p>
                      <p>Time: {format(new Date(), "MMM d, h:mm a")}</p>
                    </div>
                    <Badge variant={result.action === "check_in" ? "default" : "secondary"}>
                      {result.action === "check_in" ? "Checked In" : "Checked Out"}
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold text-destructive">{result.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
