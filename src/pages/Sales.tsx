import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Download, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, subDays, startOfWeek, endOfWeek } from "date-fns";

interface Sale {
  id: string;
  bakery_name: string;
  bakery_phone: string;
  items: any;
  total_amount: number;
  created_at: string;
}

export default function Sales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetchSales();
  }, [user, fromDate, toDate]);

  const setDateRange = (from: Date, to: Date) => {
    setFromDate(format(from, "yyyy-MM-dd"));
    setToDate(format(to, "yyyy-MM-dd"));
  };

  const quickFilters = {
    today: () => setDateRange(new Date(), new Date()),
    yesterday: () => setDateRange(subDays(new Date(), 1), subDays(new Date(), 1)),
    thisWeek: () => setDateRange(startOfWeek(new Date()), endOfWeek(new Date())),
    thisMonth: () => setDateRange(startOfMonth(new Date()), endOfMonth(new Date())),
    lastMonth: () => {
      const lastMonth = subMonths(new Date(), 1);
      setDateRange(startOfMonth(lastMonth), endOfMonth(lastMonth));
    },
    thisYear: () => setDateRange(startOfYear(new Date()), endOfYear(new Date())),
    lastYear: () => {
      const lastYear = subYears(new Date(), 1);
      setDateRange(startOfYear(lastYear), endOfYear(lastYear));
    },
  };

  const fetchSales = async () => {
    if (!user) return;

    const fromDateStart = new Date(fromDate);
    fromDateStart.setHours(0, 0, 0, 0);

    const toDateEnd = new Date(toDate);
    toDateEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("created_by", user.id)
      .gte("created_at", fromDateStart.toISOString())
      .lte("created_at", toDateEnd.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch sales");
    } else {
      setSales(data || []);
    }
  };

  const exportToCSV = () => {
    if (sales.length === 0) {
      toast.error("No sales data to export");
      return;
    }

    const headers = [
      "sale_id",
      "bakery_name",
      "bakery_phone",
      "date_iso",
      "item_name",
      "qty",
      "unit_price",
      "amount",
      "total_amount",
      "status",
    ];

    const rows: string[][] = [];
    sales.forEach((sale) => {
      const items = sale.items as any[];
      items.forEach((item: any) => {
        rows.push([
          sale.id,
          sale.bakery_name,
          sale.bakery_phone,
          sale.created_at,
          item.name,
          item.qty.toString(),
          item.unitPrice.toString(),
          item.amount.toString(),
          sale.total_amount.toString(),
          "saved",
        ]);
      });
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("CSV exported successfully");
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sales History</h1>
        <p className="text-muted-foreground mt-1">View and export your sales data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Sales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={quickFilters.today}>Today</Button>
            <Button variant="outline" size="sm" onClick={quickFilters.yesterday}>Yesterday</Button>
            <Button variant="outline" size="sm" onClick={quickFilters.thisWeek}>This Week</Button>
            <Button variant="outline" size="sm" onClick={quickFilters.thisMonth}>This Month</Button>
            <Button variant="outline" size="sm" onClick={quickFilters.lastMonth}>Last Month</Button>
            <Button variant="outline" size="sm" onClick={quickFilters.thisYear}>This Year</Button>
            <Button variant="outline" size="sm" onClick={quickFilters.lastYear}>Last Year</Button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={exportToCSV} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sales.map((sale) => (
          <Card key={sale.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{sale.bakery_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{sale.bakery_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">₹{sale.total_amount}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(sale.created_at), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(sale.items as any[]).map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between text-sm p-2 bg-secondary rounded"
                  >
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.qty} × ₹{item.unitPrice} = ₹{item.amount}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sales.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No sales found for the selected date range.
        </div>
      )}
    </div>
  );
}
