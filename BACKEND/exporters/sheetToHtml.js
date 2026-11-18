// Gihimong HTML ang usa ka Excel sheet (merged cells, borders, fonts, kolor, images) para sa preview

const PX_PER_CHAR = 7;

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nl = (s) => s.replace(/\n/g, "<br>");

const colNum = (letters) => letters.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const argb = (c) => (c && typeof c.argb === "string" && c.argb.length >= 6 ? "#" + c.argb.slice(-6) : null);

const BORDER_CSS = {
  thin: "1px solid", medium: "2px solid", thick: "3px solid", dashed: "1px dashed", dotted: "1px dotted",
  double: "3px double", hair: "1px dotted", dashDot: "1px dashed", dashDotDot: "1px dashed",
  mediumDashed: "2px dashed", mediumDashDot: "2px dashed", mediumDashDotDot: "2px dashed", slantDashDot: "1px dashed",
};
const edge = (b) => (b && b.style ? `${BORDER_CSS[b.style] || "1px solid"} ${argb(b.color) || "#000"}` : null);

function parseRange(ref) {
  const m = String(ref || "").match(/\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)/);
  return m ? { c1: colNum(m[1]), r1: +m[2], c2: colNum(m[3]), r2: +m[4] } : null;
}

function valueHtml(cell) {
  const v = cell.value;
  if (v == null) return "";
  if (v instanceof Date) return esc(v.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" }));
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) {
      return v.richText
        .map((seg) => {
          const f = seg.font || {};
          const st = [
            f.bold ? "font-weight:700" : "font-weight:400",
            f.italic ? "font-style:italic" : "",
            f.size ? `font-size:${f.size}pt` : "",
            argb(f.color) ? `color:${argb(f.color)}` : "",
          ].filter(Boolean).join(";");
          return `<span style="${st}">${nl(esc(seg.text))}</span>`;
        })
        .join("");
    }
    if (v.result != null) return nl(esc(v.result));
    if (typeof v.text === "string") return nl(esc(v.text));
    if (v.hyperlink) return esc(v.hyperlink);
    return "";
  }
  return nl(esc(v));
}

