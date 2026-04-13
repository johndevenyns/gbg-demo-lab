import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminAuditLogs(limit = 200) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("admin-audit-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_audit_logs" },
        () => {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
          }, 0);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ["admin-audit-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalActivityLogs(limit = 200) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("portal-activity-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "portal_activity_logs" },
        () => {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["portal-activity-logs"] });
            queryClient.invalidateQueries({ queryKey: ["portal-user-stats"] });
          }, 0);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ["portal-activity-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalUserStats() {
  return useQuery({
    queryKey: ["portal-user-stats"],
    queryFn: async () => {
      const [usersRes, activityRes] = await Promise.all([
        supabase.from("portal_users").select("id, created_at, is_active, verification_status"),
        supabase.from("portal_activity_logs").select("action, created_at, verification_result, demo_name"),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (activityRes.error) throw activityRes.error;

      const users = usersRes.data ?? [];
      const activities = activityRes.data ?? [];

      return {
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.is_active).length,
        verifiedUsers: users.filter((u) => u.verification_status === "verified").length,
        failedUsers: users.filter((u) => u.verification_status === "failed").length,
        totalActivities: activities.length,
        verificationStarted: activities.filter((a) => a.action === "verification_started").length,
        verificationCompleted: activities.filter((a) => a.action === "verification_completed").length,
        verificationFailed: activities.filter((a) => a.action === "verification_failed").length,
        useCasesCompleted: activities.filter((a) => a.action === "use_case_completed").length,
        logins: activities.filter((a) => a.action === "login").length,
        registrations: activities.filter((a) => a.action === "registration").length,
        activityByDay: getActivityByDay(activities),
        actionBreakdown: getActionBreakdown(activities),
        activityByDemo: getActivityByDemo(activities),
      };
    },
  });
}

function getActivityByDay(activities: Array<{ action: string; created_at: string }>) {
  const days: Record<string, number> = {};
  activities.forEach((a) => {
    const day = a.created_at.slice(0, 10);
    days[day] = (days[day] || 0) + 1;
  });
  return Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));
}

function getActionBreakdown(activities: Array<{ action: string }>) {
  const counts: Record<string, number> = {};
  activities.forEach((a) => {
    counts[a.action] = (counts[a.action] || 0) + 1;
  });
  return Object.entries(counts).map(([action, count]) => ({ action, count }));
}

function getActivityByDemo(activities: Array<{ demo_name: string | null }>) {
  const counts: Record<string, number> = {};
  activities.forEach((a) => {
    const name = a.demo_name || "Unknown";
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([demo, count]) => ({ demo, count }))
    .sort((a, b) => b.count - a.count);
}
