import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

interface ExportButtonProps {
  projectId: string;
  pageName: string;
  data: any[];
  chartRefs?: React.RefObject<HTMLDivElement>[];
  fileName?: string;
}

export const ExportButton = ({ 
  projectId, 
  pageName, 
  data, 
  chartRefs = [],
  fileName = "laporan"
}: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const captureCharts = async () => {
    const chartImages: string[] = [];
    
    for (const ref of chartRefs) {
      if (ref.current) {
        try {
          const canvas = await html2canvas(ref.current, {
            backgroundColor: '#ffffff',
            scale: 2
          });
          chartImages.push(canvas.toDataURL('image/png'));
        } catch (error) {
          console.error("Error capturing chart:", error);
        }
      }
    }
    
    return chartImages;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header
      pdf.setFontSize(20);
      pdf.text(`Laporan ${pageName}`, pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 30, { align: 'center' });
      
      let yPosition = 45;
      
      // Add charts
      const chartImages = await captureCharts();
      for (const imgData of chartImages) {
        if (yPosition + 100 > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(imgData, 'PNG', 15, yPosition, pageWidth - 30, 80);
        yPosition += 90;
      }
      
      // Add data summary
      if (data && data.length > 0) {
        if (yPosition + 40 > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(14);
        pdf.text('Ringkasan Data', 15, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.text(`Total Data: ${data.length} baris`, 15, yPosition);
      }
      
      // Save PDF
      const pdfFileName = `${fileName}_${new Date().getTime()}.pdf`;
      pdf.save(pdfFileName);
      
      // Log to database
      await logExport('PDF', pdfFileName);
      
      toast({
        title: "Export Berhasil",
        description: "Laporan PDF berhasil diunduh",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Gagal",
        description: "Terjadi kesalahan saat export PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      if (!data || data.length === 0) {
        toast({
          title: "Tidak Ada Data",
          description: "Tidak ada data untuk di-export",
          variant: "destructive",
        });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, pageName);
      
      const excelFileName = `${fileName}_${new Date().getTime()}.xlsx`;
      XLSX.writeFile(workbook, excelFileName);
      
      // Log to database
      await logExport('Excel', excelFileName);
      
      toast({
        title: "Export Berhasil",
        description: "Data Excel berhasil diunduh",
      });
    } catch (error) {
      console.error("Error exporting Excel:", error);
      toast({
        title: "Export Gagal",
        description: "Terjadi kesalahan saat export Excel",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const logExport = async (jenis: string, namaFile: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('riwayat_export').insert({
        id_proyek: projectId,
        id_pengguna: user.id,
        jenis_export: jenis,
        nama_file: namaFile,
        halaman_export: pageName,
      });
    } catch (error) {
      console.error("Error logging export:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting} className="gap-2">
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export Laporan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportToPDF} disabled={isExporting}>
          <FileText className="mr-2 h-4 w-4" />
          Export ke PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} disabled={isExporting || !data || data.length === 0}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export ke Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
