import { nextSeq, peekSeq } from "../models/Counter.js";

// Asset ID format: ICT-XX-00001  (XX = type code)
export const TYPE_CODES = {
  Laptop: "LP",
  Monitor: "MT",
  Desktop: "DC",
  Printer: "PR",
  Keyboard: "KB",
  Mouse: "MS",
  AVR: "AV",
  UPS: "PS",
  "CCTV Camera": "CV",
  CCTV: "CV",
  DVR: "DV",
  NVR: "NV",
  Router: "RT",
  Switch: "ST",
  Telephone: "TP",
  Biometrics: "BM",
  Biometric: "BM",
  Tablet: "TB",
  "Access Point": "AP",
  Server: "SV",
};

export const typeCode = (assetType = "") => TYPE_CODES[assetType] || "OT";
const pad = (n) => String(n).padStart(5, "0");

export async function generateAssetId(assetType) {
  const code = typeCode(assetType);
  const seq = await nextSeq(`asset:${code}`);
  return `ICT-${code}-${pad(seq)}`;
}

export async function previewAssetId(assetType) {
  const code = typeCode(assetType);
  return `ICT-${code}-${pad(await peekSeq(`asset:${code}`))}`;
}

// e.g. MR-2026-00001, TKT-2026-00001, SRF-2026-00001
export async function generateDocNo(prefix) {
  const year = new Date().getFullYear();
  const seq = await nextSeq(`doc:${prefix}:${year}`);
  return `${prefix}-${year}-${pad(seq)}`;
}