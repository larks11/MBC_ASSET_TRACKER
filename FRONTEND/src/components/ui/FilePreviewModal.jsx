import { useRef } from "react";
import { Download, Printer } from "lucide-react";
import { renderAsync } from "docx-preview";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";

const BLANK = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#e9eeea}
  @media print{.docx-wrapper{background:#fff!important;padding:0!important}
  .docx-wrapper>section.docx{box-shadow:none!important;margin:0!important}}
</style></head><body></body></html>`;

export default function FilePreviewModal({
  open, title, html, docxBlob, loading, error, onClose, onDownload, downloading, downloadLabel = "Download Excel",
}) {
  const frame = useRef(null);
  const ready = !!(html || docxBlob);

  const renderDocx = async () => {
    const doc = frame.current?.contentDocument;
    if (!doc || !docxBlob) return;
    try {
      await renderAsync(docxBlob, doc.body, doc.head, {
        className: "docx",
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
      });
    } catch (e) {
      doc.body.innerHTML = `<p style="font:14px Arial;color:#b91c1c;padding:16px">Could not display the Word file: ${e.message}</p>`;
    }
  };

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
          <Button variant="secondary" icon={Printer} onClick={print} disabled={!ready}>Print</Button>
          <Button icon={Download} onClick={onDownload} disabled={!ready || downloading}>
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
      {docxBlob && (
        <iframe
          ref={frame}
          title={title}
          srcDoc={BLANK}
          onLoad={renderDocx}
          className="h-[70vh] w-full rounded border border-line bg-white"
        />
      )}
    </Modal>
  );
}