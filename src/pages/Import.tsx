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
import { Upload, Link as LinkIcon, Database, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Import = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, datasets, refreshDatasets } = useApp();
  const [uploading, setUploading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // CSV Upload Handler
  const handleCsvUpload = async () => {
    if (!csvFile || !selectedProject) {
      toast.error("Pilih file CSV terlebih dahulu");
      return;
    }

    setUploading(true);
    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const required = ["platform", "content_type", "post_id", "posted_at", "reach", "likes", "comments", "shares", "saved", "views", "followers"];
      const missing = required.filter((col) => !headers.includes(col));
      if (missing.length > 0) throw new Error(`Kolom yang hilang: ${missing.join(", ")}`);

      const { data: dataset, error: datasetError } = await supabase
        .from("datasets")
        .insert({
          project_id: selectedProject.id,
          name: csvFile.name,
          source_type: "upload_csv",
          row_count: lines.length - 1,
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      const { data: platforms } = await supabase.from("platforms").select("*");
      const { data: contentTypes } = await supabase.from("content_types").select("*");

      const posts = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        if (values.length < headers.length) continue;

        const platform = platforms?.find((p) => p.name.toLowerCase() === values[headers.indexOf("platform")]?.trim().toLowerCase());
        const contentType = contentTypes?.find((c) => c.name.toLowerCase() === values[headers.indexOf("content_type")]?.trim().toLowerCase());

        if (!platform || !contentType) continue;

        const reach = parseInt(values[headers.indexOf("reach")]) || 0;
        const likes = parseInt(values[headers.indexOf("likes")]) || 0;
        const comments = parseInt(values[headers.indexOf("comments")]) || 0;
        const shares = parseInt(values[headers.indexOf("shares")]) || 0;
        const saved = parseInt(values[headers.indexOf("saved")]) || 0;
        const engagement = likes + comments + shares + saved;

        posts.push({
          project_id: selectedProject.id,
          dataset_id: dataset.id,
          platform_id: platform.id,
          content_type_id: contentType.id,
          post_id: values[headers.indexOf("post_id")]?.trim() || `POST-${i}`,
          posted_at: new Date(values[headers.indexOf("posted_at")]?.trim()).toISOString(),
          reach, likes, comments, shares, saved,
          views: parseInt(values[headers.indexOf("views")]) || 0,
          followers: parseInt(values[headers.indexOf("followers")]) || 0,
          engagement,
          engagement_rate: reach > 0 ? parseFloat(((engagement / reach) * 100).toFixed(2)) : 0,
          caption: values[headers.indexOf("caption")]?.trim() || "",
        });
      }

      await supabase.from("posts").insert(posts);
      await supabase.from("imports_log").insert({ dataset_id: dataset.id, status: "success", message: `Imported ${posts.length} posts` });
      toast.success(`Berhasil import ${posts.length} posts!`);
      await refreshDatasets();
      setCsvFile(null);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Google Sheets Import
  const handleSheetsImport = async () => {
    if (!sheetsUrl || !selectedProject) {
      toast.error("Masukkan URL Google Sheets");
      return;
    }

    setUploading(true);
    try {
      const match = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) throw new Error("URL tidak valid");

      const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error("Gagal mengambil data. Pastikan sheet publik");

      const text = await response.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const required = ["platform", "content_type", "post_id", "posted_at", "reach", "likes", "comments", "shares", "saved", "views", "followers"];
      const missing = required.filter((col) => !headers.includes(col));
      if (missing.length > 0) throw new Error(`Kolom yang hilang: ${missing.join(", ")}`);

      const { data: dataset } = await supabase
        .from("datasets")
        .insert({
          project_id: selectedProject.id,
          name: `Google Sheets - ${new Date().toLocaleDateString()}`,
          source_type: "google_sheet",
          storage_path: sheetsUrl,
          row_count: lines.length - 1,
        })
        .select()
        .single();

      const { data: platforms } = await supabase.from("platforms").select("*");
      const { data: contentTypes } = await supabase.from("content_types").select("*");

      const posts = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        if (values.length < headers.length) continue;

        const platform = platforms?.find((p) => p.name.toLowerCase() === values[headers.indexOf("platform")]?.trim().toLowerCase());
        const contentType = contentTypes?.find((c) => c.name.toLowerCase() === values[headers.indexOf("content_type")]?.trim().toLowerCase());
        if (!platform || !contentType) continue;

        const reach = parseInt(values[headers.indexOf("reach")]) || 0;
        const likes = parseInt(values[headers.indexOf("likes")]) || 0;
        const comments = parseInt(values[headers.indexOf("comments")]) || 0;
        const shares = parseInt(values[headers.indexOf("shares")]) || 0;
        const saved = parseInt(values[headers.indexOf("saved")]) || 0;
        const engagement = likes + comments + shares + saved;

        posts.push({
          project_id: selectedProject.id,
          dataset_id: dataset!.id,
          platform_id: platform.id,
          content_type_id: contentType.id,
          post_id: values[headers.indexOf("post_id")]?.trim() || `POST-${i}`,
          posted_at: new Date(values[headers.indexOf("posted_at")]?.trim()).toISOString(),
          reach, likes, comments, shares, saved,
          views: parseInt(values[headers.indexOf("views")]) || 0,
          followers: parseInt(values[headers.indexOf("followers")]) || 0,
          engagement,
          engagement_rate: reach > 0 ? parseFloat(((engagement / reach) * 100).toFixed(2)) : 0,
          caption: values[headers.indexOf("caption")]?.trim() || "",
        });
      }

      await supabase.from("posts").insert(posts);
      toast.success(`Berhasil import ${posts.length} posts!`);
      await refreshDatasets();
      setSheetsUrl("");
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

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
            <CardContent className="space-y-3">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  id="csv-upload"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  {csvFile ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="h-8 w-8 mx-auto text-primary" />
                      <p className="text-sm font-medium text-foreground">{csvFile.name}</p>
                      <p className="text-xs text-muted-foreground">Klik untuk ganti file</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-foreground">Pilih file CSV</p>
                      <p className="text-xs text-muted-foreground">atau drag & drop di sini</p>
                    </div>
                  )}
                </Label>
              </div>
              {csvFile && (
                <Button 
                  className="w-full" 
                  onClick={handleCsvUpload}
                  disabled={uploading}
                >
                  {uploading ? "Mengupload..." : "Upload CSV"}
                </Button>
              )}
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
              <Input 
                placeholder="https://docs.google.com/spreadsheets/d/..." 
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                disabled={uploading}
              />
              <Button 
                className="w-full" 
                onClick={handleSheetsImport}
                disabled={uploading || !sheetsUrl}
              >
                {uploading ? "Mengimport..." : "Import dari Google Sheets"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Pastikan sheet sudah dipublikasikan (File → Share → Publish to web)
              </p>
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
                        {new Date(dataset.created_at).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>{dataset.row_count}</TableCell>
                      <TableCell>
                        {dataset.is_active ? (
                          <Badge className="bg-success">Aktif</Badge>
                        ) : (
                          <Badge variant="outline">Tidak Aktif</Badge>
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
