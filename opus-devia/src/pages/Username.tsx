import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./ProfileSettings.css";

function ArrowLeftIcon({ size = 22 }: { size?: number }) {
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

function UserIcon({ size = 24 }: { size?: number }) {
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

const Username: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  const [username, setUsername] = useState(
    profile?.display_name || "KING"
  );

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!username.trim()) return;

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

        <h1>Username</h1>

        <div className="profile-settings-header-spacer" />

      </header>


      {/* ================= CONTENT ================= */}

      <main className="profile-settings-content">

        {/* ================= HERO ================= */}

        <section className="profile-settings-hero username-hero">

          <div className="username-hero-icon">
            <UserIcon />
          </div>

          <h2>Choose your username</h2>

          <p>
            Your username is how you'll appear across Opus Devia.
          </p>

        </section>


        {/* ================= USERNAME FORM ================= */}

        <section className="profile-settings-section">

          <div className="profile-settings-label">
            USERNAME
          </div>

          <div className="profile-settings-card username-form-card">

            <div className="username-input-wrapper">

              <span className="username-input-prefix">
                @
              </span>

              <input
                type="text"
                value={loading ? "" : username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setSaved(false);
                }}
                placeholder="Enter your username"
                maxLength={30}
                autoComplete="off"
                disabled={loading}
              />

            </div>

            <div className="username-character-count">
              {username.length}/30
            </div>

          </div>

        </section>


        {/* ================= INFORMATION ================= */}

        <div className="username-info">

          <div className="username-info-icon">
            i
          </div>

          <p>
            Your username can be changed at any time. Choose something
            you'd like others to recognize you by.
          </p>

        </div>


        {/* ================= SAVE ================= */}

        <button
          className={`username-save-button ${
            saved ? "is-saved" : ""
          }`}
          onClick={handleSave}
          disabled={!username.trim() || loading}
        >
          {saved ? "Username Saved" : "Save Username"}
        </button>

      </main>

    </div>
  );
};

export default Username;