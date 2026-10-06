import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const PrivacySettings: React.FC = () => {
  const navigate = useNavigate();

  const [activityHistory, setActivityHistory] = useState(true);
  const [personalizedExperience, setPersonalizedExperience] = useState(true);

  return (
    <div className="data-privacy-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="data-privacy-header">

        <button
          className="data-privacy-back"
          onClick={() => navigate("/settings/data-privacy")}
          aria-label="Back to Data & Privacy"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <h1>
          Privacy Settings
        </h1>

        <div className="data-privacy-header-spacer" />

      </header>


      {/* =====================================================
          CONTENT
          ===================================================== */}

      <main className="data-privacy-content">


        {/* =====================================================
            HERO
            ===================================================== */}

        <section className="data-privacy-hero">

          <div className="data-privacy-hero-icon">
            ◇
          </div>

          <p>
            Manage how your data is collected,
            used, and handled across Opus.
          </p>

        </section>


        {/* =====================================================
            DATA & PRIVACY OPTIONS
            ===================================================== */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            PRIVACY CONTROLS
          </div>

          <div className="data-privacy-card">


            {/* USAGE DATA */}

            <button
              type="button"
              className="data-privacy-row"
              onClick={() =>
                navigate("/settings/data-privacy/data-usage")
              }
            >

              <div className="data-privacy-row-icon">
                ◉
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Usage Data
                </h3>

                <p>
                  Control how your usage data is collected and used.
                </p>

              </div>

              <div className="data-privacy-chevron">

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

              </div>

            </button>


            {/* AI & MENTOR DATA */}

            <button
              type="button"
              className="data-privacy-row"
              onClick={() =>
                navigate("/settings/data-privacy/ai-mentor-data")
              }
            >

              <div className="data-privacy-row-icon">
                ✦
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  AI &amp; Mentor Data
                </h3>

                <p>
                  Manage data used to personalize your mentor.
                </p>

              </div>

              <div className="data-privacy-chevron">

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

              </div>

            </button>


            {/* COMMUNICATIONS */}

            <button
              type="button"
              className="data-privacy-row"
              onClick={() =>
                navigate("/settings/data-privacy/communications")
              }
            >

              <div className="data-privacy-row-icon">
                ◇
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Communications
                </h3>

                <p>
                  Choose what information you receive from Opus.
                </p>

              </div>

              <div className="data-privacy-chevron">

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

              </div>

            </button>

          </div>

        </section>


        {/* =====================================================
            DATA CONTROLS
            ===================================================== */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            DATA CONTROLS
          </div>

          <div className="data-privacy-card">


            {/* ACTIVITY HISTORY */}

            <div className="data-privacy-toggle-row">

              <div className="data-privacy-toggle-content">

                <h3>
                  Activity History
                </h3>

                <p>
                  Save your activity to help you track your progress.
                </p>

              </div>

              <button
                type="button"
                className={`data-privacy-toggle ${
                  activityHistory ? "is-on" : ""
                }`}
                onClick={() =>
                  setActivityHistory(!activityHistory)
                }
                aria-label="Toggle activity history"
                aria-pressed={activityHistory}
              >
                <span />
              </button>

            </div>


            {/* PERSONALIZED EXPERIENCE */}

            <div className="data-privacy-toggle-row">

              <div className="data-privacy-toggle-content">

                <h3>
                  Personalized Experience
                </h3>

                <p>
                  Allow Opus to personalize your experience.
                </p>

              </div>

              <button
                type="button"
                className={`data-privacy-toggle ${
                  personalizedExperience ? "is-on" : ""
                }`}
                onClick={() =>
                  setPersonalizedExperience(
                    !personalizedExperience
                  )
                }
                aria-label="Toggle personalized experience"
                aria-pressed={personalizedExperience}
              >
                <span />
              </button>

            </div>

          </div>

        </section>


        {/* =====================================================
            NOTE
            ===================================================== */}

        <div className="data-privacy-note">

          <span className="data-privacy-note-icon">
            ✦
          </span>

          <span>
            You can change these preferences at any time.
          </span>

        </div>

      </main>

    </div>
  );
};

export default PrivacySettings;