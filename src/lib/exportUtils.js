import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from "docx";
import { jsPDF } from "jspdf";
import { formatTime, speakerName } from "./transcriptUtils";

function buildParagraphs({ segments, speakers, settings, chapters }) {
  const paragraphs = [];
  const includeTimestamps = settings.include?.timestamps;
  const includeSpeakers = settings.include?.speaker_names !== false;
  const includeChapters = settings.include?.chapter_headings && chapters?.length;

  if (includeChapters) {
    chapters.forEach((ch, idx) => {
      if (idx > 0) paragraphs.push(new Paragraph({ children: [] }));
      paragraphs.push(new Paragraph({
        text: ch.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 }
      }));
    });
    paragraphs.push(new Paragraph({ children: [] }));
  }

  segments.forEach((seg) => {
    const text = seg.current_text || seg.clean_text || seg.raw_text;
    const runs = [];
    if (includeTimestamps) {
      runs.push(new TextRun({ text: `[${formatTime(seg.start_time)}] `, bold: true, color: "666666" }));
    }
    if (includeSpeakers) {
      const name = speakerName(speakers, seg);
      runs.push(new TextRun({ text: `${name}: `, bold: true }));
    }
    runs.push(new TextRun({ text }));
    paragraphs.push(new Paragraph({
      children: runs,
      spacing: { after: 160 },
      alignment: AlignmentType.LEFT
    }));
  });
  return paragraphs;
}

export async function exportDocx({ project, transcript, settings }) {
  const segments = transcript?.segments || [];
  const speakers = project?.speakers || [];
  const chapters = project?.chapters || [];
  const children = [];

  if (settings.include?.title_page) {
    children.push(new Paragraph({
      text: settings.title || project.title || "Interview Transcript",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    }));
    const meta = [];
    if (settings.interviewee) meta.push(`Interviewee: ${settings.interviewee}`);
    if (settings.interviewer) meta.push(`Interviewer: ${settings.interviewer}`);
    if (settings.date) meta.push(`Date: ${settings.date}`);
    if (settings.company) meta.push(`Organization: ${settings.company}`);
    meta.forEach((m) => children.push(new Paragraph({
      text: m, alignment: AlignmentType.CENTER, spacing: { after: 80 }, color: "555555"
    })));
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  if (!settings.include?.title_page) {
    children.push(new Paragraph({
      text: settings.title || project.title || "Interview Transcript",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 }
    }));
  }

  children.push(...buildParagraphs({ segments, speakers, settings, chapters }));

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${(settings.title || project.title || "transcript").replace(/[^a-z0-9]+/gi, "_")}.docx`);
}

export function exportTxt({ project, transcript, settings }) {
  const segments = transcript?.segments || [];
  const speakers = project?.speakers || [];
  const includeTimestamps = settings.include?.timestamps;
  const includeSpeakers = settings.include?.speaker_names !== false;
  let out = `${settings.title || project.title || "Interview Transcript"}\n\n`;
  if (settings.interviewee) out += `Interviewee: ${settings.interviewee}\n`;
  if (settings.interviewer) out += `Interviewer: ${settings.interviewer}\n`;
  if (settings.date) out += `Date: ${settings.date}\n`;
  if (settings.company) out += `Organization: ${settings.company}\n`;
  out += "\n";
  segments.forEach((seg) => {
    const text = seg.current_text || seg.clean_text || seg.raw_text;
    let line = "";
    if (includeTimestamps) line += `[${formatTime(seg.start_time)}] `;
    if (includeSpeakers) line += `${speakerName(speakers, seg)}: `;
    line += text;
    out += line + "\n\n";
  });
  downloadText(out, `${(settings.title || project.title || "transcript").replace(/[^a-z0-9]+/gi, "_")}.txt`);
}

export function exportMarkdown({ project, transcript, settings }) {
  const segments = transcript?.segments || [];
  const speakers = project?.speakers || [];
  const includeTimestamps = settings.include?.timestamps;
  const includeSpeakers = settings.include?.speaker_names !== false;
  let out = `# ${settings.title || project.title || "Interview Transcript"}\n\n`;
  if (settings.interviewee) out += `**Interviewee:** ${settings.interviewee}  \n`;
  if (settings.interviewer) out += `**Interviewer:** ${settings.interviewer}  \n`;
  if (settings.date) out += `**Date:** ${settings.date}  \n`;
  if (settings.company) out += `**Organization:** ${settings.company}  \n`;
  out += "\n";
  (project.chapters || []).forEach((ch) => { out += `## ${ch.title}\n\n`; });
  segments.forEach((seg) => {
    const text = seg.current_text || seg.clean_text || seg.raw_text;
    let line = "";
    if (includeTimestamps) line += `*[${formatTime(seg.start_time)}]* `;
    if (includeSpeakers) line += `**${speakerName(speakers, seg)}:** `;
    line += text;
    out += line + "\n\n";
  });
  downloadText(out, `${(settings.title || project.title || "transcript").replace(/[^a-z0-9]+/gi, "_")}.md`);
}

export function exportPdf({ project, transcript, settings }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(settings.title || project.title || "Interview Transcript", margin, y);
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const meta = [];
  if (settings.interviewee) meta.push(`Interviewee: ${settings.interviewee}`);
  if (settings.interviewer) meta.push(`Interviewer: ${settings.interviewer}`);
  if (settings.date) meta.push(`Date: ${settings.date}`);
  if (settings.company) meta.push(`Organization: ${settings.company}`);
  meta.forEach((m) => {
    doc.setTextColor(90);
    doc.text(m, margin, y);
    y += 16;
  });
  y += 10;
  doc.setTextColor(20);
  const segments = transcript?.segments || [];
  const speakers = project?.speakers || [];
  segments.forEach((seg) => {
    const text = seg.current_text || seg.clean_text || seg.raw_text;
    let line = "";
    if (settings.include?.timestamps) line += `[${formatTime(seg.start_time)}] `;
    if (settings.include?.speaker_names !== false) line += `${speakerName(speakers, seg)}: `;
    line += text;
    const wrapped = doc.splitTextToSize(line, maxWidth);
    wrapped.forEach((w) => {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(w, margin, y);
      y += 15;
    });
    y += 8;
  });
  doc.save(`${(settings.title || project.title || "transcript").replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}

export async function copyToClipboard({ project, transcript, settings }) {
  const segments = transcript?.segments || [];
  const speakers = project?.speakers || [];
  let out = "";
  segments.forEach((seg) => {
    const text = seg.current_text || seg.clean_text || seg.raw_text;
    out += `${speakerName(speakers, seg)}: ${text}\n\n`;
  });
  await navigator.clipboard.writeText(out.trim());
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}