import { jsPDF } from 'jspdf';
import type { DetectionResult } from '../types';

export function downloadDetectionPdfReport(result: DetectionResult, farmerName?: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = 52;

  const ensureSpace = (needed: number) => {
    if (y + needed > 780) {
      doc.addPage();
      y = 52;
    }
  };

  // Header band
  doc.setFillColor(21, 128, 61);
  doc.rect(0, 0, pageWidth, 84, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AgroCare AI - Crop Pathology Diagnostic Report', margin, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Report ID: #AC-${result.detectionId}   |   Generated: ${new Date(result.createdAt).toLocaleString()}`,
    margin,
    58
  );

  y = 110;
  doc.setTextColor(23, 36, 27);

  if (farmerName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Prepared For: ${farmerName}`, margin, y);
    y += 18;
  }

  // Diagnostic Summary Box
  doc.setDrawColor(215, 226, 210);
  doc.setFillColor(244, 248, 242);
  doc.roundedRect(margin, y, maxWidth, 74, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Crop: ${result.cropDetected}`, margin + 14, y + 22);
  doc.text(`Prediction: ${result.diseaseDetected}`, margin + 14, y + 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Confidence: ${result.confidence}%   |   Severity: ${result.severity}   |   Model: ${result.modelUsed}`,
    margin + 14,
    y + 58
  );

  y += 96;

  const writeSection = (title: string, body: string | string[]) => {
    ensureSpace(46);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(21, 128, 61);
    doc.text(title, margin, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(35, 45, 38);

    const linesInput = Array.isArray(body) ? body.map((item) => `• ${item}`) : [body];
    for (const item of linesInput) {
      if (!item) continue;
      const wrapped = doc.splitTextToSize(item, maxWidth);
      for (const line of wrapped) {
        ensureSpace(16);
        doc.text(line, margin, y);
        y += 14;
      }
    }
    y += 8;
  };

  if (result.qualityWarning) {
    writeSection('Image Quality Note', result.qualityWarning);
  }
  writeSection('Diagnostic Overview', result.description);
  if (result.visibleSymptoms.length > 0) {
    writeSection('Visible Symptoms', result.visibleSymptoms);
  }
  if (result.possibleCauses.length > 0) {
    writeSection('Possible Causes', result.possibleCauses);
  }
  if (result.preventiveMeasures.length > 0) {
    writeSection('Preventive Measures', result.preventiveMeasures);
  }
  if (result.organicControls.length > 0) {
    writeSection('Organic & Biological Controls', result.organicControls);
  }
  if (result.chemicalTreatments.length > 0) {
    writeSection('Chemical Treatment Guidance', result.chemicalTreatments);
  }

  ensureSpace(60);
  doc.setDrawColor(230, 200, 140);
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(margin, y, maxWidth, 52, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text('Agronomic Safety Disclaimer', margin + 10, y + 16);
  doc.setFont('helvetica', 'normal');
  const discLines = doc.splitTextToSize(
    'AI-assisted crop disease predictions are preliminary. Please consult a certified local agricultural extension officer or plant pathologist before purchasing or applying chemical pesticides.',
    maxWidth - 20
  );
  doc.text(discLines, margin + 10, y + 30);

  const safeSlug = `${result.cropDetected}_${result.diseaseDetected}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  doc.save(`agrocare_report_${safeSlug}.pdf`);
}
