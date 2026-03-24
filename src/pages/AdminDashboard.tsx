import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Car, IndianRupee, TrendingUp, Check, X, Trash2, Loader2, Shield, UserCog, Calendar, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  role: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState({ users: 0, locations: 0, bookings: 0, revenue: 0, platformEarnings: 0 });
  const [pendingLocations, setPendingLocations] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [usersPage, setUsersPage] = useState(1);
  const [bookingsPage, setBookingsPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        { count: usersCount },
        { count: locationsCount },
        { count: bookingsCount },
        { data: revenue },
        { data: pending },
        { data: profilesData },
        { data: rolesData },
        { data: bookingsData },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("parking_locations").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("payments").select("amount, platform_fee").eq("status", "completed"),
        supabase.from("parking_locations").select("*, profiles(full_name, email)").eq("is_approved", false),
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("bookings").select("*, profiles(full_name, email), parking_locations(name, city), payments(platform_fee, owner_revenue)").order("created_at", { ascending: false }),
      ]);

      const totalRevenue = revenue?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalPlatformEarnings = revenue?.reduce((sum, p) => sum + Number((p as any).platform_fee || 0), 0) || 0;
      setStats({ users: usersCount || 0, locations: locationsCount || 0, bookings: bookingsCount || 0, revenue: totalRevenue, platformEarnings: totalPlatformEarnings });
      setPendingLocations(pending || []);
      setBookings(bookingsData || []);

      // Merge profiles with roles
      const roleMap: Record<string, string> = {};
      for (const r of rolesData || []) {
        roleMap[r.user_id] = r.role;
      }
      const merged = (profilesData || []).map((p) => ({
        ...p,
        role: roleMap[p.id] || "user",
      }));
      setUsers(merged);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const approveLocation = async (id: string) => {
    await supabase.from("parking_locations").update({ is_approved: true }).eq("id", id);
    toast({ title: "Location approved!" });
    fetchData();
  };

  const rejectLocation = async (id: string) => {
    await supabase.from("parking_locations").update({ is_approved: false }).eq("id", id);
    toast({ title: "Location rejected" });
    fetchData();
  };

  const deleteLocation = async (id: string) => {
    await supabase.from("parking_slots").delete().eq("parking_id", id);
    const { error } = await supabase.from("parking_locations").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Location deleted permanently" });
      fetchData();
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id) {
      toast({ title: "Cannot change your own role", variant: "destructive" });
      return;
    }
    setUpdatingRole(userId);
    // Delete existing role and insert new one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert([{ user_id: userId, role: newRole as "user" | "parking_owner" | "admin" }]);
    if (error) {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role updated", description: `User role changed to ${newRole}` });
      fetchData();
    }
    setUpdatingRole(null);
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "parking_owner": return "default" as const;
      default: return "secondary" as const;
    }
  };

  const statCards = [
    { icon: Users, label: "Total Users", value: stats.users, color: "text-blue-500" },
    { icon: Car, label: "Parking Locations", value: stats.locations, color: "text-primary" },
    { icon: TrendingUp, label: "Total Bookings", value: stats.bookings, color: "text-orange-500" },
    { icon: IndianRupee, label: "Total Revenue", value: `₹${stats.revenue.toLocaleString()}`, color: "text-primary" },
    { icon: IndianRupee, label: "Platform Earnings (5%)", value: `₹${stats.platformEarnings.toLocaleString()}`, color: "text-green-500" },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold mb-8">Admin <span className="text-gradient">Dashboard</span></h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div className="text-2xl font-display font-bold">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList>
            <TabsTrigger value="approvals" className="gap-2">
              <Shield className="h-4 w-4" /> Approvals
              {pendingLocations.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                  {pendingLocations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UserCog className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="h-4 w-4" /> Bookings
            </TabsTrigger>
          </TabsList>

          {/* Pending Approvals Tab */}
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLocations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No pending approvals</p>
                ) : (
                  <div className="space-y-4">
                    {pendingLocations.map((loc) => (
                      <div key={loc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-accent/50 border border-border">
                        <div>
                          <h4 className="font-semibold">{loc.name}</h4>
                          <p className="text-sm text-muted-foreground">{loc.address}, {loc.city}</p>
                          <p className="text-xs text-muted-foreground">by {loc.profiles?.full_name || loc.profiles?.email}</p>
                          <p className="text-xs text-muted-foreground">{loc.total_slots} slots · ₹{loc.price_per_hour}/hr</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" onClick={() => approveLocation(loc.id)}>
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rejectLocation(loc.id)}>
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{loc.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete this parking location and all its slots. This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteLocation(loc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-3 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[160px] h-9 text-sm">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="parking_owner">Parking Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const filtered = users.filter((u) => {
                          const q = userSearch.toLowerCase();
                          const matchesSearch = !q || (u.full_name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone || "").toLowerCase().includes(q);
                          const matchesRole = roleFilter === "all" || u.role === roleFilter;
                          return matchesSearch && matchesRole;
                        });
                        const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
                        const page = Math.min(usersPage, totalPages);
                        const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
                        return paginated.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.phone || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(u.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {u.id === currentUser?.id ? (
                                <span className="text-xs text-muted-foreground">You</span>
                              ) : (
                                <Select
                                  value={u.role}
                                  onValueChange={(val) => changeUserRole(u.id, val)}
                                  disabled={updatingRole === u.id}
                                >
                                  <SelectTrigger className="w-[140px] h-8 text-sm">
                                    {updatingRole === u.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <SelectValue />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover z-50">
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="parking_owner">Parking Owner</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
                {(() => {
                  const filtered = users.filter((u) => {
                    const q = userSearch.toLowerCase();
                    const matchesSearch = !q || (u.full_name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone || "").toLowerCase().includes(q);
                    const matchesRole = roleFilter === "all" || u.role === roleFilter;
                    return matchesSearch && matchesRole;
                  });
                  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
                  if (totalPages <= 1) return null;
                  return (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={usersPage <= 1} onClick={() => setUsersPage((p) => p - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">Page {usersPage} of {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={usersPage >= totalPages} onClick={() => setUsersPage((p) => p + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Booking History</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No bookings yet</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Start</TableHead>
                            <TableHead>End</TableHead>
                             <TableHead>Amount</TableHead>
                             <TableHead>Platform Fee</TableHead>
                             <TableHead>Owner Revenue</TableHead>
                             <TableHead>Status</TableHead>
                             <TableHead>Payment</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookings
                            .slice((bookingsPage - 1) * ROWS_PER_PAGE, bookingsPage * ROWS_PER_PAGE)
                            .map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="font-medium">{b.profiles?.full_name || b.profiles?.email || "—"}</TableCell>
                              <TableCell>{b.parking_locations?.name || "—"}<span className="text-xs text-muted-foreground block">{b.parking_locations?.city}</span></TableCell>
                              <TableCell className="text-sm">{new Date(b.start_time).toLocaleString()}</TableCell>
                              <TableCell className="text-sm">{new Date(b.end_time).toLocaleString()}</TableCell>
                              <TableCell>₹{Number(b.total_price).toLocaleString()}</TableCell>
                              <TableCell className="text-destructive font-medium">₹{Number((b as any).payments?.[0]?.platform_fee || (b.total_price * 0.05)).toLocaleString()}</TableCell>
                              <TableCell className="text-primary font-medium">₹{Number((b as any).payments?.[0]?.owner_revenue || (b.total_price * 0.95)).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={b.booking_status === "confirmed" ? "default" : b.booking_status === "cancelled" ? "destructive" : "secondary"}>
                                  {b.booking_status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={b.payment_status === "completed" ? "default" : "secondary"}>
                                  {b.payment_status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(bookings.length / ROWS_PER_PAGE));
                      if (totalPages <= 1) return null;
                      return (
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-sm text-muted-foreground">{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={bookingsPage <= 1} onClick={() => setBookingsPage((p) => p - 1)}>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">Page {bookingsPage} of {totalPages}</span>
                            <Button variant="outline" size="sm" disabled={bookingsPage >= totalPages} onClick={() => setBookingsPage((p) => p + 1)}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
