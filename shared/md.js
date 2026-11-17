// Tiny, safe Markdown renderer shared by the server (SSR) and the admin preview.
// Supports: # headings, paragraphs, **bold**, *italic*, `code`, ```code blocks```,
// [links](url), ![images](url), > quotes, - / 1. lists, --- rules.

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeUrl = (u) => {
  const url = String(u).trim();
  if (/^(https?:|mailto:|\/|#)/i.test(url)) return url;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url)) return url;
  return "#";
};

function inline(text) {
  let s = esc(text);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const href = safeUrl(url);
    const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${href}"${ext}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
  return s;
}

export function renderMarkdown(src = "") {
  const lines = String(src).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code${lang ? ` data-lang="${esc(lang)}"` : ""}>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^\s*$/.test(line)) { i++; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lvl = Math.min(h[1].length + 1, 5); // # → h2 (page already has h1)
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const re = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      const buf = [];
      while (i < lines.length && re.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(re, ""))}</li>`);
      out.push(`<${ordered ? "ol" : "ul"}>${buf.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const buf = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,4}\s|```|>|\s*[-*]\s+|\s*\d+\.\s+|-{3,}\s*$)/.test(lines[i])
    ) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

export function readingMinutes(src = "") {
  const words = String(src).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export { esc };
