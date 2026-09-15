import { useState } from "react";

// Icon components
const CameraIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ImageIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const PaperclipIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 0 18.8-4.3M22 12.5a10 10 0 0 0-18.8 2.2" />
  </svg>
);

const LinkIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

interface AttachmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraSelect: () => void;
  onPhotoSelect: () => void;
  onFileSelect: () => void;
  onLinkSubmit: (url: string) => void;
}

const ATTACHMENT_OPTIONS = [
  { id: "camera", label: "Camera", icon: CameraIcon },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "files", label: "Files", icon: PaperclipIcon },
  { id: "link", label: "Paste Link", icon: LinkIcon },
];

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

  if (!isOpen) return null;

  const handleOptionClick = (id: string) => {
    if (id === "camera") {
      onCameraSelect();
      onClose();
    } else if (id === "photos") {
      onPhotoSelect();
      onClose();
    } else if (id === "files") {
      onFileSelect();
      onClose();
    } else if (id === "link") {
      setShowLinkInput(true);
    }
  };

  const handleLinkSubmit = () => {
    if (linkInput.trim()) {
      onLinkSubmit(linkInput.trim());
      setLinkInput("");
      setShowLinkInput(false);
      onClose();
    }
  };

  const handleLinkCancel = () => {
    setShowLinkInput(false);
    setLinkInput("");
  };

  return (
    <>
      {/* Dimmed overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          zIndex: 1000,
        }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(26, 29, 39, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          zIndex: 1001,
          animation: "slideUp 0.25s ease-out",
          padding: "0 20px 32px 20px",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "rgba(255, 255, 255, 0.2)",
            }}
          />
        </div>

        {showLinkInput ? (
          <div style={{ paddingTop: 8, paddingBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, color: "#F5F5F5", fontWeight: 500, marginBottom: 12 }}>
              Paste a URL
            </label>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLinkSubmit();
                  if (e.key === "Escape") handleLinkCancel();
                }}
                placeholder="https://..."
                autoFocus
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "#F5F5F5",
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <button
                onClick={handleLinkSubmit}
                style={{
                  background: "rgba(154, 0, 0, 0.8)",
                  border: "none",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#F5F5F5",
                  fontSize: 16,
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = "rgba(154, 0, 0, 1)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = "rgba(154, 0, 0, 0.8)";
                }}
              >
                ✓
              </button>
              <button
                onClick={handleLinkCancel}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "none",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#F5F5F5",
                  fontSize: 16,
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.06)";
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <>
            {ATTACHMENT_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 20px",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = "rgba(154, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = "transparent";
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
                      flexShrink: 0,
                    }}
                  >
                    <IconComponent size={20} />
                  </div>
                  <span
                    style={{
                      fontSize: 16,
                      color: "#F5F5F5",
                      fontWeight: 500,
                      textAlign: "left",
                    }}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
