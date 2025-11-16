import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfDay, startOfMonth, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Package } from "lucide-react";

interface DailyRevenue {
  date: string;
  revenue: number;
}

interface TopItem {
  name: string;
  quantity: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<"today" | "month" | "custom">("today");
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayQty, setTodayQty] = useState(0);
  const [chartData, setChartData] = useState<DailyRevenue[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    if (!user) return;

    let startDate = new Date();
    if (dateRange === "today") {
      startDate = startOfDay(new Date());
    } else if (dateRange === "month") {
      startDate = startOfMonth(new Date());
    }

    const { data: salesData } = await supabase
      .from("sales")
      .select("*")
      .eq("created_by", user.id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (!salesData) return;

    // Calculate today's metrics
    const today = startOfDay(new Date());
    const todaySales = salesData.filter(
      (sale) => new Date(sale.created_at) >= today
    );
    const todayRev = todaySales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    const todayQ = todaySales.reduce((sum, sale) => {
      const items = sale.items as any[];
      return sum + items.reduce((itemSum: number, item: any) => itemSum + item.qty, 0);
    }, 0);

    setTodayRevenue(todayRev);
    setTodayQty(todayQ);

    // Calculate daily revenue for chart
    const dailyMap = new Map<string, number>();
    salesData.forEach((sale) => {
      const date = format(new Date(sale.created_at), "MMM dd");
      dailyMap.set(date, (dailyMap.get(date) || 0) + Number(sale.total_amount));
    });

    const chartD: DailyRevenue[] = Array.from(dailyMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
    setChartData(chartD);

    // Calculate top items
    const itemMap = new Map<string, number>();
    salesData.forEach((sale) => {
      const items = sale.items as any[];
      items.forEach((item: any) => {
        itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.qty);
      });
    });

    const topI: TopItem[] = Array.from(itemMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    setTopItems(topI);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your business performance</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={dateRange === "today" ? "default" : "outline"}
          onClick={() => setDateRange("today")}
        >
          Today
        </Button>
        <Button
          variant={dateRange === "month" ? "default" : "outline"}
          onClick={() => setDateRange("month")}
        >
          This Month
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{todayRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Quantity Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayQty}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Items by Quantity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topItems.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-secondary rounded-md"
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-primary font-bold">{item.quantity} units</span>
              </div>
            ))}
          </div>
          {topItems.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
