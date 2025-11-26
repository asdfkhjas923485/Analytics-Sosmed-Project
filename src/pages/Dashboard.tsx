import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Eye, Heart, Share2, Bookmark, Settings } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { InsightCard } from "@/components/InsightCard";
import { NotesDialog } from "@/components/NotesDialog";
import { ExportButton } from "@/components/ExportButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { selectedProject, activeDataset, loading: appLoading } = useApp();
  
  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  const chartRef3 = useRef<HTMLDivElement>(null);
  
  const [kpiData, setKpiData] = useState({
    totalPosts: 0,
    avgER: 0,
    medianReach: 0,
    followersNow: 0,
    saveRate: 0,
    shareRate: 0
  });
  const [weeklyERTrend, setWeeklyERTrend] = useState<any[]>([]);
  const [platformDist, setPlatformDist] = useState<any[]>([]);
  const [contentTypeDist, setContentTypeDist] = useState<any[]>([]);
  const [insights, setInsights] = useState({
    erTrend: "",
    platform: "",
    contentType: ""
  });
  const [widgetVisibility, setWidgetVisibility] = useState({
    kpi: true,
    trends: true,
    platforms: true,
    content_types: true,
    insights: true,
  });

  // Load widget preferences
  useEffect(() => {
    if (profile?.preferensi_dashboard?.widgets) {
      const widgets = profile.preferensi_dashboard.widgets;
      setWidgetVisibility({
        kpi: widgets.includes('kpi'),
        trends: widgets.includes('trends'),
        platforms: widgets.includes('platforms'),
        content_types: widgets.includes('content_types'),
        insights: widgets.includes('insights'),
      });
    }
  }, [profile]);

  const toggleWidget = async (widget: keyof typeof widgetVisibility) => {
    const newVisibility = { ...widgetVisibility, [widget]: !widgetVisibility[widget] };
    setWidgetVisibility(newVisibility);

    const enabledWidgets = Object.keys(newVisibility).filter(
      (key) => newVisibility[key as keyof typeof newVisibility]
    );

    try {
      await supabase
        .from('profil')
        .update({
          preferensi_dashboard: {
            widgets: enabledWidgets,
            layout: 'default',
          },
        })
        .eq('id', user?.id);
      toast.success("Pengaturan dashboard diperbarui!");
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!selectedProject || !activeDataset) return;

      try {
        const { data: posts, error } = await supabase
          .from("postingan")
          .select("*, platform(kode_platform, nama_platform), jenis_konten(kode_jenis_konten, nama_jenis_konten)")
          .eq("id_proyek", selectedProject.id)
          .eq("id_dataset", activeDataset.id)
          .order("waktu_diposting", { ascending: true });

        if (error) throw error;

        if (posts && posts.length > 0) {
          const totalPosts = posts.length;
          const avgER = posts.reduce((sum, p) => sum + (p.engagement_rate_persen || 0), 0) / totalPosts;
          const sortedReach = [...posts].map(p => p.jumlah_reach).sort((a, b) => a - b);
          const medianReach = sortedReach[Math.floor(sortedReach.length / 2)] || 0;
          const latestPost = posts.reduce((latest, post) => 
            new Date(post.waktu_diposting) > new Date(latest.waktu_diposting) ? post : latest
          );
          const followersNow = latestPost.jumlah_followers || 0;
          const totalReach = posts.reduce((sum, p) => sum + Math.max(p.jumlah_reach, 1), 0);
          const totalSaves = posts.reduce((sum, p) => sum + p.jumlah_saved, 0);
          const totalShares = posts.reduce((sum, p) => sum + p.jumlah_shares, 0);
          const saveRate = (totalSaves / totalReach) * 100;
          const shareRate = (totalShares / totalReach) * 100;

          setKpiData({
            totalPosts,
            avgER: Number(avgER.toFixed(2)),
            medianReach,
            followersNow,
            saveRate: Number(saveRate.toFixed(2)),
            shareRate: Number(shareRate.toFixed(2))
          });

          // Weekly ER Trend
          const weeklyMap = new Map<string, { totalER: number; count: number; postCount: number }>();
          posts.forEach(post => {
            const date = new Date(post.waktu_diposting);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = format(weekStart, "yyyy-MM-dd");
            
            if (!weeklyMap.has(weekKey)) {
              weeklyMap.set(weekKey, { totalER: 0, count: 0, postCount: 0 });
            }
            const week = weeklyMap.get(weekKey)!;
            week.totalER += post.engagement_rate_persen || 0;
            week.count++;
            week.postCount++;
          });

          const weeklyTrend = Array.from(weeklyMap.entries())
            .map(([week, data]) => ({
              week: format(new Date(week), "dd MMM"),
              avgER: Number((data.totalER / data.count).toFixed(2)),
              posts: data.postCount
            }))
            .sort((a, b) => a.week.localeCompare(b.week));
          setWeeklyERTrend(weeklyTrend);

          // Platform Distribution
          const platformMap = new Map<string, number>();
          posts.forEach(p => {
            const name = p.platform?.nama_platform || "Unknown";
            platformMap.set(name, (platformMap.get(name) || 0) + 1);
          });
          const platforms = Array.from(platformMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
          setPlatformDist(platforms);

          // Content Type Distribution
          const contentTypeMap = new Map<string, number>();
          posts.forEach(p => {
            const name = p.jenis_konten?.nama_jenis_konten || "Unknown";
            contentTypeMap.set(name, (contentTypeMap.get(name) || 0) + 1);
          });
          const contentTypes = Array.from(contentTypeMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
          setContentTypeDist(contentTypes);
          
          // Generate insights
          generateInsights(posts, weeklyTrend, platforms, contentTypes);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Gagal memuat data dashboard");
      }
    };

    fetchDashboardData();
  }, [selectedProject, activeDataset]);

  const generateInsights = (
    posts: any[],
    weeklyData: any[],
    platformData: any[],
    contentTypeData: any[]
  ) => {
    let erTrendInsight = "";
    if (weeklyData.length >= 2) {
      const erFirst = weeklyData[0].avgER;
      const erLast = weeklyData[weeklyData.length - 1].avgER;
      
      if (erFirst === 0) {
        erTrendInsight = "Data awal belum cukup untuk menghitung tren engagement rate mingguan.";
      } else {
        const deltaPercent = ((erLast - erFirst) / erFirst) * 100;
        let trendCategory = deltaPercent > 10 ? "tren naik" : deltaPercent < -10 ? "tren turun" : "relatif stabil";
        erTrendInsight = `Engagement rate minggu pertama sebesar ${erFirst.toFixed(2)}% dan minggu terakhir ${erLast.toFixed(2)}%, menunjukkan ${trendCategory}.`;
      }
    }

    let platformInsight = "";
    if (platformData.length > 0) {
      const dominant = platformData[0];
      const totalPosts = posts.length;
      const dominantPercent = ((dominant.count / totalPosts) * 100).toFixed(1);
      platformInsight = `Platform ${dominant.name} mendominasi dengan ${dominantPercent}% dari total konten.`;
    }

    let contentTypeInsight = "";
    if (contentTypeData.length > 0) {
      const mostUsed = contentTypeData[0];
      const totalPosts = posts.length;
      const percentage = ((mostUsed.count / totalPosts) * 100).toFixed(1);
      contentTypeInsight = `Tipe konten ${mostUsed.name} paling sering digunakan dengan ${percentage}% dari total konten.`;
    }

    setInsights({
      erTrend: erTrendInsight,
      platform: platformInsight,
      contentType: contentTypeInsight
    });
  };

  if (authLoading || appLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-2" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!selectedProject) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-foreground text-lg">Belum ada project</p>
          <p className="text-muted-foreground">Silakan buat project baru untuk memulai</p>
        </div>
      </AppLayout>
    );
  }

  if (!activeDataset) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-foreground text-lg">Belum ada dataset aktif</p>
          <p className="text-muted-foreground">Silakan import data CSV di halaman Import</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-1">
              Ringkasan performa konten sosial media Anda
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Customize Dashboard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Pilih widget yang ingin ditampilkan</p>
                  {Object.entries(widgetVisibility).map(([key, visible]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={visible}
                        onCheckedChange={() => toggleWidget(key as keyof typeof widgetVisibility)}
                      />
                      <label htmlFor={key} className="text-sm font-medium capitalize cursor-pointer">
                        {key.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            {selectedProject && (
              <ExportButton
                projectId={selectedProject.id}
                pageName="Dashboard"
                data={[]}
                chartRefs={[chartRef1, chartRef2, chartRef3]}
                fileName="dashboard_overview"
              />
            )}
            <NotesDialog scope="global" />
          </div>
        </div>

        {/* KPI Cards */}
        {widgetVisibility.kpi && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Posts
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpiData.totalPosts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Engagement Rate
                </CardTitle>
                <Heart className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpiData.avgER}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Followers Now
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {kpiData.followersNow.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Median Reach
                </CardTitle>
                <Eye className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {kpiData.medianReach.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Save Rate
                </CardTitle>
                <Bookmark className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpiData.saveRate}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Share Rate
                </CardTitle>
                <Share2 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpiData.shareRate}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {widgetVisibility.trends && (
            <Card ref={chartRef1}>
              <CardHeader>
                <CardTitle>Tren Engagement Rate Mingguan</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyERTrend.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Tidak ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyERTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem"
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="avgER" stroke="hsl(var(--primary))" strokeWidth={2} name="Avg ER (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {widgetVisibility.platforms && (
            <Card ref={chartRef2}>
              <CardHeader>
                <CardTitle>Distribusi Platform</CardTitle>
              </CardHeader>
              <CardContent>
                {platformDist.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Tidak ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={platformDist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem"
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Posts" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {widgetVisibility.content_types && (
            <Card ref={chartRef3}>
              <CardHeader>
                <CardTitle>Distribusi Tipe Konten</CardTitle>
              </CardHeader>
              <CardContent>
                {contentTypeDist.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Tidak ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={contentTypeDist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem"
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--secondary))" name="Posts" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Insights */}
        {widgetVisibility.insights && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.erTrend && <InsightCard insight={insights.erTrend} />}
            {insights.platform && <InsightCard insight={insights.platform} />}
            {insights.contentType && <InsightCard insight={insights.contentType} />}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
