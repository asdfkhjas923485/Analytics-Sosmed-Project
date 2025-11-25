import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const TargetKPI = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject } = useApp();
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any>(null);

  // Form state
  const [jenisPeriode, setJenisPeriode] = useState<'weekly' | 'monthly'>('monthly');
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [targetReach, setTargetReach] = useState("");
  const [targetER, setTargetER] = useState("");
  const [targetFollowers, setTargetFollowers] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchTargets();
  }, [selectedProject]);

  const fetchTargets = async () => {
    if (!selectedProject) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("target_kpi")
        .select("*")
        .eq("id_proyek", selectedProject.id)
        .order("tanggal_mulai_periode", { ascending: false });

      if (error) throw error;
      setTargets(data || []);
    } catch (error) {
      console.error("Error fetching targets:", error);
      toast.error("Gagal memuat target KPI");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setJenisPeriode('monthly');
    setTanggalMulai("");
    setTanggalSelesai("");
    setTargetReach("");
    setTargetER("");
    setTargetFollowers("");
    setEditingTarget(null);
  };

  const handleOpenDialog = (target?: any) => {
    if (target) {
      setEditingTarget(target);
      setJenisPeriode(target.jenis_periode);
      setTanggalMulai(target.tanggal_mulai_periode);
      setTanggalSelesai(target.tanggal_selesai_periode);
      setTargetReach(target.target_total_jangkauan?.toString() || "");
      setTargetER(target.target_rata_rata_er?.toString() || "");
      setTargetFollowers(target.target_jumlah_followers?.toString() || "");
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject || !tanggalMulai || !tanggalSelesai) {
      toast.error("Silakan lengkapi tanggal periode");
      return;
    }

    const payload = {
      id_proyek: selectedProject.id,
      jenis_periode: jenisPeriode,
      tanggal_mulai_periode: tanggalMulai,
      tanggal_selesai_periode: tanggalSelesai,
      target_total_jangkauan: targetReach ? parseFloat(targetReach) : null,
      target_rata_rata_er: targetER ? parseFloat(targetER) : null,
      target_jumlah_followers: targetFollowers ? parseFloat(targetFollowers) : null,
    };

    try {
      if (editingTarget) {
        const { error } = await supabase
          .from("target_kpi")
          .update(payload)
          .eq("id", editingTarget.id);

        if (error) throw error;
        toast.success("Target KPI berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("target_kpi")
          .insert([payload]);

        if (error) throw error;
        toast.success("Target KPI berhasil ditambahkan");
      }

      setDialogOpen(false);
      resetForm();
      fetchTargets();
    } catch (error) {
      console.error("Error saving target:", error);
      toast.error("Gagal menyimpan target KPI");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus target ini?")) return;

    try {
      const { error } = await supabase
        .from("target_kpi")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Target KPI berhasil dihapus");
      fetchTargets();
    } catch (error) {
      console.error("Error deleting target:", error);
      toast.error("Gagal menghapus target KPI");
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
            <h1 className="text-3xl font-bold text-foreground">Target KPI</h1>
            <p className="text-muted-foreground mt-1">Kelola target performa bulanan atau mingguan</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Target
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTarget ? "Edit Target KPI" : "Tambah Target KPI"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Jenis Periode</Label>
                  <Select value={jenisPeriode} onValueChange={(val: 'weekly' | 'monthly') => setJenisPeriode(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Mingguan</SelectItem>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tanggal Mulai</Label>
                    <Input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Tanggal Selesai</Label>
                    <Input type="date" value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <Label>Target Total Reach (opsional)</Label>
                  <Input type="number" value={targetReach} onChange={(e) => setTargetReach(e.target.value)} placeholder="e.g., 100000" />
                </div>

                <div>
                  <Label>Target Rata-rata ER % (opsional)</Label>
                  <Input type="number" step="0.01" value={targetER} onChange={(e) => setTargetER(e.target.value)} placeholder="e.g., 5.5" />
                </div>

                <div>
                  <Label>Target Jumlah Followers (opsional)</Label>
                  <Input type="number" value={targetFollowers} onChange={(e) => setTargetFollowers(e.target.value)} placeholder="e.g., 10000" />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">{editingTarget ? "Update" : "Simpan"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Target</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : targets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Belum ada target KPI</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead>Tanggal Mulai</TableHead>
                      <TableHead>Tanggal Selesai</TableHead>
                      <TableHead className="text-right">Target Reach</TableHead>
                      <TableHead className="text-right">Target ER %</TableHead>
                      <TableHead className="text-right">Target Followers</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.map((target) => (
                      <TableRow key={target.id}>
                        <TableCell className="capitalize">{target.jenis_periode === 'weekly' ? 'Mingguan' : 'Bulanan'}</TableCell>
                        <TableCell>{format(new Date(target.tanggal_mulai_periode), "dd MMM yyyy")}</TableCell>
                        <TableCell>{format(new Date(target.tanggal_selesai_periode), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right">{target.target_total_jangkauan ? target.target_total_jangkauan.toLocaleString() : "-"}</TableCell>
                        <TableCell className="text-right">{target.target_rata_rata_er ? target.target_rata_rata_er + "%" : "-"}</TableCell>
                        <TableCell className="text-right">{target.target_jumlah_followers ? target.target_jumlah_followers.toLocaleString() : "-"}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(target)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(target.id)}>
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

export default TargetKPI;
