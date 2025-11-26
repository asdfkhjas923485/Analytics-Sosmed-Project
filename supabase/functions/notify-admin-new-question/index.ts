import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  question_id: string;
  judul_pertanyaan: string;
  isi_pertanyaan: string;
  nama_penanya: string;
  nama_proyek: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      question_id,
      judul_pertanyaan, 
      isi_pertanyaan,
      nama_penanya,
      nama_proyek
    }: NotificationRequest = await req.json();

    console.log("Sending admin notification for question:", question_id);

    const emailResponse = await resend.emails.send({
      from: "Notifikasi Admin <onboarding@resend.dev>",
      to: ["maarifalaawi@gmail.com"],
      subject: `Pertanyaan Baru: ${judul_pertanyaan}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
            Pertanyaan Baru Membutuhkan Jawaban
          </h2>
          
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #4F46E5; margin-top: 0;">${judul_pertanyaan}</h3>
            <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${isi_pertanyaan}</p>
          </div>

          <div style="margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Ditanya oleh:</strong> ${nama_penanya}</p>
            <p style="margin: 5px 0;"><strong>Proyek:</strong> ${nama_proyek}</p>
          </div>

          <div style="margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/bantuan-admin" 
               style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Kelola Pertanyaan
            </a>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Email ini dikirim otomatis saat ada pertanyaan baru yang perlu dijawab.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-new-question function:", error);
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
