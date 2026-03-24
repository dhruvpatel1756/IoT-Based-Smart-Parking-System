import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, TrendingUp, Clock, IndianRupee, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Recommendation {
  peak_hour_start: number;
  peak_hour_end: number;
  peak_price_per_hour: number;
  explanation: string;
  confidence: "low" | "medium" | "high";
}

interface Props {
  parkingId: string;
  locationName: string;
  currentPeakStart: number | null;
  currentPeakEnd: number | null;
  currentPeakPrice: number | null;
  onApply: (start: number, end: number, price: number) => void;
}

export default function AIPeakRecommendation({
  parkingId,
  locationName,
  currentPeakStart,
  currentPeakEnd,
  currentPeakPrice,
  onApply,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [totalBookings, setTotalBookings] = useState(0);
  const [applied, setApplied] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setRecommendation(null);
    setApplied(false);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-peak-hours", {
        body: { parking_id: parkingId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRecommendation(data.recommendation);
      setTotalBookings(data.total_bookings);
    } catch (e: any) {
      toast({
        title: "Analysis failed",
        description: e.message || "Could not analyze booking data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!recommendation) return;
    onApply(
      recommendation.peak_hour_start,
      recommendation.peak_hour_end,
      recommendation.peak_price_per_hour
    );
    setApplied(true);
    toast({ title: "Recommendation applied!", description: "Peak hours updated in the form." });
  };

  const confidenceColor = {
    low: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    medium: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    high: "bg-green-500/10 text-green-600 border-green-500/20",
  };

  const formatHour = (h: number) => `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? "AM" : "PM"}`;

  return (
    <div className="border border-dashed border-primary/30 rounded-lg p-4 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">AI Peak Hour Optimizer</span>
      </div>

      {!recommendation && !loading && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            Analyze your booking history to get AI-powered recommendations for optimal peak hours and pricing.
          </p>
          <Button variant="outline" size="sm" onClick={analyze} className="w-full">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Analyze Bookings
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Analyzing {locationName}...</span>
        </div>
      )}

      <AnimatePresence>
        {recommendation && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${confidenceColor[recommendation.confidence]}`}>
                {recommendation.confidence} confidence
              </Badge>
              <span className="text-xs text-muted-foreground">{totalBookings} bookings analyzed</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background rounded-md p-2.5 border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" /> Peak Window
                </div>
                <p className="text-sm font-semibold">
                  {formatHour(recommendation.peak_hour_start)} – {formatHour(recommendation.peak_hour_end)}
                </p>
              </div>
              <div className="bg-background rounded-md p-2.5 border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <IndianRupee className="h-3 w-3" /> Peak Price
                </div>
                <p className="text-sm font-semibold">₹{recommendation.peak_price_per_hour}/hr</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{recommendation.explanation}</p>

            {currentPeakStart != null && (
              <div className="text-xs text-muted-foreground bg-background rounded-md p-2 border">
                <span className="font-medium">Current:</span> {formatHour(currentPeakStart)} – {formatHour(currentPeakEnd!)} at ₹{currentPeakPrice}/hr
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleApply}
                disabled={applied}
                className="flex-1"
              >
                {applied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Applied
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Apply to Form
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={analyze}>
                Re-analyze
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
