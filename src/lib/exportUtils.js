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

// --- Academic report export (DeepSeek returns Markdown: #/##/### headings,
// blank-line-separated paragraphs, **bold** spans) ---

function parseReportBlocks(markdown) {
  const lines = (markdown || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length) {
      blocks.push({ type: "p", text: buffer.join(" ").trim() });
      buffer = [];
    }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ type: `h${heading[1].length}`, text: heading[2].trim() });
      continue;
    }
    buffer.push(trimmed);
  }
  flush();
  return blocks.filter((b) => b.text);
}

function parseInlineRuns(text) {
  const runs = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), bold: false });
    runs.push({ text: m[1], bold: true });
    last = re.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last), bold: false });
  return runs.length ? runs : [{ text, bold: false }];
}

function reportTitlePageMeta(settings) {
  const meta = [];
  if (settings.interviewee) meta.push(`Interviewee: ${settings.interviewee}`);
  if (settings.interviewer) meta.push(`Interviewer: ${settings.interviewer}`);
  if (settings.date) meta.push(`Date: ${settings.date}`);
  if (settings.company) meta.push(`Organization: ${settings.company}`);
  return meta;
}

function reportFilename(project, settings, ext) {
  return `${(settings.title || project?.title || "academic_report").replace(/[^a-z0-9]+/gi, "_")}.${ext}`;
}

export async function exportReportDocx({ project, reportText, settings }) {
  const blocks = parseReportBlocks(reportText);
  const children = [];

  if (settings.include?.title_page) {
    children.push(new Paragraph({
      text: settings.title || project?.title || "Academic Report",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    }));
    reportTitlePageMeta(settings).forEach((m) => children.push(new Paragraph({
      text: m, alignment: AlignmentType.CENTER, spacing: { after: 80 }, color: "555555"
    })));
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  const headingLevelMap = { h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3 };
  blocks.forEach((b) => {
    if (b.type in headingLevelMap) {
      children.push(new Paragraph({ text: b.text, heading: headingLevelMap[b.type], spacing: { before: 240, after: 120 } }));
    } else {
      const runs = parseInlineRuns(b.text).map((r) => new TextRun({ text: r.text, bold: r.bold }));
      children.push(new Paragraph({ children: runs, spacing: { after: 160 }, alignment: AlignmentType.LEFT }));
    }
  });

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, reportFilename(project, settings, "docx"));
}

export function exportReportPdf({ project, reportText, settings }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  const ensureSpace = () => { if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; } };

  if (settings.include?.title_page) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(settings.title || project?.title || "Academic Report", margin, y);
    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(90);
    reportTitlePageMeta(settings).forEach((m) => { doc.text(m, margin, y); y += 16; });
    y += 14;
    doc.setTextColor(20);
  }

  const headingSizes = { h1: 16, h2: 14, h3: 12 };
  parseReportBlocks(reportText).forEach((b) => {
    ensureSpace();
    if (b.type in headingSizes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(headingSizes[b.type]);
      doc.splitTextToSize(b.text, maxWidth).forEach((w) => { ensureSpace(); doc.text(w, margin, y); y += headingSizes[b.type] + 6; });
      y += 6;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const plain = b.text.replace(/\*\*(.+?)\*\*/g, "$1");
      doc.splitTextToSize(plain, maxWidth).forEach((w) => { ensureSpace(); doc.text(w, margin, y); y += 15; });
      y += 8;
    }
  });

  doc.save(reportFilename(project, settings, "pdf"));
}

export function exportReportTxt({ project, reportText, settings }) {
  let out = "";
  if (settings.include?.title_page) {
    out += `${settings.title || project?.title || "Academic Report"}\n\n`;
    reportTitlePageMeta(settings).forEach((m) => { out += `${m}\n`; });
    out += "\n";
  }
  out += (reportText || "").replace(/\*\*(.+?)\*\*/g, "$1").trim();
  downloadText(out + "\n", reportFilename(project, settings, "txt"));
}

export function exportReportMarkdown({ project, reportText, settings }) {
  let out = "";
  if (settings.include?.title_page) {
    const meta = reportTitlePageMeta(settings);
    if (meta.length) out += meta.map((m) => `**${m}**  `).join("\n") + "\n\n";
  }
  out += (reportText || "").trim() + "\n";
  downloadText(out, reportFilename(project, settings, "md"));
}

export async function copyReportToClipboard({ reportText }) {
  await navigator.clipboard.writeText((reportText || "").trim());
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