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
  const [previewSource, setPreviewSource] = useState<"csv" | "sheets" | null>(null);
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
      
      const { data: platforms } = await supabase.from("platform").select("*");
      const { data: contentTypes } = await supabase.from("jenis_konten").select("*");

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
        
        const platform = platforms?.find((p) => p.kode_platform.toLowerCase() === platformName);
        const contentType = contentTypes?.find((c) => c.kode_jenis_konten.toLowerCase() === contentTypeName);

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
      setPreviewSource("csv");
      setShowPreview(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // CSV Upload Handler
  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error("Pilih file CSV terlebih dahulu");
      return;
    }
    
    if (!selectedProject?.id) {
      toast.error("Silakan pilih project terlebih dahulu");
      return;
    }

    setUploading(true);
    try {
      const text = await csvFile.text();
      const { lines, getColumnIndex } = parseCSV(text);

      // Deactivate all existing datasets first
      await supabase
        .from("dataset")
        .update({ dataset_aktif: false })
        .eq("id_proyek", selectedProject.id);

      // Create new dataset and set as active
      const { data: dataset, error: datasetError } = await supabase
        .from("dataset")
        .insert({
          id_proyek: selectedProject.id,
          nama_dataset: csvFile.name,
          jenis_sumber_dataset: "upload_csv",
          jumlah_baris_dataset: lines.length - 1,
          dataset_aktif: true,
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      const { data: platforms } = await supabase.from("platform").select("*");
      const { data: contentTypes } = await supabase.from("jenis_konten").select("*");

      const posts = [];
      const errors = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        
        const platformName = values[getColumnIndex("platform")]?.trim().toLowerCase();
        const contentTypeName = values[getColumnIndex("content_type")]?.trim().toLowerCase();
        
        const platform = platforms?.find((p) => p.kode_platform.toLowerCase() === platformName);
        const contentType = contentTypes?.find((c) => c.kode_jenis_konten.toLowerCase() === contentTypeName);

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

        posts.push({
          id_proyek: selectedProject.id,
          id_dataset: dataset.id,
          id_platform: platform.id,
          id_jenis_konten: contentType.id,
          kode_postingan: values[getColumnIndex("post_id")]?.trim() || `POST-${i}`,
          waktu_diposting: new Date(values[getColumnIndex("posted_at")]?.trim()).toISOString(),
          jumlah_reach: parseInt(values[getColumnIndex("reach")]) || 0,
          jumlah_likes: likes,
          jumlah_komentar: comments,
          jumlah_shares: shares,
          jumlah_saved: saved,
          jumlah_views: parseInt(values[getColumnIndex("views")]) || 0,
          jumlah_followers: parseInt(values[getColumnIndex("followers")]) || 0,
          teks_caption: values[getColumnIndex("caption")]?.trim() || "",
        });
      }

      if (posts.length === 0) {
        throw new Error("Tidak ada data valid yang bisa diimport. Periksa format CSV Anda.");
      }

      console.log("Attempting to insert posts:", posts);
      
      const { data: insertedPosts, error: postsError } = await supabase
        .from("postingan")
        .insert(posts)
        .select();

      if (postsError) {
        console.error("Error inserting posts:", postsError);
        await supabase.from("log_impor").insert({ 
          id_dataset: dataset.id, 
          status_impor: "failed", 
          pesan: `Failed to insert posts: ${postsError.message}`,
          jumlah_baris_tidak_valid: posts.length
        });
        throw new Error(`Gagal menyimpan posts: ${postsError.message}`);
      }

      console.log("Successfully inserted posts:", insertedPosts);

      await supabase.from("log_impor").insert({ 
        id_dataset: dataset.id, 
        status_impor: "success", 
        pesan: `Imported ${insertedPosts?.length || posts.length} posts`,
        jumlah_baris_tidak_valid: errors.length
      });
      
      toast.success(`Berhasil import ${posts.length} posts! Dataset sekarang aktif dan data dapat dilihat di Dashboard.${errors.length > 0 ? ` (${errors.length} baris dilewati)` : ""}`);
      if (errors.length > 0 && errors.length <= 5) {
        errors.forEach(err => toast.warning(err));
      }
      
      await refreshDatasets();
      setCsvFile(null);
      setShowPreview(false);
    } catch (error: any) {
      console.error("CSV upload error:", error);
      toast.error(`Error: ${error.message}`);
      
      // If dataset was created but posts failed, delete the empty dataset
      if (error.message?.includes("Gagal menyimpan posts")) {
        try {
          await supabase.from("dataset").delete().eq("nama_dataset", csvFile?.name || "");
        } catch (cleanupError) {
          console.error("Failed to cleanup dataset:", cleanupError);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  // Preview Google Sheets before import
  const handlePreviewSheets = async () => {
    if (!sheetsUrl) {
      toast.error("Masukkan URL Google Sheets");
      return;
    }

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

      const { data: platforms } = await supabase.from("platform").select("*");
      const { data: contentTypes } = await supabase.from("jenis_konten").select("*");

      const preview = {
        fileName: "Google Sheets",
        totalRows: lines.length - 1,
        headers: lines[0],
        sampleRows: lines.slice(1, 4).map(line => line.split(",")),
        validationResults: {
          validRows: 0,
          invalidRows: 0,
          errors: [] as string[]
        }
      };

      // Validate ALL data (not just sample)
      let validCount = 0;
      let invalidCount = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        if (values.length < headers.length) {
          errors.push(`Baris ${i}: Data tidak lengkap (${values.length} kolom, dibutuhkan ${headers.length})`);
          invalidCount++;
          continue;
        }

        const platformName = values[headers.indexOf("platform")]?.trim().toLowerCase();
        const contentTypeName = values[headers.indexOf("content_type")]?.trim().toLowerCase();
        
        const platform = platforms?.find((p) => p.kode_platform.toLowerCase() === platformName);
        const contentType = contentTypes?.find((c) => c.kode_jenis_konten.toLowerCase() === contentTypeName);

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
        errors: errors.slice(0, 10) // Show first 10 errors
      };

      setPreviewData(preview);
      setPreviewSource("sheets");
      setShowPreview(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Google Sheets Import (after preview confirmation)
  const handleSheetsImport = async () => {
    if (!sheetsUrl) {
      toast.error("Masukkan URL Google Sheets");
      return;
    }
    
    if (!selectedProject?.id) {
      toast.error("Silakan pilih project terlebih dahulu");
      return;
    }

    setUploading(true);
    setShowPreview(false);
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

      // Deactivate all existing datasets first
      await supabase
        .from("dataset")
        .update({ dataset_aktif: false })
        .eq("id_proyek", selectedProject.id);

      // Create new dataset and set as active
      const { data: dataset, error: datasetError } = await supabase
        .from("dataset")
        .insert({
          id_proyek: selectedProject.id,
          nama_dataset: `Google Sheets - ${new Date().toLocaleDateString()}`,
          jenis_sumber_dataset: "google_sheet",
          lokasi_berkas_dataset: sheetsUrl,
          jumlah_baris_dataset: lines.length - 1,
          dataset_aktif: true,
        })
        .select()
        .single();

      if (datasetError || !dataset) throw new Error(`Gagal membuat dataset: ${datasetError?.message || "Unknown error"}`);

      const { data: platforms, error: platformsError } = await supabase
        .from("platform")
        .select("*")
        .eq("platform_aktif", true);
        
      const { data: contentTypes, error: contentTypesError } = await supabase
        .from("jenis_konten")
        .select("*")
        .eq("jenis_konten_aktif", true);

      if (platformsError || !platforms || platforms.length === 0) {
        throw new Error("Gagal memuat data platform");
      }
      if (contentTypesError || !contentTypes || contentTypes.length === 0) {
        throw new Error("Gagal memuat data jenis konten");
      }

      const posts = [];
      const errors = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        if (values.length < headers.length) {
          errors.push(`Baris ${i}: Data tidak lengkap`);
          continue;
        }

        const platform = platforms?.find((p) => p.kode_platform.toLowerCase() === values[headers.indexOf("platform")]?.trim().toLowerCase());
        const contentType = contentTypes?.find((c) => c.kode_jenis_konten.toLowerCase() === values[headers.indexOf("content_type")]?.trim().toLowerCase());
        
        if (!platform?.id) {
          errors.push(`Baris ${i}: Platform tidak ditemukan`);
          continue;
        }
        if (!contentType?.id) {
          errors.push(`Baris ${i}: Content type tidak ditemukan`);
          continue;
        }

        posts.push({
          id_proyek: selectedProject.id,
          id_dataset: dataset.id,
          id_platform: platform.id,
          id_jenis_konten: contentType.id,
          kode_postingan: values[headers.indexOf("post_id")]?.trim() || `POST-${i}`,
          waktu_diposting: new Date(values[headers.indexOf("posted_at")]?.trim()).toISOString(),
          jumlah_reach: parseInt(values[headers.indexOf("reach")]) || 0,
          jumlah_likes: parseInt(values[headers.indexOf("likes")]) || 0,
          jumlah_komentar: parseInt(values[headers.indexOf("comments")]) || 0,
          jumlah_shares: parseInt(values[headers.indexOf("shares")]) || 0,
          jumlah_saved: parseInt(values[headers.indexOf("saved")]) || 0,
          jumlah_views: parseInt(values[headers.indexOf("views")]) || 0,
          jumlah_followers: parseInt(values[headers.indexOf("followers")]) || 0,
          teks_caption: values[headers.indexOf("caption")]?.trim() || "",
        });
      }

      if (posts.length === 0) {
        throw new Error("Tidak ada data valid yang bisa diimport dari Google Sheets");
      }

      const { error: postsError } = await supabase.from("postingan").insert(posts);
      if (postsError) {
        console.error("Error inserting posts from sheets:", postsError);
        throw new Error(`Gagal menyimpan data: ${postsError.message}`);
      }
      
      await supabase.from("log_impor").insert({
        id_dataset: dataset.id,
        status_impor: "success",
        pesan: `Imported ${posts.length} posts from Google Sheets`,
        jumlah_baris_tidak_valid: errors.length
      });
      
      toast.success(`Berhasil import ${posts.length} posts dari Google Sheets!${errors.length > 0 ? ` (${errors.length} baris dilewati)` : ""}`);
      await refreshDatasets();
      setSheetsUrl("");
    } catch (error: any) {
      console.error("Google Sheets import error:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const generateSamplePostsForDataset = async (datasetId: string, projectId: string) => {
    // Get platform and content type IDs
    const { data: platforms, error: platformsError } = await supabase
      .from("platform")
      .select("*")
      .eq("platform_aktif", true);

    const { data: contentTypes, error: contentTypesError } = await supabase
      .from("jenis_konten")
      .select("*")
      .eq("jenis_konten_aktif", true);

    if (platformsError) throw new Error(`Gagal memuat platform: ${platformsError.message}`);
    if (contentTypesError) throw new Error(`Gagal memuat jenis konten: ${contentTypesError.message}`);
    if (!platforms || platforms.length === 0) throw new Error("Tidak ada platform aktif yang tersedia");
    if (!contentTypes || contentTypes.length === 0) throw new Error("Tidak ada jenis konten aktif yang tersedia");

    // Generate sample posts
    const samplePosts: any[] = [];
    const startDate = new Date("2025-04-28");
    const endDate = new Date("2025-06-25");

    for (let i = 1; i <= 50; i++) {
      const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
      const randomHour = Math.floor(Math.random() * 24);
      randomDate.setHours(randomHour, Math.floor(Math.random() * 60), 0, 0);

      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

      if (!platform?.id || !contentType?.id) {
        console.error("Invalid platform or content type at index", i);
        continue;
      }

      const reach = Math.floor(Math.random() * 9200) + 800;
      const views = reach + Math.floor(Math.random() * 1000);
      const likes = Math.floor(Math.random() * 750) + 50;
      const comments = Math.floor(Math.random() * 98) + 2;
      const shares = Math.floor(Math.random() * 80);
      const saved = Math.floor(Math.random() * 80);
      const followers = Math.floor(Math.random() * 200) + 700;

      samplePosts.push({
        id_proyek: projectId,
        id_dataset: datasetId,
        id_platform: platform.id,
        id_jenis_konten: contentType.id,
        kode_postingan: `P${String(i).padStart(3, "0")}`,
        waktu_diposting: randomDate.toISOString(),
        teks_caption: `Sample post ${i}`,
        jumlah_likes: likes,
        jumlah_komentar: comments,
        jumlah_shares: shares,
        jumlah_saved: saved,
        jumlah_views: views,
        jumlah_reach: reach,
        jumlah_followers: followers,
      });
    }

    if (samplePosts.length === 0) {
      throw new Error("Gagal membuat data sample. Tidak ada postingan yang valid.");
    }

    const { error: postsError } = await supabase.from("postingan").insert(samplePosts);

    if (postsError) {
      console.error("Error inserting sample posts:", postsError);
      throw new Error(`Gagal menyimpan data sample: ${postsError.message}`);
    }

    await supabase.from("log_impor").insert({
      id_dataset: datasetId,
      status_impor: "success",
      pesan: "Sample data generated successfully",
      jumlah_baris_tidak_valid: 0,
    });
  };

  const handleUseSampleData = async () => {
    if (!selectedProject?.id) {
      toast.error("Silakan pilih project terlebih dahulu");
      return;
    }

    setUploading(true);

    try {
      // Check if sample dataset already exists
      const { data: existingSample } = await supabase
        .from("dataset")
        .select("*")
        .eq("id_proyek", selectedProject.id)
        .eq("jenis_sumber_dataset", "sample")
        .maybeSingle();

      if (existingSample) {
        // Jika dataset sample sudah ada tapi belum punya postingan, generate dulu
        const { count, error: countError } = await supabase
          .from("postingan")
          .select("id", { count: "exact", head: true })
          .eq("id_dataset", existingSample.id);

        if (countError) {
          console.error("Error checking existing sample posts:", countError);
        } else if (!count || count === 0) {
          await generateSamplePostsForDataset(existingSample.id, selectedProject.id);
        }

        // Activate existing sample dataset
        await supabase
          .from("dataset")
          .update({ dataset_aktif: false })
          .eq("id_proyek", selectedProject.id);

        await supabase
          .from("dataset")
          .update({ dataset_aktif: true })
          .eq("id", existingSample.id);

        toast.success("Dataset sample berhasil diaktifkan");
        await refreshDatasets();
        navigate("/dashboard");
        return;
      }

      // Create sample dataset
      const { data: newDataset, error: datasetError } = await supabase
        .from("dataset")
        .insert({
          id_proyek: selectedProject.id,
          nama_dataset: "Sample Dataset Mei-Juni 2025",
          jenis_sumber_dataset: "sample",
          dataset_aktif: true,
          jumlah_baris_dataset: 50,
        })
        .select()
        .single();

      if (datasetError || !newDataset) throw datasetError || new Error("Gagal membuat dataset sample");

      // Deactivate other datasets
      await supabase
        .from("dataset")
        .update({ dataset_aktif: false })
        .eq("id_proyek", selectedProject.id)
        .neq("id", newDataset.id);

      await generateSamplePostsForDataset(newDataset.id, selectedProject.id);

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
    if (!selectedProject?.id) {
      toast.error("Silakan pilih project terlebih dahulu");
      return;
    }

    try {
      await supabase.from("dataset").update({ dataset_aktif: false }).eq("id_proyek", selectedProject.id);
      await supabase.from("dataset").update({ dataset_aktif: true }).eq("id", datasetId);
      toast.success("Dataset aktif berhasil diubah");
      await refreshDatasets();
    } catch (error: any) {
      console.error("Error setting active dataset:", error);
      toast.error(`Gagal mengubah dataset aktif: ${error.message}`);
    }
  };

  const handleDeleteDataset = async () => {
    if (!datasetToDelete || !selectedProject?.id) {
      toast.error("Data tidak valid");
      return;
    }

    try {
      setUploading(true);
      
      // Delete related posts first
      const { error: postsError } = await supabase
        .from("postingan")
        .delete()
        .eq("id_dataset", datasetToDelete);
      
      if (postsError) {
        console.error("Error deleting posts:", postsError);
      }
      
      // Delete import logs
      const { error: logsError } = await supabase
        .from("log_impor")
        .delete()
        .eq("id_dataset", datasetToDelete);
      
      if (logsError) {
        console.error("Error deleting logs:", logsError);
      }
      
      // Delete dataset
      const { error: datasetError } = await supabase
        .from("dataset")
        .delete()
        .eq("id", datasetToDelete);
      
      if (datasetError) throw datasetError;
      
      toast.success("Dataset berhasil dihapus");
      await refreshDatasets();
      setShowDeleteDialog(false);
      setDatasetToDelete(null);
    } catch (error: any) {
      console.error("Error deleting dataset:", error);
      toast.error(`Gagal menghapus dataset: ${error.message}`);
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
        .from("postingan")
        .select(`
          *,
          platform:id_platform(kode_platform),
          jenis_konten:id_jenis_konten(kode_jenis_konten)
        `)
        .eq("id_dataset", datasetId);

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
            Kelola dataset CSV untuk project <strong>{selectedProject.nama_proyek}</strong>
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
                className="w-full gap-2" 
                onClick={handlePreviewSheets}
                disabled={uploading || !sheetsUrl}
              >
                <Eye className="h-4 w-4" />
                {uploading ? "Memuat..." : "Preview Data"}
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
                      <TableCell className="font-medium">{dataset.nama_dataset}</TableCell>
                      <TableCell>
                        {new Date(dataset.created_at).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>{dataset.jumlah_baris_dataset}</TableCell>
                      <TableCell>
                        {dataset.dataset_aktif ? (
                          <Badge className="bg-success">Aktif</Badge>
                        ) : (
                          <Badge variant="outline">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!dataset.dataset_aktif && (
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
                            onClick={() => handleExportDataset(dataset.id, dataset.nama_dataset)}
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
          <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Preview Data Import</DialogTitle>
              <DialogDescription>
                Periksa data dan validasi sebelum mengimport
              </DialogDescription>
            </DialogHeader>
            
            {previewData && (
              <div className="space-y-4 overflow-y-auto flex-1">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground mb-1">Source</p>
                      <p className="font-semibold text-lg">{previewData.fileName}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground mb-1">Total Baris</p>
                      <p className="font-semibold text-lg">{previewData.totalRows.toLocaleString('id-ID')}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground mb-1">Status Validasi</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className="bg-success text-success-foreground hover:bg-success/80">
                          {previewData.validationResults.validRows} Valid
                        </Badge>
                        {previewData.validationResults.invalidRows > 0 && (
                          <Badge variant="destructive">
                            {previewData.validationResults.invalidRows} Invalid
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Error Alert */}
                {previewData.validationResults.invalidRows > 0 && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-semibold mb-2">
                        Ditemukan {previewData.validationResults.invalidRows} baris bermasalah
                      </p>
                      <ScrollArea className="h-24 pr-4">
                        <ul className="space-y-1.5">
                          {previewData.validationResults.errors.map((err: string, idx: number) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                              <span className="text-destructive mt-0.5">•</span>
                              <span className="flex-1">{err}</span>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                      <p className="text-xs mt-3 font-medium opacity-90">
                        💡 Baris bermasalah akan dilewati saat import
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Sample Data Table */}
                <div className="border rounded-lg overflow-hidden bg-card">
                  <div className="px-4 py-3 bg-muted/50 border-b">
                    <p className="text-sm font-semibold">Sample Data (3 baris pertama)</p>
                  </div>
                  <ScrollArea className="w-full">
                    <div className="min-w-max">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            {previewData.headers.split(",").map((header: string, idx: number) => {
                              const cleanHeader = header.trim();
                              const headerMap: Record<string, string> = {
                                'platform': 'Platform',
                                'content_type': 'Content Type',
                                'post_id': 'Post ID',
                                'posted_at': 'Posted At',
                                'reach': 'Reach',
                                'likes': 'Likes',
                                'comments': 'Comments',
                                'shares': 'Shares',
                                'saved': 'Saved',
                                'views': 'Views',
                                'followers': 'Followers',
                                'caption': 'Caption'
                              };
                              return (
                                <TableHead key={idx} className="font-semibold whitespace-nowrap">
                                  {headerMap[cleanHeader.toLowerCase()] || cleanHeader}
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.sampleRows.map((row: string[], rowIdx: number) => (
                            <TableRow key={rowIdx} className="hover:bg-muted/30">
                              {row.map((cell: string, cellIdx: number) => {
                                const header = previewData.headers.split(",")[cellIdx]?.trim().toLowerCase();
                                let formattedCell = cell;
                                
                                // Format numbers
                                if (['reach', 'likes', 'comments', 'shares', 'saved', 'views', 'followers'].includes(header)) {
                                  const num = parseInt(cell);
                                  formattedCell = !isNaN(num) ? num.toLocaleString('id-ID') : cell;
                                }
                                
                                // Format dates
                                if (header === 'posted_at') {
                                  try {
                                    const date = new Date(cell);
                                    if (!isNaN(date.getTime())) {
                                      formattedCell = date.toLocaleString('id-ID', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    }
                                  } catch (e) {
                                    // Keep original if parsing fails
                                  }
                                }
                                
                                // Truncate caption
                                if (header === 'caption' && formattedCell.length > 50) {
                                  formattedCell = formattedCell.substring(0, 50) + '...';
                                }
                                
                                return (
                                  <TableCell 
                                    key={cellIdx} 
                                    className={`whitespace-nowrap ${
                                      ['reach', 'likes', 'comments', 'shares', 'saved', 'views', 'followers'].includes(header) 
                                        ? 'text-right font-mono text-sm' 
                                        : ''
                                    }`}
                                  >
                                    {formattedCell}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Batal
              </Button>
              <Button 
                onClick={previewSource === "csv" ? handleCsvUpload : handleSheetsImport} 
                disabled={uploading || (previewData?.validationResults.validRows === 0)}
              >
                {uploading ? "Mengimport..." : `Import ${previewData?.validationResults.validRows || 0} Data Valid`}
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
