import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Bakery {
  id: string;
  name: string;
  phone: string;
}

interface Item {
  id: string;
  name: string;
  unit_price: number;
}

interface CartItem {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export default function Sell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bakeries, setBakeries] = useState<Bakery[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedBakery, setSelectedBakery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [bakeriesRes, itemsRes] = await Promise.all([
      supabase.from("bakeries").select("id, name, phone").eq("created_by", user.id).order("last_used_at", { ascending: false }),
      supabase.from("items").select("*").eq("created_by", user.id).order("name", { ascending: true }),
    ]);

    if (bakeriesRes.data) setBakeries(bakeriesRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
  };

  const addToCart = () => {
    if (!selectedItem || qty <= 0) {
      toast.error("Please select an item and enter a valid quantity");
      return;
    }

    const item = items.find((i) => i.id === selectedItem);
    if (!item) return;

    const amount = item.unit_price * qty;
    const newItem: CartItem = {
      itemId: item.id,
      name: item.name,
      qty,
      unitPrice: item.unit_price,
      amount,
    };

    setCart([...cart, newItem]);
    setSelectedItem("");
    setQty(1);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.amount, 0);

  const saveSale = async () => {
    if (!selectedBakery || cart.length === 0) {
      toast.error("Please select a bakery and add items to cart");
      return;
    }

    const bakery = bakeries.find((b) => b.id === selectedBakery);
    if (!bakery || !user) return;

    const { error: saleError } = await supabase.from("sales").insert({
      bakery_id: bakery.id,
      bakery_name: bakery.name,
      bakery_phone: bakery.phone,
      items: cart as any,
      total_amount: cartTotal,
      created_by: user.id,
      status: "saved",
    });

    if (saleError) {
      toast.error("Failed to save sale");
      return;
    }

    await supabase
      .from("bakeries")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", bakery.id);

    toast.success("Sale saved successfully!");
    setCart([]);
    setSelectedBakery("");
    navigate("/sales");
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sell</h1>
        <p className="text-muted-foreground mt-1">Create a new sale transaction</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Bakery</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBakery} onValueChange={setSelectedBakery}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a bakery..." />
            </SelectTrigger>
            <SelectContent>
              {bakeries.map((bakery) => (
                <SelectItem key={bakery.id} value={bakery.id}>
                  {bakery.name} - {bakery.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Item</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - ₹{item.unit_price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addToCart} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cart</CardTitle>
        </CardHeader>
        <CardContent>
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Cart is empty</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-secondary rounded-md"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.qty} × ₹{item.unitPrice} = ₹{item.amount}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFromCart(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={saveSale} className="w-full" size="lg" disabled={cart.length === 0}>
        <Save className="h-4 w-4 mr-2" />
        Save Sale
      </Button>
    </div>
  );
}
