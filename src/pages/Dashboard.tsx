import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Eye, Heart, Share2, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
          .select("*")
          .eq("project_id", selectedProject.id)
          .eq("dataset_id", activeDataset.id);

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

        {/* Placeholder for charts */}
        <Card>
          <CardHeader>
            <CardTitle>Tren Engagement Rate Mingguan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Chart akan ditampilkan di sini
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
