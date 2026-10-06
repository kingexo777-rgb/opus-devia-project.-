import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./XPGamification.css";
import "./SettingsSubPage.css";

const XPGamification: React.FC = () => {
  const navigate = useNavigate();

  const [streakShield, setStreakShield] = useState(true);
  const [showXP, setShowXP] = useState(true);
  const [leaderboard, setLeaderboard] = useState(false);

  return (
    <div className="xp-page">

      {/* ==================================================
          HEADER
          ================================================== */}
      <header className="xp-header">
        <button
            className="back-button"
            onClick={() => navigate("/settings")}
            aria-label="Back to Settings"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <h1>XP & Gamification</h1>

        <div className="xp-header-spacer" />
      </header>


      {/* ==================================================
          YOUR XP
          ================================================== */}
      <section className="xp-section">

        <div className="xp-section-title">
          YOUR XP
        </div>

        {/* Monthly Cap */}
        <div className="xp-cap-card">

          <div className="xp-cap-label">
            MONTHLY CAP USAGE
          </div>

          <div className="xp-progress-track">
            <div
              className="xp-progress-fill"
              style={{ width: "68%" }}
            />
          </div>

          <div className="xp-cap-values">
            <strong>1,700 XP used</strong>
            <span>2,500 XP cap</span>
          </div>

        </div>

      </section>


      {/* ==================================================
          XP STATS
          ================================================== */}
      <section className="xp-section">

        <div className="xp-card xp-stats-card">

          {/* Total XP */}
          <div className="xp-row">

            <div className="xp-icon">
              ☆
            </div>

            <div className="xp-row-content">
              <div className="xp-row-title">
                Total XP earned
              </div>

              <div className="xp-row-subtitle">
                Across all time
              </div>
            </div>

            <div className="xp-value gold">
              20,300
            </div>

          </div>


          {/* XP Multiplier */}
          <div className="xp-row">

            <div className="xp-icon">
              ↗
            </div>

            <div className="xp-row-content">
              <div className="xp-row-title">
                XP multiplier
              </div>

              <div className="xp-row-subtitle">
                Based on your current plan
              </div>
            </div>

            <div className="xp-value">
              1.5x
            </div>

          </div>


          {/* XP Rollover */}
          <div className="xp-row">

            <div className="xp-icon">
              ⟳
            </div>

            <div className="xp-row-content">
              <div className="xp-row-title">
                XP rollover
              </div>

              <div className="xp-row-subtitle">
                Unused XP carried into next month
              </div>
            </div>

            <div className="xp-value">
              25%
            </div>

          </div>


          {/* Cap Reset */}
          <div className="xp-row last">

            <div className="xp-icon">
              ◴
            </div>

            <div className="xp-row-content">
              <div className="xp-row-title">
                Cap resets in
              </div>

              <div className="xp-row-subtitle">
                Days until monthly XP cap refreshes
              </div>
            </div>

            <div className="xp-value">
              18 days
            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          GAMIFICATION
          ================================================== */}
      <section className="xp-section">

        <div className="xp-section-title">
          GAMIFICATION
        </div>

        <div className="xp-card gamification-card">

          {/* Streak Shield */}
          <div className="xp-setting-row">

            <div className="xp-icon">
              ♢
            </div>

            <div className="xp-row-content">
              <div className="xp-row-title">
                Streak shield
              </div>

              <div className="xp-row-subtitle">
                1 miss forgiven per week
              </div>
            </div>

            <button
              className={`xp-toggle ${streakShield ? "on" : ""}`}
              onClick={() => setStreakShield(!streakShield)}
              aria-label="Toggle streak shield"
            >
              <span />
            </button>

          </div>


          {/* Show XP */}
          <div className="xp-setting-row">

            <div className="xp-icon">
              ♜
            </div>

            <div className="xp-row-content">
              <div className="xp-row-title">
                Show XP on profile
              </div>

              <div className="xp-row-subtitle">
                Visible to others on your Build card
              </div>
            </div>

            <button
              className={`xp-toggle ${showXP ? "on" : ""}`}
              onClick={() => setShowXP(!showXP)}
              aria-label="Toggle show XP"
            >
              <span />
            </button>

          </div>


          {/* Leaderboard */}
          <div className="xp-setting-row last">

            <div className="xp-icon">
              ▥
            </div>

            <div className="xp-row-content">
              <div className="xp-row-title">
                Leaderboard visibility
              </div>

              <div className="xp-row-subtitle">
                Appear on community XP boards
              </div>
            </div>

            <button
              className={`xp-toggle ${leaderboard ? "on" : ""}`}
              onClick={() => setLeaderboard(!leaderboard)}
              aria-label="Toggle leaderboard visibility"
            >
              <span />
            </button>

          </div>

        </div>

      </section>


      {/* ==================================================
          PLAN
          ================================================== */}
      <section className="xp-section">

        <div className="xp-section-title">
          PLAN
        </div>

        <div className="xp-card plan-card">

          <div className="xp-plan-row">

            <div className="xp-plan-icon">
              ϟ
            </div>

            <div className="xp-row-content">

              <div className="xp-row-title">
                Current plan
              </div>

              <div className="xp-row-subtitle">
                Starter — $6.99/month
              </div>

            </div>

            <button className="xp-upgrade-button">
              Upgrade
            </button>

          </div>

        </div>

      </section>

    </div>
  );
};

export default XPGamification;