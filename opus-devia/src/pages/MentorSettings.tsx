import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MentorSettings.css";

const MentorSettings: React.FC = () => {
  const navigate = useNavigate();

  const [focus, setFocus] = useState("business");
  const [approach, setApproach] = useState("balanced");
  const [accountability, setAccountability] = useState(true);
  const [reminders, setReminders] = useState(true);

  return (
    <div className="mentor-settings-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="mentor-settings-header">

        <button
          className="mentor-settings-back"
          onClick={() => navigate("/settings/mentor")}
          aria-label="Back to Mentor"
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

        <h1>Mentor Settings</h1>

        <div className="mentor-settings-header-spacer" />

      </header>


      {/* =====================================================
          CONTENT
          ===================================================== */}

      <main className="mentor-settings-content">


        {/* =====================================================
            HERO
            ===================================================== */}

        <section className="mentor-settings-hero">

          <div className="mentor-settings-hero-icon">
            ⚙
          </div>

          <h2>
            Customize Your Mentor
          </h2>

          <p>
            Adjust how your mentor guides, supports,
            and keeps you moving toward your goals.
          </p>

        </section>


        {/* =====================================================
            MENTOR FOCUS
            ===================================================== */}

        <section className="mentor-settings-section">

          <div className="mentor-settings-label">
            MENTOR FOCUS
          </div>

          <div className="mentor-settings-card">


            {/* BUSINESS */}

            <button
              type="button"
              className={`mentor-settings-row ${
                focus === "business" ? "is-selected" : ""
              }`}
              onClick={() => setFocus("business")}
            >

              <div className="mentor-row-icon">
                ✦
              </div>

              <div className="mentor-row-content">

                <h3>
                  Business
                </h3>

                <p>
                  Business ideas, decisions, and opportunities.
                </p>

              </div>

              {focus === "business" && (
                <div className="mentor-row-check">
                  ✓
                </div>
              )}

            </button>


            {/* GOALS */}

            <button
              type="button"
              className={`mentor-settings-row ${
                focus === "goals" ? "is-selected" : ""
              }`}
              onClick={() => setFocus("goals")}
            >

              <div className="mentor-row-icon">
                ◇
              </div>

              <div className="mentor-row-content">

                <h3>
                  Goals &amp; Productivity
                </h3>

                <p>
                  Staying focused, organized, and consistent.
                </p>

              </div>

              {focus === "goals" && (
                <div className="mentor-row-check">
                  ✓
                </div>
              )}

            </button>


            {/* PROBLEM SOLVING */}

            <button
              type="button"
              className={`mentor-settings-row ${
                focus === "problem-solving" ? "is-selected" : ""
              }`}
              onClick={() => setFocus("problem-solving")}
            >

              <div className="mentor-row-icon">
                ◎
              </div>

              <div className="mentor-row-content">

                <h3>
                  Problem Solving
                </h3>

                <p>
                  Breaking down challenges into practical steps.
                </p>

              </div>

              {focus === "problem-solving" && (
                <div className="mentor-row-check">
                  ✓
                </div>
              )}

            </button>


            {/* DECISION MAKING */}

            <button
              type="button"
              className={`mentor-settings-row ${
                focus === "decisions" ? "is-selected" : ""
              }`}
              onClick={() => setFocus("decisions")}
            >

              <div className="mentor-row-icon">
                ◈
              </div>

              <div className="mentor-row-content">

                <h3>
                  Decision Making
                </h3>

                <p>
                  Thinking through choices before taking action.
                </p>

              </div>

              {focus === "decisions" && (
                <div className="mentor-row-check">
                  ✓
                </div>
              )}

            </button>

          </div>

        </section>


        {/* =====================================================
            MENTOR APPROACH
            ===================================================== */}

        <section className="mentor-settings-section">

          <div className="mentor-settings-label">
            MENTOR APPROACH
          </div>

          <div className="mentor-settings-card">


            {/* DIRECT */}

            <button
              type="button"
              className={`mentor-settings-row ${
                approach === "direct" ? "is-selected" : ""
              }`}
              onClick={() => setApproach("direct")}
            >

              <div className="mentor-row-icon">
                →
              </div>

              <div className="mentor-row-content">

                <h3>
                  Direct
                </h3>

                <p>
                  Clear, straightforward advice without unnecessary padding.
                </p>

              </div>

              {approach === "direct" && (
                <div className="mentor-row-check">
                  ✓
                </div>
              )}

            </button>


            {/* BALANCED */}

            <button
              type="button"
              className={`mentor-settings-row ${
                approach === "balanced" ? "is-selected" : ""
              }`}
              onClick={() => setApproach("balanced")}
            >

              <div className="mentor-row-icon">
                ◇
              </div>

              <div className="mentor-row-content">

                <h3>
                  Balanced
                </h3>

                <p>
                  A mix of practical guidance and encouragement.
                </p>

              </div>

              {approach === "balanced" && (
                <div className="mentor-row-check">
                  ✓
                </div>
              )}

            </button>


            {/* SUPPORTIVE */}

            <button
              type="button"
              className={`mentor-settings-row ${
                approach === "supportive" ? "is-selected" : ""
              }`}
              onClick={() => setApproach("supportive")}
            >

              <div className="mentor-row-icon">
                ♡
              </div>

              <div className="mentor-row-content">

                <h3>
                  Supportive
                </h3>

                <p>
                  More encouragement and guidance along the way.
                </p>

              </div>

              {approach === "supportive" && (
                <div className="mentor-row-check">
                  ✓
                </div>
              )}

            </button>

          </div>

        </section>


        {/* =====================================================
            ACCOUNTABILITY
            ===================================================== */}

        <section className="mentor-settings-section">

          <div className="mentor-settings-label">
            ACCOUNTABILITY
          </div>

          <div className="mentor-settings-card">


            {/* KEEP ME ACCOUNTABLE */}

            <div className="mentor-accountability-row">

              <div className="mentor-accountability-content">

                <h3>
                  Keep Me Accountable
                </h3>

                <p>
                  Let your mentor help you stay on track.
                </p>

              </div>

              <button
                type="button"
                className={`mentor-settings-toggle ${
                  accountability ? "is-on" : ""
                }`}
                onClick={() =>
                  setAccountability(!accountability)
                }
                aria-label="Toggle accountability"
                aria-pressed={accountability}
              >
                <span />
              </button>

            </div>


            {/* GOAL REMINDERS */}

            <div className="mentor-accountability-row">

              <div className="mentor-accountability-content">

                <h3>
                  Goal Reminders
                </h3>

                <p>
                  Receive reminders when you need to take action.
                </p>

              </div>

              <button
                type="button"
                className={`mentor-settings-toggle ${
                  reminders ? "is-on" : ""
                }`}
                onClick={() =>
                  setReminders(!reminders)
                }
                aria-label="Toggle goal reminders"
                aria-pressed={reminders}
              >
                <span />
              </button>

            </div>

          </div>

        </section>


        {/* =====================================================
            NOTE
            ===================================================== */}

        <div className="mentor-settings-note">

          <span>
            ✦
          </span>

          <span>
            Your preferences will shape how your mentor guides you.
          </span>

        </div>

      </main>

    </div>
  );
};

export default MentorSettings;