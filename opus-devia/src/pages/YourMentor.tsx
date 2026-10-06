import React from "react";
import { useNavigate } from "react-router-dom";
import "./YourMentor.css";

const YourMentor: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="your-mentor-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="your-mentor-header">

        <button
          className="your-mentor-back"
          onClick={() => navigate("/settings/mentor")}
          aria-label="Back to Mentor Settings"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <h1>Your Mentor</h1>

        <div className="your-mentor-header-spacer" />

      </header>


      {/* =====================================================
          CONTENT
          ===================================================== */}

      <main className="your-mentor-content">

        {/* =================================================
            HERO
            ================================================= */}

        <section className="your-mentor-hero">

          <div className="your-mentor-hero-icon">
            ✦
          </div>

          <div className="your-mentor-status">
            <span />
            ACTIVE
          </div>

          <p>
            Your AI-powered guide for making progress,
            staying accountable, and reaching your goals.
          </p>

        </section>


        {/* =================================================
            MENTOR STATUS
            ================================================= */}

        <section className="your-mentor-section">

          <div className="your-mentor-label">
            MENTOR STATUS
          </div>

          <div className="your-mentor-card">

            <div className="your-mentor-row">

              <div className="your-mentor-row-icon">
                ✦
              </div>

              <div className="your-mentor-row-content">

                <h3>
                  Mentor Active
                </h3>

                <p>
                  Your mentor is ready to help you work
                  through your current goals and challenges.
                </p>

              </div>

              <div className="your-mentor-active">
                <span />
                Active
              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            YOUR MENTOR
            ================================================= */}

        <section className="your-mentor-section">

          <div className="your-mentor-label">
            YOUR MENTOR
          </div>

          <div className="your-mentor-card">

            {/* Focus */}

            <div className="your-mentor-info-row">

              <div className="your-mentor-info-icon">
                ◎
              </div>

              <div className="your-mentor-info-content">

                <span>
                  Focus
                </span>

                <p>
                  Business • Goals • Growth
                </p>

              </div>

            </div>


            {/* Approach */}

            <div className="your-mentor-info-row">

              <div className="your-mentor-info-icon">
                ◈
              </div>

              <div className="your-mentor-info-content">

                <span>
                  Approach
                </span>

                <p>
                  Direct • Supportive • Practical
                </p>

              </div>

            </div>


            {/* Goal */}

            <div className="your-mentor-info-row">

              <div className="your-mentor-info-icon">
                ◇
              </div>

              <div className="your-mentor-info-content">

                <span>
                  Goal
                </span>

                <p>
                  Help you turn plans into action.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            WHAT YOUR MENTOR CAN HELP WITH
            ================================================= */}

        <section className="your-mentor-section">

          <div className="your-mentor-label">
            YOUR MENTOR CAN HELP WITH
          </div>

          <div className="your-mentor-card">

            {/* Business Decisions */}

            <div className="your-mentor-help-row">

              <div className="your-mentor-help-icon">
                ✦
              </div>

              <div className="your-mentor-help-content">

                <h3>
                  Business Decisions
                </h3>

                <p>
                  Think through ideas and decisions before taking action.
                </p>

              </div>

            </div>


            {/* Goal Setting */}

            <div className="your-mentor-help-row">

              <div className="your-mentor-help-icon">
                ◇
              </div>

              <div className="your-mentor-help-content">

                <h3>
                  Goal Setting
                </h3>

                <p>
                  Turn bigger ambitions into clear, manageable goals.
                </p>

              </div>

            </div>


            {/* Accountability */}

            <div className="your-mentor-help-row">

              <div className="your-mentor-help-icon">
                ✓
              </div>

              <div className="your-mentor-help-content">

                <h3>
                  Accountability
                </h3>

                <p>
                  Stay focused and keep moving when motivation drops.
                </p>

              </div>

            </div>


            {/* Problem Solving */}

            <div className="your-mentor-help-row last">

              <div className="your-mentor-help-icon">
                ◎
              </div>

              <div className="your-mentor-help-content">

                <h3>
                  Problem Solving
                </h3>

                <p>
                  Break down challenges and find practical next steps.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            CHAT BUTTON
            ================================================= */}

        <button
          className="your-mentor-chat-button"
          onClick={() => navigate("/mentor/chat")}
        >

          <span>
            Chat with Mentor
          </span>

          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>

        </button>

      </main>

    </div>
  );
};

export default YourMentor;