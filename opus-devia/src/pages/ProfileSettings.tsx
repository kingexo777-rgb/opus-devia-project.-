import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./ProfileSettings.css";

interface ArrowIconProps {
  size?: number;
}

function ArrowLeftIcon({ size = 22 }: ArrowIconProps) {
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

function ChevronIcon({ size = 19 }: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function UserIcon({ size = 20 }: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function MailIcon({ size = 20 }: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function EditIcon({ size = 20 }: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function LockIcon({ size = 20 }: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  const displayName = profile?.display_name || "KING";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="profile-settings-page">

      {/* ================= HEADER ================= */}

      <header className="profile-settings-header">
        <button
          className="profile-settings-back"
          onClick={() => navigate("/settings")}
          aria-label="Back to Settings"
        >
          <ArrowLeftIcon />
        </button>

        <h1>Profile</h1>

        <div className="profile-settings-header-spacer" />
      </header>

      {/* ================= CONTENT ================= */}

      <main className="profile-settings-content">

        {/* ================= PROFILE HERO ================= */}

        <section className="profile-settings-hero">

          <div className="profile-settings-avatar">
            <span>
              {loading ? "..." : initial}
            </span>
          </div>

          <h2>
            {loading ? "..." : displayName}
          </h2>

          <p>
            Manage your account and personal information.
          </p>

        </section>

        {/* ================= ACCOUNT ================= */}

        <section className="profile-settings-section">

          <div className="profile-settings-label">
            ACCOUNT
          </div>

          <div className="profile-settings-card">

            {/* Username */}

              <button
                className="profile-settings-row"
                onClick={() => navigate("/settings/profile/username")}
              >
              <div className="profile-settings-row-icon">
                <UserIcon />
              </div>

              <div className="profile-settings-row-content">
                <h3>Username</h3>
                <p>{loading ? "Loading..." : displayName}</p>
              </div>

              <div className="profile-settings-row-arrow">
                <ChevronIcon />
              </div>
            </button>

            {/* Email */}

              <button
                className="profile-settings-row last"
                onClick={() => navigate("/settings/profile/email")}
              >
              <div className="profile-settings-row-icon">
                <MailIcon />
              </div>

              <div className="profile-settings-row-content">
                <h3>Email</h3>
                <p>
                  Account email
                </p>
              </div>

              <div className="profile-settings-row-arrow">
                <ChevronIcon />
              </div>
            </button>

          </div>

        </section>

        {/* ================= PERSONALIZATION ================= */}

        <section className="profile-settings-section">

          <div className="profile-settings-label">
            PERSONALIZATION
          </div>

          <div className="profile-settings-card">

            <button
              className="profile-settings-row last"
              onClick={() => navigate("/settings/profile/display-name")}
            >
              <div className="profile-settings-row-icon">
                <EditIcon />
              </div>

              <div className="profile-settings-row-content">
                <h3>Display Name</h3>
                <p>
                  Choose how your name appears across Opus Devia.
                </p>
              </div>

              <div className="profile-settings-row-arrow">
                <ChevronIcon />
              </div>
            </button>

          </div>

        </section>

        {/* ================= SECURITY ================= */}

        <section className="profile-settings-section">

          <div className="profile-settings-label">
            ACCOUNT SECURITY
          </div>

          <div className="profile-settings-card">

            <button
              className="profile-settings-row last"
              onClick={() => navigate("/settings/profile/change-password")}
            >
              <div className="profile-settings-row-icon">
                <LockIcon />
              </div>

              <div className="profile-settings-row-content">
                <h3>Change Password</h3>
                <p>
                  Update your account password.
                </p>
              </div>

              <div className="profile-settings-row-arrow">
                <ChevronIcon />
              </div>
            </button>

          </div>

        </section>

        {/* ================= ACCOUNT STATUS ================= */}

        <div className="profile-settings-note">
          <span className="profile-settings-note-dot" />
          Your account is active
        </div>

      </main>
    </div>
  );
};

export default ProfileSettings;