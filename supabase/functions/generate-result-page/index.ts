import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Body {
  demoId?: string;
  resultType: "success" | "failure";
  prompt: string;
  title?: string;
  subtitle?: string;
  message?: string;
}

function stripCodeFences(s: string): string {
  const m = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : s).trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.prompt || !body?.resultType) {
      return new Response(JSON.stringify({ error: "Missing prompt or resultType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional: pull demo branding + mirrored chrome for richer context
    let demoContext = "";
    if (body.demoId) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: demo } = await admin
        .from("demo_environments")
        .select(
          "customer_name, button_color, header_bg_color, header_text_color, logo_url, customer_site_url, mirror_active_method, mirror_html_header_html, mirror_html_footer_html, mirror_screenshot_header_html, mirror_screenshot_footer_html",
        )
        .eq("id", body.demoId)
        .maybeSingle();
      if (demo) {
        const method = demo.mirror_active_method === "screenshot" ? "screenshot" : "html";
        const headerHtml =
          method === "screenshot" ? demo.mirror_screenshot_header_html : demo.mirror_html_header_html;
        const footerHtml =
          method === "screenshot" ? demo.mirror_screenshot_footer_html : demo.mirror_html_footer_html;
        demoContext = `
Demo branding:
- Customer: ${demo.customer_name}
- Site URL: ${demo.customer_site_url || "n/a"}
- Primary/button color: ${demo.button_color}
- Header background: ${demo.header_bg_color}
- Header text color: ${demo.header_text_color}
- Logo URL: ${demo.logo_url || "n/a"}
Scraped header HTML (excerpt):
${(headerHtml || "").slice(0, 1500)}
Scraped footer HTML (excerpt):
${(footerHtml || "").slice(0, 1000)}
`;
      }
    }

    const systemPrompt = `You are a senior web designer building a self-contained verification result page.
Output ONE valid, accessible HTML fragment (no <html>, <head>, or <body> wrappers; no <script>; no external links to JS). Inline all styles via a single <style> block or style="" attributes. Use the demo branding colors. Make it visually polished, responsive, and centered. Include the title/subtitle/message context, and a primary call-to-action button styled with the brand color. Do NOT include any explanatory prose around the HTML; return HTML only.`;

    const userPrompt = `Result type: ${body.resultType.toUpperCase()}
Title: ${body.title || (body.resultType === "success" ? "Verification Complete" : "Verification Failed")}
Subtitle: ${body.subtitle || ""}
Message: ${body.message || ""}

User design direction:
${body.prompt}
${demoContext}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI gateway error: ${aiRes.status} ${text}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const html = stripCodeFences(content);

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});