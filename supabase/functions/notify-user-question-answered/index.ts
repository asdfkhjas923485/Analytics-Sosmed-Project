import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("re_HeLsu9FX_4qs76twqmXo99Tb58yFshE4D"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_email: string;
  nama_penanya: string;
  judul_pertanyaan: string;
  isi_pertanyaan: string;
  jawaban: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      user_email,
      nama_penanya,
      judul_pertanyaan,
      isi_pertanyaan,
      jawaban,
    }: NotificationRequest = await req.json();

    console.log("Sending answer notification to:", user_email);

    const emailResponse = await resend.emails.send({
      from: "Support <onboarding@resend.dev>",
      to: [user_email],
      subject: `Pertanyaan Anda "${judul_pertanyaan}" telah dijawab!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Halo ${nama_penanya}!</h2>
          <p style="color: #666;">Pertanyaan Anda telah dijawab oleh tim kami.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Pertanyaan Anda:</h3>
            <p style="color: #555; font-weight: bold;">${judul_pertanyaan}</p>
            <p style="color: #666;">${isi_pertanyaan}</p>
          </div>

          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <h3 style="color: #2e7d32; margin-top: 0;">Jawaban:</h3>
            <p style="color: #333; white-space: pre-wrap;">${jawaban}</p>
          </div>

          <p style="color: #666; margin-top: 20px;">
            Silakan kembali ke aplikasi untuk melihat jawaban lengkap dan memberikan rating jika puas dengan layanan kami.
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Email ini dikirim secara otomatis, mohon tidak membalas email ini.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-user-question-answered function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
