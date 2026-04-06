import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AdminAction = 
  | "login" | "logout" 
  | "create" | "update" | "delete" 
  | "password_reset" | "role_change";

export type PortalAction =
  | "login" | "registration"
  | "verification_started" | "verification_completed" | "verification_failed"
  | "use_case_started" | "use_case_completed"
  | "form_submitted";

export async function logAdminAction(params: {
  action: AdminAction;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  details?: Record<string, unknown>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("admin_audit_logs").insert([{
      user_id: user.id,
      user_email: user.email ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      entity_label: params.entityLabel ?? null,
      details: (params.details ?? {}) as Json,
    }]);
  } catch (err) {
    console.error("Failed to log admin action:", err);
  }
}

export async function logPortalActivity(params: {
  action: PortalAction;
  portalUserId?: string;
  portalUserEmail?: string;
  demoId?: string;
  demoName?: string;
  useCaseId?: string;
  useCaseTitle?: string;
  verificationType?: string;
  verificationResult?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await supabase.from("portal_activity_logs").insert([{
      portal_user_id: params.portalUserId ?? null,
      portal_user_email: params.portalUserEmail ?? null,
      demo_id: params.demoId ?? null,
      demo_name: params.demoName ?? null,
      action: params.action,
      use_case_id: params.useCaseId ?? null,
      use_case_title: params.useCaseTitle ?? null,
      verification_type: params.verificationType ?? null,
      verification_result: params.verificationResult ?? null,
      details: (params.details ?? {}) as Record<string, unknown>,
    }]);
  } catch (err) {
    console.error("Failed to log portal activity:", err);
  }
}
