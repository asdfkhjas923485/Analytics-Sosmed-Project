import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";

const CaptionGenerator = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [deskripsi, setDeskripsi] = useState("");
  const [gayaBahasa, setGayaBahasa] = useState("friendly");
  const [customStyle, setCustomStyle] = useState("");
  const [panjangCaption, setPanjangCaption] = useState("sedang");
  const [opsiHashtag, setOpsiHashtag] = useState("seperlunya");
  const [opsiEmoji, setOpsiEmoji] = useState("sedikit");
  const [tujuanCaption, setTujuanCaption] = useState("");
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!deskripsi.trim()) {
      toast({
        title: "Deskripsi diperlukan",
        description: "Silakan isi deskripsi konten terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setGeneratedCaptions([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-caption', {
        body: {
          deskripsi: deskripsi.trim(),
          gaya_bahasa: gayaBahasa,
          custom_style: customStyle.trim(),
          panjang_caption: panjangCaption,
          opsi_hashtag: opsiHashtag,
          opsi_emoji: opsiEmoji,
          tujuan_caption: tujuanCaption,
        }
      });

      if (error) throw error;

      if (data?.captions && Array.isArray(data.captions)) {
        setGeneratedCaptions(data.captions);
        toast({
          title: "Caption berhasil dibuat!",
          description: `${data.captions.length} caption siap digunakan`,
        });
      } else {
        throw new Error('Format response tidak valid');
      }
    } catch (error) {
      console.error('Error generating caption:', error);
      toast({
        title: "Gagal generate caption",
        description: error instanceof Error ? error.message : "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (caption: string, index: number) => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedIndex(index);
      toast({
        title: "Caption disalin",
        description: "Caption berhasil disalin ke clipboard",
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast({
        title: "Gagal menyalin",
        description: "Tidak dapat menyalin caption",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Caption Generator</h1>
          <p className="text-muted-foreground mt-2">
            Generate caption Instagram yang menarik dengan bantuan AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Caption</CardTitle>
            <CardDescription>
              Isi form di bawah untuk menghasilkan caption yang sesuai dengan kebutuhan Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deskripsi Konten */}
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi Konten *</Label>
              <Textarea
                id="deskripsi"
                placeholder="Contoh: video behind the scenes produksi, promo diskon 20% untuk follower baru, tips skincare routine untuk kulit berminyak, dll."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="min-h-[100px]"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {deskripsi.length}/1000 karakter
              </p>
            </div>

            {/* Gaya Bahasa */}
            <div className="space-y-2">
              <Label htmlFor="gaya">Gaya Bahasa</Label>
              <Select value={gayaBahasa} onValueChange={setGayaBahasa}>
                <SelectTrigger id="gaya">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="confident">Confident</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="simplified">Simplified</SelectItem>
                  <SelectItem value="vivid">Vivid</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                  <SelectItem value="persuasive">Persuasive</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Style (jika dipilih) */}
            {gayaBahasa === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customStyle">Keterangan Custom Style</Label>
                <Textarea
                  id="customStyle"
                  placeholder="Contoh: campur Indo-Inggris ala Gen Z, santai tapi tetap sopan"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}

            {/* Panjang Caption */}
            <div className="space-y-2">
              <Label>Panjang Caption</Label>
              <RadioGroup value={panjangCaption} onValueChange={setPanjangCaption}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pendek" id="pendek" />
                  <Label htmlFor="pendek" className="font-normal cursor-pointer">
                    Pendek (1-2 kalimat)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sedang" id="sedang" />
                  <Label htmlFor="sedang" className="font-normal cursor-pointer">
                    Sedang (3-5 kalimat)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="panjang" id="panjang" />
                  <Label htmlFor="panjang" className="font-normal cursor-pointer">
                    Panjang (story-like, 6-10 kalimat)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Penggunaan Hashtag */}
            <div className="space-y-2">
              <Label>Penggunaan Hashtag</Label>
              <RadioGroup value={opsiHashtag} onValueChange={setOpsiHashtag}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tanpa" id="tanpa-hashtag" />
                  <Label htmlFor="tanpa-hashtag" className="font-normal cursor-pointer">
                    Tanpa hashtag
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="seperlunya" id="seperlunya" />
                  <Label htmlFor="seperlunya" className="font-normal cursor-pointer">
                    Hashtag seperlunya (3-5 relevan)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="banyak" id="banyak-hashtag" />
                  <Label htmlFor="banyak-hashtag" className="font-normal cursor-pointer">
                    Hashtag lebih banyak (10-15 relevan)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Penggunaan Emoji */}
            <div className="space-y-2">
              <Label>Penggunaan Emoji</Label>
              <RadioGroup value={opsiEmoji} onValueChange={setOpsiEmoji}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tanpa" id="tanpa-emoji" />
                  <Label htmlFor="tanpa-emoji" className="font-normal cursor-pointer">
                    Tanpa emoji
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sedikit" id="sedikit-emoji" />
                  <Label htmlFor="sedikit-emoji" className="font-normal cursor-pointer">
                    Sedikit emoji (2-4 emoji)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="banyak" id="banyak-emoji" />
                  <Label htmlFor="banyak-emoji" className="font-normal cursor-pointer">
                    Banyak emoji (5-10 emoji)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Tujuan Caption */}
            <div className="space-y-2">
              <Label htmlFor="tujuan">Tujuan Caption (Opsional)</Label>
              <Select value={tujuanCaption} onValueChange={setTujuanCaption}>
                <SelectTrigger id="tujuan">
                  <SelectValue placeholder="Pilih tujuan caption" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada preferensi</SelectItem>
                  <SelectItem value="awareness">Awareness / Branding</SelectItem>
                  <SelectItem value="interaksi">Mengajak Interaksi</SelectItem>
                  <SelectItem value="traffic">Traffic ke Link</SelectItem>
                  <SelectItem value="konversi">Konversi / Jualan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tombol Generate */}
            <Button 
              onClick={handleGenerate} 
              disabled={isLoading || !deskripsi.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Caption dengan AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Hasil Caption */}
        {generatedCaptions.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Hasil Caption</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Silakan cek kembali sebelum diposting. Angka promo, harga, atau klaim sensitif tetap harus disesuaikan manual.
              </p>
            </div>
            
            {generatedCaptions.map((caption, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-base">Opsi {index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="whitespace-pre-wrap text-sm">{caption}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(caption, index)}
                      className="flex-1"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Salin
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CaptionGenerator;
