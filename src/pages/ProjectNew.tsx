import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProjectNew = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refreshProjects, setSelectedProject } = useApp();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Nama project harus diisi");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          user_id: user!.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Project berhasil dibuat!");
      await refreshProjects();
      setSelectedProject(data);
      navigate("/import");
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error(error.message || "Gagal membuat project");
    } finally {
      setLoading(false);
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

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Buat Project Baru</h1>
          <p className="text-muted-foreground mt-1">
            Tambahkan UMKM atau project baru untuk dianalisis
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informasi Project</CardTitle>
            <CardDescription>
              Isi detail project/UMKM yang akan Anda analisis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Project *</Label>
                <Input
                  id="name"
                  placeholder="contoh: UMKM Kopi Nusantara"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi (opsional)</Label>
                <Textarea
                  id="description"
                  placeholder="Deskripsi singkat tentang project ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex space-x-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Membuat..." : "Buat Project"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  disabled={loading}
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProjectNew;
