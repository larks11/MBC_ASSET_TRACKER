import { useRef } from "react";
import { Download, Printer } from "lucide-react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";

export default function FilePreviewModal({
  open, title, html, loading, error, onClose, onDownload, downloading, downloadLabel = "Download Excel",
}) {
  const frame = useRef(null);

  const print = () => {
    const w = frame.current?.contentWindow;
    if (w) {
      w.focus();
      w.print();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      footer={
        <>
          <Button variant="secondary" icon={Printer} onClick={print} disabled={!html}>Print</Button>
          <Button icon={Download} onClick={onDownload} disabled={!html || downloading}>
            {downloading ? "Preparing file..." : downloadLabel}
          </Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </>
      }
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="py-20 text-center text-sm text-slate-500">Preparing preview...</p>}
      {html && (
        <iframe ref={frame} title={title} srcDoc={html} className="h-[70vh] w-full rounded border border-line bg-white" />
      )}
    </Modal>
  );
}