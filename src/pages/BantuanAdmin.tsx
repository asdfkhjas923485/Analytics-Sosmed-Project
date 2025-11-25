import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, Clock, Send } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Question {
  id: string;
  judul_pertanyaan: string;
  isi_pertanyaan: string;
  jawaban: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  id_pengguna: string;
  id_proyek: string;
  profil?: {
    nama_lengkap: string;
  };
  proyek?: {
    nama_proyek: string;
  };
}

const BantuanAdmin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [jawaban, setJawaban] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"semua" | "menunggu" | "dijawab">("menunggu");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && user && profile?.peran !== "admin") {
      toast.error("Akses ditolak. Halaman ini hanya untuk admin.");
      navigate("/dashboard");
    }
  }, [user, authLoading, profile, navigate]);

  useEffect(() => {
    if (user && profile?.peran === "admin") {
      fetchQuestions();
      subscribeToChanges();
    }
  }, [user, profile]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pertanyaan")
        .select(`
          *,
          profil:id_pengguna (nama_lengkap),
          proyek:id_proyek (nama_proyek)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions(data as any || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Gagal memuat pertanyaan");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel("admin_pertanyaan_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pertanyaan",
        },
        () => {
          fetchQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleOpenDialog = (question: Question) => {
    setSelectedQuestion(question);
    setJawaban(question.jawaban || "");
  };

  const handleSubmitAnswer = async () => {
    if (!selectedQuestion || !jawaban.trim()) {
      toast.error("Jawaban tidak boleh kosong");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("pertanyaan")
        .update({
          jawaban: jawaban,
          status: "dijawab",
          dijawab_oleh: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedQuestion.id);

      if (error) throw error;

      toast.success("Jawaban berhasil dikirim");
      setSelectedQuestion(null);
      setJawaban("");
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Gagal mengirim jawaban");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (filter === "semua") return true;
    return q.status === filter;
  });

  const menungguCount = questions.filter((q) => q.status === "menunggu").length;

  if (profile?.peran !== "admin") {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kelola Pertanyaan</h1>
            <p className="text-muted-foreground mt-2">Jawab pertanyaan dari pengguna</p>
          </div>
          {menungguCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {menungguCount} Menunggu
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Daftar Pertanyaan</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === "semua" ? "default" : "outline"}
                  onClick={() => setFilter("semua")}
                >
                  Semua ({questions.length})
                </Button>
                <Button
                  size="sm"
                  variant={filter === "menunggu" ? "default" : "outline"}
                  onClick={() => setFilter("menunggu")}
                >
                  Menunggu ({menungguCount})
                </Button>
                <Button
                  size="sm"
                  variant={filter === "dijawab" ? "default" : "outline"}
                  onClick={() => setFilter("dijawab")}
                >
                  Dijawab ({questions.filter((q) => q.status === "dijawab").length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Memuat...</p>
            ) : filteredQuestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Tidak ada pertanyaan {filter !== "semua" && `dengan status "${filter}"`}
              </p>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map((q) => (
                  <Card
                    key={q.id}
                    className="border-l-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{
                      borderLeftColor:
                        q.status === "dijawab" ? "hsl(var(--success))" : "hsl(var(--warning))",
                    }}
                    onClick={() => handleOpenDialog(q)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{q.judul_pertanyaan}</CardTitle>
                          <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                            <span>User: {q.profil?.nama_lengkap}</span>
                            <span>•</span>
                            <span>Project: {q.proyek?.nama_proyek}</span>
                            <span>•</span>
                            <span>{format(new Date(q.created_at), "dd MMM yyyy HH:mm", { locale: id })}</span>
                          </div>
                        </div>
                        <Badge variant={q.status === "dijawab" ? "default" : "secondary"}>
                          {q.status === "dijawab" ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Dijawab
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Menunggu
                            </>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{q.isi_pertanyaan}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuestion?.judul_pertanyaan}</DialogTitle>
            <DialogDescription>
              Dari: {selectedQuestion?.profil?.nama_lengkap} • Project: {selectedQuestion?.proyek?.nama_proyek}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Pertanyaan:</Label>
              <p className="mt-2 text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                {selectedQuestion?.isi_pertanyaan}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Dikirim: {selectedQuestion && format(new Date(selectedQuestion.created_at), "dd MMM yyyy HH:mm", { locale: id })}
              </p>
            </div>
            <div>
              <Label htmlFor="jawaban">Jawaban Anda:</Label>
              <Textarea
                id="jawaban"
                value={jawaban}
                onChange={(e) => setJawaban(e.target.value)}
                placeholder="Tulis jawaban untuk pertanyaan ini..."
                rows={6}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
                Batal
              </Button>
              <Button onClick={handleSubmitAnswer} disabled={submitting || !jawaban.trim()}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Mengirim..." : "Kirim Jawaban"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default BantuanAdmin;
