import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./ProfileSettings.css";

interface IconProps {
  size?: number;
}

function ArrowLeftIcon({ size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function EditIcon({ size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

const DisplayName: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);

  // Load the profile's display name once it becomes available.
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  const handleSave = () => {
    if (!displayName.trim()) return;

    // Backend update will be connected here later.
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  return (
    <div className="profile-settings-page">

      {/* ================= HEADER ================= */}

      <header className="profile-settings-header">

        <button
          className="profile-settings-back"
          onClick={() => navigate("/settings/profile")}
          aria-label="Back to Profile"
        >
          <ArrowLeftIcon />
        </button>

        <h1>Display Name</h1>

        <div className="profile-settings-header-spacer" />

      </header>

      {/* ================= CONTENT ================= */}

      <main className="profile-settings-content">

        {/* ================= HERO ================= */}

        <section className="profile-settings-hero display-name-hero">

          <div className="display-name-hero-icon">
            <EditIcon />
          </div>

          <h2>Choose your display name</h2>

          <p>
            This is the name people will see across Opus Devia.
          </p>

        </section>

        {/* ================= DISPLAY NAME ================= */}

        <section className="profile-settings-section">

          <div className="profile-settings-label">
            DISPLAY NAME
          </div>

          <div className="profile-settings-card display-name-form-card">

            <div className="display-name-input-wrapper">

              <EditIcon size={18} />

              <input
                type="text"
                value={loading ? "" : displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setSaved(false);
                }}
                placeholder="Enter your display name"
                maxLength={30}
                autoComplete="off"
                disabled={loading}
              />

            </div>

            <div className="display-name-character-count">
              {displayName.length}/30
            </div>

          </div>

        </section>

        {/* ================= INFO ================= */}

        <div className="display-name-info">

          <div className="display-name-info-icon">
            i
          </div>

          <p>
            Your display name is shown throughout Opus Devia. Choose a name
            you're comfortable using across the platform.
          </p>

        </div>

        {/* ================= SAVE ================= */}

        <button
          className={`display-name-save-button ${saved ? "is-saved" : ""}`}
          onClick={handleSave}
          disabled={!displayName.trim() || loading}
        >
          {saved ? "Display Name Saved" : "Save Display Name"}
        </button>

      </main>
    </div>
  );
};

export default DisplayName;