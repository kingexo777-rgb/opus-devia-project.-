import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const AIMentorData: React.FC = () => {
  const navigate = useNavigate();

  const [personalizedMentor, setPersonalizedMentor] = useState(true);
  const [contextAwareness, setContextAwareness] = useState(true);

  return (
    <div className="data-privacy-page">

      {/* ================= HEADER ================= */}

      <header className="data-privacy-header">

        <button
          className="data-privacy-back"
          onClick={() =>
            navigate("/settings/data-privacy/privacy-settings")
          }
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

        <h1>AI &amp; Mentor Data</h1>

        <div className="data-privacy-header-spacer" />

      </header>

      {/* ================= CONTENT ================= */}

      <main className="data-privacy-content">

        {/* ================= HERO ================= */}

        <section className="data-privacy-hero">

          <div className="data-privacy-hero-icon">
            ✦
          </div>

          <p>
            Manage the information Opus can use to
            personalize your AI mentor experience.
          </p>

        </section>


        {/* ================= DATA USED ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            DATA USED BY YOUR MENTOR
          </div>

          <div className="data-privacy-card">

            {/* GOALS */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ◎
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Goals &amp; Objectives
                </h3>

                <p>
                  Information about your goals that helps
                  your mentor provide relevant guidance.
                </p>

              </div>

            </div>


            {/* TASKS */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ✓
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Tasks &amp; Progress
                </h3>

                <p>
                  Information about tasks and progress used
                  to make more relevant recommendations.
                </p>

              </div>

            </div>


            {/* CONVERSATIONS */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ✦
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Mentor Conversations
                </h3>

                <p>
                  Information from mentor conversations that
                  may help maintain useful context.
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
                  Preferences &amp; Approach
                </h3>

                <p>
                  Your mentor preferences and communication
                  style used to shape your experience.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ================= PERSONALIZATION ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            PERSONALIZATION
          </div>

          <div className="data-privacy-card">

            {/* PERSONALIZED MENTOR */}

            <div className="data-privacy-toggle-row">

              <div className="data-privacy-toggle-content">

                <h3>
                  Personalized Mentor
                </h3>

                <p>
                  Allow Opus to use relevant data to
                  personalize mentor responses.
                </p>

              </div>

              <button
                type="button"
                className={`data-privacy-toggle ${
                  personalizedMentor ? "is-on" : ""
                }`}
                onClick={() =>
                  setPersonalizedMentor(!personalizedMentor)
                }
                aria-label="Toggle personalized mentor"
                aria-pressed={personalizedMentor}
              >
                <span />
              </button>

            </div>


            {/* CONTEXT AWARENESS */}

            <div className="data-privacy-toggle-row">

              <div className="data-privacy-toggle-content">

                <h3>
                  Context Awareness
                </h3>

                <p>
                  Allow your mentor to use relevant account
                  activity for more contextual guidance.
                </p>

              </div>

              <button
                type="button"
                className={`data-privacy-toggle ${
                  contextAwareness ? "is-on" : ""
                }`}
                onClick={() =>
                  setContextAwareness(!contextAwareness)
                }
                aria-label="Toggle context awareness"
                aria-pressed={contextAwareness}
              >
                <span />
              </button>

            </div>

          </div>

        </section>


        {/* ================= NOTE ================= */}

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

export default AIMentorData;