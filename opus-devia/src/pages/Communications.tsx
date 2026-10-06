import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const Communications: React.FC = () => {
  const navigate = useNavigate();

  const [productUpdates, setProductUpdates] = useState(true);
  const [tipsInsights, setTipsInsights] = useState(true);
  const [mentorReminders, setMentorReminders] = useState(true);

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

        <h1>Communications</h1>

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
            Choose what updates, reminders, and
            helpful information you receive from Opus.
          </p>

        </section>


        {/* ================= PREFERENCES ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-label">
            COMMUNICATION PREFERENCES
          </div>

          <div className="data-privacy-card">

            {/* PRODUCT UPDATES */}

            <div className="data-privacy-toggle-row">

              <div className="data-privacy-toggle-content">

                <h3>
                  Product Updates
                </h3>

                <p>
                  Receive updates about new features,
                  improvements, and changes to Opus.
                </p>

              </div>

              <button
                type="button"
                className={`data-privacy-toggle ${
                  productUpdates ? "is-on" : ""
                }`}
                onClick={() =>
                  setProductUpdates(!productUpdates)
                }
                aria-label="Toggle product updates"
                aria-pressed={productUpdates}
              >
                <span />
              </button>

            </div>


            {/* TIPS & INSIGHTS */}

            <div className="data-privacy-toggle-row">

              <div className="data-privacy-toggle-content">

                <h3>
                  Tips &amp; Insights
                </h3>

                <p>
                  Receive helpful productivity, goal-setting,
                  and personal development tips.
                </p>

              </div>

              <button
                type="button"
                className={`data-privacy-toggle ${
                  tipsInsights ? "is-on" : ""
                }`}
                onClick={() =>
                  setTipsInsights(!tipsInsights)
                }
                aria-label="Toggle tips and insights"
                aria-pressed={tipsInsights}
              >
                <span />
              </button>

            </div>


            {/* MENTOR REMINDERS */}

            <div className="data-privacy-toggle-row">

              <div className="data-privacy-toggle-content">

                <h3>
                  Mentor Reminders
                </h3>

                <p>
                  Receive reminders related to your mentor,
                  goals, and planned activities.
                </p>

              </div>

              <button
                type="button"
                className={`data-privacy-toggle ${
                  mentorReminders ? "is-on" : ""
                }`}
                onClick={() =>
                  setMentorReminders(!mentorReminders)
                }
                aria-label="Toggle mentor reminders"
                aria-pressed={mentorReminders}
              >
                <span />
              </button>

            </div>


            {/* ACCOUNT UPDATES */}

            <div className="data-privacy-row data-privacy-static-row">

              <div className="data-privacy-row-icon">
                ✓
              </div>

              <div className="data-privacy-row-content">

                <h3>
                  Important Account Updates
                </h3>

                <p>
                  Important information about your account,
                  security, or essential Opus services.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ================= NOTE ================= */}

        <div className="data-privacy-note">

          <span className="data-privacy-note-icon">
            ✦
          </span>

          <span>
            Essential account communications may still be
            sent when they are necessary to provide Opus services.
          </span>

        </div>

      </main>

    </div>
  );
};

export default Communications;