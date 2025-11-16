import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Phone, MapPin, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Bakery {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  last_used_at: string;
}

export default function Bakeries() {
  const { user } = useAuth();
  const [bakeries, setBakeries] = useState<Bakery[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBakery, setEditingBakery] = useState<Bakery | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", address: "" });

  useEffect(() => {
    fetchBakeries();
  }, [user]);

  const fetchBakeries = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("bakeries")
      .select("*")
      .eq("created_by", user.id)
      .order("last_used_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch bakeries");
    } else {
      setBakeries(data || []);
    }
  };

  const handleSave = async () => {
    if (!user || !formData.name || !formData.phone) {
      toast.error("Name and phone are required");
      return;
    }

    if (editingBakery) {
      const { error } = await supabase
        .from("bakeries")
        .update({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
        })
        .eq("id", editingBakery.id);

      if (error) {
        toast.error("Failed to update bakery");
      } else {
        toast.success("Bakery updated successfully");
        fetchBakeries();
        closeDialog();
      }
    } else {
      const { error } = await supabase.from("bakeries").insert({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        created_by: user.id,
      });

      if (error) {
        toast.error("Failed to create bakery");
      } else {
        toast.success("Bakery created successfully");
        fetchBakeries();
        closeDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("bakeries").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete bakery");
    } else {
      toast.success("Bakery deleted");
      fetchBakeries();
    }
  };

  const openEditDialog = (bakery: Bakery) => {
    setEditingBakery(bakery);
    setFormData({
      name: bakery.name,
      phone: bakery.phone,
      address: bakery.address || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingBakery(null);
    setFormData({ name: "", phone: "", address: "" });
  };

  const filteredBakeries = bakeries.filter((bakery) =>
    bakery.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bakeries</h1>
          <p className="text-muted-foreground mt-1">Manage your bakery clients</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingBakery(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bakery
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBakery ? "Edit Bakery" : "Add New Bakery"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bakeries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBakeries.map((bakery) => (
          <Card key={bakery.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle>{bakery.name}</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <Phone className="h-3 w-3 mr-1" />
                    {bakery.phone}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(bakery)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(bakery.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {bakery.address && (
              <CardContent>
                <div className="flex items-start text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1 mt-1 flex-shrink-0" />
                  <span>{bakery.address}</span>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filteredBakeries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No bakeries found. Add your first bakery to get started.
        </div>
      )}
    </div>
  );
}
