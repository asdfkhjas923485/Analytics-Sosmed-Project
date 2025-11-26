import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptionRequest {
  deskripsi: string;
  gaya_bahasa: string;
  custom_style?: string;
  panjang_caption: string;
  opsi_hashtag: string;
  opsi_emoji: string;
  tujuan_caption?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CaptionRequest = await req.json();
    console.log('Request received:', body);

    // Validasi
    if (!body.deskripsi || body.deskripsi.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Deskripsi konten wajib diisi' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key tidak dikonfigurasi' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Susun system instruction
    const systemInstruction = `Kamu adalah asisten penulis caption Instagram untuk brand UMKM dan content creator Indonesia. 
Tugas kamu adalah membuat caption yang enak dibaca, natural, tidak kaku, dan relevan dengan deskripsi konten yang diberikan.
Caption harus dalam Bahasa Indonesia yang baik, boleh campur sedikit English jika sesuai dengan gaya yang diminta.
PENTING: Jangan menciptakan angka, harga, promo, atau klaim yang tidak disebutkan dalam deskripsi.`;

    // Mapping gaya bahasa ke penjelasan
    const styleDescriptions: Record<string, string> = {
      'formal': 'Bahasa formal, sopan, dan profesional seperti brand besar',
      'friendly': 'Bahasa ramah, hangat, seperti berbicara dengan teman dekat',
      'casual': 'Bahasa santai, rileks, seperti chatting dengan teman',
      'professional': 'Bahasa profesional namun tetap approachable untuk B2B atau layanan profesional',
      'confident': 'Bahasa percaya diri, tegas, authoritative tapi tidak arogan',
      'academic': 'Bahasa akademis, edukatif, untuk konten pembelajaran atau artikel',
      'simplified': 'Bahasa sederhana, mudah dipahami siapa saja, straight to the point',
      'vivid': 'Bahasa deskriptif, penuh detail visual, menggugah imajinasi',
      'empathetic': 'Bahasa empatik, understanding, menunjukkan kepedulian',
      'persuasive': 'Bahasa persuasif, mengajak action, selling tapi tidak hard selling',
      'direct': 'Bahasa langsung, to the point, tanpa basa-basi'
    };

    const gayaBahasaDesc = body.gaya_bahasa === 'custom' 
      ? body.custom_style || 'gaya bebas sesuai konteks'
      : styleDescriptions[body.gaya_bahasa] || 'gaya natural dan engaging';

    // Mapping panjang caption
    const lengthGuide: Record<string, string> = {
      'pendek': '1-2 kalimat saja, concise dan impactful',
      'sedang': '3-5 kalimat, cukup detail tapi tidak bertele-tele',
      'panjang': 'story-like dengan 6-10 kalimat, bercerita lebih dalam tapi tetap engaging'
    };

    const panjangDesc = lengthGuide[body.panjang_caption] || lengthGuide['sedang'];

    // Mapping hashtag
    const hashtagGuide: Record<string, string> = {
      'tanpa': 'JANGAN gunakan hashtag sama sekali',
      'seperlunya': 'Gunakan 3-5 hashtag yang relevan di bagian akhir, pisahkan dengan spasi',
      'banyak': 'Gunakan 10-15 hashtag yang relevan dan spesifik di bagian akhir, pisahkan dengan spasi'
    };

    const hashtagDesc = hashtagGuide[body.opsi_hashtag] || hashtagGuide['seperlunya'];

    // Mapping emoji
    const emojiGuide: Record<string, string> = {
      'tanpa': 'JANGAN gunakan emoji sama sekali',
      'sedikit': 'Gunakan beberapa emoji di tempat yang tepat saja, tidak berlebihan (2-4 emoji)',
      'banyak': 'Gunakan emoji lebih ekspresif untuk memperkuat pesan (5-10 emoji), tapi tetap rapi'
    };

    const emojiDesc = emojiGuide[body.opsi_emoji] || emojiGuide['sedikit'];

    // Mapping tujuan caption
    const purposeGuide: Record<string, string> = {
      'awareness': 'Fokus untuk meningkatkan awareness dan branding. Buat orang ingat dengan brand/konten ini.',
      'interaksi': 'Ajak followers untuk berinteraksi: komen, save, atau share. Bisa dengan pertanyaan atau ajakan diskusi.',
      'traffic': 'Arahkan followers untuk klik link di bio atau website. Jelaskan value yang akan mereka dapat.',
      'konversi': 'Fokus untuk konversi/penjualan. Jelaskan benefit produk/layanan dan ajak untuk action (beli, daftar, dll).'
    };

    const tujuanDesc = body.tujuan_caption && body.tujuan_caption !== 'none'
      ? purposeGuide[body.tujuan_caption] || ''
      : '';

    // Susun prompt lengkap
    const fullPrompt = `${systemInstruction}

Buat 3 opsi caption Instagram yang berbeda berdasarkan informasi berikut:

DESKRIPSI KONTEN:
${body.deskripsi}

GAYA BAHASA:
${gayaBahasaDesc}

PANJANG CAPTION:
${panjangDesc}

ATURAN HASHTAG:
${hashtagDesc}

ATURAN EMOJI:
${emojiDesc}

${tujuanDesc ? `TUJUAN CAPTION:\n${tujuanDesc}\n` : ''}

INSTRUKSI OUTPUT:
- Buat 3 caption yang berbeda variasinya (angle/fokus berbeda)
- Output dalam format JSON dengan struktur: {"captions": ["caption_1", "caption_2", "caption_3"]}
- Setiap caption adalah string lengkap dengan emoji dan hashtag sesuai aturan di atas
- Pastikan caption natural, tidak kaku, dan enak dibaca
- JANGAN membuat harga, angka promo, atau klaim yang tidak ada di deskripsi`;

    console.log('Calling Gemini API...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: fullPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 1,
            maxOutputTokens: 2048
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Gagal menghubungi AI. Silakan coba lagi sebentar lagi.' 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('Gemini response:', data);

    // Parse Gemini response text -> JSON
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedContent || typeof generatedContent !== 'string') {
      console.error('Gemini response missing text content');
      return new Response(
        JSON.stringify({ error: 'Format jawaban AI tidak sesuai. Coba lagi beberapa saat.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let jsonText = generatedContent.trim();

    // Hapus ``` atau ```json ``` jika ada
    if (jsonText.startsWith('```')) {
      const firstNewline = jsonText.indexOf('\n');
      if (firstNewline !== -1) {
        jsonText = jsonText.slice(firstNewline + 1);
      }
      const lastFence = jsonText.lastIndexOf('```');
      if (lastFence !== -1) {
        jsonText = jsonText.slice(0, lastFence);
      }
      jsonText = jsonText.trim();
    }

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', e, 'raw:', jsonText);
      return new Response(
        JSON.stringify({ error: 'Gagal membaca hasil AI. Coba lagi sebentar lagi.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        captions: parsedResult.captions || []
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-caption function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Terjadi kesalahan'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
