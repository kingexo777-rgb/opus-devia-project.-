import React from "react";
import { useNavigate } from "react-router-dom";
import "./SettingsSubPage.css";

const Mentor: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-subpage">

      {/* ================= HEADER ================= */}

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

        <h1>Mentor</h1>

        <div className="header-spacer" />
      </div>


      {/* ================= CONTENT ================= */}

      <div className="subpage-content">

        {/* ================= HERO ================= */}

        <div className="subpage-hero">

          <div className="hero-icon">
            ♙
          </div>

          <p>
            Get guidance, feedback, and personalized support
            to help you grow on your journey.
          </p>

        </div>


        {/* ================= MENTOR OPTIONS ================= */}

        <div className="settings-card">

          {/* ================= YOUR MENTOR ================= */}

          <button
            className="notification-row clickable-row"
            onClick={() => navigate("/settings/mentor/your-mentor")}
          >
            <div className="notification-icon">
              ✦
            </div>

            <div className="notification-info">

              <div className="notification-title">
                Your Mentor
              </div>

              <div className="notification-description">
                AI-powered guidance for your business and life goals.
              </div>

            </div>

            <span className="chevron">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>

          </button>


          {/* ================= MENTOR SETTINGS ================= */}

          <button
            className="notification-row clickable-row"
            onClick={() => navigate("/settings/mentor/settings")}
          >
            <div className="notification-icon">
              ⚙
            </div>

            <div className="notification-info">

              <div className="notification-title">
                Mentor Settings
              </div>

              <div className="notification-description">
                Customize your mentor's focus and preferences.
              </div>

            </div>

            <span className="chevron">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>

          </button>

        </div>

      </div>

    </div>
  );
};

export default Mentor;