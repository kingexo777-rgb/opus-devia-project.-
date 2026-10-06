import React from "react";
import { useNavigate } from "react-router-dom";
import "./SettingsSubPage.css";

const DataPrivacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-subpage">

      {/* ── HEADER ── */}
      <div className="subpage-header">
        <button
          className="back-button"
          onClick={() => navigate("/settings")}
          aria-label="Back to Settings"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <h1>Data & Privacy</h1>

        <div className="header-spacer" />
      </div>


      {/* ── CONTENT ── */}
      <div className="subpage-content">

        {/* ── HERO ── */}
        <div className="subpage-hero">

          <div className="hero-icon">
            ▣
          </div>

          <p>
            Your data is important. Manage your privacy settings and control
            how your information is used.
          </p>

        </div>


        {/* ── SETTINGS CARD ── */}
        <div className="settings-card">

          {/* Privacy Settings */}
          <button
            className="notification-row clickable-row"
            onClick={() =>
              navigate("/settings/data-privacy/privacy-settings")
            }
          >
            <div className="notification-icon">
              ♢
            </div>

            <div className="notification-info">
              <div className="notification-title">
                Privacy Settings
              </div>

              <div className="notification-description">
                Control what data you share and how it's used.
              </div>
            </div>

            <svg
              className="settings-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>


          {/* Your Data */}
          <button
            className="notification-row clickable-row"
            onClick={() =>
              navigate("/settings/data-privacy/your-data")
            }
          >
            <div className="notification-icon">
              ◉
            </div>

            <div className="notification-info">
              <div className="notification-title">
                Your Data
              </div>

              <div className="notification-description">
                See what data we collect and how it's stored.
              </div>
            </div>

            <svg
              className="settings-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>


          {/* Terms & Conditions */}
          <button
            className="notification-row clickable-row"
            onClick={() =>
              navigate("/settings/data-privacy/terms")
            }
          >
            <div className="notification-icon">
              ▤
            </div>

            <div className="notification-info">
              <div className="notification-title">
                Terms & Conditions
              </div>

              <div className="notification-description">
                Read the terms that govern your use of Opus Devia.
              </div>
            </div>

            <svg
              className="settings-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>


          {/* Privacy Policy */}
          <button
            className="notification-row clickable-row"
            onClick={() =>
              navigate("/settings/data-privacy/privacy-policy")
            }
          >
            <div className="notification-icon">
              ◇
            </div>

            <div className="notification-info">
              <div className="notification-title">
                Privacy Policy
              </div>

              <div className="notification-description">
                Learn how Opus Devia collects, uses, and protects your data.
              </div>
            </div>

            <svg
              className="settings-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>


          {/* Delete Account */}
          <button
            className="notification-row last clickable-row danger-row"
            onClick={() =>
              navigate("/settings/data-privacy/delete-account")
            }
          >
            <div className="notification-icon">
              ♲
            </div>

            <div className="notification-info">
              <div className="notification-title">
                Delete Account
              </div>

              <div className="notification-description">
                Permanently remove your account and data.
              </div>
            </div>

            <svg
              className="settings-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

        </div>
      </div>
    </div>
  );
};

export default DataPrivacy;