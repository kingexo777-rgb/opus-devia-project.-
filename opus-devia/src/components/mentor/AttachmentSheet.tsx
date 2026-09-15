import { useRef, useState } from "react";

// Icon components
const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ImageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const PaperclipIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const LinkIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

interface AttachmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraSelect: () => void;
  onPhotoSelect: (file: File) => void;
  onFileSelect: (file: File) => void;
  onLinkSubmit: (url: string) => void;
}

export default function AttachmentSheet({
  isOpen,
  onClose,
  onCameraSelect,
  onPhotoSelect,
  onFileSelect,
  onLinkSubmit,
}: AttachmentSheetProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCameraClick = () => {
    onCameraSelect();
    onClose();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoSelect(file);
      onClose();
    }
    e.target.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      onClose();
    }
    e.target.value = "";
  };

  const handleLinkOption = () => {
    setShowLinkInput(true);
  };

  const handleLinkConfirm = () => {
    const trimmed = linkInput.trim();
    if (trimmed) {
      onLinkSubmit(trimmed);
      setLinkInput("");
      setShowLinkInput(false);
      onClose();
    }
  };

  const handleLinkCancel = () => {
    setShowLinkInput(false);
    setLinkInput("");
  };

  const ATTACHMENT_OPTIONS = [
    { id: "camera", label: "Camera", icon: CameraIcon },
    { id: "photos", label: "Photos", icon: ImageIcon },
    { id: "files", label: "Files", icon: PaperclipIcon },
    { id: "link", label: "Paste Link", icon: LinkIcon },
  ];

  return (
    <>
      {/* Dimmed overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          zIndex: 999,
        }}
      />

      {/* Bottom sheet container */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(26, 29, 39, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "20px 20px 0 0",
          zIndex: 1000,
          maxWidth: 430,
          margin: "0 auto",
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Drag handle bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "16px 0 8px 0",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "rgba(255, 255, 255, 0.2)",
            }}
          />
        </div>

        {/* Link input (conditionally shown) */}
        {showLinkInput ? (
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                autoFocus
                type="text"
                placeholder="Paste a URL"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLinkConfirm();
                  if (e.key === "Escape") handleLinkCancel();
                }}
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "#F5F5F5",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleLinkConfirm}
                aria-label="Confirm link"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9a0000",
                  cursor: "pointer",
                  fontSize: 18,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✓
              </button>
              <button
                onClick={handleLinkCancel}
                aria-label="Cancel"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#B0B0B0",
                  cursor: "pointer",
                  fontSize: 18,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          /* Attachment options */
          <div style={{ padding: "8px 0" }}>
            {ATTACHMENT_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    if (option.id === "camera") handleCameraClick();
                    else if (option.id === "photos") photoInputRef.current?.click();
                    else if (option.id === "files") fileInputRef.current?.click();
                    else if (option.id === "link") handleLinkOption();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 20px",
                    background: "transparent",
                    border: "none",
                    width: "100%",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(154, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#F5F5F5",
                    }}
                  >
                    <IconComponent />
                  </div>
                  <span
                    style={{
                      fontSize: 16,
                      color: "#F5F5F5",
                      fontWeight: 500,
                    }}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: "none" }}
        onChange={handlePhotoSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.md,.txt,.docx,application/pdf,text/plain,text/markdown,text/x-markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />
    </>
  );
}
