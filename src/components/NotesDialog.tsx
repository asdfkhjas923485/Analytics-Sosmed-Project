import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { format } from "date-fns";

interface NotesDialogProps {
  scope: 'global' | 'post';
  scopeKey?: string; // post id if scope is 'post'
}

export const NotesDialog = ({ scope, scopeKey }: NotesDialogProps) => {
  const { selectedProject, activeDataset } = useApp();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchNotes();
    }
  }, [open, selectedProject, activeDataset, scopeKey]);

  const fetchNotes = async () => {
    if (!selectedProject || !activeDataset) return;

    setLoading(true);
    try {
      let query = supabase
        .from("catatan")
        .select("*")
        .eq("id_proyek", selectedProject.id)
        .eq("id_dataset", activeDataset.id)
        .eq("jenis_scope", scope)
        .order("created_at", { ascending: false });

      if (scope === 'post' && scopeKey) {
        query = query.eq("kunci_scope", scopeKey);
      } else if (scope === 'global') {
        query = query.is("kunci_scope", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Gagal memuat catatan");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedProject || !activeDataset) {
      toast.error("Pilih project dan dataset terlebih dahulu");
      return;
    }

    if (!newNote.trim()) {
      toast.error("Catatan tidak boleh kosong");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("User tidak terautentikasi");
        return;
      }

      const { error } = await supabase
        .from("catatan")
        .insert([
          {
            id_proyek: selectedProject.id,
            id_dataset: activeDataset.id,
            id_pengguna: userData.user.id,
            jenis_scope: scope,
            kunci_scope: scope === 'post' ? scopeKey : null,
            isi_catatan: newNote.trim(),
          },
        ]);

      if (error) throw error;

      toast.success("Catatan berhasil ditambahkan");
      setNewNote("");
      fetchNotes();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Gagal menambahkan catatan");
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Yakin ingin menghapus catatan ini?")) return;

    try {
      const { error } = await supabase.from("catatan").delete().eq("id", id);
      if (error) throw error;

      toast.success("Catatan berhasil dihapus");
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Gagal menghapus catatan");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          {scope === 'global' ? 'Project Notes' : 'Post Notes'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {scope === 'global' ? 'Catatan Project' : 'Catatan Post'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new note */}
          <div>
            <Label>Tambah Catatan Baru</Label>
            <div className="flex space-x-2 mt-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Tulis catatan..."
                rows={3}
                className="flex-1"
              />
              <Button onClick={handleAddNote} size="sm" className="self-end">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Existing notes */}
          <div>
            <Label>Catatan Tersimpan</Label>
            <ScrollArea className="h-[300px] mt-2 border rounded-md p-4">
              {loading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : notes.length === 0 ? (
                <div className="text-center text-muted-foreground">Belum ada catatan</div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="p-3 bg-muted rounded-md space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.isi_catatan}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteNote(note.id)}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "dd MMM yyyy HH:mm")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
