import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, text, container } = body;

    const apiKey = Deno.env.get("LOQATE_API_KEY");

    if (!apiKey) {
      console.error("LOQATE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Address verification request:", { action, text: text?.substring(0, 50) });

    if (action === "find") {
      // Find addresses based on search text
      const url = new URL("https://api.addressy.com/Capture/Interactive/Find/v1.20/json3.ws");
      url.searchParams.set("Key", apiKey);
      url.searchParams.set("Text", text);
      url.searchParams.set("Countries", "US");
      url.searchParams.set("Limit", "10");
      if (container) {
        url.searchParams.set("Container", container);
      }

      console.log("Calling Loqate Find API");
      const response = await fetch(url.toString());
      const data = await response.json();
      
      console.log("Loqate Find response items:", data.Items?.length || 0);
      
      return new Response(
        JSON.stringify({ success: true, items: data.Items || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    
    if (action === "retrieve") {
      // Retrieve full address details
      const url = new URL("https://api.addressy.com/Capture/Interactive/Retrieve/v1.20/json3.ws");
      url.searchParams.set("Key", apiKey);
      url.searchParams.set("Id", text);

      console.log("Calling Loqate Retrieve API");
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.Items && data.Items.length > 0) {
        const addr = data.Items[0];
        // Format as a single line address
        const formattedAddress = [
          addr.Line1,
          addr.City,
          addr.ProvinceCode,
          addr.PostalCode
        ].filter(Boolean).join(", ");
        
        console.log("Retrieved address (redacted)");

        return new Response(
          JSON.stringify({ 
            success: true, 
            address: formattedAddress,
            details: addr 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: "No address details found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      // Verify address using Loqate Verify API
      const { address1, address2, locality, administrativeArea, postalCode, country } = body;
      
      console.log("Verifying address:", { address1, address2, locality, administrativeArea, postalCode, country });
      
      const verifyUrl = "https://api.loqate.com/address/verify?suggest";
      
      const verifyPayload = {
        lqtkey: apiKey,
        input: [
          {
            Address1: address1 || text,
            Address2: address2 || "",
            Locality: locality || "",
            AdministrativeArea: administrativeArea || "",
            PostalCode: postalCode || "",
            Country: country || "USA"
          }
        ],
        options: {
          DefaultCountry: "USA",
          OutputCasing: "Upper"
        }
      };
      
      console.log("Loqate Verify request:", JSON.stringify(verifyPayload, null, 2));
      
      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(verifyPayload)
      });
      
      const data = await response.json();
      console.log("Loqate Verify response:", JSON.stringify(data, null, 2));
      
      if (data.Status !== "OK") {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: data.Status || "Verification failed",
            apiError: true 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (data.output && data.output.length > 0) {
        const result = data.output[0];
        const aqi = result.AQI || "";
        const avc = result.AVC || "";
        
        // Extract matchscore from AVC (format: V44-I44-P3-100, last number is matchscore)
        const avcParts = avc.split("-");
        const matchScore = avcParts.length >= 4 ? parseInt(avcParts[3], 10) : 0;
        
        // Determine confidence level based on AQI and matchscore
        // A = Excellent (100), B = Good (95+), C = Average (90+), D = Poor (80+), E = Bad
        const isHighConfidence = (aqi === "A" || aqi === "B") && matchScore >= 70;
        const isLowConfidence = aqi === "D" || aqi === "E" || matchScore < 70;
        
        // Format suggested address
        const suggestedAddress = result.Address || [
          result.Address1,
          result.Locality,
          result.AdministrativeArea,
          result.PostalCode
        ].filter(Boolean).join(", ");
        
        console.log("Verification result:", { verified: isHighConfidence, confidence: matchScore, aqi });
        
        return new Response(
          JSON.stringify({ 
            success: true,
            verified: isHighConfidence,
            confidence: matchScore,
            aqi,
            avc,
            isLowConfidence,
            originalAddress: address1 || text,
            suggestedAddress,
            details: result
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No verification results returned" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'find', 'retrieve', or 'verify'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: unknown) {
    console.error("Loqate API error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to process address request. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
