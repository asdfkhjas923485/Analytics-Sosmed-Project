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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type SortBy = "er" | "reach" | "engagement";

const Performa = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, activeDataset } = useApp();
  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("er");
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minReach, setMinReach] = useState("");
  const [searchCaption, setSearchCaption] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [contentTypes, setContentTypes] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchMasterData = async () => {
      const { data: platformData } = await supabase
        .from("platforms")
        .select("*")
        .eq("is_active", true);
      const { data: contentTypeData } = await supabase
        .from("content_types")
        .select("*")
        .eq("is_active", true);
      
      setPlatforms(platformData || []);
      setContentTypes(contentTypeData || []);
      
      if (platformData) {
        setSelectedPlatforms(platformData.map(p => p.id));
      }
      if (contentTypeData) {
        setSelectedContentTypes(contentTypeData.map(c => c.id));
      }
    };

    fetchMasterData();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!selectedProject || !activeDataset) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*, platforms(name, display_name), content_types(name, display_name)")
          .eq("project_id", selectedProject.id)
          .eq("dataset_id", activeDataset.id)
          .order("posted_at", { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error("Error fetching posts:", error);
        toast.error("Gagal memuat data performa");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedProject, activeDataset]);

  useEffect(() => {
    let filtered = [...posts];

    // Apply filters
    if (dateFrom) {
      filtered = filtered.filter(p => new Date(p.posted_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(p => new Date(p.posted_at) <= new Date(dateTo));
    }
    if (minReach) {
      filtered = filtered.filter(p => p.reach >= parseInt(minReach));
    }
    if (searchCaption) {
      filtered = filtered.filter(p => 
        p.caption?.toLowerCase().includes(searchCaption.toLowerCase())
      );
    }
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter(p => selectedPlatforms.includes(p.platform_id));
    }
    if (selectedContentTypes.length > 0) {
      filtered = filtered.filter(p => selectedContentTypes.includes(p.content_type_id));
    }

    // Apply sorting
    if (sortBy === "er") {
      filtered.sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0));
    } else if (sortBy === "reach") {
      filtered.sort((a, b) => b.reach - a.reach);
    } else if (sortBy === "engagement") {
      filtered.sort((a, b) => (b.engagement || 0) - (a.engagement || 0));
    }

    setFilteredPosts(filtered);
  }, [posts, dateFrom, dateTo, minReach, searchCaption, selectedPlatforms, selectedContentTypes, sortBy]);

  const handleExport = () => {
    const csv = [
      ["Post ID", "Platform", "Tanggal", "Tipe", "Caption", "Reach", "Views", "Likes", "Comments", "Shares", "Saved", "Engagement", "ER%"],
      ...filteredPosts.map(p => [
        p.post_id,
        p.platforms?.display_name || "",
        format(new Date(p.posted_at), "yyyy-MM-dd HH:mm"),
        p.content_types?.display_name || "",
        p.caption || "",
        p.reach,
        p.views,
        p.likes,
        p.comments,
        p.shares,
        p.saved,
        p.engagement || 0,
        (p.engagement_rate || 0).toFixed(2)
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performa-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Data berhasil diexport");
  };

  const getPerformanceBadge = (post: any) => {
    if (!posts.length) return null;
    const sortedByER = [...posts].sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0));
    const index = sortedByER.findIndex(p => p.id === post.id);
    const percentile = (index / sortedByER.length) * 100;

    if (percentile <= 10) {
      return <Badge className="bg-success text-success-foreground">Top 10%</Badge>;
    } else if (percentile >= 90) {
      return <Badge variant="destructive">Bottom 10%</Badge>;
    }
    return null;
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
          <h1 className="text-3xl font-bold text-foreground">Content Performance</h1>
          <p className="text-muted-foreground mt-2">Analisis performa setiap postingan</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Dari Tanggal</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label>Sampai Tanggal</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <Label>Reach Minimum</Label>
                <Input type="number" value={minReach} onChange={(e) => setMinReach(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Search Caption</Label>
                <Input value={searchCaption} onChange={(e) => setSearchCaption(e.target.value)} placeholder="Cari caption..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Platform</Label>
                <div className="space-y-2">
                  {platforms.map(platform => (
                    <div key={platform.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedPlatforms.includes(platform.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPlatforms([...selectedPlatforms, platform.id]);
                          } else {
                            setSelectedPlatforms(selectedPlatforms.filter(id => id !== platform.id));
                          }
                        }}
                      />
                      <label className="text-sm text-foreground">{platform.display_name}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Tipe Konten</Label>
                <div className="space-y-2">
                  {contentTypes.map(type => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedContentTypes.includes(type.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedContentTypes([...selectedContentTypes, type.id]);
                          } else {
                            setSelectedContentTypes(selectedContentTypes.filter(id => id !== type.id));
                          }
                        }}
                      />
                      <label className="text-sm text-foreground">{type.display_name}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sorting and Export */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-2">
                <Label>Urutkan berdasarkan:</Label>
                <div className="flex border border-border rounded-md">
                  <Button
                    variant={sortBy === "er" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy("er")}
                    className="rounded-r-none"
                  >
                    ER
                  </Button>
                  <Button
                    variant={sortBy === "reach" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy("reach")}
                    className="rounded-none border-x border-border"
                  >
                    Reach
                  </Button>
                  <Button
                    variant={sortBy === "engagement" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy("engagement")}
                    className="rounded-l-none"
                  >
                    Engagement
                  </Button>
                </div>
              </div>
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Tidak ada data</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post ID</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Caption</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comments</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Saved</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                      <TableHead className="text-right">ER%</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPosts.map(post => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.post_id}</TableCell>
                        <TableCell>{post.platforms?.display_name}</TableCell>
                        <TableCell>{format(new Date(post.posted_at), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell>{post.content_types?.display_name}</TableCell>
                        <TableCell className="max-w-xs truncate" title={post.caption || ""}>
                          {post.caption || "-"}
                        </TableCell>
                        <TableCell className="text-right">{post.reach.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{post.likes.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{post.comments.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{post.shares.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{post.saved.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(post.engagement || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {(post.engagement_rate || 0).toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getPerformanceBadge(post)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Performa;
