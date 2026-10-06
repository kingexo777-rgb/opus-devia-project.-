import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

function LockIcon({ size = 24 }: IconProps) {
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
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ size = 19 }: IconProps) {
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
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saved, setSaved] = useState(false);

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const canSave =
    currentPassword.trim() &&
    newPassword.trim() &&
    confirmPassword.trim() &&
    passwordsMatch;

  const handleSave = () => {
    if (!canSave) return;

    // Backend password update will be connected here later.

    setSaved(true);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setTimeout(() => {
      setSaved(false);
    }, 2500);
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

        <h1>Change Password</h1>

        <div className="profile-settings-header-spacer" />

      </header>

      {/* ================= CONTENT ================= */}

      <main className="profile-settings-content">

        {/* ================= HERO ================= */}

        <section className="profile-settings-hero change-password-hero">

          <div className="change-password-hero-icon">
            <LockIcon />
          </div>

          <h2>Update your password</h2>

          <p>
            Create a new password to help keep your Opus Devia account secure.
          </p>

        </section>

        {/* ================= PASSWORD FORM ================= */}

        <section className="profile-settings-section">

          <div className="profile-settings-label">
            PASSWORD
          </div>

          <div className="profile-settings-card change-password-form-card">

            {/* Current Password */}

            <div className="password-field">

              <label htmlFor="current-password">
                Current Password
              </label>

              <div className="password-input-wrapper">

                <input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-visibility-button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  aria-label={
                    showCurrent
                      ? "Hide current password"
                      : "Show current password"
                  }
                >
                  <EyeIcon />
                </button>

              </div>

            </div>

            {/* New Password */}

            <div className="password-field">

              <label htmlFor="new-password">
                New Password
              </label>

              <div className="password-input-wrapper">

                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-visibility-button"
                  onClick={() => setShowNew(!showNew)}
                  aria-label={
                    showNew
                      ? "Hide new password"
                      : "Show new password"
                  }
                >
                  <EyeIcon />
                </button>

              </div>

            </div>

            {/* Confirm Password */}

            <div className="password-field last">

              <label htmlFor="confirm-password">
                Confirm New Password
              </label>

              <div
                className={`password-input-wrapper ${
                  confirmPassword && !passwordsMatch
                    ? "has-error"
                    : ""
                }`}
              >

                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-visibility-button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={
                    showConfirm
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <EyeIcon />
                </button>

              </div>

              {confirmPassword && !passwordsMatch && (
                <span className="password-error">
                  Passwords do not match.
                </span>
              )}

            </div>

          </div>

        </section>

        {/* ================= PASSWORD INFO ================= */}

        <div className="change-password-info">

          <div className="change-password-info-icon">
            i
          </div>

          <p>
            Use a strong password that you don't use for other accounts.
          </p>

        </div>

        {/* ================= SAVE ================= */}

        <button
          className={`change-password-save-button ${
            saved ? "is-saved" : ""
          }`}
          onClick={handleSave}
          disabled={!canSave}
        >
          {saved ? "Password Updated" : "Update Password"}
        </button>

      </main>
    </div>
  );
};

export default ChangePassword;