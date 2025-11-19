import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { InsightCard } from "@/components/InsightCard";

const Audiens = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, activeDataset } = useApp();
  const [followersTrend, setFollowersTrend] = useState<any[]>([]);
  const [weeklyPosts, setWeeklyPosts] = useState<any[]>([]);
  const [scatterData, setScatterData] = useState<any[]>([]);
  const [correlation, setCorrelation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProject || !activeDataset) return;
      setLoading(true);
      try {
        const { data: posts, error } = await supabase.from("posts").select("*").eq("project_id", selectedProject.id).eq("dataset_id", activeDataset.id).order("posted_at", { ascending: true });
        if (error) throw error;
        if (posts && posts.length > 0) {
          const dailyMap = new Map<string, number[]>();
          posts.forEach(post => {
            const date = format(new Date(post.posted_at), "yyyy-MM-dd");
            if (!dailyMap.has(date)) dailyMap.set(date, []);
            dailyMap.get(date)!.push(post.followers);
          });
          const trend = Array.from(dailyMap.entries()).map(([date, followers]) => ({ date, followers: Math.round(followers.reduce((a, b) => a + b, 0) / followers.length) }));
          setFollowersTrend(trend);
          const weeklyMap = new Map<string, number>();
          posts.forEach(post => {
            const date = new Date(post.posted_at);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = format(weekStart, "yyyy-MM-dd");
            weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
          });
          const weekly = Array.from(weeklyMap.entries()).map(([week, count]) => ({ week: format(new Date(week), "dd MMM"), count })).sort((a, b) => a.week.localeCompare(b.week));
          setWeeklyPosts(weekly);
          const scatter = posts.map(p => ({ reach: p.reach, engagement: p.engagement || 0 }));
          setScatterData(scatter);
          const n = posts.length;
          const sumX = posts.reduce((sum, p) => sum + p.reach, 0);
          const sumY = posts.reduce((sum, p) => sum + (p.engagement || 0), 0);
          const sumXY = posts.reduce((sum, p) => sum + p.reach * (p.engagement || 0), 0);
          const sumX2 = posts.reduce((sum, p) => sum + p.reach * p.reach, 0);
          const sumY2 = posts.reduce((sum, p) => sum + (p.engagement || 0) * (p.engagement || 0), 0);
          const r = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
          setCorrelation(r * r);
          generateInsight(posts, trend, weekly, r * r);
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedProject, activeDataset]);

  const generateInsight = (posts: any[], followersTrend: any[], weeklyPosts: any[], correlation: number) => {
    if (posts.length === 0) {
      setInsight("");
      return;
    }

    const firstFollowers = followersTrend[0]?.followers || 0;
    const lastFollowers = followersTrend[followersTrend.length - 1]?.followers || 0;
    const growthPercent = firstFollowers > 0 ? ((lastFollowers - firstFollowers) / firstFollowers * 100) : 0;
    
    const avgPostsPerWeek = weeklyPosts.length > 0 
      ? (weeklyPosts.reduce((sum, w) => sum + w.count, 0) / weeklyPosts.length).toFixed(1)
      : 0;

    const totalPosts = posts.length;
    const avgReach = posts.reduce((sum, p) => sum + p.reach, 0) / totalPosts;
    const avgEngagement = posts.reduce((sum, p) => sum + (p.engagement || 0), 0) / totalPosts;

    let growthStatus = "relatif stabil";
    if (growthPercent > 5) growthStatus = "bertumbuh positif";
    else if (growthPercent < -5) growthStatus = "mengalami penurunan";

    let correlationStatus = "lemah";
    if (correlation > 0.7) correlationStatus = "sangat kuat";
    else if (correlation > 0.5) correlationStatus = "kuat";
    else if (correlation > 0.3) correlationStatus = "moderat";

    let insightText = `Dalam periode ini, jumlah followers ${growthStatus} dari ${firstFollowers.toLocaleString()} menjadi ${lastFollowers.toLocaleString()} (${growthPercent > 0 ? '+' : ''}${growthPercent.toFixed(1)}%). `;
    insightText += `Frekuensi posting rata-rata ${avgPostsPerWeek} post per minggu dengan rata-rata reach ${Math.round(avgReach).toLocaleString()} dan engagement ${Math.round(avgEngagement).toLocaleString()}. `;
    insightText += `Korelasi antara reach dan engagement tergolong ${correlationStatus} (R²=${correlation.toFixed(3)}), yang menunjukkan ${correlation > 0.5 ? 'bahwa konten dengan jangkauan luas cenderung juga mendapat engagement tinggi' : 'perlu strategi lebih fokus untuk meningkatkan kualitas interaksi di konten berjangkauan luas'}.`;

    setInsight(insightText);
  };

  if (!selectedProject || !activeDataset) return <AppLayout><div className="flex items-center justify-center h-64"><p className="text-foreground">Silakan pilih project dan dataset</p></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold text-foreground">Audience & Growth</h1><p className="text-muted-foreground mt-2">Analisis pertumbuhan audiens</p></div>
        {loading ? <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card> : (
          <>
            <Card><CardHeader><CardTitle>Tren Followers Harian</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={followersTrend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" stroke="hsl(var(--foreground))" tickFormatter={(d) => format(new Date(d), "dd MMM")} /><YAxis stroke="hsl(var(--foreground))" /><Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} /><Line type="monotone" dataKey="followers" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle>Frekuensi Posting Mingguan</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={weeklyPosts}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="week" stroke="hsl(var(--foreground))" /><YAxis stroke="hsl(var(--foreground))" /><Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} /><Bar dataKey="count" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle>Korelasi Reach vs Engagement</CardTitle><CardDescription>R² = {correlation.toFixed(3)}</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={400}><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" dataKey="reach" name="Reach" stroke="hsl(var(--foreground))" /><YAxis type="number" dataKey="engagement" name="Engagement" stroke="hsl(var(--foreground))" /><Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} /><Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.6} /></ScatterChart></ResponsiveContainer></CardContent></Card>

            <InsightCard insight={insight} />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Audiens;
