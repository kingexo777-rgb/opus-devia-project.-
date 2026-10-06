import React, { useState } from "react";
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

function MailIcon({ size = 24 }: IconProps) {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

const Email: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  // Change this to the actual email field from your profile if you have one.
  const [email, setEmail] = useState("");

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!email.trim()) return;

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

        <h1>Email</h1>

        <div className="profile-settings-header-spacer" />

      </header>

      {/* ================= CONTENT ================= */}

      <main className="profile-settings-content">

        {/* ================= HERO ================= */}

        <section className="profile-settings-hero email-hero">

          <div className="email-hero-icon">
            <MailIcon />
          </div>

          <h2>Manage your email</h2>

          <p>
            Update the email address associated with your Opus Devia account.
          </p>

        </section>

        {/* ================= EMAIL ================= */}

        <section className="profile-settings-section">

          <div className="profile-settings-label">
            EMAIL ADDRESS
          </div>

          <div className="profile-settings-card email-form-card">

            <div className="email-input-wrapper">

              <MailIcon size={18} />

              <input
                type="email"
                value={loading ? "" : email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSaved(false);
                }}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
              />

            </div>

          </div>

        </section>

        {/* ================= INFO ================= */}

        <div className="email-info">

          <div className="email-info-icon">
            i
          </div>

          <p>
            Make sure you use an email address you can access. It may be used
            for important account and security updates.
          </p>

        </div>

        {/* ================= SAVE ================= */}

        <button
          className={`email-save-button ${saved ? "is-saved" : ""}`}
          onClick={handleSave}
          disabled={!email.trim() || loading}
        >
          {saved ? "Email Saved" : "Save Email"}
        </button>

      </main>
    </div>
  );
};

export default Email;