import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const DeleteAccount: React.FC = () => {
  const navigate = useNavigate();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  const handleDeleteRequest = () => {
    setDeleteRequested(true);
    setShowConfirmation(false);
  };

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

        <h1>Delete Account</h1>

        <div className="data-privacy-header-spacer" />

      </header>


      {/* ================= CONTENT ================= */}

      <main className="data-privacy-content">

        {/* ================= HERO ================= */}

        <section className="data-privacy-hero">

          <div className="data-privacy-hero-icon delete-account-icon">
            ×
          </div>

          <p>
            Permanently remove your Opus account and
            associated information.
          </p>

        </section>


        {/* ================= WARNING ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            BEFORE YOU CONTINUE
          </div>

          <div className="data-privacy-card">

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                !
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  This action may be permanent
                </h3>

                <p>
                  Deleting your account may remove your
                  account information, goals, tasks,
                  progress, and other associated data.
                </p>

              </div>

            </div>


            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ◉
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Your progress may be lost
                </h3>

                <p>
                  Information connected to your Opus
                  experience may no longer be available
                  after deletion.
                </p>

              </div>

            </div>


            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ↓
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Export your data first
                </h3>

                <p>
                  If you want to keep a copy of your
                  information, export your data before
                  deleting your account.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ================= DELETE ACTION ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            ACCOUNT DELETION
          </div>

          <div className="data-privacy-card">

            {!deleteRequested ? (

              <button
                type="button"
                className="data-privacy-row delete-account-action"
                onClick={() =>
                  setShowConfirmation(true)
                }
              >

                <div className="data-privacy-row-icon">
                  ×
                </div>

                <div className="data-privacy-row-content">

                  <h3>
                    Delete My Account
                  </h3>

                  <p>
                    Begin the account deletion process.
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
                    Deletion Request Recorded
                  </h3>

                  <p>
                    Your request has been recorded.
                    The account deletion workflow will be
                    connected to your account later.
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


        {/* ================= CONFIRMATION ================= */}

        {showConfirmation && !deleteRequested && (

          <div className="delete-confirmation-overlay">

            <div className="delete-confirmation">

              <div className="delete-confirmation-icon">
                !
              </div>

              <h2>
                Delete your account?
              </h2>

              <p>
                This action may permanently remove your
                Opus account and associated information.
                Make sure you have exported anything you
                want to keep.
              </p>

              <div className="delete-confirmation-actions">

                <button
                  type="button"
                  className="delete-cancel-button"
                  onClick={() =>
                    setShowConfirmation(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="delete-confirm-button"
                  onClick={handleDeleteRequest}
                >
                  Confirm Deletion
                </button>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>
  );
};

export default DeleteAccount;