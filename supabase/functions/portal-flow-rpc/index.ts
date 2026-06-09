import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action =
  | { action: "validate_code"; demoId: string; code: string }
  | { action: "verify_cc"; demoId: string; cardNumber: string }
  | {
      action: "upsert_verification_result";
      demoId: string;
      email: string;
      profileData: Record<string, unknown>;
      displayName?: string | null;
      verificationStatus: "verified" | "failed";
      password?: string;
    };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const body = (await req.json()) as Action;
    if (!body || !("action" in body)) return json(400, { error: "Invalid body" });

    if (body.action === "validate_code") {
      const code = (body.code || "").trim();
      const demoId = body.demoId;
      if (!code || !demoId) return json(400, { error: "Missing fields" });

      // Global codes
      const { data: globalRows } = await admin
        .from("global_settings")
        .select("value")
        .like("key", "global_reg_code_%");
      const isGlobal = (globalRows || []).some((row: { value: string }) => {
        try {
          const parsed = JSON.parse(row.value);
          return parsed.isActive !== false && parsed.code === code;
        } catch {
          return row.value === code;
        }
      });
      if (isGlobal) return json(200, { ok: true, prefill: {} });

      // Legacy master code
      const { data: master } = await admin
        .from("global_settings")
        .select("value")
        .eq("key", "master_registration_code")
        .maybeSingle();
      if ((master as { value?: string } | null)?.value === code) {
        return json(200, { ok: true, prefill: {} });
      }

      // Portal user lookup
      const { data: user } = await admin
        .from("portal_users")
        .select(
          "id, email, registration_code, registration_code_expires_at, is_active, is_default, profile_data"
        )
        .eq("registration_code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (!user) return json(200, { ok: false, error: "Invalid registration code." });

      if (!user.is_default) {
        const { data: assignment } = await admin
          .from("portal_user_demo_assignments")
          .select("id")
          .eq("portal_user_id", user.id)
          .eq("demo_id", demoId)
          .maybeSingle();
        if (!assignment)
          return json(200, { ok: false, error: "Invalid registration code." });
      }

      if (user.registration_code_expires_at) {
        if (new Date(user.registration_code_expires_at) < new Date()) {
          return json(200, {
            ok: false,
            error: "This registration code has expired. Please request a new one.",
          });
        }
      }

      const prefill: Record<string, string> = {};
      const pd = user.profile_data as Record<string, unknown> | null;
      if (pd && typeof pd === "object") {
        for (const [k, v] of Object.entries(pd)) {
          if (typeof v === "string" && v.trim()) prefill[k] = v;
        }
      }
      if (user.email && !prefill.email) prefill.email = user.email;
      return json(200, { ok: true, prefill, email: user.email });
    }

    if (body.action === "verify_cc") {
      const demoId = body.demoId;
      const normalized = (body.cardNumber || "").replace(/[\s-]/g, "");
      if (!normalized || !demoId) return json(400, { error: "Missing fields" });

      const { data: assignments } = await admin
        .from("portal_user_demo_assignments")
        .select("portal_user_id")
        .eq("demo_id", demoId);
      const assignedIds = (assignments || []).map((a: { portal_user_id: string }) => a.portal_user_id);

      const { data: users } = await admin
        .from("portal_users")
        .select("id, email, display_name, profile_data, is_default, is_active")
        .eq("is_active", true);

      const match = (users || []).find((u: {
        id: string; is_default: boolean; profile_data: Record<string, string> | null;
      }) => {
        if (!u.is_default && !assignedIds.includes(u.id)) return false;
        const pd = u.profile_data;
        if (!pd?.creditCardNumber) return false;
        return pd.creditCardNumber.replace(/[\s-]/g, "") === normalized;
      });

      if (!match)
        return json(200, {
          ok: false,
          error: "Card number not recognized. Please check and try again.",
        });

      return json(200, {
        ok: true,
        email: (match as { email: string }).email,
        profileData: (match as { profile_data: Record<string, unknown> }).profile_data || {},
      });
    }

    if (body.action === "upsert_verification_result") {
      const { demoId, email, profileData, displayName, verificationStatus, password } = body;
      if (!demoId || !email) return json(400, { error: "Missing fields" });

      const normalizedEmail = email.toLowerCase();
      const { data: existing } = await admin
        .from("portal_users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      let userId: string | null = existing?.id ?? null;
      if (userId) {
        await admin
          .from("portal_users")
          .update({
            profile_data: profileData,
            display_name: displayName ?? null,
            verification_status: verificationStatus,
          })
          .eq("id", userId);
      } else {
        const pwd = password || Math.random().toString(36).slice(-10);
        const { data: created } = await admin
          .from("portal_users")
          .insert({
            email: normalizedEmail,
            password: pwd,
            display_name: displayName ?? null,
            profile_data: profileData,
            verification_status: verificationStatus,
          })
          .select("id")
          .single();
        userId = created?.id ?? null;
      }

      if (userId) {
        await admin
          .from("portal_user_demo_assignments")
          .upsert(
            { portal_user_id: userId, demo_id: demoId },
            { onConflict: "portal_user_id,demo_id" }
          );
      }
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("portal-flow-rpc error", err);
    return json(500, { error: "Server error" });
  }
});
