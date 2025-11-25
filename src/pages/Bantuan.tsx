import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, Clock, Star } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import RatingDialog from "@/components/RatingDialog";

interface Question {
  id: string;
  judul_pertanyaan: string;
  isi_pertanyaan: string;
  jawaban: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  rating: number | null;
  komentar_rating: string | null;
  rating_at: string | null;
}

const Bantuan = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedProject } = useApp();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [judul, setJudul] = useState("");
  const [pertanyaan, setPertanyaan] = useState("");
  const [filter, setFilter] = useState<"semua" | "menunggu" | "dijawab">("semua");
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedQuestionForRating, setSelectedQuestionForRating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && selectedProject) {
      fetchQuestions();
      subscribeToChanges();
    }
  }, [user, selectedProject]);

  const fetchQuestions = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pertanyaan")
        .select("*")
        .eq("id_proyek", selectedProject.id)
        .eq("id_pengguna", user?.id)
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
    if (!selectedProject) return;

    const channel = supabase
      .channel("pertanyaan_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pertanyaan",
          filter: `id_proyek=eq.${selectedProject.id}`,
        },
        (payload) => {
          setQuestions((prev) =>
            prev.map((q) => (q.id === payload.new.id ? (payload.new as Question) : q))
          );
          if ((payload.new as Question).status === "dijawab" && (payload.old as Question).status === "menunggu") {
            toast.success("Pertanyaan Anda telah dijawab!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!judul.trim() || !pertanyaan.trim()) {
      toast.error("Judul dan pertanyaan harus diisi");
      return;
    }

    if (!selectedProject) {
      toast.error("Pilih project terlebih dahulu");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("pertanyaan").insert({
        id_pengguna: user?.id,
        id_proyek: selectedProject.id,
        judul_pertanyaan: judul,
        isi_pertanyaan: pertanyaan,
        status: "menunggu",
      });

      if (error) throw error;

      toast.success("Pertanyaan berhasil dikirim");
      setJudul("");
      setPertanyaan("");
    } catch (error) {
      console.error("Error submitting question:", error);
      toast.error("Gagal mengirim pertanyaan");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (filter === "semua") return true;
    return q.status === filter;
  });

  if (!selectedProject) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-foreground">Silakan pilih project terlebih dahulu</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bantuan & Pertanyaan</h1>
          <p className="text-muted-foreground mt-2">Ajukan pertanyaan dan dapatkan bantuan dari admin</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ajukan Pertanyaan</CardTitle>
            <CardDescription>Tim kami akan menjawab pertanyaan Anda secepatnya</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="judul">Judul Pertanyaan</Label>
                <Input
                  id="judul"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Bagaimana cara import data CSV?"
                  maxLength={200}
                />
              </div>
              <div>
                <Label htmlFor="pertanyaan">Detail Pertanyaan</Label>
                <Textarea
                  id="pertanyaan"
                  value={pertanyaan}
                  onChange={(e) => setPertanyaan(e.target.value)}
                  placeholder="Jelaskan pertanyaan Anda secara detail..."
                  rows={5}
                  maxLength={2000}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {submitting ? "Mengirim..." : "Kirim Pertanyaan"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Riwayat Pertanyaan</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === "semua" ? "default" : "outline"}
                  onClick={() => setFilter("semua")}
                >
                  Semua
                </Button>
                <Button
                  size="sm"
                  variant={filter === "menunggu" ? "default" : "outline"}
                  onClick={() => setFilter("menunggu")}
                >
                  Menunggu
                </Button>
                <Button
                  size="sm"
                  variant={filter === "dijawab" ? "default" : "outline"}
                  onClick={() => setFilter("dijawab")}
                >
                  Dijawab
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
                  <Card key={q.id} className="border-l-4" style={{ borderLeftColor: q.status === "dijawab" ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{q.judul_pertanyaan}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(q.created_at), "dd MMM yyyy HH:mm", { locale: id })}
                          </p>
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
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Pertanyaan:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.isi_pertanyaan}</p>
                      </div>
                      {q.jawaban && (
                        <div className="bg-muted p-4 rounded-lg space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-1">Jawaban Admin:</p>
                            <p className="text-sm whitespace-pre-wrap">{q.jawaban}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Dijawab: {format(new Date(q.updated_at), "dd MMM yyyy HH:mm", { locale: id })}
                            </p>
                          </div>
                          {q.rating ? (
                            <div className="border-t pt-3">
                              <p className="text-sm font-medium mb-1">Rating Anda:</p>
                              <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= q.rating!
                                        ? "fill-primary text-primary"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                              {q.komentar_rating && (
                                <p className="text-sm text-muted-foreground mt-2">{q.komentar_rating}</p>
                              )}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedQuestionForRating(q.id);
                                setRatingDialogOpen(true);
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Beri Rating
                            </Button>
                          )}
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

      <RatingDialog
        questionId={selectedQuestionForRating || ""}
        isOpen={ratingDialogOpen}
        onClose={() => {
          setRatingDialogOpen(false);
          setSelectedQuestionForRating(null);
        }}
        onSuccess={() => {
          fetchQuestions();
        }}
      />
    </AppLayout>
  );
};

export default Bantuan;
