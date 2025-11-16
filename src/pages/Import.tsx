import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Link as LinkIcon, Database, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const Import = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, datasets, refreshDatasets } = useApp();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleUseSampleData = async () => {
    if (!selectedProject) {
      toast.error("Silakan pilih project terlebih dahulu");
      return;
    }

    setUploading(true);

    try {
      // Check if sample dataset already exists
      const { data: existingSample } = await supabase
        .from("datasets")
        .select("*")
        .eq("project_id", selectedProject.id)
        .eq("source_type", "sample")
        .single();

      if (existingSample) {
        // Activate existing sample dataset
        await supabase
          .from("datasets")
          .update({ is_active: false })
          .eq("project_id", selectedProject.id);

        await supabase
          .from("datasets")
          .update({ is_active: true })
          .eq("id", existingSample.id);

        toast.success("Dataset sample berhasil diaktifkan");
        await refreshDatasets();
        navigate("/dashboard");
        return;
      }

      // Create sample dataset
      const { data: newDataset, error: datasetError } = await supabase
        .from("datasets")
        .insert({
          project_id: selectedProject.id,
          name: "Sample Dataset Mei-Juni 2025",
          source_type: "sample",
          is_active: true,
          row_count: 50
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      // Deactivate other datasets
      await supabase
        .from("datasets")
        .update({ is_active: false })
        .eq("project_id", selectedProject.id)
        .neq("id", newDataset.id);

      // Get platform and content type IDs
      const { data: platforms } = await supabase.from("platforms").select("*");
      const { data: contentTypes } = await supabase.from("content_types").select("*");

      if (!platforms || !contentTypes) throw new Error("Failed to fetch master data");

      // Generate sample posts
      const samplePosts = [];
      const startDate = new Date("2025-04-28");
      const endDate = new Date("2025-06-25");

      for (let i = 1; i <= 50; i++) {
        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const randomHour = Math.floor(Math.random() * 24);
        randomDate.setHours(randomHour, Math.floor(Math.random() * 60), 0, 0);

        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
        
        const reach = Math.floor(Math.random() * 9200) + 800;
        const views = reach + Math.floor(Math.random() * 1000);
        const likes = Math.floor(Math.random() * 750) + 50;
        const comments = Math.floor(Math.random() * 98) + 2;
        const shares = Math.floor(Math.random() * 80);
        const saved = Math.floor(Math.random() * 80);
        const followers = Math.floor(Math.random() * 200) + 700;

        samplePosts.push({
          project_id: selectedProject.id,
          dataset_id: newDataset.id,
          platform_id: platform.id,
          content_type_id: contentType.id,
          post_id: `P${String(i).padStart(3, "0")}`,
          posted_at: randomDate.toISOString(),
          caption: `Sample post ${i}`,
          likes,
          comments,
          shares,
          saved,
          views,
          reach,
          followers
        });
      }

      const { error: postsError } = await supabase
        .from("posts")
        .insert(samplePosts);

      if (postsError) throw postsError;

      // Create import log
      await supabase
        .from("imports_log")
        .insert({
          dataset_id: newDataset.id,
          status: "success",
          message: "Sample data generated successfully",
          invalid_rows_count: 0
        });

      toast.success("Data sample berhasil dibuat!");
      await refreshDatasets();
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating sample data:", error);
      toast.error(error.message || "Gagal membuat data sample");
    } finally {
      setUploading(false);
    }
  };

  const handleSetActive = async (datasetId: string) => {
    if (!selectedProject) return;

    try {
      // Deactivate all datasets
      await supabase
        .from("datasets")
        .update({ is_active: false })
        .eq("project_id", selectedProject.id);

      // Activate selected dataset
      await supabase
        .from("datasets")
        .update({ is_active: true })
        .eq("id", datasetId);

      toast.success("Dataset aktif berhasil diubah");
      await refreshDatasets();
    } catch (error: any) {
      console.error("Error setting active dataset:", error);
      toast.error("Gagal mengubah dataset aktif");
    }
  };

  if (authLoading) {
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Import Data</h1>
          <p className="text-muted-foreground mt-1">
            Kelola dataset CSV untuk project <strong>{selectedProject.name}</strong>
          </p>
        </div>

        {/* Import Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-primary" />
                <span>Upload CSV</span>
              </CardTitle>
              <CardDescription>Drag & drop atau pilih file CSV</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Input type="file" accept=".csv" className="hidden" id="csv-upload" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <p className="text-sm text-muted-foreground">
                    Feature coming soon
                  </p>
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                <span>Google Sheets</span>
              </CardTitle>
              <CardDescription>Import dari link Google Sheets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Paste Google Sheets URL" disabled />
              <Button className="w-full" disabled>
                Preview Data
              </Button>
              <p className="text-xs text-muted-foreground">Feature coming soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <span>Data Sample</span>
              </CardTitle>
              <CardDescription>Gunakan data contoh untuk testing</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={handleUseSampleData}
                disabled={uploading}
              >
                {uploading ? "Loading..." : "Gunakan Data Sample"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                50 post sample dari berbagai platform
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dataset List */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Dataset</CardTitle>
            <CardDescription>
              Dataset yang tersedia untuk project ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {datasets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Belum ada dataset. Silakan import data terlebih dahulu.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Dataset</TableHead>
                    <TableHead>Tanggal Upload</TableHead>
                    <TableHead>Jumlah Post</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="font-medium">{dataset.name}</TableCell>
                      <TableCell>
                        {format(new Date(dataset.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>{dataset.row_count}</TableCell>
                      <TableCell>
                        {dataset.is_active ? (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <XCircle className="h-3 w-3 mr-1" />
                            Tidak Aktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!dataset.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetActive(dataset.id)}
                          >
                            Set sebagai Aktif
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Import;
