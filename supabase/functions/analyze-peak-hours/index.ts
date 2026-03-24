import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { parking_id } = await req.json();
    if (!parking_id) throw new Error("parking_id is required");

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from("parking_locations")
      .select("*")
      .eq("id", parking_id)
      .eq("owner_id", user.id)
      .single();

    if (locError || !location) throw new Error("Location not found or not owned by you");

    // Fetch all bookings for this location
    const { data: bookings } = await supabase
      .from("bookings")
      .select("start_time, end_time, total_price, booking_status")
      .eq("parking_id", parking_id)
      .order("start_time", { ascending: false })
      .limit(500);

    // Build hourly distribution
    const hourlyCount: Record<number, number> = {};
    const hourlyRevenue: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      hourlyCount[h] = 0;
      hourlyRevenue[h] = 0;
    }

    (bookings || []).forEach((b) => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3600000));
      const pricePerHour = (Number(b.total_price) || 0) / hours;
      for (let h = start.getHours(); h < start.getHours() + hours && h < 24; h++) {
        hourlyCount[h]++;
        hourlyRevenue[h] += pricePerHour;
      }
    });

    const hourlyData = Object.entries(hourlyCount).map(([h, count]) => ({
      hour: Number(h),
      bookings: count,
      revenue: Math.round(hourlyRevenue[Number(h)]),
    }));

    const prompt = `You are a parking business analyst. Analyze this parking location's booking data and recommend optimal peak hours and pricing.

Location: "${location.name}" in ${location.city}
Current pricing: ₹${location.price_per_hour}/hr
Current peak hours: ${location.peak_hour_start != null ? `${location.peak_hour_start}:00 – ${location.peak_hour_end}:00 at ₹${location.peak_price_per_hour}/hr` : "Not set"}
Total slots: ${location.total_slots}
Total bookings analyzed: ${(bookings || []).length}

Hourly booking distribution (hour: bookings count, revenue):
${hourlyData.map((d) => `${d.hour}:00 → ${d.bookings} bookings, ₹${d.revenue} revenue`).join("\n")}

Based on this data, recommend:
1. The optimal peak hour window (start hour and end hour, 0-23)
2. The recommended peak price per hour in ₹
3. A brief explanation of why these hours and price were chosen`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a data-driven parking business consultant. Always provide specific numbers. Be concise.",
            },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "recommend_peak_hours",
                description:
                  "Return the recommended peak hours and pricing for a parking location.",
                parameters: {
                  type: "object",
                  properties: {
                    peak_hour_start: {
                      type: "number",
                      description: "Recommended peak start hour (0-23)",
                    },
                    peak_hour_end: {
                      type: "number",
                      description: "Recommended peak end hour (0-23)",
                    },
                    peak_price_per_hour: {
                      type: "number",
                      description: "Recommended peak price per hour in INR",
                    },
                    explanation: {
                      type: "string",
                      description:
                        "Brief explanation (2-3 sentences) of why these values were recommended",
                    },
                    confidence: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                      description:
                        "Confidence level based on data quantity and clarity of patterns",
                    },
                  },
                  required: [
                    "peak_hour_start",
                    "peak_hour_end",
                    "peak_price_per_hour",
                    "explanation",
                    "confidence",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "recommend_peak_hours" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No recommendation returned from AI");

    const recommendation = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        recommendation,
        hourly_data: hourlyData,
        total_bookings: (bookings || []).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-peak-hours error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
