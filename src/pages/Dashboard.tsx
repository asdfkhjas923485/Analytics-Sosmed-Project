import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Eye, Heart, Share2, Bookmark } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, activeDataset, loading: appLoading } = useApp();
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!selectedProject || !activeDataset) return;

      try {
        // Fetch posts for active dataset
        const { data: posts, error } = await supabase
          .from("posts")
          .select("*, platforms(name, display_name), content_types(name, display_name)")
          .eq("project_id", selectedProject.id)
          .eq("dataset_id", activeDataset.id)
          .order("posted_at", { ascending: true });

        if (error) throw error;

        if (posts && posts.length > 0) {
          // Calculate KPIs
          const totalPosts = posts.length;
          const avgER = posts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / totalPosts;
          
          // Median reach
          const sortedReach = [...posts].map(p => p.reach).sort((a, b) => a - b);
          const medianReach = sortedReach[Math.floor(sortedReach.length / 2)] || 0;
          
          // Latest followers
          const latestPost = posts.reduce((latest, post) => 
            new Date(post.posted_at) > new Date(latest.posted_at) ? post : latest
          );
          const followersNow = latestPost.followers || 0;
          
          // Save and share rates
          const totalReach = posts.reduce((sum, p) => sum + Math.max(p.reach, 1), 0);
          const totalSaves = posts.reduce((sum, p) => sum + p.saved, 0);
          const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);
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
            const date = new Date(post.posted_at);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = format(weekStart, "yyyy-MM-dd");
            
            if (!weeklyMap.has(weekKey)) {
              weeklyMap.set(weekKey, { totalER: 0, count: 0, postCount: 0 });
            }
            const week = weeklyMap.get(weekKey)!;
            week.totalER += post.engagement_rate || 0;
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
            const name = p.platforms?.display_name || "Unknown";
            platformMap.set(name, (platformMap.get(name) || 0) + 1);
          });
          const platforms = Array.from(platformMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
          setPlatformDist(platforms);

          // Content Type Distribution
          const contentTypeMap = new Map<string, number>();
          posts.forEach(p => {
            const name = p.content_types?.display_name || "Unknown";
            contentTypeMap.set(name, (contentTypeMap.get(name) || 0) + 1);
          });
          const contentTypes = Array.from(contentTypeMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
          setContentTypeDist(contentTypes);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Gagal memuat data dashboard");
      }
    };

    fetchDashboardData();
  }, [selectedProject, activeDataset]);

  if (authLoading || appLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">
            Ringkasan performa konten sosial media Anda
          </p>
        </div>

        {/* KPI Cards */}
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

        {/* Weekly ER Trend */}
        <Card>
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
                  <YAxis yAxisId="left" stroke="hsl(var(--foreground))" label={{ value: 'Avg ER (%)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" label={{ value: 'Posts', angle: 90, position: 'insideRight' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem"
                    }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="avgER" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Avg ER (%)"
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="posts" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    name="Jumlah Post"
                    dot={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Platform Distribution */}
          <Card>
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
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Content Type Distribution */}
          <Card>
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
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
