import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LogOut,
  BarChart3,
  Users,
  Activity,
  Shield,
  UserCheck,
  UserX,
  Eye,
  FileCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuditLogs, usePortalActivityLogs, usePortalUserStats } from "@/hooks/useReporting";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";

const actionColors: Record<string, string> = {
  login: "hsl(var(--primary))",
  logout: "hsl(var(--muted-foreground))",
  create: "hsl(142 76% 36%)",
  update: "hsl(217 91% 60%)",
  delete: "hsl(0 84% 60%)",
  password_reset: "hsl(38 92% 50%)",
  role_change: "hsl(280 67% 55%)",
  registration: "hsl(199 89% 48%)",
  verification_started: "hsl(38 92% 50%)",
  verification_completed: "hsl(142 76% 36%)",
  verification_failed: "hsl(0 84% 60%)",
  use_case_started: "hsl(217 91% 60%)",
  use_case_completed: "hsl(142 76% 36%)",
  form_submitted: "hsl(var(--primary))",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(217 91% 60%)",
  "hsl(280 67% 55%)",
  "hsl(199 89% 48%)",
];

const barChartConfig: ChartConfig = {
  count: { label: "Events", color: "hsl(var(--primary))" },
};

const pieChartConfig: ChartConfig = {
  count: { label: "Count" },
};

function formatAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function ActionBadge({ action }: { action: string }) {
  const variant =
    action === "delete" || action.includes("failed")
      ? "destructive"
      : action === "create" || action.includes("completed")
      ? "default"
      : "secondary";
  return <Badge variant={variant}>{formatAction(action)}</Badge>;
}

export default function ReportingPage() {
  const navigate = useNavigate();
  const { signOut, isAdmin, isLoading: authLoading, roleChecked } = useAuth();
  const { data: adminLogs = [], isLoading: adminLogsLoading } = useAdminAuditLogs();
  const { data: portalLogs = [], isLoading: portalLogsLoading } = usePortalActivityLogs();
  const { data: stats, isLoading: statsLoading } = usePortalUserStats();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (authLoading || !roleChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="admin-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Reporting</h1>
                <p className="text-sm text-muted-foreground">Activity logs, usage analytics & reports</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="admin-container py-8">
        <Tabs defaultValue="portal-stats" className="space-y-6 w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
            <TabsTrigger value="portal-stats" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Portal User Stats
            </TabsTrigger>
            <TabsTrigger value="portal-activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Portal Activity Log
            </TabsTrigger>
            <TabsTrigger value="admin-activity" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Admin Activity Log
            </TabsTrigger>
          </TabsList>

          {/* Portal User Stats */}
          <TabsContent value="portal-stats" className="space-y-6">
            {statsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : stats ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={stats.totalUsers} />
                  <StatCard icon={<UserCheck className="w-5 h-5" />} label="Active Users" value={stats.activeUsers} color="text-emerald-500" />
                  <StatCard icon={<Shield className="w-5 h-5" />} label="Verified" value={stats.verifiedUsers} color="text-blue-500" />
                  <StatCard icon={<UserX className="w-5 h-5" />} label="Failed" value={stats.failedUsers} color="text-destructive" />
                  <StatCard icon={<Eye className="w-5 h-5" />} label="Logins" value={stats.logins} />
                  <StatCard icon={<FileCheck className="w-5 h-5" />} label="Use Cases Done" value={stats.useCasesCompleted} color="text-emerald-500" />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Activity Over Time */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Portal Activity (Last 30 Days)</CardTitle>
                      <CardDescription>Events per day across all portal users</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stats.activityByDay.length > 0 ? (
                        <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                          <BarChart data={stats.activityByDay}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} />
                            <YAxis allowDecimals={false} fontSize={11} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <p className="text-center text-muted-foreground py-12">No activity data yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Action Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Activity Breakdown</CardTitle>
                      <CardDescription>Distribution of portal user actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stats.actionBreakdown.length > 0 ? (
                        <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
                          <PieChart>
                            <ChartTooltip content={<ChartTooltipContent nameKey="action" />} />
                            <Pie
                              data={stats.actionBreakdown}
                              dataKey="count"
                              nameKey="action"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ action, count }) => `${formatAction(action)}: ${count}`}
                              labelLine={false}
                            >
                              {stats.actionBreakdown.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ChartContainer>
                      ) : (
                        <p className="text-center text-muted-foreground py-12">No activity data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* Portal Activity Log */}
          <TabsContent value="portal-activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Portal Activity Log</CardTitle>
                <CardDescription>Recent portal user events (logins, verifications, use cases)</CardDescription>
              </CardHeader>
              <CardContent>
                {portalLogsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : portalLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No portal activity recorded yet</p>
                ) : (
                  <div className="overflow-auto max-h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Demo</TableHead>
                          <TableHead>Use Case</TableHead>
                          <TableHead>Verification</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {portalLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(log.created_at), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell><ActionBadge action={log.action} /></TableCell>
                            <TableCell className="text-sm">{log.portal_user_email || "—"}</TableCell>
                            <TableCell className="text-sm">{log.demo_name || "—"}</TableCell>
                            <TableCell className="text-sm">{log.use_case_title || "—"}</TableCell>
                            <TableCell className="text-sm">
                              {log.verification_result ? (
                                <Badge variant={log.verification_result === "pass" ? "default" : "destructive"}>
                                  {log.verification_result}
                                </Badge>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Activity Log */}
          <TabsContent value="admin-activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Activity Log</CardTitle>
                <CardDescription>Recent admin actions (logins, changes, user management)</CardDescription>
              </CardHeader>
              <CardContent>
                {adminLogsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : adminLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No admin activity recorded yet</p>
                ) : (
                  <div className="overflow-auto max-h-[600px]">
                    <Table>
                      <TableHeader>
                         <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Entity Type</TableHead>
                          <TableHead>Entity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminLogs.map((log) => {
                          const role = (log.details as Record<string, unknown>)?.role as string | undefined;
                          return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(log.created_at), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell><ActionBadge action={log.action} /></TableCell>
                            <TableCell className="text-sm">{log.user_email || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {role === "global_admin" ? "Global Admin" : role === "admin" ? "Admin" : role || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{log.entity_type || "—"}</TableCell>
                            <TableCell className="text-sm">{log.entity_label || log.entity_id || "—"}</TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-1">
          <span className={color || "text-muted-foreground"}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
