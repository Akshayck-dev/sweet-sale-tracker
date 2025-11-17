import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Save, Edit2, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

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
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [showBakeryDialog, setShowBakeryDialog] = useState<boolean>(false);
  const [newBakery, setNewBakery] = useState({ name: "", phone: "", address: "" });
  const [editingCartIndex, setEditingCartIndex] = useState<number>(-1);
  const [editQty, setEditQty] = useState<number>(1);

  useEffect(() => {
    fetchData();
    fetchUnsyncedCount();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
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

  const fetchUnsyncedCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id)
      .eq("status", "pending");
    setUnsyncedCount(count || 0);
  };

  const handleAddBakery = async () => {
    if (!newBakery.name || !newBakery.phone) {
      toast.error("Name & phone required");
      return;
    }

    const { data: existing } = await supabase
      .from("bakeries")
      .select("id, name, phone")
      .eq("phone", newBakery.phone)
      .eq("created_by", user!.id)
      .limit(1)
      .single();

    if (existing) {
      setSelectedBakery(existing.id);
      toast.success("Selected existing bakery");
    } else {
      const { data: created, error } = await supabase
        .from("bakeries")
        .insert({
          name: newBakery.name,
          phone: newBakery.phone,
          address: newBakery.address || null,
          created_by: user!.id,
          last_used_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Failed to add bakery");
        return;
      }

      setSelectedBakery(created.id);
      toast.success("Bakery added");
      fetchData();
    }

    setShowBakeryDialog(false);
    setNewBakery({ name: "", phone: "", address: "" });
  };

  const addToCart = () => {
    if (!selectedItem || qty <= 0) {
      toast.error("Please select an item and enter a valid quantity");
      return;
    }

    const item = items.find((i) => i.id === selectedItem);
    if (!item) return;

    const existingIndex = cart.findIndex((c) => c.itemId === item.id);
    if (existingIndex !== -1) {
      const updated = [...cart];
      updated[existingIndex].qty += qty;
      updated[existingIndex].amount = updated[existingIndex].qty * updated[existingIndex].unitPrice;
      setCart(updated);
    } else {
      const amount = item.unit_price * qty;
      const newItem: CartItem = {
        itemId: item.id,
        name: item.name,
        qty,
        unitPrice: item.unit_price,
        amount,
      };
      setCart([...cart, newItem]);
    }

    setSelectedItem("");
    setQty(1);
  };

  const openEditCart = (index: number) => {
    setEditingCartIndex(index);
    setEditQty(cart[index].qty);
  };

  const saveEditCart = () => {
    if (editQty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    const updated = [...cart];
    updated[editingCartIndex].qty = editQty;
    updated[editingCartIndex].amount = editQty * updated[editingCartIndex].unitPrice;
    setCart(updated);
    setEditingCartIndex(-1);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.amount, 0);

  const saveSale = async (andEdit: boolean = false) => {
    if (!selectedBakery || cart.length === 0) {
      toast.error("Please select a bakery and add items to cart");
      return;
    }

    const bakery = bakeries.find((b) => b.id === selectedBakery);
    if (!bakery || !user) return;

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        bakery_id: bakery.id,
        bakery_name: bakery.name,
        bakery_phone: bakery.phone,
        items: cart as any,
        total_amount: cartTotal,
        created_by: user.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (saleError) {
      toast.error("Failed to save sale");
      return;
    }

    await supabase
      .from("bakeries")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", bakery.id);

    setCart([]);
    setSelectedBakery("");
    fetchUnsyncedCount();

    if (andEdit) {
      navigate(`/sales`);
      toast.success("Sale saved");
    } else {
      toast.success("Sale saved", {
        action: {
          label: "View",
          onClick: () => navigate("/sales"),
        },
      });
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sell</h1>
          <p className="text-muted-foreground mt-1">Create a new sale transaction</p>
        </div>
        <Badge variant={isOnline ? "default" : "secondary"} className="gap-1">
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isOnline ? "Online" : `Offline • ${unsyncedCount} unsynced`}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Bakery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <Button variant="outline" onClick={() => setShowBakeryDialog(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Bakery
          </Button>
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
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditCart(index)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFromCart(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => saveSale(false)} size="lg" disabled={cart.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button onClick={() => saveSale(true)} size="lg" disabled={cart.length === 0} variant="secondary">
          <Save className="h-4 w-4 mr-2" />
          Save & Edit
        </Button>
      </div>

      <Dialog open={showBakeryDialog} onOpenChange={setShowBakeryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bakery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newBakery.name}
                onChange={(e) => setNewBakery({ ...newBakery, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={newBakery.phone}
                onChange={(e) => setNewBakery({ ...newBakery, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={newBakery.address}
                onChange={(e) => setNewBakery({ ...newBakery, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBakeryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBakery}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingCartIndex !== -1} onOpenChange={() => setEditingCartIndex(-1)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={editQty}
                onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCartIndex(-1)}>
              Cancel
            </Button>
            <Button onClick={saveEditCart}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
