import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Verify that the request comes from an authenticated admin user.
 * Returns the user ID if valid, or null if not authorized.
 */
export async function requireAdmin(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error } = await userClient.auth.getUser(token);

  if (error || !claims?.user) return null;

  // Check admin role using service client to bypass RLS
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleCheck } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", claims.user.id)
    .in("role", ["admin", "global_admin"])
    .maybeSingle();

  if (!roleCheck) return null;

  return { userId: claims.user.id };
}

/**
 * Standard 401 response for unauthorized requests.
 */
export function unauthorizedResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
