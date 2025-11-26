import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditQuestionDialogProps {
  question: {
    id: string;
    judul_pertanyaan: string;
    isi_pertanyaan: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditQuestionDialog = ({
  question,
  open,
  onOpenChange,
  onSuccess,
}: EditQuestionDialogProps) => {
  const [judul, setJudul] = useState(question.judul_pertanyaan);
  const [isi, setIsi] = useState(question.isi_pertanyaan);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!judul.trim() || !isi.trim()) {
      toast.error("Judul dan isi pertanyaan harus diisi");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("pertanyaan")
        .update({
          judul_pertanyaan: judul.trim(),
          isi_pertanyaan: isi.trim(),
        })
        .eq("id", question.id);

      if (error) throw error;

      toast.success("Pertanyaan berhasil diperbarui");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating question:", error);
      toast.error("Gagal memperbarui pertanyaan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Pertanyaan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="judul">Judul Pertanyaan</Label>
            <Input
              id="judul"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Masukkan judul pertanyaan"
              required
            />
          </div>
          <div>
            <Label htmlFor="isi">Detail Pertanyaan</Label>
            <Textarea
              id="isi"
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              placeholder="Jelaskan pertanyaan Anda secara detail"
              rows={5}
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
