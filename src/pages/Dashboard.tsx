import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Store, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    bakeries: 0,
    items: 0,
    totalSales: 0,
    todayRevenue: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [bakeriesRes, itemsRes, salesRes, todaySalesRes] = await Promise.all([
        supabase.from("bakeries").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("items").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase
          .from("sales")
          .select("total_amount")
          .eq("created_by", user.id)
          .gte("created_at", today.toISOString()),
      ]);

      const todayRevenue = todaySalesRes.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      setStats({
        bakeries: bakeriesRes.count || 0,
        items: itemsRes.count || 0,
        totalSales: salesRes.count || 0,
        todayRevenue,
      });
    };

    fetchStats();
  }, [user]);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bakeries</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bakeries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.items}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.todayRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/bakeries"
              className="flex items-center p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              <Store className="h-5 w-5 text-primary mr-3" />
              <span className="font-medium">Manage Bakeries</span>
            </a>
            <a
              href="/items"
              className="flex items-center p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              <Package className="h-5 w-5 text-primary mr-3" />
              <span className="font-medium">Manage Items</span>
            </a>
            <a
              href="/sell"
              className="flex items-center p-4 border border-border rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <ShoppingCart className="h-5 w-5 mr-3" />
              <span className="font-medium">Create Sale</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
