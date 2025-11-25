import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Platform = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useApp();
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    kode_platform: "",
    nama_platform: "",
    warna_platform: "#000000",
    platform_aktif: true
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile && profile.peran !== "admin") {
      toast.error("Halaman ini hanya untuk admin");
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlatforms(data || []);
    } catch (error) {
      console.error("Error fetching platforms:", error);
      toast.error("Gagal memuat platform");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingPlatform) {
        const { error } = await supabase
          .from("platform")
          .update(formData)
          .eq("id", editingPlatform.id);

        if (error) throw error;
        toast.success("Platform berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("platform")
          .insert([formData]);

        if (error) throw error;
        toast.success("Platform berhasil ditambahkan");
      }

      setIsDialogOpen(false);
      setEditingPlatform(null);
      setFormData({
        kode_platform: "",
        nama_platform: "",
        warna_platform: "#000000",
        platform_aktif: true
      });
      fetchPlatforms();
    } catch (error) {
      console.error("Error saving platform:", error);
      toast.error("Gagal menyimpan platform");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (platform: any) => {
    setEditingPlatform(platform);
    setFormData({
      kode_platform: platform.kode_platform,
      nama_platform: platform.nama_platform,
      warna_platform: platform.warna_platform,
      platform_aktif: platform.platform_aktif
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus platform ini?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("platform")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Platform berhasil dihapus");
      fetchPlatforms();
    } catch (error) {
      console.error("Error deleting platform:", error);
      toast.error("Gagal menghapus platform. Mungkin masih digunakan.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("platform")
        .update({ platform_aktif: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success("Status platform berhasil diubah");
      fetchPlatforms();
    } catch (error) {
      console.error("Error toggling platform:", error);
      toast.error("Gagal mengubah status");
    }
  };

  if (profile?.peran !== "admin") {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Platform Management</h1>
            <p className="text-muted-foreground mt-2">Kelola platform sosial media (Admin Only)</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingPlatform(null);
                setFormData({
                  kode_platform: "",
                  nama_platform: "",
                  warna_platform: "#000000",
                  platform_aktif: true
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Platform
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPlatform ? "Edit Platform" : "Tambah Platform Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Kode Platform</Label>
                  <Input
                    value={formData.kode_platform}
                    onChange={(e) => setFormData({ ...formData, kode_platform: e.target.value })}
                    placeholder="instagram"
                    required
                  />
                </div>
                <div>
                  <Label>Nama Platform</Label>
                  <Input
                    value={formData.nama_platform}
                    onChange={(e) => setFormData({ ...formData, nama_platform: e.target.value })}
                    placeholder="Instagram"
                    required
                  />
                </div>
                <div>
                  <Label>Warna</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={formData.warna_platform}
                      onChange={(e) => setFormData({ ...formData, warna_platform: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.warna_platform}
                      onChange={(e) => setFormData({ ...formData, warna_platform: e.target.value })}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.platform_aktif}
                    onCheckedChange={(checked) => setFormData({ ...formData, platform_aktif: checked })}
                  />
                  <Label>Aktif</Label>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {editingPlatform ? "Update" : "Tambah"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : platforms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Belum ada platform</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platforms.map(platform => (
                    <TableRow key={platform.id}>
                      <TableCell className="font-medium">{platform.kode_platform}</TableCell>
                      <TableCell>{platform.nama_platform}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-6 h-6 rounded border border-border"
                            style={{ backgroundColor: platform.warna_platform }}
                          />
                          <span className="text-sm text-muted-foreground">{platform.warna_platform}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={platform.platform_aktif}
                          onCheckedChange={() => handleToggleActive(platform.id, platform.platform_aktif)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(platform)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(platform.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Platform;
