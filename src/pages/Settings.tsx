import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function Settings() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const exportAllData = async () => {
    if (!user) return;

    const { data: allSales } = await supabase
      .from("sales")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (!allSales || allSales.length === 0) {
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
    allSales.forEach((sale) => {
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
    a.download = `all_sales_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("All data exported successfully");
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>Export all your sales data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportAllData} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export All Sales Data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign Out</CardTitle>
          <CardDescription>End your current session</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignOut} variant="destructive" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
