import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getUser(token);
    
    if (claimsError || !claims?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.user.id;

    // Check if the requesting user is an admin (using service role to bypass RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user is at least an admin
    const { data: roleCheck, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "global_admin"])
      .maybeSingle();

    if (roleError || !roleCheck) {
      return new Response(
        JSON.stringify({ error: "You must be an admin to access this function" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isGlobalAdmin = roleCheck.role === "global_admin";

    // Parse request body
    const body = await req.json();
    const { action, email, userId: targetUserId, password: initialPassword, newPassword, role: requestedRole } = body;
    const roleToAssign = requestedRole === 'global_admin' ? 'global_admin' : 'admin';

    // Read-only actions are available to all admins; mutating actions require global_admin
    if (action !== "list" && !isGlobalAdmin) {
      return new Response(
        JSON.stringify({ error: "You must be a global admin to manage users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // List all admin users with their emails
    if (action === "list") {
      // Get all admin user roles
      const { data: roles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("*")
        .in("role", ["admin", "global_admin"])
        .order("created_at", { ascending: false });

      if (rolesError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch admin roles" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all users to map emails
      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();
      
      if (usersError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch user details" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map user IDs to emails
      const userMap = new Map(usersData.users.map(u => [u.id, u.email]));
      
      const adminsWithEmails = roles?.map(role => ({
        ...role,
        email: userMap.get(role.user_id) || 'Unknown',
      })) || [];

      return new Response(
        JSON.stringify({ users: adminsWithEmails, canManageUsers: isGlobalAdmin }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset password for a user (admin sets new password directly)
    if (action === "resetPassword") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // newPassword is already parsed from body above

      if (newPassword) {
        // Admin is setting a new password directly
        const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
          password: newPassword,
        });

        if (updateError) {
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: "Password has been updated successfully." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Otherwise send a password reset email
      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();
      
      if (usersError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch user details" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetUser = usersData.users.find(u => u.id === targetUserId);
      
      if (!targetUser || !targetUser.email) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: linkData, error: resetError } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: targetUser.email,
      });

      if (resetError) {
        return new Response(
          JSON.stringify({ error: "Failed to generate password setup link: " + resetError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const setupLink = linkData?.properties?.action_link || null;

      return new Response(
        JSON.stringify({ success: true, message: `Password setup link generated for ${targetUser.email}`, setupLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "add") {
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Look up user by email using admin client
      const { data: users, error: lookupError } = await adminClient.auth.admin.listUsers();
      
      if (lookupError) {
        return new Response(
          JSON.stringify({ error: "Failed to look up user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let targetUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      let wasCreated = false;
      
      // If user doesn't exist, create them with a random password (they'll set their own via link)
      if (!targetUser) {
        const randomPassword = crypto.randomUUID() + "Aa1!";
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: email.toLowerCase(),
          password: randomPassword,
          email_confirm: true,
        });

        if (createError || !newUser?.user) {
          return new Response(
            JSON.stringify({ error: "Failed to create user: " + (createError?.message || "Unknown error") }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        targetUser = newUser.user;
        wasCreated = true;
      }

      // Check if already has this role
      const { data: existingRole } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUser.id)
        .eq("role", roleToAssign)
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: `This user already has the ${roleToAssign} role` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove any existing role before assigning the new one
      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUser.id)
        .in("role", ["admin", "global_admin"]);

      // Add role
      const { error: insertError } = await adminClient
        .from("user_roles")
        .insert({ user_id: targetUser.id, role: roleToAssign });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to add admin role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a password setup link for the user
      let setupLink: string | null = null;
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase(),
      });

      if (!linkError && linkData?.properties?.action_link) {
        setupLink = linkData.properties.action_link;
      }

      return new Response(
        JSON.stringify({ success: true, userId: targetUser.id, created: wasCreated, role: roleToAssign, setupLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "updateRole") {
      if (!targetUserId || !requestedRole) {
        return new Response(
          JSON.stringify({ error: "User ID and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove existing admin roles
      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .in("role", ["admin", "global_admin"]);

      // Insert new role
      const { error: insertError } = await adminClient
        .from("user_roles")
        .insert({ user_id: targetUserId, role: roleToAssign });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to update role: " + insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, role: roleToAssign }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "remove") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .in("role", ["admin", "global_admin"]);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Failed to remove admin role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