export function sheetToHtml(wb, ws, { title = "Preview" } = {}) {
  const area = parseRange(ws.pageSetup && ws.pageSetup.printArea);
  const lastRow = Math.max(ws.rowCount, area ? area.r2 : 0);
  const lastCol = area ? area.c2 : ws.columnCount;

  // sukat sa matag column / row (pixels)
  const widths = [];
  for (let c = 1; c <= lastCol + 60; c++) widths[c] = Math.round((ws.getColumn(c).width || 8.43) * PX_PER_CHAR + 5);
  const heights = [];
  for (let r = 1; r <= lastRow + 60; r++) heights[r] = Math.round((ws.getRow(r).height || 15) * (96 / 72));

  const xAt = (f) => {
    const i = Math.floor(f);
    let x = 0;
    for (let c = 1; c <= i; c++) x += widths[c] || 0;
    return x + (f - i) * (widths[i + 1] || 0);
  };
  const yAt = (f) => {
    const i = Math.floor(f);
    let y = 0;
    for (let r = 1; r <= i; r++) y += heights[r] || 0;
    return y + (f - i) * (heights[i + 1] || 0);
  };

  let W = 0;
  for (let c = 1; c <= lastCol; c++) W += widths[c];

  // merged cells
  const masters = new Map();
  const covered = new Set();
  for (const ref of ws.model.merges || []) {
    const m = parseRange(ref);
    if (!m) continue;
    masters.set(`${m.r1},${m.c1}`, m);
    for (let r = m.r1; r <= m.r2; r++)
      for (let c = m.c1; c <= m.c2; c++) if (r !== m.r1 || c !== m.c1) covered.add(`${r},${c}`);
  }

  const sidesOf = (cell, m) => {
    const own = cell.border || {};
    if (!m) return own;
    const tr = ws.getCell(m.r1, m.c2).border || {};
    const bl = ws.getCell(m.r2, m.c1).border || {};
    const br = ws.getCell(m.r2, m.c2).border || {};
    return { top: own.top, left: own.left, right: tr.right || br.right || own.right, bottom: bl.bottom || br.bottom || own.bottom };
  };

  let rowsHtml = "";
  for (let r = 1; r <= lastRow; r++) {
    let tds = "";
    for (let c = 1; c <= lastCol; c++) {
      const key = `${r},${c}`;
      if (covered.has(key)) continue;

      const cell = ws.getCell(r, c);
      const m = masters.get(key);
      const f = cell.font || {};
      const a = cell.alignment || {};
      const s = sidesOf(cell, m);

      const css = [
        `font-family:${f.name ? `'${f.name}',` : ""}Arial,sans-serif`,
        `font-size:${f.size || 11}pt`,
        f.bold ? "font-weight:700" : "",
        f.italic ? "font-style:italic" : "",
        f.underline ? "text-decoration:underline" : "",
        argb(f.color) ? `color:${argb(f.color)}` : "",
        cell.fill && cell.fill.type === "pattern" && cell.fill.pattern === "solid" && argb(cell.fill.fgColor)
          ? `background:${argb(cell.fill.fgColor)}` : "",
        `text-align:${a.horizontal === "centerContinuous" ? "center" : ["center", "right", "justify"].includes(a.horizontal) ? a.horizontal : "left"}`,
        `vertical-align:${a.vertical === "top" ? "top" : a.vertical === "middle" || a.vertical === "center" ? "middle" : "bottom"}`,
        a.wrapText ? "white-space:pre-wrap;word-break:break-word" : "white-space:nowrap",
        edge(s.top) ? `border-top:${edge(s.top)}` : "",
        edge(s.left) ? `border-left:${edge(s.left)}` : "",
        edge(s.right) ? `border-right:${edge(s.right)}` : "",
        edge(s.bottom) ? `border-bottom:${edge(s.bottom)}` : "",
      ].filter(Boolean).join(";");

      const cs = m ? Math.min(m.c2, lastCol) - m.c1 + 1 : 1;
      const rs = m ? Math.min(m.r2, lastRow) - m.r1 + 1 : 1;
      tds += `<td${cs > 1 ? ` colspan="${cs}"` : ""}${rs > 1 ? ` rowspan="${rs}"` : ""} style="${css}">${valueHtml(cell)}</td>`;
    }
    rowsHtml += `<tr style="height:${heights[r]}px">${tds}</tr>`;
  }

  // images (pananglitan ang MAC logo)
  let imagesHtml = "";
  try {
    const posX = (p) => (p.col != null ? xAt(+p.col) : xAt(+p.nativeCol || 0) + (+p.nativeColOff || 0) / 9525);
    const posY = (p) => (p.row != null ? yAt(+p.row) : yAt(+p.nativeRow || 0) + (+p.nativeRowOff || 0) / 9525);

    for (const { imageId, range } of ws.getImages ? ws.getImages() : []) {
      const media = wb.getImage(imageId);
      if (!media || !media.buffer || !range || !range.tl) continue;
      const ext = String(media.extension || "png").replace("jpg", "jpeg");
      const x = posX(range.tl);
      const y = posY(range.tl);
      let w;
      let h;
      if (range.br) {
        w = posX(range.br) - x;
        h = posY(range.br) - y;
      } else if (range.ext) {
        w = range.ext.width > 5000 ? range.ext.width / 9525 : range.ext.width;
        h = range.ext.height > 5000 ? range.ext.height / 9525 : range.ext.height;
      }
      if (!(w > 0 && h > 0)) continue;
      imagesHtml += `<img alt="" src="data:image/${ext};base64,${Buffer.from(media.buffer).toString("base64")}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px">`;
    }
  } catch (e) {
    console.warn("Preview: could not render images:", e.message);
  }

  const cols = Array.from({ length: lastCol }, (_, i) => `<col style="width:${widths[i + 1]}px">`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  html,body{margin:0;background:#e9eeea}
  .page{position:relative;margin:12px auto;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.25);width:${W}px}
  table{border-collapse:collapse;table-layout:fixed;width:${W}px}
  td{padding:0 3px;overflow:hidden;box-sizing:border-box;line-height:1.2}
  @page{size:A4 portrait;margin:8mm}
  @media print{html,body{background:#fff}.page{margin:0;box-shadow:none}}
</style></head><body>
<div class="page" id="page"><table><colgroup>${cols}</colgroup><tbody>${rowsHtml}</tbody></table>${imagesHtml}</div>
<script>
  var W=${W}, page=document.getElementById('page');
  function fit(){ page.style.zoom=Math.min(1,(window.innerWidth-24)/W); page.style.margin='12px auto'; }
  function printFit(){ page.style.zoom=Math.min(1,730/W); page.style.margin='0'; }
  window.addEventListener('resize',fit);
  window.addEventListener('beforeprint',printFit);
  window.addEventListener('afterprint',fit);
  fit();
</script></body></html>`;
}