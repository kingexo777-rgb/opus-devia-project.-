import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const UsageData: React.FC = () => {
  const navigate = useNavigate();

  const [activityTracking, setActivityTracking] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  return (
    <div className="data-privacy-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="data-privacy-header">

        <button
          className="data-privacy-back"
          onClick={() => navigate("/settings/data-privacy/privacy-settings")}
          aria-label="Back to Privacy Settings"
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
          Usage Data
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
            ◉
          </div>

          <p>
            Understand what activity data Opus uses
            and control how it contributes to your experience.
          </p>

        </section>


        {/* =====================================================
            WHAT WE COLLECT
            ===================================================== */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            DATA WE COLLECT
          </div>

          <div className="data-privacy-card">


            {/* APP ACTIVITY */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ◇
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  App Activity
                </h3>

                <p>
                  Information about how you interact with
                  features and pages in Opus.
                </p>

              </div>

            </div>


            {/* PROGRESS */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ✦
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Goals &amp; Progress
                </h3>

                <p>
                  Information about goals, tasks, and progress
                  used to support your experience.
                </p>

              </div>

            </div>


            {/* PREFERENCES */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ⚙
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Preferences
                </h3>

                <p>
                  Your selected settings and preferences
                  that help Opus remember how you use the app.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            USAGE CONTROLS
            ===================================================== */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            USAGE CONTROLS
          </div>

          <div className="data-privacy-card">


            {/* ACTIVITY TRACKING */}

            <div className="data-privacy-toggle-row">

              <div className="data-privacy-toggle-content">

                <h3>
                  Activity Tracking
                </h3>

                <p>
                  Allow Opus to save activity that helps
                  track your progress.
                </p>

              </div>

              <button
                type="button"
                className={`data-privacy-toggle ${
                  activityTracking ? "is-on" : ""
                }`}
                onClick={() =>
                  setActivityTracking(!activityTracking)
                }
                aria-label="Toggle activity tracking"
                aria-pressed={activityTracking}
              >
                <span />
              </button>

            </div>


            {/* ANALYTICS */}

            <div className="data-privacy-toggle-row">

              <div className="data-privacy-toggle-content">

                <h3>
                  Analytics
                </h3>

                <p>
                  Allow anonymous usage information to help
                  improve Opus.
                </p>

              </div>

              <button
                type="button"
                className={`data-privacy-toggle ${
                  analytics ? "is-on" : ""
                }`}
                onClick={() =>
                  setAnalytics(!analytics)
                }
                aria-label="Toggle analytics"
                aria-pressed={analytics}
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
            Some information may still be required to provide
            core Opus features and keep your account working.
          </span>

        </div>

      </main>

    </div>
  );
};

export default UsageData;