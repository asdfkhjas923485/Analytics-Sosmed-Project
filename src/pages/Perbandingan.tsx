import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingUp, Users, Eye } from "lucide-react";
import { InsightCard } from "@/components/InsightCard";

const Perbandingan = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, datasets } = useApp();
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchComparison = async () => {
      if (selectedDatasets.length === 0) {
        setComparison([]);
        setChartData([]);
        return;
      }

      setLoading(true);
      try {
        const comparisons = await Promise.all(
          selectedDatasets.map(async (datasetId) => {
            const dataset = datasets.find(d => d.id === datasetId);
            if (!dataset) return null;

            const { data: posts, error } = await supabase
              .from("posts")
              .select("*, platforms(name, display_name), content_types(name, display_name)")
              .eq("dataset_id", datasetId);

            if (error) throw error;

            if (!posts || posts.length === 0) {
              return {
                datasetId,
                datasetName: dataset.name,
                totalPosts: 0,
                avgER: 0,
                medianReach: 0,
                totalEngagement: 0,
                platformDist: [],
                contentTypeDist: []
              };
            }

            const totalPosts = posts.length;
            const avgER = posts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / totalPosts;
            
            const sortedReach = [...posts].map(p => p.reach).sort((a, b) => a - b);
            const medianReach = sortedReach[Math.floor(sortedReach.length / 2)] || 0;
            
            const totalEngagement = posts.reduce((sum, p) => sum + (p.engagement || 0), 0);

            const platformMap = new Map<string, number>();
            posts.forEach(p => {
              const name = p.platforms?.display_name || "Unknown";
              platformMap.set(name, (platformMap.get(name) || 0) + 1);
            });
            const platformDist = Array.from(platformMap.entries()).map(([name, count]) => ({
              name,
              count,
              percentage: (count / totalPosts * 100).toFixed(1)
            }));

            const contentTypeMap = new Map<string, number>();
            posts.forEach(p => {
              const name = p.content_types?.display_name || "Unknown";
              contentTypeMap.set(name, (contentTypeMap.get(name) || 0) + 1);
            });
            const contentTypeDist = Array.from(contentTypeMap.entries()).map(([name, count]) => ({
              name,
              count,
              percentage: (count / totalPosts * 100).toFixed(1)
            }));

            return {
              datasetId,
              datasetName: dataset.name,
              totalPosts,
              avgER: Number(avgER.toFixed(2)),
              medianReach,
              totalEngagement,
              platformDist,
              contentTypeDist
            };
          })
        );

        const validComparisons = comparisons.filter(c => c !== null);
        setComparison(validComparisons);

        // Restructure data for grouped bar chart
        const metrics = ["Avg ER (%)", "Median Reach", "Total Posts"];
        const chart = metrics.map(metric => {
          const row: any = { metric };
          validComparisons.forEach(c => {
            if (metric === "Avg ER (%)") row[c.datasetName] = c.avgER;
            else if (metric === "Median Reach") row[c.datasetName] = c.medianReach;
            else if (metric === "Total Posts") row[c.datasetName] = c.totalPosts;
          });
          return row;
        });
        setChartData(chart);
        generateInsight(validComparisons);
      } catch (error) {
        console.error("Error fetching comparison:", error);
        toast.error("Gagal memuat perbandingan");
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [selectedDatasets, datasets]);

  const generateInsight = (data: any[]) => {
    if (data.length < 2) {
      setInsight("");
      return;
    }

    const sortedByER = [...data].sort((a, b) => b.avgER - a.avgER);
    const sortedByReach = [...data].sort((a, b) => b.medianReach - a.medianReach);
    
    const bestER = sortedByER[0];
    const bestReach = sortedByReach[0];
    
    let insightText = "";
    
    if (bestER.datasetId === bestReach.datasetId) {
      insightText = `Dataset "${bestER.datasetName}" unggul di kedua metrik dengan rata-rata engagement rate ${bestER.avgER.toFixed(2)}% dan median reach ${bestReach.medianReach.toLocaleString()}. Periode atau kampanye ini menunjukkan performa terbaik secara keseluruhan, baik dalam kualitas interaksi maupun luas jangkauan.`;
    } else {
      insightText = `Dataset "${bestER.datasetName}" unggul di kualitas interaksi dengan rata-rata ER ${bestER.avgER.toFixed(2)}%, sementara "${bestReach.datasetName}" unggul di luas jangkauan dengan median reach ${bestReach.medianReach.toLocaleString()}. Ini menunjukkan bahwa ${bestER.datasetName} lebih kuat dalam mendorong engagement berkualitas, sedangkan ${bestReach.datasetName} lebih efektif dalam menjangkau audiens luas.`;
    }

    setInsight(insightText);
  };

  const handleDatasetToggle = (datasetId: string) => {
    if (selectedDatasets.includes(datasetId)) {
      setSelectedDatasets(selectedDatasets.filter(id => id !== datasetId));
    } else {
      if (selectedDatasets.length >= 3) {
        toast.error("Maksimal 3 dataset untuk perbandingan");
        return;
      }
      setSelectedDatasets([...selectedDatasets, datasetId]);
    }
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Perbandingan Dataset</h1>
          <p className="text-muted-foreground mt-2">Bandingkan performa antar dataset (maksimal 3)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pilih Dataset untuk Dibandingkan</CardTitle>
            <CardDescription>Pilih 2-3 dataset untuk melihat perbandingan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {datasets.length === 0 ? (
                <p className="text-muted-foreground">Belum ada dataset</p>
              ) : (
                datasets.map(dataset => (
                  <div key={dataset.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedDatasets.includes(dataset.id)}
                      onCheckedChange={() => handleDatasetToggle(dataset.id)}
                      disabled={!selectedDatasets.includes(dataset.id) && selectedDatasets.length >= 3}
                    />
                    <label className="text-sm text-foreground">
                      {dataset.name} ({dataset.row_count} posts)
                      {dataset.is_active && <span className="ml-2 text-primary">(Aktif)</span>}
                    </label>
                  </div>
                ))
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
        ) : comparison.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Pilih minimal 2 dataset untuk melihat perbandingan
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparison.map((comp) => (
                <Card key={comp.datasetId}>
                  <CardHeader>
                    <CardTitle className="text-lg">{comp.datasetName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Total Posts</span>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{comp.totalPosts}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Avg ER</span>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold text-primary">{comp.avgER}%</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Median Reach</span>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{comp.medianReach.toLocaleString()}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Platform</p>
                      <div className="space-y-1">
                        {comp.platformDist.slice(0, 3).map((p: any) => (
                          <div key={p.name} className="flex justify-between text-xs">
                            <span className="text-foreground">{p.name}</span>
                            <span className="text-muted-foreground">{p.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Tipe Konten</p>
                      <div className="space-y-1">
                        {comp.contentTypeDist.slice(0, 3).map((c: any) => (
                          <div key={c.name} className="flex justify-between text-xs">
                            <span className="text-foreground">{c.name}</span>
                            <span className="text-muted-foreground">{c.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Perbandingan Metrik Utama</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="metric" stroke="hsl(var(--foreground))" />
                    <YAxis stroke="hsl(var(--foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem"
                      }}
                    />
                    <Legend />
                    {comparison.map((comp, index) => {
                      const colors = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
                      return (
                        <Bar 
                          key={comp.datasetId}
                          dataKey={comp.datasetName} 
                          fill={colors[index] || colors[0]}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <InsightCard insight={insight} />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Perbandingan;
