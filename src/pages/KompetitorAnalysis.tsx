import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, TrendingUp, Users, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ExportButton } from "@/components/ExportButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Competitor {
  id: string;
  nama_kompetitor: string;
  deskripsi_kompetitor: string;
  platform_kompetitor: string;
  handle_kompetitor: string;
}

interface CompetitorData {
  tanggal_data: string;
  jumlah_followers: number;
  rata_rata_engagement_rate: number;
  total_posts: number;
  rata_rata_likes: number;
}

const KompetitorAnalysis = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedProject } = useApp();
  const { toast } = useToast();
  
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  
  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  const chartRef3 = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    nama_kompetitor: "",
    deskripsi_kompetitor: "",
    platform_kompetitor: "instagram",
    handle_kompetitor: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (selectedProject) {
      fetchCompetitors();
    }
  }, [selectedProject]);

  const fetchCompetitors = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kompetitor")
        .select("*")
        .eq("id_proyek", selectedProject.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompetitors(data || []);
      
      if (data && data.length > 0) {
        await fetchComparisonData(data.map(c => c.id));
      }
    } catch (error) {
      console.error("Error fetching competitors:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data kompetitor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonData = async (competitorIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("data_kompetitor")
        .select(`
          *,
          kompetitor:id_kompetitor (
            nama_kompetitor
          )
        `)
        .in("id_kompetitor", competitorIds)
        .order("tanggal_data", { ascending: true });

      if (error) throw error;
      
      // Group data by date for comparison
      const grouped: any = {};
      data?.forEach((item: any) => {
        const date = item.tanggal_data;
        if (!grouped[date]) {
          grouped[date] = { date };
        }
        const name = item.kompetitor.nama_kompetitor;
        grouped[date][`${name}_followers`] = item.jumlah_followers;
        grouped[date][`${name}_er`] = item.rata_rata_engagement_rate;
      });
      
      setComparisonData(Object.values(grouped));
    } catch (error) {
      console.error("Error fetching comparison data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      if (editingCompetitor) {
        const { error } = await supabase
          .from("kompetitor")
          .update(formData)
          .eq("id", editingCompetitor.id);

        if (error) throw error;
        toast({ title: "Sukses", description: "Kompetitor berhasil diupdate" });
      } else {
        const { error } = await supabase
          .from("kompetitor")
          .insert([{ ...formData, id_proyek: selectedProject.id }]);

        if (error) throw error;
        toast({ title: "Sukses", description: "Kompetitor berhasil ditambahkan" });
      }

      setDialogOpen(false);
      resetForm();
      fetchCompetitors();
    } catch (error) {
      console.error("Error saving competitor:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan kompetitor",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kompetitor ini?")) return;

    try {
      const { error } = await supabase
        .from("kompetitor")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Sukses", description: "Kompetitor berhasil dihapus" });
      fetchCompetitors();
    } catch (error) {
      console.error("Error deleting competitor:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus kompetitor",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (competitor: Competitor) => {
    setEditingCompetitor(competitor);
    setFormData({
      nama_kompetitor: competitor.nama_kompetitor,
      deskripsi_kompetitor: competitor.deskripsi_kompetitor || "",
      platform_kompetitor: competitor.platform_kompetitor,
      handle_kompetitor: competitor.handle_kompetitor || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nama_kompetitor: "",
      deskripsi_kompetitor: "",
      platform_kompetitor: "instagram",
      handle_kompetitor: "",
    });
    setEditingCompetitor(null);
  };

  if (!selectedProject) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Pilih proyek terlebih dahulu</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analisis Kompetitor</h1>
            <p className="text-muted-foreground mt-2">
              Bandingkan performa Anda dengan kompetitor
            </p>
          </div>
          <div className="flex gap-2">
            {competitors.length > 0 && (
              <ExportButton
                projectId={selectedProject.id}
                pageName="Analisis Kompetitor"
                data={comparisonData}
                chartRefs={[chartRef1, chartRef2, chartRef3]}
                fileName="competitor_analysis"
              />
            )}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah Kompetitor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCompetitor ? "Edit Kompetitor" : "Tambah Kompetitor Baru"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nama">Nama Kompetitor</Label>
                    <Input
                      id="nama"
                      value={formData.nama_kompetitor}
                      onChange={(e) => setFormData({ ...formData, nama_kompetitor: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="platform">Platform</Label>
                    <Select
                      value={formData.platform_kompetitor}
                      onValueChange={(value) => setFormData({ ...formData, platform_kompetitor: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="handle">Handle/Username</Label>
                    <Input
                      id="handle"
                      value={formData.handle_kompetitor}
                      onChange={(e) => setFormData({ ...formData, handle_kompetitor: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deskripsi">Deskripsi</Label>
                    <Textarea
                      id="deskripsi"
                      value={formData.deskripsi_kompetitor}
                      onChange={(e) => setFormData({ ...formData, deskripsi_kompetitor: e.target.value })}
                      placeholder="Catatan tentang kompetitor..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit">
                      {editingCompetitor ? "Update" : "Tambah"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : competitors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum Ada Kompetitor</h3>
              <p className="text-muted-foreground mb-4">
                Tambahkan kompetitor untuk mulai analisis perbandingan
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Kompetitor Pertama
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {competitors.map((competitor) => (
                <Card key={competitor.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{competitor.nama_kompetitor}</CardTitle>
                        <CardDescription className="capitalize">
                          {competitor.platform_kompetitor}
                          {competitor.handle_kompetitor && ` • ${competitor.handle_kompetitor}`}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(competitor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(competitor.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {competitor.deskripsi_kompetitor && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {competitor.deskripsi_kompetitor}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {comparisonData.length > 0 && (
              <>
                <Card ref={chartRef1}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Perbandingan Followers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {competitors.map((comp, idx) => (
                          <Line
                            key={comp.id}
                            type="monotone"
                            dataKey={`${comp.nama_kompetitor}_followers`}
                            stroke={`hsl(${idx * 137.5}, 70%, 50%)`}
                            name={comp.nama_kompetitor}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card ref={chartRef2}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Perbandingan Engagement Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {competitors.map((comp, idx) => (
                          <Bar
                            key={comp.id}
                            dataKey={`${comp.nama_kompetitor}_er`}
                            fill={`hsl(${idx * 137.5}, 70%, 50%)`}
                            name={comp.nama_kompetitor}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default KompetitorAnalysis;
