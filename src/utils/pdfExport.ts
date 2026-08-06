/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { KMLAnalysisResult, StatusCategory } from '../types';
import { COLOR_CONFIG, getStatusCategoryLabel } from './myMapsKmlParser';

/**
 * Helper to draw page header on Canvas
 */
function drawPageHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  titleName: string,
  currentDate: string,
  pageNum: number,
  totalPages: number
) {
  // Top header bar (National Water Navy blue gradient)
  const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
  headerGrad.addColorStop(0, '#003366');
  headerGrad.addColorStop(1, '#0055a5');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, 120);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('تقرير', width - 40, 45);

  ctx.font = 'bold 18px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText('تقرير حصر أطوال الشبكات (LineString) وحالات التنفيذ', width - 40, 78);

  ctx.font = '13px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`تاريخ الإصدار: ${currentDate}`, width - 40, 105);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('وحدة التحليل التلقائي @turf/length', 40, 65);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText(`صفحة ${pageNum} من ${totalPages}`, 40, 95);
}

/**
 * Helper to draw page footer on Canvas
 */
function drawPageFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pageNum: number,
  totalPages: number
) {
  const footerY = height - 40;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, footerY - 15);
  ctx.lineTo(width - 40, footerY - 15);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('تم توليد هذا التقرير تلقائياً بواسطة المنصة • اعتماد حساب الأطوال باستعمال @turf/length', width - 40, footerY);

  ctx.textAlign = 'left';
  ctx.fillText(`صفحة ${pageNum} من ${totalPages}`, 40, footerY);
}

/**
 * Generate a professional PDF report for KML LineString lengths and execution status with 100% Arabic text fidelity
 */
