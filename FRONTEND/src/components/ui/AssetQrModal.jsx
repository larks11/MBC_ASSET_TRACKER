import { useRef } from "react";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import { esc, openPrintWindow } from "../../utils/printHistory.js";

export default function AssetQrModal({ asset, onClose }) {
  const box = useRef(null);

  const printLabel = () => {
    const svg = box.current?.innerHTML || "";
    openPrintWindow(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(asset.assetId)}</title>
<style>
  @page { margin: 10mm; }
  body { font-family: Arial, sans-serif; display: flex; justify-content: center; }
  .label { width: 62mm; border: 1px solid #0a2e1f; padding: 4mm; text-align: center; }
  .label svg { width: 40mm; height: 40mm; }
  .co { font-size: 9px; letter-spacing: 1px; color: #0a2e1f; font-weight: bold; text-transform: uppercase; }
  .id { font-size: 15px; font-weight: bold; margin: 3px 0; color: #0f5a37; }
  .meta { font-size: 10px; color: #444; }
</style></head><body>
  <div class="label">
    <div class="co">MAC Builders Corp. · ICT</div>
    ${svg}
    <div class="id">${esc(asset.assetId)}</div>
    <div class="meta">${esc(asset.assetType)} · ${esc([asset.brand, asset.model].filter(Boolean).join(" "))}</div>
  </div>
</body></html>`);
  };

  return (
    <Modal
      open={!!asset}
      onClose={onClose}
      size="sm"
      title="Asset QR code"
      footer={
        <>
          <Button icon={Printer} onClick={printLabel}>Print label</Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </>
      }
    >
      {asset && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div ref={box} className="rounded border border-line bg-white p-3">
            <QRCodeSVG value={asset.assetId} size={190} level="M" />
          </div>
          <p className="tabular text-lg font-semibold text-navy-800">{asset.assetId}</p>
          <p className="text-sm text-slate-500">
            {asset.assetType} · {[asset.brand, asset.model].filter(Boolean).join(" ")}
          </p>
        </div>
      )}
    </Modal>
  );
}