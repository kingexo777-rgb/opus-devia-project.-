import React from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const YourData: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="data-privacy-page">

      {/* ================= HEADER ================= */}

      <header className="data-privacy-header">

        <button
          className="data-privacy-back"
          onClick={() =>
            navigate("/settings/data-privacy")
          }
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

        <h1>Your Data</h1>

        <div className="data-privacy-header-spacer" />

      </header>


      {/* ================= CONTENT ================= */}

      <main className="data-privacy-content">

        {/* ================= HERO ================= */}

        <section className="data-privacy-hero">

          <div className="data-privacy-hero-icon">
            ◇
          </div>

          <p>
            View and manage the information associated
            with your Opus account.
          </p>

        </section>


        {/* ================= YOUR INFORMATION ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            YOUR INFORMATION
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
                  Information associated with your
                  Opus account and settings.
                </p>

              </div>

            </div>


            {/* ACTIVITY & PROGRESS */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ◉
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Activity &amp; Progress
                </h3>

                <p>
                  Your goals, tasks, progress, and
                  activity within Opus.
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
                  Information used to personalize
                  your AI mentor experience.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ================= DATA ACTIONS ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            DATA ACTIONS
          </div>

          <div className="data-privacy-card">

            {/* EXPORT */}

            <button
              type="button"
              className="data-privacy-row"
              onClick={() =>
                navigate("/settings/data-privacy/your-data/export")
              }
            >

              <div className="data-privacy-row-icon">
                ↓
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Export My Data
                </h3>

                <p>
                  Request a copy of the information
                  associated with your account.
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


            {/* DELETE DATA */}

            <button
              type="button"
              className="data-privacy-row"
              onClick={() =>
                navigate("/settings/data-privacy/your-data/delete")
              }
            >

              <div className="data-privacy-row-icon">
                ×
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Request Data Deletion
                </h3>

                <p>
                  Request deletion of eligible
                  personal information.
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


        {/* ================= NOTE ================= */}

        <div className="data-privacy-note">

          <span className="data-privacy-note-icon">
            ✦
          </span>

          <span>
            Some information may need to be retained
            to provide essential Opus services or meet
            applicable requirements.
          </span>

        </div>

      </main>

    </div>
  );
};

export default YourData;