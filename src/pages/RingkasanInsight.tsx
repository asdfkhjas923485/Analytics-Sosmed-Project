import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InsightCard } from "@/components/InsightCard";

const RingkasanInsight = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, activeDataset } = useApp();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState({
    erTrend: "",
    platform: "",
    contentType: "",
    bestTime: "",
    audience: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (selectedProject && activeDataset) {
      fetchAllInsights();
    }
  }, [selectedProject, activeDataset, dateRange]);

  const fetchAllInsights = async () => {
    if (!selectedProject || !activeDataset) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("posts")
        .select("*, platforms(name, display_name), content_types(name, display_name)")
        .eq("project_id", selectedProject.id)
        .eq("dataset_id", activeDataset.id)
        .order("posted_at", { ascending: true });

      if (dateRange.from) {
        query = query.gte("posted_at", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte("posted_at", dateRange.to.toISOString());
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      if (!posts || posts.length === 0) {
        setInsights({ erTrend: "", platform: "", contentType: "", bestTime: "", audience: "" });
        return;
      }

      generateAllInsights(posts);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal memuat insight");
    } finally {
      setLoading(false);
    }
  };

  const generateAllInsights = (posts: any[]) => {
    // 1. ER Trend Insight
    const weeklyMap = new Map<string, { totalER: number; count: number }>();
    posts.forEach(post => {
      const date = new Date(post.posted_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = format(weekStart, "yyyy-MM-dd");
      const current = weeklyMap.get(weekKey) || { totalER: 0, count: 0 };
      weeklyMap.set(weekKey, {
        totalER: current.totalER + (post.engagement_rate || 0),
        count: current.count + 1,
      });
    });

    const weeklyData = Array.from(weeklyMap.entries())
      .map(([week, data]) => ({
        week,
        avgER: data.totalER / data.count,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    let erTrendInsight = "";
    if (weeklyData.length >= 2) {
      const erFirst = weeklyData[0].avgER;
      const erLast = weeklyData[weeklyData.length - 1].avgER;
      const deltaPercent = erFirst > 0 ? ((erLast - erFirst) / erFirst * 100) : 0;
      
      let trendCategory = "relatif stabil";
      let suggestion = "Pertahankan pola konten saat ini";
      if (deltaPercent > 10) {
        trendCategory = "tren naik";
        suggestion = "Lanjutkan strategi konten yang sedang berjalan";
      } else if (deltaPercent < -10) {
        trendCategory = "tren turun";
        suggestion = "Evaluasi konten dan mulai eksperimen dengan format atau jadwal baru";
      }

      erTrendInsight = `Engagement rate menunjukkan ${trendCategory} dari ${erFirst.toFixed(2)}% di minggu pertama menjadi ${erLast.toFixed(2)}% di minggu terakhir (${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(1)}%). ${suggestion}.`;
    }

    // 2. Platform Distribution Insight
    const platformMap = new Map<string, number>();
    posts.forEach(p => {
      const name = p.platforms?.display_name || "Unknown";
      platformMap.set(name, (platformMap.get(name) || 0) + 1);
    });

    const platformDist = Array.from(platformMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / posts.length * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    let platformInsight = "";
    if (platformDist.length > 0) {
      const dominant = platformDist[0];
      const second = platformDist[1];
      
      platformInsight = `Platform ${dominant.name} mendominasi dengan ${dominant.percentage.toFixed(1)}% dari total post. `;
      
      if (dominant.percentage > 50) {
        platformInsight += `Strategi saat ini sangat fokus di ${dominant.name}. `;
      }
      
      if (second && Math.abs(dominant.percentage - second.percentage) < 10) {
        platformInsight += `Distribusi dengan ${second.name} relatif merata. `;
      }
      
      const smallPlatforms = platformDist.filter(p => p.percentage < 10);
      if (smallPlatforms.length > 0) {
        platformInsight += `Platform ${smallPlatforms.map(p => p.name).join(", ")} masih belum terlalu dieksplor.`;
      }
    }

    // 3. Content Type Insight
    const contentTypeMap = new Map<string, { count: number; totalER: number }>();
    posts.forEach(p => {
      const name = p.content_types?.display_name || "Unknown";
      const current = contentTypeMap.get(name) || { count: 0, totalER: 0 };
      contentTypeMap.set(name, {
        count: current.count + 1,
        totalER: current.totalER + (p.engagement_rate || 0),
      });
    });

    const contentTypeDist = Array.from(contentTypeMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        percentage: (data.count / posts.length * 100),
        avgER: data.totalER / data.count,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    let contentTypeInsight = "";
    if (contentTypeDist.length > 0) {
      const mostUsed = contentTypeDist[0];
      const mostEffective = [...contentTypeDist].sort((a, b) => b.avgER - a.avgER)[0];
      
      contentTypeInsight = `Tipe konten ${mostUsed.name} paling sering digunakan (${mostUsed.percentage.toFixed(1)}%). `;
      
      if (mostEffective.name !== mostUsed.name && mostEffective.percentage < 30) {
        contentTypeInsight += `Namun, ${mostEffective.name} memiliki rata-rata ER tertinggi (${mostEffective.avgER.toFixed(2)}%) meskipun porsinya masih kecil. Tipe ini potensial dan layak dinaikkan porsinya. `;
      }
      
      contentTypeInsight += `Kombinasi tipe terbanyak (${mostUsed.name}) vs tipe paling efektif (${mostEffective.name}) menunjukkan peluang optimasi konten.`;
    }

    // 4. Best Time Insight
    const timeSlotMap = new Map<string, { totalER: number; count: number }>();
    posts.forEach(post => {
      const date = new Date(post.posted_at);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;
      const current = timeSlotMap.get(key) || { totalER: 0, count: 0 };
      timeSlotMap.set(key, {
        totalER: current.totalER + (post.engagement_rate || 0),
        count: current.count + 1,
      });
    });

    const bestTimes = Array.from(timeSlotMap.entries())
      .map(([key, data]) => {
        const [day, hour] = key.split("-").map(Number);
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        return {
          day: dayNames[day],
          hour: `${hour.toString().padStart(2, "0")}:00`,
          medianER: data.totalER / data.count,
          count: data.count,
        };
      })
      .sort((a, b) => b.medianER - a.medianER);

    let bestTimeInsight = "";
    if (bestTimes.length > 0) {
      const best = bestTimes[0];
      bestTimeInsight = `Waktu terbaik untuk posting adalah ${best.day} pukul ${best.hour} dengan median ER ${best.medianER.toFixed(2)}%. `;
      
      if (bestTimes.length >= 2) {
        const second = bestTimes[1];
        if (Math.abs(best.medianER - second.medianER) < 2) {
          bestTimeInsight += `${second.day} pukul ${second.hour} juga merupakan alternatif kuat dengan ER ${second.medianER.toFixed(2)}%. `;
        }
      }
      
      if (best.count < 3) {
        bestTimeInsight += `Namun, sampel di slot ini masih kecil (${best.count} post) dan perlu diuji lagi untuk konfirmasi.`;
      }
    }

    // 5. Audience Growth Insight
    const followersTrend = Array.from(
      posts.reduce((map, post) => {
        const date = format(new Date(post.posted_at), "yyyy-MM-dd");
        if (!map.has(date)) map.set(date, []);
        map.get(date)!.push(post.followers);
        return map;
      }, new Map<string, number[]>())
    ).map(([date, followers]) => ({
      date,
      followers: Math.round(followers.reduce((a, b) => a + b, 0) / followers.length),
    }));

    let audienceInsight = "";
    if (followersTrend.length >= 2) {
      const firstFollowers = followersTrend[0].followers;
      const lastFollowers = followersTrend[followersTrend.length - 1].followers;
      const growthPercent = firstFollowers > 0 ? ((lastFollowers - firstFollowers) / firstFollowers * 100) : 0;
      
      let growthStatus = "relatif stabil";
      if (growthPercent > 5) growthStatus = "bertumbuh positif";
      else if (growthPercent < -5) growthStatus = "mengalami penurunan";

      audienceInsight = `Jumlah followers ${growthStatus} dari ${firstFollowers.toLocaleString()} menjadi ${lastFollowers.toLocaleString()} (${growthPercent > 0 ? '+' : ''}${growthPercent.toFixed(1)}%) dalam periode ini.`;
    }

    setInsights({
      erTrend: erTrendInsight,
      platform: platformInsight,
      contentType: contentTypeInsight,
      bestTime: bestTimeInsight,
      audience: audienceInsight,
    });
  };

  if (!selectedProject) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-foreground text-lg">Silakan pilih project</p>
        </div>
      </AppLayout>
    );
  }

  if (!activeDataset) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-foreground text-lg">Silakan pilih dataset aktif</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ringkasan Insight</h1>
          <p className="text-muted-foreground mt-2">Kumpulan insight otomatis dari semua analisis</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Periode</CardTitle>
            <CardDescription>Pilih rentang tanggal untuk analisis (opsional)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label>Tanggal Mulai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-2">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <Label>Tanggal Akhir</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-2">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(dateRange.from || dateRange.to) && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                  >
                    Reset
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tren Engagement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <InsightCard insight={insights.erTrend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribusi Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <InsightCard insight={insights.platform} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribusi Tipe Konten</CardTitle>
              </CardHeader>
              <CardContent>
                <InsightCard insight={insights.contentType} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Waktu Terbaik Posting</CardTitle>
              </CardHeader>
              <CardContent>
                <InsightCard insight={insights.bestTime} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pertumbuhan Audiens</CardTitle>
              </CardHeader>
              <CardContent>
                <InsightCard insight={insights.audience} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default RingkasanInsight;
