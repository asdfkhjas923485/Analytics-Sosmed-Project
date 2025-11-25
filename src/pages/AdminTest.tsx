import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AdminTest = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { selectedProject } = useApp();
  const [loading, setLoading] = useState<string | null>(null);

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (profile?.peran !== 'admin') {
    navigate("/");
    return null;
  }

  if (!selectedProject) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Pilih proyek terlebih dahulu untuk generate sample data.</p>
        </div>
      </AppLayout>
    );
  }

  const generateCatatan = async () => {
    setLoading('catatan');
    try {
      const { data: datasets } = await supabase
        .from('dataset')
        .select('id')
        .eq('id_proyek', selectedProject.id)
        .eq('dataset_aktif', true)
        .limit(1);

      const sampleData = [
        {
          id_proyek: selectedProject.id,
          id_pengguna: user.id,
          jenis_scope: 'global' as const,
          isi_catatan: 'Ini catatan global pertama untuk testing',
          kunci_scope: null,
          id_dataset: null
        },
        {
          id_proyek: selectedProject.id,
          id_pengguna: user.id,
          jenis_scope: 'post' as const,
          isi_catatan: 'Catatan untuk post tertentu menunjukkan performa bagus',
          kunci_scope: datasets?.[0]?.id || null,
          id_dataset: datasets?.[0]?.id || null
        }
      ];

      const { error } = await supabase.from('catatan').insert(sampleData);
      if (error) throw error;
      
      toast.success("Sample data untuk 'catatan' berhasil dibuat!");
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const generateFilterTersimpan = async () => {
    setLoading('filter_tersimpan');
    try {
      const sampleData = [
        {
          id_proyek: selectedProject.id,
          id_pengguna: user.id,
          nama_filter: 'Filter Instagram Bulan Ini',
          halaman: 'dashboard',
          nilai_filter_json: {
            platform: ['instagram'],
            dateRange: { start: '2025-11-01', end: '2025-11-30' }
          }
        }
      ];

      const { error } = await supabase.from('filter_tersimpan').insert(sampleData);
      if (error) throw error;
      
      toast.success("Sample data untuk 'filter_tersimpan' berhasil dibuat!");
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const generateKampanye = async () => {
    setLoading('kampanye');
    try {
      const sampleData = [
        {
          id_proyek: selectedProject.id,
          nama_kampanye: 'Kampanye Promo Akhir Tahun',
          tanggal_mulai_kampanye: '2025-12-01',
          tanggal_selesai_kampanye: '2025-12-31',
          catatan_kampanye: 'Fokus pada konten giveaway dan testimoni pelanggan'
        },
        {
          id_proyek: selectedProject.id,
          nama_kampanye: 'Launching Produk Baru',
          tanggal_mulai_kampanye: '2025-11-15',
          tanggal_selesai_kampanye: '2025-11-30',
          catatan_kampanye: 'Teaser produk mulai 15 Nov, launching 20 Nov'
        }
      ];

      const { error } = await supabase.from('kampanye').insert(sampleData);
      if (error) throw error;
      
      toast.success("Sample data untuk 'kampanye' berhasil dibuat!");
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const generateAnggotaProyek = async () => {
    setLoading('anggota_proyek');
    try {
      // Create a dummy user entry (will fail if user doesn't exist, but good for testing)
      const sampleData = [
        {
          id_proyek: selectedProject.id,
          id_pengguna: user.id,
          peran_dalam_proyek: 'editor' as const
        }
      ];

      const { error } = await supabase.from('anggota_proyek').insert(sampleData);
      if (error) throw error;
      
      toast.success("Sample data untuk 'anggota_proyek' berhasil dibuat!");
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const generateTargetKPI = async () => {
    setLoading('target_kpi');
    try {
      const sampleData = [
        {
          id_proyek: selectedProject.id,
          jenis_periode: 'monthly' as const,
          tanggal_mulai_periode: '2025-11-01',
          tanggal_selesai_periode: '2025-11-30',
          target_total_jangkauan: 50000,
          target_rata_rata_er: 5.5,
          target_jumlah_followers: 10000
        },
        {
          id_proyek: selectedProject.id,
          jenis_periode: 'weekly' as const,
          tanggal_mulai_periode: '2025-11-18',
          tanggal_selesai_periode: '2025-11-24',
          target_total_jangkauan: 15000,
          target_rata_rata_er: 6.0,
          target_jumlah_followers: 12000
        }
      ];

      const { error } = await supabase.from('target_kpi').insert(sampleData);
      if (error) throw error;
      
      toast.success("Sample data untuk 'target_kpi' berhasil dibuat!");
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const clearTable = async (tableName: 'catatan' | 'filter_tersimpan' | 'kampanye' | 'anggota_proyek' | 'target_kpi') => {
    setLoading(`clear-${tableName}`);
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id_proyek', selectedProject.id);
      
      if (error) throw error;
      toast.success(`Data dari '${tableName}' berhasil dihapus!`);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Testing Data Generator</h1>
          <p className="text-muted-foreground">Generate sample data untuk testing table</p>
          <p className="text-sm text-muted-foreground mt-2">Proyek aktif: <span className="font-semibold">{selectedProject.nama_proyek}</span></p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Catatan</CardTitle>
              <CardDescription>Generate catatan proyek dan dataset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={generateCatatan} 
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'catatan' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Sample
              </Button>
              <Button 
                onClick={() => clearTable('catatan')} 
                disabled={loading !== null}
                variant="outline"
                className="w-full"
              >
                {loading === 'clear-catatan' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Clear Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filter Tersimpan</CardTitle>
              <CardDescription>Generate saved filters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={generateFilterTersimpan} 
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'filter_tersimpan' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Sample
              </Button>
              <Button 
                onClick={() => clearTable('filter_tersimpan')} 
                disabled={loading !== null}
                variant="outline"
                className="w-full"
              >
                {loading === 'clear-filter_tersimpan' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Clear Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kampanye</CardTitle>
              <CardDescription>Generate campaign data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={generateKampanye} 
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'kampanye' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Sample
              </Button>
              <Button 
                onClick={() => clearTable('kampanye')} 
                disabled={loading !== null}
                variant="outline"
                className="w-full"
              >
                {loading === 'clear-kampanye' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Clear Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anggota Proyek</CardTitle>
              <CardDescription>Generate project members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={generateAnggotaProyek} 
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'anggota_proyek' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Sample
              </Button>
              <Button 
                onClick={() => clearTable('anggota_proyek')} 
                disabled={loading !== null}
                variant="outline"
                className="w-full"
              >
                {loading === 'clear-anggota_proyek' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Clear Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target KPI</CardTitle>
              <CardDescription>Generate KPI targets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={generateTargetKPI} 
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'target_kpi' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Sample
              </Button>
              <Button 
                onClick={() => clearTable('target_kpi')} 
                disabled={loading !== null}
                variant="outline"
                className="w-full"
              >
                {loading === 'clear-target_kpi' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Clear Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminTest;
