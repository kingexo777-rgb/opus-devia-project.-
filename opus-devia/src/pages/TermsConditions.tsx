import React from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const TermsConditions: React.FC = () => {
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

        <h1>Terms &amp; Conditions</h1>

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
            Last updated: July 2026
          </p>

        </section>


        {/* ================= TERMS ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-card terms-card">

            <div className="terms-section">
              <h3>1. Introduction</h3>

              <p>
                Welcome to Opus Devia ("we," "our," or "us").
                These Terms explain the rules for using our
                website, application, and related services
                ("Platform"). By using the Platform, you agree
                to these Terms.
              </p>
            </div>


            <div className="terms-section">
              <h3>2. Who Can Use Opus Devia</h3>

              <p>
                You must meet the minimum legal age in your
                jurisdiction, provide accurate information,
                and comply with applicable laws.
              </p>
            </div>


            <div className="terms-section">
              <h3>3. Your Account</h3>

              <p>
                Keep your account secure and accurate. Do not
                share accounts or impersonate others.
              </p>
            </div>


            <div className="terms-section">
              <h3>4. Acceptable Use</h3>

              <p>
                Do not break the law, disrupt the Platform,
                upload malware, abuse users, reverse engineer
                our software, or manipulate progression systems.
              </p>
            </div>


            <div className="terms-section">
              <h3>5. AI Features</h3>

              <p>
                AI powers recommendations, mentor conversations,
                Fit Scores, quests, and roadmaps. AI may make
                mistakes and does not replace professional advice.
              </p>
            </div>


            <div className="terms-section">
              <h3>6. Your Content</h3>

              <p>
                You retain ownership of your content while
                granting us permission to process it to operate
                and improve the Platform.
              </p>
            </div>


            <div className="terms-section">
              <h3>7. Our Intellectual Property</h3>

              <p>
                Our software, branding, graphics, designs,
                and code remain our property.
              </p>
            </div>


            <div className="terms-section">
              <h3>8. Paid Features</h3>

              <p>
                Subscriptions renew according to your selected
                plan unless cancelled. Prices are shown before
                purchase.
              </p>
            </div>


            <div className="terms-section">
              <h3>9. Platform Availability</h3>

              <p>
                The Platform may occasionally be unavailable
                due to maintenance, security updates, or
                technical issues.
              </p>
            </div>


            <div className="terms-section">
              <h3>10. Changes to the Platform</h3>

              <p>
                We may improve features, AI models,
                subscriptions, and pricing over time.
              </p>
            </div>


            <div className="terms-section">
              <h3>11. Suspension and Termination</h3>

              <p>
                Accounts violating these Terms may be
                suspended or terminated.
              </p>
            </div>


            <div className="terms-section">
              <h3>12. Disclaimer</h3>

              <p>
                The Platform is provided "as is" without
                guarantees of uninterrupted service, accuracy,
                or business success.
              </p>
            </div>


            <div className="terms-section">
              <h3>13. Limitation of Liability</h3>

              <p>
                To the fullest extent permitted by law,
                Opus Devia is not liable for indirect losses
                or decisions based on AI-generated content.
              </p>
            </div>


            <div className="terms-section">
              <h3>14. Privacy</h3>

              <p>
                Your use of the Platform is also governed
                by our Privacy Policy.
              </p>
            </div>


            <div className="terms-section">
              <h3>15. Changes to These Terms</h3>

              <p>
                We may update these Terms and will notify
                users of significant changes when practical.
              </p>
            </div>


            <div className="terms-section">
              <h3>16. Governing Law</h3>

              <p>
                These Terms are governed by applicable laws
                where Opus Devia operates.
              </p>
            </div>


            <div className="terms-section terms-section-last">
              <h3>17. Contact</h3>

              <p>
                Email: @opusdevia.com
              </p>
            </div>

          </div>

        </section>


        {/* ================= NOTE ================= */}

        <div className="data-privacy-note">

          <span className="data-privacy-note-icon">
            ✦
          </span>

          <span>
            These Terms may be updated from time to time.
            Please review the latest version when changes
            are announced.
          </span>

        </div>

      </main>

    </div>
  );
};

export default TermsConditions;