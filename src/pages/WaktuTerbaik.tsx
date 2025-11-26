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
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { InsightCard } from "@/components/InsightCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type MetricType = "er" | "engagement" | "reach";
type PeriodType = "week" | "month" | "all";

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
  const [insight, setInsight] = useState("");
  
  // Filters
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  
  // Period comparison
  const [period, setPeriod] = useState<PeriodType>("all");
  const [showComparison, setShowComparison] = useState(false);
  const [previousTopSlots, setPreviousTopSlots] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch platforms and content types
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [platformsRes, contentTypesRes] = await Promise.all([
          supabase.from("platform").select("*").eq("platform_aktif", true),
          supabase.from("jenis_konten").select("*").eq("jenis_konten_aktif", true)
        ]);

        if (platformsRes.error) throw platformsRes.error;
        if (contentTypesRes.error) throw contentTypesRes.error;

        setPlatforms(platformsRes.data || []);
        setContentTypes(contentTypesRes.data || []);
      } catch (error) {
        console.error("Error fetching filters:", error);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!selectedProject || !activeDataset) return;

      setLoading(true);
      try {
        let query = supabase
          .from("postingan")
          .select("*")
          .eq("id_proyek", selectedProject.id)
          .eq("id_dataset", activeDataset.id);

        // Apply filters
        if (selectedPlatforms.length > 0) {
          query = query.in("id_platform", selectedPlatforms);
        }
        if (selectedContentTypes.length > 0) {
          query = query.in("id_jenis_konten", selectedContentTypes);
        }

        const { data, error } = await query;

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
  }, [selectedProject, activeDataset, selectedPlatforms, selectedContentTypes]);

  useEffect(() => {
    if (posts.length === 0) return;

    // Filter posts by period
    const now = new Date();
    const getFilteredPosts = (periodType: PeriodType, offset: number = 0) => {
      if (periodType === "all") return posts;
      
      const startDate = new Date(now);
      if (periodType === "week") {
        startDate.setDate(now.getDate() - 7 * (offset + 1));
      } else if (periodType === "month") {
        startDate.setMonth(now.getMonth() - (offset + 1));
      }
      
      const endDate = new Date(now);
      if (periodType === "week") {
        endDate.setDate(now.getDate() - 7 * offset);
      } else if (periodType === "month") {
        endDate.setMonth(now.getMonth() - offset);
      }
      
      return posts.filter(post => {
        const postDate = new Date(post.waktu_diposting);
        return postDate >= startDate && postDate < endDate;
      });
    };

    const currentPosts = getFilteredPosts(period, 0);
    const previousPosts = showComparison ? getFilteredPosts(period, 1) : [];

    // Calculate top slots for current period
    const calculateSlots = (postList: any[]) => {
      const slotMap = new Map<string, { values: number[]; count: number }>();
      
      postList.forEach(post => {
        const date = new Date(post.waktu_diposting);
        const day = date.getDay();
        const hour = date.getHours();
        const key = `${day}-${hour}`;

        let value = 0;
        if (metric === "er") {
          value = post.engagement_rate_persen || 0;
        } else if (metric === "engagement") {
          value = post.total_engagement || 0;
        } else if (metric === "reach") {
          value = post.jumlah_reach || 0;
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
      return slots
        .filter(s => s.count >= 2)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    };

    const currentTop3 = calculateSlots(currentPosts);
    setTopSlots(currentTop3);

    if (showComparison && previousPosts.length > 0) {
      const previousTop3 = calculateSlots(previousPosts);
      setPreviousTopSlots(previousTop3);
    } else {
      setPreviousTopSlots([]);
    }

    // Prepare heatmap data based on current period posts
    const allSlots: any[] = [];
    const slotMapForHeatmap = new Map<string, { values: number[]; count: number }>();
    
    currentPosts.forEach(post => {
      const date = new Date(post.waktu_diposting);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;

      let value = 0;
      if (metric === "er") {
        value = post.engagement_rate_persen || 0;
      } else if (metric === "engagement") {
        value = post.total_engagement || 0;
      } else if (metric === "reach") {
        value = post.jumlah_reach || 0;
      }

      if (!slotMapForHeatmap.has(key)) {
        slotMapForHeatmap.set(key, { values: [], count: 0 });
      }
      const slot = slotMapForHeatmap.get(key)!;
      slot.values.push(value);
      slot.count++;
    });

    slotMapForHeatmap.forEach((slot, key) => {
      const [day, hour] = key.split("-").map(Number);
      let metricValue = 0;
      if (metric === "engagement") {
        metricValue = slot.values.reduce((sum, v) => sum + v, 0);
      } else {
        const sorted = [...slot.values].sort((a, b) => a - b);
        metricValue = sorted[Math.floor(sorted.length / 2)] || 0;
      }
      allSlots.push({ day, hour, value: metricValue });
    });

    const heatmap = DAYS.map((dayName, dayIndex) => {
      const daySlots: any = { day: dayName };
      for (let h = 0; h < 24; h++) {
        const slot = allSlots.find(s => s.day === dayIndex && s.hour === h);
        daySlots[`h${h}`] = slot ? slot.value : 0;
      }
      return daySlots;
    });
    setHeatmapData(heatmap);

    // Hourly frequency based on current period
    const hourlyCount = Array(24).fill(0);
    currentPosts.forEach(post => {
      const hour = new Date(post.waktu_diposting).getHours();
      hourlyCount[hour]++;
    });
    const hourly = hourlyCount.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      count
    }));
    setHourlyData(hourly);
    generateInsight(currentTop3);
  }, [posts, metric, period, showComparison]);

  const generateInsight = (sortedSlots: any[]) => {
    if (sortedSlots.length === 0) {
      setInsight("");
      return;
    }

    const best = sortedSlots[0];
    const metricValue = best.value;
    const metricLabel = metric === "er" ? "engagement rate" : metric === "engagement" ? "engagement" : "reach";
    
    let insightText = `Slot waktu terbaik untuk posting adalah ${best.dayName} pukul ${best.hourStr} dengan median ${metricLabel} ${metric === "er" ? metricValue.toFixed(2) + "%" : metricValue.toLocaleString()}`;
    
    if (sortedSlots.length >= 2) {
      const second = sortedSlots[1];
      const secondValue = second.value;
      const diff = Math.abs(metricValue - secondValue);
      const diffPercent = (diff / metricValue) * 100;
      
      if (diffPercent < 10) {
        insightText += `. Alternatif lain yang juga kuat adalah ${second.dayName} pukul ${second.hourStr}`;
        
        if (sortedSlots.length >= 3) {
          const third = sortedSlots[2];
          const thirdValue = third.value;
          const diff3 = Math.abs(metricValue - thirdValue);
          const diffPercent3 = (diff3 / metricValue) * 100;
          
          if (diffPercent3 < 15) {
            insightText += ` dan ${third.dayName} pukul ${third.hourStr}`;
          }
        }
        insightText += ", karena performanya tidak jauh berbeda";
      }
    }
    
    if (best.count < 3) {
      insightText += `. Perlu diperhatikan bahwa sampel di slot ini masih kecil (${best.count} post), sebaiknya diuji lebih lanjut dengan posting lebih banyak konten pada waktu tersebut`;
    }
    
    insightText += ".";
    setInsight(insightText);
  };

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

        {/* Filters and Settings */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Metric Selector */}
            <div className="flex flex-wrap items-center gap-4">
              <Label>Pilih Metrik:</Label>
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

            {/* Period Selector */}
            <div className="flex flex-wrap items-center gap-4">
              <Label>Periode:</Label>
              <Select value={period} onValueChange={(value) => setPeriod(value as PeriodType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Data</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                </SelectContent>
              </Select>
              
              {period !== "all" && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="comparison" 
                    checked={showComparison}
                    onCheckedChange={(checked) => setShowComparison(checked as boolean)}
                  />
                  <Label htmlFor="comparison" className="cursor-pointer">
                    Bandingkan dengan periode sebelumnya
                  </Label>
                </div>
              )}
            </div>

            {/* Platform Filter */}
            <div className="flex flex-wrap items-start gap-4">
              <Label className="pt-2">Platform:</Label>
              <div className="flex flex-wrap gap-3">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`platform-${platform.id}`}
                      checked={selectedPlatforms.includes(platform.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPlatforms([...selectedPlatforms, platform.id]);
                        } else {
                          setSelectedPlatforms(selectedPlatforms.filter(id => id !== platform.id));
                        }
                      }}
                    />
                    <Label htmlFor={`platform-${platform.id}`} className="cursor-pointer">
                      {platform.nama_platform}
                    </Label>
                  </div>
                ))}
                {selectedPlatforms.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedPlatforms([])}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Content Type Filter */}
            <div className="flex flex-wrap items-start gap-4">
              <Label className="pt-2">Jenis Konten:</Label>
              <div className="flex flex-wrap gap-3">
                {contentTypes.map((contentType) => (
                  <div key={contentType.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`content-${contentType.id}`}
                      checked={selectedContentTypes.includes(contentType.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedContentTypes([...selectedContentTypes, contentType.id]);
                        } else {
                          setSelectedContentTypes(selectedContentTypes.filter(id => id !== contentType.id));
                        }
                      }}
                    />
                    <Label htmlFor={`content-${contentType.id}`} className="cursor-pointer">
                      {contentType.nama_jenis_konten}
                    </Label>
                  </div>
                ))}
                {selectedContentTypes.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedContentTypes([])}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Slots */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Rekomendasi Waktu Terbaik (Top 3)
            {period !== "all" && (
              <span className="text-sm text-muted-foreground ml-2">
                - {period === "week" ? "Minggu Ini" : "Bulan Ini"}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topSlots.map((slot, index) => {
              // Find comparison data
              const previousSlot = showComparison 
                ? previousTopSlots.find(ps => ps.day === slot.day && ps.hour === slot.hour)
                : null;
              
              const change = previousSlot 
                ? ((slot.value - previousSlot.value) / previousSlot.value) * 100
                : null;

              return (
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
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-primary">
                          {metric === "er" 
                            ? `${slot.value.toFixed(2)}%` 
                            : slot.value.toLocaleString()}
                        </p>
                        {change !== null && (
                          <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? (
                              <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            {Math.abs(change).toFixed(1)}%
                          </div>
                        )}
                      </div>
                      {slot.count < 5 && (
                        <p className="text-xs text-warning">
                          Sample kecil, gunakan dengan hati-hati
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <InsightCard insight={insight} />

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
                    
                    // Calculate min/max from ALL values with data across entire heatmap
                    const allValues = heatmapData.flatMap(r => 
                      Array.from({ length: 24 }, (_, h) => r[`h${h}`] || 0)
                    ).filter(v => v > 0);
                    
                    if (allValues.length === 0) return null;
                    
                    const minVal = Math.min(...allValues);
                    const maxVal = Math.max(...allValues);
                    const range = maxVal - minVal;
                    
                    // Calculate threshold values for Best/Medium/Poor
                    const highThreshold = minVal + (range * 0.66);
                    const mediumThreshold = minVal + (range * 0.33);
                    
                    const getHeatmapColor = (val: number) => {
                      if (val === 0) return "bg-muted/30 text-muted-foreground/50";
                      
                      // Categorize based on thresholds
                      if (val >= highThreshold) {
                        // Best performance - green
                        return "bg-green-100 text-green-900 font-semibold border-green-200";
                      } else if (val >= mediumThreshold) {
                        // Medium performance - yellow/amber
                        return "bg-yellow-100 text-yellow-900 font-medium border-yellow-200";
                      } else {
                        // Poor performance - red
                        return "bg-red-100 text-red-900 font-medium border-red-200";
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
