import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, Clock, Star } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Question {
  id: string;
  id_pengguna: string;
  id_proyek: string;
  judul_pertanyaan: string;
  isi_pertanyaan: string;
  jawaban: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  rating: number | null;
  komentar_rating: string | null;
  rating_at: string | null;
  proyek?: { nama_proyek: string };
  profil?: { nama_lengkap: string };
}

const BantuanAdmin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"semua" | "menunggu" | "dijawab">("semua");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && profile) {
      if (profile.peran !== "admin") {
        toast.error("Akses ditolak. Hanya admin yang dapat mengakses halaman ini.");
        navigate("/dashboard");
        return;
      }
      fetchQuestions();
      subscribeToChanges();
    }
  }, [user, profile, navigate]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pertanyaan")
        .select(`
          *,
          proyek:id_proyek(nama_proyek),
          profil:id_pengguna(nama_lengkap)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Gagal memuat pertanyaan");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel("pertanyaan_admin_changes")
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
    setAnswer(question.jawaban || "");
  };

  const handleSubmitAnswer = async () => {
    if (!selectedQuestion || !answer.trim()) {
      toast.error("Jawaban tidak boleh kosong");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("pertanyaan")
        .update({
          jawaban: answer.trim(),
          status: "dijawab",
          dijawab_oleh: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedQuestion.id);

      if (error) throw error;

      toast.success("Jawaban berhasil dikirim");
      setSelectedQuestion(null);
      setAnswer("");
      fetchQuestions();
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

  const pendingCount = questions.filter((q) => q.status === "menunggu").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kelola Pertanyaan & Jawaban</h1>
          <p className="text-muted-foreground mt-2">
            Kelola dan jawab pertanyaan dari pengguna
          </p>
        </div>

        {pendingCount > 0 && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-warning" />
                <p className="font-medium text-foreground">
                  Ada {pendingCount} pertanyaan menunggu dijawab
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
                  Menunggu ({questions.filter(q => q.status === "menunggu").length})
                </Button>
                <Button
                  size="sm"
                  variant={filter === "dijawab" ? "default" : "outline"}
                  onClick={() => setFilter("dijawab")}
                >
                  Dijawab ({questions.filter(q => q.status === "dijawab").length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Memuat...</p>
            ) : filteredQuestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {filter === "semua" ? "Belum ada pertanyaan" : `Tidak ada pertanyaan dengan status "${filter}"`}
              </p>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map((q) => (
                  <Card
                    key={q.id}
                    className="border-l-4 cursor-pointer hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: q.status === "dijawab" ? "hsl(var(--success))" : "hsl(var(--warning))" }}
                    onClick={() => handleOpenDialog(q)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{q.judul_pertanyaan}</CardTitle>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-foreground">Ditanya oleh:</span>
                              <span className="text-foreground font-semibold">{q.profil?.nama_lengkap || 'Unknown'}</span>
                            </div>
                            <span>•</span>
                            <span>{format(new Date(q.created_at), "dd MMM yyyy HH:mm", { locale: id })}</span>
                            {q.proyek && (
                              <>
                                <span>•</span>
                                <span className="font-medium">{q.proyek.nama_proyek}</span>
                              </>
                            )}
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
                      {q.rating && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= q.rating!
                                    ? "fill-primary text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">Rating: {q.rating}/5</span>
                        </div>
                      )}
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
              Ditanya oleh {selectedQuestion?.profil?.nama_lengkap || 'Unknown'} pada{" "}
              {selectedQuestion && format(new Date(selectedQuestion.created_at), "dd MMM yyyy HH:mm", { locale: id })}
              {selectedQuestion?.proyek && ` • Project: ${selectedQuestion.proyek.nama_proyek}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Pertanyaan:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg">
                {selectedQuestion?.isi_pertanyaan}
              </p>
            </div>
            
            {selectedQuestion?.rating && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Rating dari {selectedQuestion?.profil?.nama_lengkap || 'Unknown'}:</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= selectedQuestion.rating!
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">({selectedQuestion.rating}/5)</span>
                </div>
                {selectedQuestion.komentar_rating && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{selectedQuestion.komentar_rating}"</p>
                )}
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Jawaban Admin:</p>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Tulis jawaban Anda di sini..."
                rows={8}
                maxLength={5000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
              Batal
            </Button>
            <Button onClick={handleSubmitAnswer} disabled={submitting}>
              {submitting 
                ? (selectedQuestion?.jawaban ? "Menyimpan..." : "Mengirim...") 
                : (selectedQuestion?.jawaban ? "Edit Jawaban" : "Kirim Jawaban")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default BantuanAdmin;
