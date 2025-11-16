import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const Laporan = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, activeDataset } = useApp();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const generateReport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error("Silakan pilih tanggal mulai dan selesai");
      return;
    }

    if (!selectedProject || !activeDataset) {
      toast.error("Silakan pilih project dan dataset");
      return;
    }

    setGenerating(true);
    try {
      const { data: posts, error } = await supabase
        .from("posts")
        .select("*, platforms(name, display_name), content_types(name, display_name)")
        .eq("project_id", selectedProject.id)
        .eq("dataset_id", activeDataset.id)
        .gte("posted_at", dateFrom)
        .lte("posted_at", dateTo);

      if (error) throw error;

      if (!posts || posts.length === 0) {
        toast.error("Tidak ada data pada rentang tanggal tersebut");
        setGenerating(false);
        return;
      }

      const totalPosts = posts.length;
      const avgER = posts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / totalPosts;
      const totalReach = posts.reduce((sum, p) => sum + p.reach, 0);
      const latestFollowers = posts.reduce((latest, post) => 
        new Date(post.posted_at) > new Date(latest.posted_at) ? post : latest
      ).followers;
      
      const totalSaves = posts.reduce((sum, p) => sum + p.saved, 0);
      const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);
      const saveRate = (totalSaves / Math.max(totalReach, 1)) * 100;
      const shareRate = (totalShares / Math.max(totalReach, 1)) * 100;

      const sortedReach = [...posts].map(p => p.reach).sort((a, b) => a - b);
      const q1Index = Math.floor(sortedReach.length * 0.25);
      const q1Reach = sortedReach[q1Index] || 0;
      const fairPosts = posts.filter(p => p.reach > q1Reach);

      const top5 = [...fairPosts].sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0)).slice(0, 5);
      const worst5 = [...fairPosts].sort((a, b) => (a.engagement_rate || 0) - (b.engagement_rate || 0)).slice(0, 5);

      const slotMap = new Map<string, { values: number[]; count: number }>();
      posts.forEach(post => {
        const date = new Date(post.posted_at);
        const key = `${date.getDay()}-${date.getHours()}`;
        if (!slotMap.has(key)) slotMap.set(key, { values: [], count: 0 });
        slotMap.get(key)!.values.push(post.engagement_rate || 0);
        slotMap.get(key)!.count++;
      });

      const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const bestTimes = Array.from(slotMap.entries())
        .filter(([_, slot]) => slot.count >= 2)
        .map(([key, slot]) => {
          const [day, hour] = key.split("-").map(Number);
          const sorted = [...slot.values].sort((a, b) => a - b);
          return {
            day: DAYS[day],
            hour: `${hour.toString().padStart(2, "0")}:00`,
            medianER: sorted[Math.floor(sorted.length / 2)] || 0,
            count: slot.count
          };
        })
        .sort((a, b) => b.medianER - a.medianER)
        .slice(0, 3);

      const contentTypeMap = new Map<string, { totalER: number; count: number }>();
      posts.forEach(post => {
        const name = post.content_types?.display_name || "Unknown";
        if (!contentTypeMap.has(name)) contentTypeMap.set(name, { totalER: 0, count: 0 });
        contentTypeMap.get(name)!.totalER += post.engagement_rate || 0;
        contentTypeMap.get(name)!.count++;
      });

      const medianER = avgER;
      const bestContentTypes = Array.from(contentTypeMap.entries())
        .map(([name, data]) => ({ name, avgER: data.totalER / data.count }))
        .filter(ct => ct.avgER > medianER)
        .sort((a, b) => b.avgER - a.avgER);

      setReportData({
        period: `${format(new Date(dateFrom), "dd MMM yyyy")} - ${format(new Date(dateTo), "dd MMM yyyy")}`,
        totalPosts,
        avgER: avgER.toFixed(2),
        totalReach,
        latestFollowers,
        saveRate: saveRate.toFixed(2),
        shareRate: shareRate.toFixed(2),
        top5,
        worst5,
        bestTimes,
        bestContentTypes,
        generatedAt: format(new Date(), "dd MMM yyyy HH:mm")
      });

      toast.success("Laporan berhasil dibuat");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal membuat laporan");
    } finally {
      setGenerating(false);
    }
  };

  if (!selectedProject || !activeDataset) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-foreground">Silakan pilih project dan dataset</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Report Generator</h1>
          <p className="text-muted-foreground mt-2">Buat laporan performa</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Generate Laporan</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div><Label>Tanggal Mulai</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
              <div><Label>Tanggal Selesai</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
              <Button onClick={generateReport} disabled={generating}><FileText className="h-4 w-4 mr-2" />{generating ? "Generating..." : "Generate"}</Button>
            </div>
          </CardContent>
        </Card>

        {reportData && (
          <>
            <div className="flex justify-end print:hidden">
              <Button onClick={() => window.print()} variant="outline"><Download className="h-4 w-4 mr-2" />Print PDF</Button>
            </div>

            <div className="bg-background p-8 space-y-6">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">Laporan Performa</h2>
                <p className="text-muted-foreground mt-2">{reportData.period}</p>
                <p className="text-xs text-muted-foreground">{reportData.generatedAt}</p>
              </div>

              <Card><CardHeader><CardTitle>KPI</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-4"><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{reportData.totalPosts}</p></div><div><p className="text-sm text-muted-foreground">Avg ER</p><p className="text-2xl font-bold text-primary">{reportData.avgER}%</p></div><div><p className="text-sm text-muted-foreground">Reach</p><p className="text-2xl font-bold">{reportData.totalReach.toLocaleString()}</p></div></div></CardContent></Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle className="text-success">Top 5</CardTitle></CardHeader><CardContent><div className="space-y-3">{reportData.top5.map((p: any, i: number) => (<div key={p.id} className="border-b pb-2 last:border-0"><Badge>#{i+1}</Badge><p className="text-sm font-medium">{p.post_id}</p><p className="text-lg font-bold text-primary">{(p.engagement_rate||0).toFixed(2)}%</p></div>))}</div></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-destructive">Bottom 5</CardTitle></CardHeader><CardContent><div className="space-y-3">{reportData.worst5.map((p: any) => (<div key={p.id} className="border-b pb-2 last:border-0"><p className="text-sm font-medium">{p.post_id}</p><p className="text-lg font-bold">{(p.engagement_rate||0).toFixed(2)}%</p></div>))}</div></CardContent></Card>
              </div>

              <Card><CardHeader><CardTitle>Waktu Terbaik</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-3 gap-4">{reportData.bestTimes.map((t: any, i: number) => (<div key={i} className="p-4 border rounded"><Badge>#{i+1}</Badge><p className="font-bold">{t.day}, {t.hour}</p><p className="text-sm">ER: {t.medianER.toFixed(2)}%</p></div>))}</div></CardContent></Card>

              <Card><CardHeader><CardTitle>Tipe Konten Terbaik</CardTitle></CardHeader><CardContent>{reportData.bestContentTypes.length === 0 ? <p className="text-muted-foreground">Semua rata-rata</p> : <div className="space-y-2">{reportData.bestContentTypes.map((ct: any) => (<div key={ct.name} className="flex justify-between p-2 bg-muted rounded"><span>{ct.name}</span><span className="text-primary font-bold">{ct.avgER.toFixed(2)}%</span></div>))}</div>}</CardContent></Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Laporan;
