import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const Kampanye = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject } = useApp();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);

  // Form state
  const [namaKampanye, setNamaKampanye] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchCampaigns();
  }, [selectedProject]);

  const fetchCampaigns = async () => {
    if (!selectedProject) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kampanye")
        .select("*")
        .eq("id_proyek", selectedProject.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Gagal memuat kampanye");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNamaKampanye("");
    setTanggalMulai("");
    setTanggalSelesai("");
    setCatatan("");
    setEditingCampaign(null);
  };

  const handleOpenDialog = (campaign?: any) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setNamaKampanye(campaign.nama_kampanye);
      setTanggalMulai(campaign.tanggal_mulai_kampanye || "");
      setTanggalSelesai(campaign.tanggal_selesai_kampanye || "");
      setCatatan(campaign.catatan_kampanye || "");
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject || !namaKampanye.trim()) {
      toast.error("Silakan isi nama kampanye");
      return;
    }

    const payload = {
      id_proyek: selectedProject.id,
      nama_kampanye: namaKampanye.trim(),
      tanggal_mulai_kampanye: tanggalMulai || null,
      tanggal_selesai_kampanye: tanggalSelesai || null,
      catatan_kampanye: catatan.trim() || null,
    };

    try {
      if (editingCampaign) {
        const { error } = await supabase
          .from("kampanye")
          .update(payload)
          .eq("id", editingCampaign.id);

        if (error) throw error;
        toast.success("Kampanye berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("kampanye")
          .insert([payload]);

        if (error) throw error;
        toast.success("Kampanye berhasil ditambahkan");
      }

      setDialogOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error("Gagal menyimpan kampanye");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kampanye ini?")) return;

    try {
      const { error } = await supabase
        .from("kampanye")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Kampanye berhasil dihapus");
      fetchCampaigns();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Gagal menghapus kampanye");
    }
  };

  if (!selectedProject) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-foreground text-lg">Silakan pilih project terlebih dahulu</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kampanye</h1>
            <p className="text-muted-foreground mt-1">Kelola kampanye marketing dan konten</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Kampanye
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCampaign ? "Edit Kampanye" : "Tambah Kampanye"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nama Kampanye</Label>
                  <Input 
                    value={namaKampanye} 
                    onChange={(e) => setNamaKampanye(e.target.value)} 
                    placeholder="e.g., Ramadan Sale 2025"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tanggal Mulai (opsional)</Label>
                    <Input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tanggal Selesai (opsional)</Label>
                    <Input type="date" value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label>Catatan (opsional)</Label>
                  <Textarea 
                    value={catatan} 
                    onChange={(e) => setCatatan(e.target.value)} 
                    placeholder="Tambahkan catatan atau deskripsi kampanye..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">{editingCampaign ? "Update" : "Simpan"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Kampanye</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Belum ada kampanye</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Kampanye</TableHead>
                      <TableHead>Tanggal Mulai</TableHead>
                      <TableHead>Tanggal Selesai</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.nama_kampanye}</TableCell>
                        <TableCell>
                          {campaign.tanggal_mulai_kampanye 
                            ? format(new Date(campaign.tanggal_mulai_kampanye), "dd MMM yyyy") 
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {campaign.tanggal_selesai_kampanye 
                            ? format(new Date(campaign.tanggal_selesai_kampanye), "dd MMM yyyy") 
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={campaign.catatan_kampanye || ""}>
                          {campaign.catatan_kampanye || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(campaign)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(campaign.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Kampanye;
