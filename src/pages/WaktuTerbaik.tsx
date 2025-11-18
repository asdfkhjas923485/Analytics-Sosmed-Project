import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy } from "lucide-react";

type MetricType = "er" | "engagement" | "reach";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const WaktuTerbaik = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, activeDataset } = useApp();
  const [posts, setPosts] = useState<any[]>([]);
  const [metric, setMetric] = useState<MetricType>("er");
  const [topSlots, setTopSlots] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!selectedProject || !activeDataset) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("project_id", selectedProject.id)
          .eq("dataset_id", activeDataset.id);

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error("Error fetching posts:", error);
        toast.error("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedProject, activeDataset]);

  useEffect(() => {
    if (posts.length === 0) return;

    // Calculate top slots and heatmap
    const slotMap = new Map<string, { values: number[]; count: number }>();
    
    posts.forEach(post => {
      const date = new Date(post.posted_at);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;

      let value = 0;
      if (metric === "er") {
        value = post.engagement_rate || 0;
      } else if (metric === "engagement") {
        value = post.engagement || 0;
      } else if (metric === "reach") {
        value = post.reach || 0;
      }

      if (!slotMap.has(key)) {
        slotMap.set(key, { values: [], count: 0 });
      }
      const slot = slotMap.get(key)!;
      slot.values.push(value);
      slot.count++;
    });

    // Calculate median/sum for each slot
    const slots: any[] = [];
    slotMap.forEach((slot, key) => {
      const [day, hour] = key.split("-").map(Number);
      
      let metricValue = 0;
      if (metric === "engagement") {
        metricValue = slot.values.reduce((sum, v) => sum + v, 0);
      } else {
        // Median for ER and Reach
        const sorted = [...slot.values].sort((a, b) => a - b);
        metricValue = sorted[Math.floor(sorted.length / 2)] || 0;
      }

      slots.push({
        day,
        hour,
        dayName: DAYS[day],
        hourStr: `${hour.toString().padStart(2, "0")}:00`,
        value: metricValue,
        count: slot.count
      });
    });

    // Get top 3 slots with minimum 2 posts
    const top3 = slots
      .filter(s => s.count >= 2)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    setTopSlots(top3);

    // Prepare heatmap data
    const heatmap = DAYS.map((dayName, dayIndex) => {
      const daySlots: any = { day: dayName };
      for (let h = 0; h < 24; h++) {
        const slot = slots.find(s => s.day === dayIndex && s.hour === h);
        daySlots[`h${h}`] = slot ? slot.value : 0;
      }
      return daySlots;
    });
    setHeatmapData(heatmap);

    // Hourly frequency
    const hourlyCount = Array(24).fill(0);
    posts.forEach(post => {
      const hour = new Date(post.posted_at).getHours();
      hourlyCount[hour]++;
    });
    const hourly = hourlyCount.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      count
    }));
    setHourlyData(hourly);
  }, [posts, metric]);

  const getMetricLabel = () => {
    if (metric === "er") return "Engagement Rate (%)";
    if (metric === "engagement") return "Total Engagement";
    return "Median Reach";
  };

  if (!selectedProject || !activeDataset) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-foreground text-lg">Silakan pilih project dan dataset</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Waktu Terbaik Posting</h1>
          <p className="text-muted-foreground mt-2">Analisis waktu terbaik untuk posting konten</p>
        </div>

        {/* Metric Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Label>Pilih Metrik Analisis:</Label>
              <div className="flex border border-border rounded-md">
                <Button
                  variant={metric === "er" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMetric("er")}
                  className="rounded-r-none"
                >
                  Engagement Rate
                </Button>
                <Button
                  variant={metric === "engagement" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMetric("engagement")}
                  className="rounded-none border-x border-border"
                >
                  Total Engagement
                </Button>
                <Button
                  variant={metric === "reach" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMetric("reach")}
                  className="rounded-l-none"
                >
                  Reach
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Slots */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Rekomendasi Waktu Terbaik (Top 3)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topSlots.map((slot, index) => (
              <Card key={`${slot.day}-${slot.hour}`} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={index === 0 ? "bg-primary" : "bg-secondary"}>
                      <Trophy className="h-3 w-3 mr-1" />
                      #{index + 1}
                    </Badge>
                    <Badge variant="outline">{slot.count} post</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">
                      {slot.dayName}, {slot.hourStr}
                    </h3>
                    <p className="text-muted-foreground text-sm">{getMetricLabel()}</p>
                    <p className="text-3xl font-bold text-primary">
                      {metric === "er" 
                        ? `${slot.value.toFixed(2)}%` 
                        : slot.value.toLocaleString()}
                    </p>
                    {slot.count < 5 && (
                      <p className="text-xs text-warning">
                        Sample kecil, gunakan dengan hati-hati
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Heatmap: Hari vs Jam</CardTitle>
            <CardDescription>
              <span className="inline-block px-2 py-1 rounded bg-green-500/40 text-green-950 text-xs mr-2">Terbaik</span>
              <span className="inline-block px-2 py-1 rounded bg-yellow-500/40 text-yellow-950 text-xs mr-2">Medium</span>
              <span className="inline-block px-2 py-1 rounded bg-red-500/30 text-red-950 text-xs">Kurang</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-border p-2 text-sm font-medium text-foreground">Hari</th>
                    {Array.from({ length: 24 }, (_, i) => (
                      <th key={i} className="border border-border p-1 text-xs text-foreground">
                        {i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, dayIndex) => {
                    const values = Array.from({ length: 24 }, (_, h) => row[`h${h}`] || 0);
                    const allValues = heatmapData.flatMap(r => 
                      Array.from({ length: 24 }, (_, h) => r[`h${h}`] || 0)
                    ).filter(v => v > 0);
                    const minVal = Math.min(...allValues);
                    const maxVal = Math.max(...allValues);
                    const range = maxVal - minVal;
                    
                    const getHeatmapColor = (val: number) => {
                      if (val === 0) return "bg-muted/30 text-muted-foreground/50";
                      
                      const normalized = range > 0 ? (val - minVal) / range : 0;
                      
                      if (normalized >= 0.66) {
                        // High performance - green shades
                        const intensity = 30 + (normalized - 0.66) / 0.34 * 40;
                        return `bg-green-500/${Math.round(intensity)} text-green-950 font-medium`;
                      } else if (normalized >= 0.33) {
                        // Medium performance - yellow/amber shades
                        const intensity = 30 + (normalized - 0.33) / 0.33 * 40;
                        return `bg-yellow-500/${Math.round(intensity)} text-yellow-950 font-medium`;
                      } else {
                        // Low performance - red shades
                        const intensity = 20 + (normalized / 0.33) * 30;
                        return `bg-red-500/${Math.round(intensity)} text-red-950 font-medium`;
                      }
                    };
                    
                    return (
                      <tr key={dayIndex}>
                        <td className="border border-border p-2 text-sm font-medium text-foreground">
                          {row.day}
                        </td>
                        {values.map((val, hour) => {
                          const colorClass = getHeatmapColor(val);
                          
                          return (
                            <td
                              key={hour}
                              className={`border border-border p-2 text-xs text-center transition-colors ${colorClass}`}
                              title={`${row.day} ${hour}:00 - ${metric === "er" ? val.toFixed(2) + "%" : val.toLocaleString()}`}
                            >
                              {val > 0 ? (metric === "er" ? val.toFixed(1) : Math.round(val)) : ""}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Frequency */}
        <Card>
          <CardHeader>
            <CardTitle>Frekuensi Posting per Jam</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--foreground))" />
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default WaktuTerbaik;
