import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";

interface SaveFilterDialogProps {
  halaman: string;
  filterValues: any;
}

export const SaveFilterDialog = ({ halaman, filterValues }: SaveFilterDialogProps) => {
  const { selectedProject } = useApp();
  const [open, setOpen] = useState(false);
  const [filterName, setFilterName] = useState("");

  const handleSave = async () => {
    if (!selectedProject) {
      toast.error("Pilih project terlebih dahulu");
      return;
    }

    if (!filterName.trim()) {
      toast.error("Silakan isi nama filter");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("User tidak terautentikasi");
        return;
      }

      const { error } = await supabase
        .from("filter_tersimpan")
        .insert([
          {
            id_proyek: selectedProject.id,
            id_pengguna: userData.user.id,
            halaman,
            nama_filter: filterName.trim(),
            nilai_filter_json: filterValues,
          },
        ]);

      if (error) throw error;

      toast.success("Filter berhasil disimpan");
      setFilterName("");
      setOpen(false);
    } catch (error) {
      console.error("Error saving filter:", error);
      toast.error("Gagal menyimpan filter");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save Filter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Simpan Konfigurasi Filter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nama Filter</Label>
            <Input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="e.g., Filter Mei 2025"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
