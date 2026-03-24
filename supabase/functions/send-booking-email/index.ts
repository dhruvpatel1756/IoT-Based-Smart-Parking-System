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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller's identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !callerUser) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = callerUser.id;

    // Parse request body - only need booking_id, fetch everything server-side
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to fetch data (bypasses RLS for cross-user reads)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate booking belongs to the authenticated user
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, user_id, parking_id, total_price, slot_id, start_time, end_time")
      .eq("id", booking_id)
      .eq("user_id", userId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found or unauthorized" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch slot info
    const { data: slot } = await supabase
      .from("parking_slots")
      .select("slot_number")
      .eq("id", booking.slot_id)
      .single();

    // Fetch location and owner info
    const { data: location } = await supabase
      .from("parking_locations")
      .select("name, owner_id")
      .eq("id", booking.parking_id)
      .single();

    if (!location) {
      return new Response(JSON.stringify({ error: "Location not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get owner's email
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", location.owner_id)
      .single();

    if (!ownerProfile?.email) {
      return new Response(JSON.stringify({ error: "Owner email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get booking user's name and email
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    const userName = userProfile?.full_name || "A user";
    const userEmail = userProfile?.email || callerUser.email;
    const slotNumber = slot?.slot_number || "N/A";
    const locationName = location.name || "your parking";

    const startFormatted = new Date(booking.start_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
    const endFormatted = new Date(booking.end_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

    const resendHeaders = {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    };

    // Send email to parking owner
    const ownerEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: resendHeaders,
      body: JSON.stringify({
        from: "ParkEase <bookings@bhagyatech.in>",
        to: [ownerProfile.email],
        subject: `New Booking at ${locationName} - Slot ${slotNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">🅿️ New Booking Received!</h2>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 16px 0;">
              <p style="margin: 8px 0;"><strong>Location:</strong> ${locationName}</p>
              <p style="margin: 8px 0;"><strong>Booked by:</strong> ${userName}</p>
              <p style="margin: 8px 0;"><strong>Slot:</strong> ${slotNumber}</p>
              <p style="margin: 8px 0;"><strong>Start:</strong> ${startFormatted}</p>
              <p style="margin: 8px 0;"><strong>End:</strong> ${endFormatted}</p>
              <p style="margin: 8px 0;"><strong>Amount:</strong> ₹${booking.total_price}</p>
              <p style="margin: 8px 0;"><strong>Booking ID:</strong> ${booking_id}</p>
            </div>
            <p style="color: #666; font-size: 14px;">Log in to your dashboard to manage this booking.</p>
          </div>
        `,
      }),
    });

    const ownerEmailResult = await ownerEmailResponse.json();
    if (!ownerEmailResponse.ok) {
      console.error("Owner email error:", ownerEmailResult);
    } else {
      console.log(`✅ Owner email sent to ${ownerProfile.email}, Resend ID: ${ownerEmailResult.id}`);
    }

    // Send confirmation email to booking user
    let userEmailResult = null;
    if (userEmail) {
      const userEmailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: resendHeaders,
        body: JSON.stringify({
          from: "ParkEase <bookings@bhagyatech.in>",
          to: [userEmail],
          subject: `Booking Confirmed - ${locationName}, Slot ${slotNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a2e;">✅ Booking Confirmed!</h2>
              <p>Hi ${userName},</p>
              <p>Your parking spot has been successfully booked. Here are your details:</p>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 16px 0;">
                <p style="margin: 8px 0;"><strong>Location:</strong> ${locationName}</p>
                <p style="margin: 8px 0;"><strong>Slot:</strong> ${slotNumber}</p>
                <p style="margin: 8px 0;"><strong>Start:</strong> ${startFormatted}</p>
                <p style="margin: 8px 0;"><strong>End:</strong> ${endFormatted}</p>
                <p style="margin: 8px 0;"><strong>Amount Paid:</strong> ₹${booking.total_price}</p>
                <p style="margin: 8px 0;"><strong>Booking ID:</strong> ${booking_id}</p>
              </div>
              <p style="color: #666; font-size: 14px;">Show your QR code at the parking entrance for check-in. Have a great day! 🚗</p>
            </div>
          `,
        }),
      });

      userEmailResult = await userEmailResponse.json();
      if (!userEmailResponse.ok) {
        console.error("User email error:", userEmailResult);
      } else {
        console.log(`✅ User email sent to ${userEmail}, Resend ID: ${userEmailResult.id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        owner_email: ownerProfile.email,
        user_email: userEmail,
        owner_resend_id: ownerEmailResult?.id,
        user_resend_id: userEmailResult?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-booking-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
