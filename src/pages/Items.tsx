import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Item {
  id: string;
  name: string;
  unit_price: number;
}

export default function Items() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({ name: "", unit_price: "" });

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("created_by", user.id)
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to fetch items");
    } else {
      setItems(data || []);
    }
  };

  const handleSave = async () => {
    if (!user || !formData.name || !formData.unit_price) {
      toast.error("Name and unit price are required");
      return;
    }

    if (editingItem) {
      const { error } = await supabase
        .from("items")
        .update({
          name: formData.name,
          unit_price: parseFloat(formData.unit_price),
        })
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Failed to update item");
      } else {
        toast.success("Item updated successfully");
        fetchItems();
        closeDialog();
      }
    } else {
      const { error } = await supabase.from("items").insert({
        name: formData.name,
        unit_price: parseFloat(formData.unit_price),
        created_by: user.id,
      });

      if (error) {
        toast.error("Failed to create item");
      } else {
        toast.success("Item created successfully");
        fetchItems();
        closeDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Item deleted");
      fetchItems();
    }
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      unit_price: item.unit_price.toString(),
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: "", unit_price: "" });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Items</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price (₹) *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  Save
                </Button>
                <Button onClick={closeDialog} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle>{item.name}</CardTitle>
                  <p className="text-2xl font-bold text-primary mt-2">₹{item.unit_price}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No items found. Add your first item to get started.
        </div>
      )}
    </div>
  );
}