export async function exportAnalysisToPDF(result: KMLAnalysisResult, projectName?: string): Promise<void> {
  const titleName = projectName || result.projectName || 'تقرير حصر خطوط المشروع';
  const currentDate = result.parsedAt || new Date().toLocaleString('ar-SA');

  const width = 1240;
  const height = 1754; // A4 standard high-res aspect ratio
  const categories: StatusCategory[] = ['executed_water', 'executed_sewage', 'ongoing', 'remaining', 'cancelled'];

  const items = result.items || [];
  const itemsPerPage = 32;
  const additionalPagesCount = Math.ceil(items.length / itemsPerPage);
  const totalPages = Math.max(1, additionalPagesCount + 1);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // ==========================================
  // PAGE 1: Executive Dashboard & Legend Summary
  // ==========================================
  const page1Canvas = document.createElement('canvas');
  page1Canvas.width = width;
  page1Canvas.height = height;
  const ctx1 = page1Canvas.getContext('2d');

  if (ctx1) {
    ctx1.fillStyle = '#ffffff';
    ctx1.fillRect(0, 0, width, height);

    drawPageHeader(ctx1, width, titleName, currentDate, 1, totalPages);

    // Project Info Card
    ctx1.fillStyle = '#f8fafc';
    ctx1.strokeStyle = '#e2e8f0';
    ctx1.lineWidth = 2;
    ctx1.beginPath();
    ctx1.roundRect(40, 140, width - 80, 110, 16);
    ctx1.fill();
    ctx1.stroke();

    ctx1.textAlign = 'right';
    ctx1.fillStyle = '#0f172a';
    ctx1.font = 'bold 22px system-ui, sans-serif';
    ctx1.fillText(`المشروع: ${titleName}`, width - 70, 180);

    ctx1.fillStyle = '#334155';
    ctx1.font = '15px system-ui, sans-serif';
    ctx1.fillText(`إجمالي الأطوال الكلية: ${result.totalLengthKm} كم (${result.totalLengthMeters.toLocaleString()} متر)`, width - 70, 218);
    ctx1.fillText(`إجمالي عدد قطاعات الخطوط (LineString): ${result.totalFeaturesCount} خط`, 400, 218);

    // Section 1: Execution Status & Color Legend
    ctx1.fillStyle = '#0f172a';
    ctx1.font = 'bold 20px system-ui, sans-serif';
    ctx1.fillText('1. توزيع حالات التنفيذ ومفاتيح الخريطة (Map Legend)', width - 40, 285);

    // Render Stacked Progress Bar
    const barX = 40;
    const barY = 305;
    const barW = width - 80;
    const barH = 38;

    ctx1.fillStyle = '#f1f5f9';
    ctx1.beginPath();
    ctx1.roundRect(barX, barY, barW, barH, 12);
    ctx1.fill();

    let currentX = barX;
    categories.forEach((cat) => {
      const stats = result.colorBreakdown[cat];
      const cfg = COLOR_CONFIG[cat];
      if (!stats || stats.percentage <= 0) return;

      const segW = (stats.percentage / 100) * barW;
      ctx1.fillStyle = cfg.hex;
      ctx1.fillRect(currentX, barY, segW, barH);
      currentX += segW;
    });

    ctx1.strokeStyle = '#cbd5e1';
    ctx1.lineWidth = 1;
    ctx1.beginPath();
    ctx1.roundRect(barX, barY, barW, barH, 12);
    ctx1.stroke();

    // Draw Color Cards Grid (5 categories)
    const cardY = 365;
    let colIndex = 0;

    categories.forEach((cat) => {
      const cfg = COLOR_CONFIG[cat];
      const stats = result.colorBreakdown[cat];

      const cX = width - 40 - (colIndex * 232) - 224;
      const cY = cardY;

      ctx1.fillStyle = '#f8fafc';
      ctx1.strokeStyle = '#e2e8f0';
      ctx1.lineWidth = 1.5;
      ctx1.beginPath();
      ctx1.roundRect(cX, cY, 224, 115, 12);
      ctx1.fill();
      ctx1.stroke();

      ctx1.fillStyle = cfg.hex;
      ctx1.fillRect(cX + 215, cY, 9, 115);

      const catLabel = getStatusCategoryLabel(cat, titleName, result.projectScope);

      ctx1.fillStyle = '#0f172a';
      ctx1.font = 'bold 13px system-ui, sans-serif';
      ctx1.textAlign = 'right';
      ctx1.fillText(catLabel, cX + 202, cY + 28);

      ctx1.fillStyle = cfg.hex;
      ctx1.font = 'bold 12px font-mono, sans-serif';
      ctx1.fillText(`%${stats?.percentage || 0}`, cX + 35, cY + 28);

      ctx1.fillStyle = '#0f172a';
      ctx1.font = 'bold 22px font-mono, sans-serif';
      ctx1.fillText(`${stats?.totalLengthKm || 0} كم`, cX + 202, cY + 65);

      ctx1.fillStyle = '#64748b';
      ctx1.font = '11px system-ui, sans-serif';
      ctx1.fillText(`${(stats?.totalLengthMeters || 0).toLocaleString()} م | ${stats?.segmentCount || 0} خط`, cX + 202, cY + 95);

      colIndex++;
    });

    // Section 2: Breakdown Statistics Table
    const tableY = 510;
    ctx1.fillStyle = '#0f172a';
    ctx1.font = 'bold 20px system-ui, sans-serif';
    ctx1.textAlign = 'right';
    ctx1.fillText('2. جدول إحصائيات الأطوال والتصاريح حسب كود اللون', width - 40, tableY);

    const thY = tableY + 20;
    ctx1.fillStyle = '#0f172a';
    ctx1.fillRect(40, thY, width - 80, 42);

    ctx1.fillStyle = '#ffffff';
    ctx1.font = 'bold 14px system-ui, sans-serif';
    ctx1.fillText('التصنيف وحالة التنفيذ', width - 60, thY + 28);
    ctx1.fillText('كود اللون', width - 290, thY + 28);
    ctx1.fillText('النسبة المئوية', width - 460, thY + 28);
    ctx1.fillText('الطول (كيلومتر)', width - 620, thY + 28);
    ctx1.fillText('الطول (متر)', width - 800, thY + 28);
    ctx1.fillText('عدد الخطوط', width - 960, thY + 28);
    ctx1.fillText('عدد التصاريح', width - 1100, thY + 28);

    let trY = thY + 42;
    categories.forEach((cat, idx) => {
      const cfg = COLOR_CONFIG[cat];
      const stats = result.colorBreakdown[cat];

      ctx1.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx1.fillRect(40, trY, width - 80, 38);

      ctx1.strokeStyle = '#e2e8f0';
      ctx1.lineWidth = 1;
      ctx1.strokeRect(40, trY, width - 80, 38);

      ctx1.fillStyle = cfg.hex;
      ctx1.beginPath();
      ctx1.arc(width - 60, trY + 19, 7, 0, Math.PI * 2);
      ctx1.fill();

      ctx1.fillStyle = '#0f172a';
      ctx1.font = 'bold 13px system-ui, sans-serif';
      ctx1.fillText(getStatusCategoryLabel(cat, titleName, result.projectScope), width - 80, trY + 24);

      ctx1.font = '13px font-mono, sans-serif';
      ctx1.fillStyle = '#475569';
      ctx1.fillText(cfg.hex, width - 290, trY + 24);

      ctx1.fillStyle = '#0f172a';
      ctx1.font = 'bold 13px font-mono, sans-serif';
      ctx1.fillText(`%${stats?.percentage || 0}`, width - 460, trY + 24);

      ctx1.fillStyle = '#0284c7';
      ctx1.fillText(`${stats?.totalLengthKm || 0} كم`, width - 620, trY + 24);

      ctx1.fillStyle = '#0f172a';
      ctx1.fillText(`${(stats?.totalLengthMeters || 0).toLocaleString()} م`, width - 800, trY + 24);
      ctx1.fillText(`${stats?.segmentCount || 0}`, width - 960, trY + 24);
      ctx1.fillText(`${stats?.permitCount || 0}`, width - 1100, trY + 24);

      trY += 38;
    });

    // Section 3: Sample Items on Page 1
    const itemsSectionY = trY + 40;
    ctx1.fillStyle = '#0f172a';
    ctx1.font = 'bold 20px system-ui, sans-serif';
    ctx1.textAlign = 'right';
    ctx1.fillText('3. عينة ملخصة لعناصر الخطوط (LineString) - جدول تفصيلي', width - 40, itemsSectionY);

    const th2Y = itemsSectionY + 20;
    ctx1.fillStyle = '#1e293b';
    ctx1.fillRect(40, th2Y, width - 80, 38);

    ctx1.fillStyle = '#ffffff';
    ctx1.font = 'bold 13px system-ui, sans-serif';
    ctx1.fillText('#', width - 55, th2Y + 25);
    ctx1.fillText('Segment ID', width - 140, th2Y + 25);
    ctx1.fillText('Permit No (التصريح)', width - 340, th2Y + 25);
    ctx1.fillText('الحالة واللون', width - 580, th2Y + 25);
    ctx1.fillText('الطول (متر)', width - 800, th2Y + 25);
    ctx1.fillText('اسم القطاع / Line Name', width - 980, th2Y + 25);

    let tr2Y = th2Y + 38;
    const page1SampleItems = items.slice(0, 18);

    page1SampleItems.forEach((item, idx) => {
      ctx1.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx1.fillRect(40, tr2Y, width - 80, 34);

      ctx1.strokeStyle = '#f1f5f9';
      ctx1.lineWidth = 1;
      ctx1.strokeRect(40, tr2Y, width - 80, 34);

      ctx1.fillStyle = '#64748b';
      ctx1.font = '12px font-mono, sans-serif';
      ctx1.fillText(`${idx + 1}`, width - 55, tr2Y + 22);

      ctx1.fillStyle = '#0f172a';
      ctx1.font = 'bold 12px font-mono, sans-serif';
      ctx1.fillText(item.segmentId || '-', width - 140, tr2Y + 22);
      ctx1.fillText(item.permitNo || '-', width - 340, tr2Y + 22);

      ctx1.fillStyle = item.colorHex || '#01579B';
      ctx1.beginPath();
      ctx1.arc(width - 570, tr2Y + 17, 5, 0, Math.PI * 2);
      ctx1.fill();

      ctx1.fillStyle = '#1e293b';
      ctx1.font = '12px system-ui, sans-serif';
      ctx1.fillText(item.statusLabel, width - 590, tr2Y + 22);

      ctx1.fillStyle = '#0284c7';
      ctx1.font = 'bold 12px font-mono, sans-serif';
      ctx1.fillText(`${item.lengthMeters.toLocaleString()} م (${item.lengthKm} كم)`, width - 800, tr2Y + 22);

      ctx1.fillStyle = '#475569';
      ctx1.font = '11px system-ui, sans-serif';
      const nameTruncated = item.name.length > 28 ? item.name.substring(0, 28) + '...' : item.name;
      ctx1.fillText(nameTruncated, width - 980, tr2Y + 22);

      tr2Y += 34;
    });

    drawPageFooter(ctx1, width, height, 1, totalPages);

    const img1 = page1Canvas.toDataURL('image/png', 1.0);
    pdf.addImage(img1, 'PNG', 0, 0, pdfWidth, pdfHeight);
  }

  // ==========================================
  // ADDITIONAL PAGES: Full Table Items (Canvas Multi-page)
  // ==========================================
  if (items.length > 0) {
    for (let p = 0; p < additionalPagesCount; p++) {
      const pageNum = p + 2;
      const pageItems = items.slice(p * itemsPerPage, (p + 1) * itemsPerPage);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = width;
      pageCanvas.height = height;
      const ctxP = pageCanvas.getContext('2d');
      if (!ctxP) continue;

      ctxP.fillStyle = '#ffffff';
      ctxP.fillRect(0, 0, width, height);

      drawPageHeader(ctxP, width, titleName, currentDate, pageNum, totalPages);

      // Table Header on Detail Page
      const thY = 140;
      ctxP.fillStyle = '#0f172a';
      ctxP.font = 'bold 20px system-ui, sans-serif';
      ctxP.textAlign = 'right';
      ctxP.fillText(`جدول تفاصيل قطاعات الخطوط (LineString) - صفحة ${pageNum}`, width - 40, thY);

      const thBoxY = thY + 15;
      ctxP.fillStyle = '#0f172a';
      ctxP.fillRect(40, thBoxY, width - 80, 40);

      ctxP.fillStyle = '#ffffff';
      ctxP.font = 'bold 13px system-ui, sans-serif';
      ctxP.fillText('#', width - 55, thBoxY + 26);
      ctxP.fillText('Segment ID', width - 140, thBoxY + 26);
      ctxP.fillText('Permit No (رقم التصريح)', width - 340, thBoxY + 26);
      ctxP.fillText('الحالة واللون المعتمد', width - 580, thBoxY + 26);
      ctxP.fillText('الطول (متر / كم)', width - 800, thBoxY + 26);
      ctxP.fillText('اسم القطاع / Line Name', width - 980, thBoxY + 26);

      let trY = thBoxY + 40;
      pageItems.forEach((item, idx) => {
        const itemGlobalIndex = p * itemsPerPage + idx + 1;

        ctxP.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        ctxP.fillRect(40, trY, width - 80, 36);

        ctxP.strokeStyle = '#e2e8f0';
        ctxP.lineWidth = 1;
        ctxP.strokeRect(40, trY, width - 80, 36);

        ctxP.fillStyle = '#64748b';
        ctxP.font = '12px font-mono, sans-serif';
        ctxP.fillText(`${itemGlobalIndex}`, width - 55, trY + 23);

        ctxP.fillStyle = '#0f172a';
        ctxP.font = 'bold 12px font-mono, sans-serif';
        ctxP.fillText(item.segmentId || '-', width - 140, trY + 23);
        ctxP.fillText(item.permitNo || '-', width - 340, trY + 23);

        ctxP.fillStyle = item.colorHex || '#01579B';
        ctxP.beginPath();
        ctxP.arc(width - 570, trY + 18, 5, 0, Math.PI * 2);
        ctxP.fill();

        ctxP.fillStyle = '#1e293b';
        ctxP.font = '12px system-ui, sans-serif';
        ctxP.fillText(item.statusLabel, width - 590, trY + 23);

        ctxP.fillStyle = '#0284c7';
        ctxP.font = 'bold 12px font-mono, sans-serif';
        ctxP.fillText(`${item.lengthMeters.toLocaleString()} م (${item.lengthKm} كم)`, width - 800, trY + 23);

        ctxP.fillStyle = '#475569';
        ctxP.font = '11px system-ui, sans-serif';
        const nameTruncated = item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name;
        ctxP.fillText(nameTruncated, width - 980, trY + 23);

        trY += 36;
      });

      drawPageFooter(ctxP, width, height, pageNum, totalPages);

      pdf.addPage();
      const pageImg = pageCanvas.toDataURL('image/png', 1.0);
      pdf.addImage(pageImg, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }
  }

  // Save the PDF file
  const sanitizedName = titleName.replace(/[/\\?%*:|"<>]/g, '_');
  pdf.save(`تقرير_حصر_الأطوال_${sanitizedName}.pdf`);
}

