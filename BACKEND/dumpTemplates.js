// Gamiton ra aron mabasa ang sulod sa mga template. Dili ni bahin sa app.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "templates");
const out = [];

const textOf = (cell) => {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if (v.formula) return `=${v.formula}`;
    if (v.result != null) return String(v.result);
    if (v.text) return String(v.text);
    return "";
  }
  return String(v);
};

for (const file of fs.readdirSync(dir).sort()) {
  if (file.startsWith("~$")) continue;
  const full = path.join(dir, file);
  out.push(`\n\n########## ${file} ##########`);

  if (file.toLowerCase().endsWith(".xlsx")) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(full);
      wb.eachSheet((ws) => {
        out.push(`SHEET "${ws.name}" rows=${ws.rowCount} cols=${ws.columnCount} images=${(ws.getImages?.() || []).length}`);
        out.push(`PRINTAREA ${ws.pageSetup?.printArea || "-"}`);
        out.push(`MERGES ${(ws.model.merges || []).join(", ")}`);
        ws.eachRow((row) =>
          row.eachCell((c) => {
            const t = textOf(c).replace(/\s+/g, " ").trim();
            if (t) out.push(`${c.address}\t${t}`);
          })
        );
      });
    } catch (e) {
      out.push(`ERROR reading xlsx: ${e.message}`);
    }
  } else if (file.toLowerCase().endsWith(".docx")) {
    try {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(fs.readFileSync(full));
      const xml = await zip.file("word/document.xml").async("string");
      out.push(
        xml
          .replace(/<\/w:p>/g, "\n")
          .replace(/<\/w:tc>/g, " | ")
          .replace(/<w:tab\/>/g, "\t")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      );
    } catch (e) {
      out.push(`ERROR reading docx: ${e.message}`);
    }
  }
}

fs.writeFileSync(path.join(__dirname, "..", "templates_dump.txt"), out.join("\n"), "utf8");
console.log("Done: templates_dump.txt (naa sa MAC_BUILDERS_ASSET_TRACKER folder)");