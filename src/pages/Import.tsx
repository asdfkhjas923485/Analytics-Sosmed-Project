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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Link as LinkIcon, Database, FileSpreadsheet, Download, Eye, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Import = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject, datasets, refreshDatasets } = useApp();
  const [uploading, setUploading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Parse CSV with flexible column matching
  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) throw new Error("File CSV kosong");
    
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    
    // Map common column name variations
    const columnMap: Record<string, string[]> = {
      platform: ["platform", "social_media", "media"],
      content_type: ["content_type", "type", "content", "tipe"],
      post_id: ["post_id", "id", "postid"],
      posted_at: ["posted_at", "date", "tanggal", "timestamp"],
      reach: ["reach", "jangkauan", "impressions"],
      likes: ["likes", "like", "suka"],
      comments: ["comments", "comment", "komentar"],
      shares: ["shares", "share", "bagikan"],
      saved: ["saved", "save", "simpan", "bookmark"],
      views: ["views", "view", "tayangan"],
      followers: ["followers", "follower", "pengikut"],
      caption: ["caption", "text", "keterangan"]
    };

    const getColumnIndex = (columnKey: string): number => {
      const variations = columnMap[columnKey];
      for (const variation of variations) {
        const index = headers.indexOf(variation);
        if (index !== -1) return index;
      }
      return -1;
    };

    const requiredColumns = ["platform", "content_type", "post_id", "posted_at", "reach", "likes", "comments", "shares", "saved", "views", "followers"];
    const missing = requiredColumns.filter(col => getColumnIndex(col) === -1);
    
    if (missing.length > 0) {
      throw new Error(`Kolom yang hilang: ${missing.join(", ")}. Silakan download template untuk format yang benar.`);
    }

    return { lines, headers, getColumnIndex };
  };

  // Preview CSV before upload
  const handlePreviewCSV = async () => {
    if (!csvFile) return;

    try {
      const text = await csvFile.text();
      const { lines, getColumnIndex } = parseCSV(text);
      
      const { data: platforms } = await supabase.from("platforms").select("*");
      const { data: contentTypes } = await supabase.from("content_types").select("*");

      const preview = {
        fileName: csvFile.name,
        totalRows: lines.length - 1,
        headers: lines[0],
        sampleRows: lines.slice(1, 4).map(line => line.split(",")),
        validationResults: {
          validRows: 0,
          invalidRows: 0,
          errors: [] as string[]
        }
      };

      // Validate sample data
      let validCount = 0;
      let invalidCount = 0;
      const errors: string[] = [];

      for (let i = 1; i < Math.min(lines.length, 20); i++) {
        const values = lines[i].split(",");
        const platformName = values[getColumnIndex("platform")]?.trim().toLowerCase();
        const contentTypeName = values[getColumnIndex("content_type")]?.trim().toLowerCase();
        
        const platform = platforms?.find((p) => p.name.toLowerCase() === platformName);
        const contentType = contentTypes?.find((c) => c.name.toLowerCase() === contentTypeName);

        if (!platform) {
          errors.push(`Baris ${i}: Platform "${platformName}" tidak ditemukan`);
          invalidCount++;
        } else if (!contentType) {
          errors.push(`Baris ${i}: Content type "${contentTypeName}" tidak ditemukan`);
          invalidCount++;
        } else {
          validCount++;
        }
      }

      preview.validationResults = {
        validRows: validCount,
        invalidRows: invalidCount,
        errors: errors.slice(0, 5)
      };

      setPreviewData(preview);
      setShowPreview(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // CSV Upload Handler
  const handleCsvUpload = async () => {
    if (!csvFile || !selectedProject) {
      toast.error("Pilih file CSV terlebih dahulu");
      return;
    }

    setUploading(true);
    try {
      const text = await csvFile.text();
      const { lines, getColumnIndex } = parseCSV(text);

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
      const errors = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        
        const platformName = values[getColumnIndex("platform")]?.trim().toLowerCase();
        const contentTypeName = values[getColumnIndex("content_type")]?.trim().toLowerCase();
        
        const platform = platforms?.find((p) => p.name.toLowerCase() === platformName);
        const contentType = contentTypes?.find((c) => c.name.toLowerCase() === contentTypeName);

        if (!platform) {
          errors.push(`Baris ${i}: Platform "${platformName}" tidak ditemukan`);
          continue;
        }
        
        if (!contentType) {
          errors.push(`Baris ${i}: Content type "${contentTypeName}" tidak ditemukan`);
          continue;
        }

        const reach = parseInt(values[getColumnIndex("reach")]) || 0;
        const likes = parseInt(values[getColumnIndex("likes")]) || 0;
        const comments = parseInt(values[getColumnIndex("comments")]) || 0;
        const shares = parseInt(values[getColumnIndex("shares")]) || 0;
        const saved = parseInt(values[getColumnIndex("saved")]) || 0;
        const engagement = likes + comments + shares + saved;

        posts.push({
          project_id: selectedProject.id,
          dataset_id: dataset.id,
          platform_id: platform.id,
          content_type_id: contentType.id,
          post_id: values[getColumnIndex("post_id")]?.trim() || `POST-${i}`,
          posted_at: new Date(values[getColumnIndex("posted_at")]?.trim()).toISOString(),
          reach, likes, comments, shares, saved,
          views: parseInt(values[getColumnIndex("views")]) || 0,
          followers: parseInt(values[getColumnIndex("followers")]) || 0,
          engagement,
          engagement_rate: reach > 0 ? parseFloat(((engagement / reach) * 100).toFixed(2)) : 0,
          caption: values[getColumnIndex("caption")]?.trim() || "",
        });
      }

      if (posts.length === 0) {
        throw new Error("Tidak ada data valid yang bisa diimport. Periksa format CSV Anda.");
      }

      await supabase.from("posts").insert(posts);
      await supabase.from("imports_log").insert({ 
        dataset_id: dataset.id, 
        status: "success", 
        message: `Imported ${posts.length} posts`,
        invalid_rows_count: errors.length
      });
      
      toast.success(`Berhasil import ${posts.length} posts!${errors.length > 0 ? ` (${errors.length} baris dilewati)` : ""}`);
      if (errors.length > 0 && errors.length <= 5) {
        errors.forEach(err => toast.warning(err));
      }
      
      await refreshDatasets();
      setCsvFile(null);
      setShowPreview(false);
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
      await supabase.from("datasets").update({ is_active: false }).eq("project_id", selectedProject.id);
      await supabase.from("datasets").update({ is_active: true }).eq("id", datasetId);
      toast.success("Dataset aktif berhasil diubah");
      await refreshDatasets();
    } catch (error: any) {
      toast.error("Gagal mengubah dataset aktif");
    }
  };

  const handleDeleteDataset = async () => {
    if (!datasetToDelete || !selectedProject) return;

    try {
      setUploading(true);
      
      // Delete related posts first
      await supabase.from("posts").delete().eq("dataset_id", datasetToDelete);
      
      // Delete import logs
      await supabase.from("imports_log").delete().eq("dataset_id", datasetToDelete);
      
      // Delete dataset
      await supabase.from("datasets").delete().eq("id", datasetToDelete);
      
      toast.success("Dataset berhasil dihapus");
      await refreshDatasets();
      setShowDeleteDialog(false);
      setDatasetToDelete(null);
    } catch (error: any) {
      toast.error("Gagal menghapus dataset");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `platform,content_type,post_id,posted_at,reach,likes,comments,shares,saved,views,followers,caption
instagram,reel,POST001,2025-01-15 10:30:00,5000,250,30,15,20,5500,1200,Contoh caption post
tiktok,video,POST002,2025-01-15 14:00:00,8000,400,50,25,35,8500,1500,Contoh caption lainnya`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Template CSV berhasil didownload");
  };

  const handleExportDataset = async (datasetId: string, datasetName: string) => {
    try {
      setUploading(true);
      
      const { data: posts, error } = await supabase
        .from("posts")
        .select(`
          *,
          platforms:platform_id(name),
          content_types:content_type_id(name)
        `)
        .eq("dataset_id", datasetId);

      if (error) throw error;
      if (!posts || posts.length === 0) {
        toast.error("Dataset kosong, tidak ada data untuk diekspor");
        return;
      }

      const headers = ["platform", "content_type", "post_id", "posted_at", "reach", "likes", "comments", "shares", "saved", "views", "followers", "caption"];
      const rows = posts.map((post: any) => [
        post.platforms?.name || "",
        post.content_types?.name || "",
        post.post_id,
        post.posted_at,
        post.reach,
        post.likes,
        post.comments,
        post.shares,
        post.saved,
        post.views,
        post.followers,
        post.caption || ""
      ]);

      const csv = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${datasetName.replace(/\s/g, '_')}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Dataset berhasil diekspor");
    } catch (error: any) {
      toast.error("Gagal mengekspor dataset");
    } finally {
      setUploading(false);
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

        {/* Download Template */}
        <Alert className="bg-muted/30 border-primary/20">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              Belum tahu format CSV yang benar? Download template kami
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </AlertDescription>
        </Alert>

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
                <div className="space-y-2">
                  <Button 
                    variant="outline"
                    className="w-full gap-2" 
                    onClick={handlePreviewCSV}
                    disabled={uploading}
                  >
                    <Eye className="h-4 w-4" />
                    Preview Data
                  </Button>
                  <Button 
                    className="w-full" 
                    onClick={handleCsvUpload}
                    disabled={uploading}
                  >
                    {uploading ? "Mengupload..." : "Upload CSV"}
                  </Button>
                </div>
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
                        <div className="flex gap-2">
                          {!dataset.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetActive(dataset.id)}
                            >
                              Set Aktif
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportDataset(dataset.id, dataset.name)}
                            disabled={uploading}
                            className="gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Export
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDatasetToDelete(dataset.id);
                              setShowDeleteDialog(true);
                            }}
                            disabled={uploading}
                            className="gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Preview CSV Import</DialogTitle>
              <DialogDescription>
                Periksa data sebelum mengupload
              </DialogDescription>
            </DialogHeader>
            
            {previewData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">File</p>
                    <p className="font-medium">{previewData.fileName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Baris</p>
                    <p className="font-medium">{previewData.totalRows}</p>
                  </div>
                </div>

                {previewData.validationResults.invalidRows > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium">Ditemukan {previewData.validationResults.invalidRows} baris bermasalah:</p>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        {previewData.validationResults.errors.map((err: string, idx: number) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Sample Data (3 baris pertama)</p>
                  <ScrollArea className="h-64 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.headers.split(",").map((header: string, idx: number) => (
                            <TableHead key={idx}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.sampleRows.map((row: string[], idx: number) => (
                          <TableRow key={idx}>
                            {row.map((cell: string, cellIdx: number) => (
                              <TableCell key={cellIdx}>{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Batal
              </Button>
              <Button onClick={handleCsvUpload} disabled={uploading}>
                {uploading ? "Mengupload..." : "Lanjutkan Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Hapus Dataset</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus dataset ini? Semua data post terkait juga akan dihapus. Aksi ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDatasetToDelete(null);
                }}
                disabled={uploading}
              >
                Batal
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteDataset}
                disabled={uploading}
              >
                {uploading ? "Menghapus..." : "Hapus Dataset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Import;
