import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const Bantuan = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile } = useAuth();
  const { selectedProject } = useApp();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [judul, setJudul] = useState("");
  const [pertanyaan, setPertanyaan] = useState("");
  const [nama, setNama] = useState("");
  const [filter, setFilter] = useState<"semua" | "menunggu" | "dijawab">("semua");
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedQuestionForRating, setSelectedQuestionForRating] = useState<string | null>(null);

  // Calculate statistics
  const stats = {
    totalTerjawab: questions.filter(q => q.status === "dijawab").length,
    rataRataRating: questions.filter(q => q.rating).length > 0 
      ? (questions.reduce((sum, q) => sum + (q.rating || 0), 0) / questions.filter(q => q.rating).length).toFixed(1)
      : "0",
    waktuResponTercepat: questions
      .filter(q => q.status === "dijawab" && q.jawaban)
      .map(q => {
        const created = new Date(q.created_at).getTime();
        const updated = new Date(q.updated_at).getTime();
        return (updated - created) / (1000 * 60 * 60); // hours
      })
      .sort((a, b) => a - b)[0] || 0
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchQuestions();
      subscribeToChanges();
    }
  }, [user]);

  useEffect(() => {
    if (profile?.nama_lengkap) {
      setNama(profile.nama_lengkap);
    }
  }, [profile]);

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
      .channel("pertanyaan_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pertanyaan",
        },
        (payload) => {
          fetchQuestions(); // Refresh all questions
          if ((payload.new as Question).status === "dijawab" && (payload.old as Question).status === "menunggu") {
            toast.success("Pertanyaan telah dijawab!");
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
    
    if (!nama.trim()) {
      toast.error("Nama harus diisi");
      return;
    }

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
      // Ensure profile exists with name
      const { error: profileError } = await supabase
        .from("profil")
        .upsert({ 
          id: user?.id!,
          nama_lengkap: nama.trim() 
        }, {
          onConflict: "id"
        });

      if (profileError) throw profileError;

      // Insert question
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
      fetchQuestions(); // Refresh list
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


  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bantuan & Pertanyaan</h1>
          <p className="text-muted-foreground mt-2">Ajukan pertanyaan dan dapatkan bantuan dari admin</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Terjawab</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.totalTerjawab}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rata-rata Rating</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-3xl font-bold text-foreground">{stats.rataRataRating}</p>
                    <Star className="h-6 w-6 fill-primary text-primary" />
                  </div>
                </div>
                <Star className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Respon Tercepat</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {stats.waktuResponTercepat > 0 
                      ? stats.waktuResponTercepat < 1 
                        ? `${Math.round(stats.waktuResponTercepat * 60)} menit`
                        : `${Math.round(stats.waktuResponTercepat)} jam`
                      : "-"}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ajukan Pertanyaan</CardTitle>
            <CardDescription>Tim kami akan menjawab pertanyaan Anda secepatnya</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nama">Nama Anda</Label>
                <Input
                  id="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Masukkan nama Anda"
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nama akan ditampilkan di riwayat pertanyaan dan rating
                </p>
              </div>
              <div>
                <Label htmlFor="judul">Judul Pertanyaan</Label>
                <Input
                  id="judul"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Bagaimana cara import data CSV?"
                  maxLength={200}
                  required
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
                  required
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
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{q.judul_pertanyaan}</CardTitle>
                            {q.id_pengguna === user?.id && (
                              <Badge variant="outline" className="text-xs">Pertanyaan Anda</Badge>
                            )}
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
                              <div className="mb-2">
                                <p className="text-sm font-semibold text-foreground">
                                  Rating dari {q.profil?.nama_lengkap || 'Unknown'}:
                                </p>
                                {q.rating_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(q.rating_at), "dd MMM yyyy HH:mm", { locale: id })}
                                  </p>
                                )}
                              </div>
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
                                <span className="text-sm text-muted-foreground ml-1">({q.rating}/5)</span>
                              </div>
                              {q.komentar_rating && (
                                <p className="text-sm text-muted-foreground mt-2 italic">"{q.komentar_rating}"</p>
                              )}
                            </div>
                           ) : q.id_pengguna === user?.id ? (
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
                          ) : (
                            <p className="text-xs text-muted-foreground">Belum ada rating</p>
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
