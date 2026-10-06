import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const RequestDataDeletion: React.FC = () => {
  const navigate = useNavigate();

  const [deletionRequested, setDeletionRequested] = useState(false);

  const handleDeletionRequest = () => {
    setDeletionRequested(true);
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

        <h1>Request Data Deletion</h1>

        <div className="data-privacy-header-spacer" />

      </header>


      {/* ================= CONTENT ================= */}

      <main className="data-privacy-content">

        {/* ================= HERO ================= */}

        <section className="data-privacy-hero">

          <div className="data-privacy-hero-icon">
            ×
          </div>

          <p>
            Request the deletion of eligible personal
            information associated with your Opus account.
          </p>

        </section>


        {/* ================= DATA THAT MAY BE DELETED ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            DATA THAT MAY BE DELETED
          </div>

          <div className="data-privacy-card">

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
                  Goals, tasks, progress, and other
                  eligible activity stored in Opus.
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
                  Eligible mentor preferences and
                  related personalization information.
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
                  Personal Preferences
                </h3>

                <p>
                  Eligible preferences and settings
                  associated with your experience.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ================= REQUEST ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            REQUEST
          </div>

          <div className="data-privacy-card">

            {!deletionRequested ? (

              <button
                type="button"
                className="data-privacy-row"
                onClick={handleDeletionRequest}
              >

                <div className="data-privacy-row-icon">
                  ×
                </div>

                <div className="data-privacy-row-content">

                  <h3>
                    Request Data Deletion
                  </h3>

                  <p>
                    Submit a request to remove eligible
                    personal information from Opus.
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
                    Deletion Request Submitted
                  </h3>

                  <p>
                    Your request has been recorded.
                    The deletion workflow will be connected
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
            Some information may need to be retained to
            provide essential services, maintain security,
            or meet applicable requirements.
          </span>

        </div>

      </main>

    </div>
  );
};

export default RequestDataDeletion;