/**
 * build_pdf.js — Converts the 10 markdown docs in this folder into one
 * print-styled HTML file (which is then printed to PDF via headless Chrome).
 * Documentation-only utility; does not touch any application code.
 */
const fs = require('fs');
const path = require('path');

const FILES = [
  '01_Project_Overview.md',
  '02_Requirements.md',
  '03_UI_UX.md',
  '04_Technical_Documentation.md',
  '05_API_Documentation.md',
  '06_Database.md',
  '07_Testing.md',
  '08_Deployment.md',
  '09_Development_Log.md',
  '10_Release_Notes.md',
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  let t = esc(s.trim());
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return t;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  const toc = [];
  let i = 0, inCode = false, listType = null;

  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      if (!inCode) { closeList(); out.push('<pre><code>'); inCode = true; }
      else { out.push('</code></pre>'); inCode = false; }
      i++; continue;
    }
    if (inCode) { out.push(esc(line)); i++; continue; }

    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s\-:|]+\|\s*$/.test(lines[i + 1])) {
      closeList();
      const cells = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      out.push('<table><thead><tr>' + head.map(h => '<th>' + inline(h) + '</th>').join('') + '</tr></thead><tbody>');
      rows.forEach((r, ri) => {
        out.push('<tr' + (ri % 2 ? ' class="alt"' : '') + '>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>');
      });
      out.push('</tbody></table>');
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const lvl = h[1].length, text = h[2].trim(), id = slugify(text);
      if (lvl === 1) {
        toc.push({ id, text });
        out.push(`<h1 id="${id}" class="section-title">${inline(text)}</h1>`);
      } else {
        out.push(`<h${lvl} id="${id}">${inline(text)}</h${lvl}>`);
      }
      i++; continue;
    }

    if (/^---\s*$/.test(line)) { closeList(); out.push('<hr/>'); i++; continue; }

    if (/^[-*]\s+/.test(line)) {
      if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
      let item = line.replace(/^[-*]\s+/, '').replace(/^\[[ x]\]\s+/, '☐ ');
      out.push('<li>' + inline(item) + '</li>');
      i++; continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
      out.push('<li>' + inline(line.replace(/^\d+\.\s+/, '')) + '</li>');
      i++; continue;
    }

    if (!line.trim()) { closeList(); i++; continue; }

    closeList();
    const buf = [line];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#{1,4}\s|```|\||[-*]\s|\d+\.\s|---\s)/.test(lines[i + 1])) {
      i++; buf.push(lines[i]);
    }
    out.push('<p>' + buf.map(inline).join('<br/>') + '</p>');
    i++;
  }
  closeList();
  if (inCode) out.push('</code></pre>');
  return { html: out.join('\n'), toc };
}

const CSS = `
@page { size: A4; margin: 18mm 14mm 18mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", "Nirmala UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1c2733; margin: 0; }
.cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 90vh; text-align: center; }
.cover .badge { background: #123a5f; color: #ffd700; padding: 6px 18px; border-radius: 30px; letter-spacing: 3px; font-size: 10pt; }
.cover h1 { font-size: 30pt; color: #123a5f; margin: 24px 0 6px; }
.cover h2 { font-size: 16pt; color: #333; font-weight: 600; margin: 0 0 30px; }
.cover .meta { margin-top: 34px; font-size: 10.5pt; color: #444; line-height: 2; }
.cover .line { width: 180px; height: 4px; background: #ffd700; margin: 18px auto; border-radius: 2px; }
.toc-page { page-break-after: always; }
.toc-page h1 { color: #123a5f; border: none; page-break-before: avoid; }
.toc-page ol { font-size: 11.5pt; line-height: 2.1; }
h1.section-title { color: #123a5f; font-size: 17pt; border-bottom: 3px solid #ffd700; padding-bottom: 6px; margin: 0 0 14px; page-break-before: always; }
h2 { font-size: 13.5pt; color: #123a5f; margin: 18px 0 8px; border-left: 4px solid #ffd700; padding-left: 8px; page-break-after: avoid; }
h3 { font-size: 11.5pt; color: #1b4f72; margin: 14px 0 6px; page-break-after: avoid; }
h4 { font-size: 10.8pt; color: #1b4f72; margin: 12px 0 6px; page-break-after: avoid; }
p { margin: 6px 0; }
ul, ol { margin: 6px 0 10px; padding-left: 22px; }
li { margin: 3px 0; }
table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 9.2pt; }
th { background: #123a5f; color: #fff; text-align: left; padding: 5px 7px; border: 1px solid #9fb3c8; font-weight: 600; }
td { padding: 4px 7px; border: 1px solid #c5d0db; vertical-align: top; }
tr.alt td { background: #f3f6f9; }
tr { page-break-inside: avoid; }
code { background: #eef2f6; padding: 1px 5px; border-radius: 3px; font-family: Consolas, monospace; font-size: 9.2pt; color: #0b4f6c; }
pre { background: #12232f; color: #e8f1f8; padding: 10px 12px; border-radius: 6px; white-space: pre-wrap; font-family: Consolas, monospace; font-size: 9pt; page-break-inside: avoid; }
pre code { background: none; color: inherit; padding: 0; }
strong { color: #123a5f; }
hr { border: none; border-top: 2px solid #e2c044; margin: 16px 0; }
a { color: #1b4f72; text-decoration: none; }
`;

const parts = [];
let allToc = [];
for (const f of FILES) {
  const md = fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/^\uFEFF/, '');
  const { html, toc } = mdToHtml(md);
  if (toc.length) allToc.push(toc[0]);
  parts.push(html);
}

const today = new Date().toISOString().slice(0, 10);
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>MACVEL School Management System — Project Documentation</title>
<style>${CSS}</style>
</head>
<body>
<section class="cover">
  <div class="badge">PROJECT DOCUMENTATION</div>
  <h1>MACVEL School Management System</h1>
  <div class="line"></div>
  <h2>Smart. Secure. Connected.</h2>
  <div class="meta">
    Multi-Tenant SaaS School Management Platform<br/>
    Document Version 1.0 &nbsp;&middot;&nbsp; ${today}<br/>
    Prepared by MACVEL Development Team
  </div>
</section>
<section class="toc-page">
  <h1>Table of Contents</h1>
  <ol>
${allToc.map(t => `    <li><a href="#${t.id}">${t.text}</a></li>`).join('\n')}
  </ol>
</section>
${parts.join('\n')}
</body>
</html>`;

const outFile = path.join(__dirname, 'MACVEL_Documentation.html');
fs.writeFileSync(outFile, html, 'utf8');
console.log('HTML written:', outFile, '(' + html.length + ' chars)');
