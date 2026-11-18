import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

const TPL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "templates");

const longDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" }) : "";

/**
 * MBC-SP-WHS-06F1 Memorandum Receipt.
 * Ang gamit nga template kay ang imong original nga naay {tags} na sa blank cells
 * (MBC-SP-WHS-06F1.tagged.docx), mao nga nagpabilin ang logo, header, terms ug signature blocks.
 * txn kinahanglan naay populated nga items.asset.
 */
export function memorandumReceiptDocx(txn) {
  const emp = txn.employeeSnapshot || {};
  const data = {
    transactionNo: txn.transactionNo || "",
    dateIssued: longDate(txn.date),
    employeeName: (emp.name || "").toUpperCase(),
    position: emp.position || "",
    department: [txn.department || emp.department, txn.location].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" / "),
    items: (txn.items || []).map((it) => {
      const a = it.asset || {};
      return {
        assetType: (a.assetType || "").toUpperCase(),
        assetId: a.assetId || "",
        qty: it.qty ?? 1,
        brandModel: [a.brand, a.model].filter(Boolean).join(" / "),
        serialNo: a.serialNo || "",
        details: it.details || "",
      };
    }),
    issuedByName: (txn.issuedBy?.name || "").toUpperCase(),
    notedByName: (txn.notedBy?.name || "").toUpperCase(),
  };

  const zip = new PizZip(fs.readFileSync(path.join(TPL, "MBC-SP-WHS-06F1.tagged.docx")));
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
