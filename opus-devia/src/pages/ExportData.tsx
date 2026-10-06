import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const ExportData: React.FC = () => {
  const navigate = useNavigate();

  const [exportRequested, setExportRequested] = useState(false);

  const handleExportRequest = () => {
    setExportRequested(true);
  };

  return (
    <div className="data-privacy-page">

      {/* ================= HEADER ================= */}

      <header className="data-privacy-header">

        <button
          className="data-privacy-back"
          onClick={() =>
            navigate("/settings/data-privacy/your-data")
          }
          aria-label="Back to Your Data"
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

        <h1>Export My Data</h1>

        <div className="data-privacy-header-spacer" />

      </header>


      {/* ================= CONTENT ================= */}

      <main className="data-privacy-content">

        {/* ================= HERO ================= */}

        <section className="data-privacy-hero">

          <div className="data-privacy-hero-icon">
            ↓
          </div>

          <p>
            Request a copy of the information associated
            with your Opus account.
          </p>

        </section>


        {/* ================= DATA INCLUDED ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            DATA INCLUDED
          </div>

          <div className="data-privacy-card">

            {/* ACCOUNT DATA */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ◎
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Account Data
                </h3>

                <p>
                  Your profile, account settings, and
                  related account information.
                </p>

              </div>

            </div>


            {/* GOALS & PROGRESS */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ◉
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Goals &amp; Progress
                </h3>

                <p>
                  Your goals, tasks, progress, and
                  activity stored in Opus.
                </p>

              </div>

            </div>


            {/* AI & MENTOR DATA */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ✦
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  AI &amp; Mentor Data
                </h3>

                <p>
                  Your mentor preferences and relevant
                  information stored for personalization.
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
                  across the Opus experience.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ================= EXPORT ACTION ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            EXPORT
          </div>

          <div className="data-privacy-card">

            {!exportRequested ? (

              <button
                type="button"
                className="data-privacy-row"
                onClick={handleExportRequest}
              >

                <div className="data-privacy-row-icon">
                  ↓
                </div>

                <div className="data-privacy-row-content">

                  <h3>
                    Request Data Export
                  </h3>

                  <p>
                    Prepare a copy of your Opus data
                    for export.
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

            ) : (

              <div className="data-privacy-toggle-row">

                <div className="data-privacy-row-icon">
                  ✓
                </div>

                <div className="data-privacy-toggle-content">

                  <h3>
                    Export Requested
                  </h3>

                  <p>
                    Your request has been recorded.
                    Export processing will be connected
                    to your account later.
                  </p>

                </div>

              </div>

            )}

          </div>

        </section>


        {/* ================= NOTE ================= */}

        <div className="data-privacy-note">

          <span className="data-privacy-note-icon">
            ✦
          </span>

          <span>
            Your export should contain information
            associated with your Opus account. Some
            information may not be included if it is
            required for essential services or security.
          </span>

        </div>

      </main>

    </div>
  );
};

export default ExportData;