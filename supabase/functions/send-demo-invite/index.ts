import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await userClient.auth.getUser(token);
    if (authError || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.user.id)
      .in("role", ["admin", "global_admin"])
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { demoId, email, password, profileData, templateId } = body;

    if (!demoId || !email) {
      return new Response(JSON.stringify({ error: "demoId and email are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate registration code
    const registrationCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Clean profile data
    const cleanProfile: Record<string, string> = {};
    if (profileData && typeof profileData === 'object') {
      for (const [key, value] of Object.entries(profileData)) {
        if (value && typeof value === 'string' && value.trim()) {
          cleanProfile[key] = value.trim();
        }
      }
    }

    // Upsert user (recreate if exists)
    const userPayload: Record<string, unknown> = {
      demo_id: demoId,
      email: email.trim(),
      password: password?.trim() || 'changeme123',
      registration_code: registrationCode,
      registration_code_expires_at: expiresAt,
      is_active: true,
      profile_data: Object.keys(cleanProfile).length > 0 ? cleanProfile : {},
      created_by: claims.user.id,
    };

    const { data: upsertedUser, error: upsertError } = await adminClient
      .from('demo_users')
      .upsert(userPayload, { onConflict: 'demo_id,email' })
      .select()
      .single();

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get demo info for template
    const { data: demo } = await adminClient
      .from('demo_environments')
      .select('customer_name, slug')
      .eq('id', demoId)
      .single();

    const demoName = demo?.customer_name || 'Demo';
    const demoSlug = demo?.slug || '';

    // Get invitation template
    let templateQuery = adminClient.from('invitation_templates').select('*');
    if (templateId) {
      templateQuery = templateQuery.eq('id', templateId);
    } else {
      templateQuery = templateQuery.eq('is_default', true);
    }
    const { data: templateData } = await templateQuery.maybeSingle();

    // Construct demo link
    const siteUrl = Deno.env.get("SITE_URL") || `${supabaseUrl.replace('.supabase.co', '')}`; 
    // Use the published URL or preview URL
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, '') || '';
    const demoLink = `${origin}/demo/${demoSlug}`;

    // Render template
    let emailSubject = templateData?.subject || `You're Invited to ${demoName}`;
    let emailBody = templateData?.body_html || `<p>You've been invited to ${demoName}. Your registration code is: <strong>${registrationCode}</strong></p><p><a href="${demoLink}">Get Started</a></p>`;

    // Replace placeholders
    const replacePlaceholders = (text: string) => {
      return text
        .replace(/\{\{demo_name\}\}/g, demoName)
        .replace(/\{\{registration_code\}\}/g, registrationCode)
        .replace(/\{\{demo_link\}\}/g, demoLink)
        .replace(/\{\{recipient_email\}\}/g, email.trim());
    };

    emailSubject = replacePlaceholders(emailSubject);
    emailBody = replacePlaceholders(emailBody);

    // Try to send email via Lovable API
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let emailSent = false;
    let emailError: string | null = null;

    if (lovableApiKey) {
      try {
        // Use Supabase Auth admin API to send a custom email via invite
        // For now, we'll store the invite details and the admin can share the link/code manually
        // Email sending will be available once email infrastructure is set up
        emailError = "Email infrastructure not yet configured. The user has been created with a registration code. Share the code and demo link manually.";
      } catch (e) {
        emailError = e.message || "Failed to send email";
      }
    } else {
      emailError = "Email infrastructure not configured. User created with registration code.";
    }

    return new Response(JSON.stringify({
      success: true,
      user: upsertedUser,
      registrationCode,
      demoLink,
      emailSent,
      emailError,
      emailSubject,
      emailBody,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
