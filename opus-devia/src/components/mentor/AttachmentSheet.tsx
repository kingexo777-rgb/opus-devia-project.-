import { useRef, useState } from "react";
import "./AttachmentSheet.css";

interface AttachmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraSelect: () => void;
  onPhotoSelect: (file: File) => void;
  onFileSelect: (file: File) => void;
  onLinkSubmit: (url: string) => void;
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m3 17 5-5 3 3 2-2 8 7" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5M8 13h8M8 17h6" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m10 13.5 4-4" />
      <path d="M7.5 17.5H6a4 4 0 0 1 0-8h4" />
      <path d="M16.5 6.5H18a4 4 0 0 1 0 8h-4" />
    </svg>
  );
}

const DOCUMENT_AND_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  ".pdf",
  ".md",
  ".txt",
  ".docx",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

export default function AttachmentSheet({
  isOpen,
  onClose,
  onCameraSelect,
  onPhotoSelect,
  onFileSelect,
  onLinkSubmit,
}: AttachmentSheetProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState("");

  if (!isOpen) return null;

  const submitLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    onLinkSubmit(url);
    setLinkUrl("");
  };

  return (
    <div className="attachment-sheet-layer" role="dialog" aria-modal="true" aria-label="Add attachment">
      <button type="button" className="attachment-sheet-overlay" onClick={onClose} aria-label="Close attachment options" />
      <section className="attachment-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="attachment-sheet-handle" />
        <div className="attachment-sheet-options">
          <button type="button" className="attachment-sheet-option" onClick={onCameraSelect}>
            <span className="attachment-sheet-icon"><CameraIcon /></span>
            <span>Camera</span>
          </button>
          <button type="button" className="attachment-sheet-option" onClick={() => photoInputRef.current?.click()}>
            <span className="attachment-sheet-icon"><ImageIcon /></span>
            <span>Photos</span>
          </button>
          <button type="button" className="attachment-sheet-option" onClick={() => fileInputRef.current?.click()}>
            <span className="attachment-sheet-icon"><FileIcon /></span>
            <span>Files</span>
          </button>
          <div className="attachment-sheet-link-row">
            <span className="attachment-sheet-icon"><LinkIcon /></span>
            <input
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") submitLink(); }}
              placeholder="Paste a URL"
              aria-label="Paste a URL"
              autoFocus
            />
            <button type="button" onClick={submitLink} aria-label="Submit URL" disabled={!linkUrl.trim()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            </button>
          </div>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="attachment-sheet-hidden-input"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) onPhotoSelect(file); event.target.value = ""; }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={DOCUMENT_AND_IMAGE_TYPES}
          className="attachment-sheet-hidden-input"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) onFileSelect(file); event.target.value = ""; }}
        />
      </section>
    </div>
  );
}
