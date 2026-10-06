import React from "react";
import { useNavigate } from "react-router-dom";
import "./DataPrivacyPages.css";

const PrivacyPolicy: React.FC = () => {
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

        <h1>Privacy Policy</h1>

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


        {/* ================= POLICY ================= */}

        <section className="data-privacy-section">

          <div className="data-privacy-card terms-card">

            {/* 1 */}

            <div className="terms-section">

              <h3>
                1. Introduction
              </h3>

              <p>
                Welcome to Opus Devia ("we," "our," or "us").
                We built Opus Devia for founders who take
                their work seriously — and we take your
                privacy the same way.
              </p>

              <p>
                This Privacy Policy explains what data we
                collect, why we collect it, how we use it,
                and what rights you have over it. It applies
                to our landing page (opusdevia.framer.website),
                our mobile application, and any related
                services (collectively, "the Platform").
              </p>

              <p>
                By using the Platform, you agree to the
                practices described in this policy. If you
                don't agree, please don't use the Platform.
              </p>

            </div>


            {/* 2 */}

            <div className="terms-section">

              <h3>
                2. What We Collect
              </h3>

              <h4>
                2.1 Information you give us directly
              </h4>

              <p>
                <strong>Email address</strong>
                <br />
                Collected when you join the waitlist or
                create an account. Used to communicate
                updates, early access notifications, and
                account-related information.
              </p>

              <p>
                <strong>Username</strong>
                <br />
                A display name you choose. Not required to
                be your real name. Used to personalize your
                experience within the app.
              </p>

              <p>
                <strong>Payment information</strong>
                <br />
                Collected when you subscribe to a paid tier.
                We do not store your full card details —
                payment processing is handled by a third-party
                provider (Stripe or equivalent). We only
                retain a transaction reference and
                subscription status.
              </p>


              <h4>
                2.2 Information we collect automatically
              </h4>

              <p>
                <strong>Behavioral data</strong>
                <br />
                Once you use the app, we collect data about
                how you interact with it — quests completed,
                decisions made, XP earned, streaks maintained,
                and quests avoided. This data powers the core
                features of Opus Devia, including your Founder
                Build, Fit Score, and personalized quest
                generation.
              </p>

              <p>
                <strong>Device information</strong>
                <br />
                Basic information about your device type,
                operating system, and app version. Used for
                troubleshooting and improving performance.
              </p>

              <p>
                <strong>Usage data</strong>
                <br />
                How often you open the app, which screens you
                visit, and session length. Used in aggregate
                to understand how the Platform is being used.
              </p>


              <h4>
                2.3 What we do NOT collect
              </h4>

              <p>
                • We do not collect your real name unless
                you choose to use it as your username.
                <br />
                • We do not collect location data.
                <br />
                • We do not collect contacts or access your
                camera, microphone, or files unless you
                explicitly grant permission for a specific
                feature.
                <br />
                • We do not sell your data to advertisers.
                Ever.
              </p>

            </div>


            {/* 3 */}

            <div className="terms-section">

              <h3>
                3. Why We Collect It
              </h3>

              <p>
                <strong>To provide the service</strong>
                <br />
                Your email, username, and behavioral data are
                necessary to run Opus Devia. Without them,
                the core features — archetype assignment,
                Fit Score, personalized quests — cannot
                function.
              </p>

              <p>
                <strong>To process payments</strong>
                <br />
                Your payment information is required to
                manage your subscription, process charges,
                and handle refunds.
              </p>

              <p>
                <strong>To improve the Platform</strong>
                <br />
                Aggregate usage data helps us understand
                what's working and what isn't so we can make
                Opus Devia better over time.
              </p>

              <p>
                <strong>To communicate with you</strong>
                <br />
                We use your email to send product updates,
                launch announcements, and account-related
                notices. You can opt out of marketing emails
                at any time — we'll still send essential
                account communications.
              </p>

              <p>
                <strong>To protect the Platform</strong>
                <br />
                Behavioral data is used to detect unusual
                patterns that may indicate fraudulent XP
                accumulation or abuse of the system.
              </p>

            </div>


            {/* 4 */}

            <div className="terms-section">

              <h3>
                4. How We Store and Protect Your Data
              </h3>

              <p>
                Your data is stored on secure servers with
                encryption at rest and in transit. We use
                industry-standard security practices and
                limit access to your personal data to only
                the people and systems that need it to
                operate the Platform.
              </p>

              <p>
                We retain your data for as long as your
                account is active. If you delete your
                account, we will delete your personal data
                within 30 days, except where we are legally
                required to retain certain records.
              </p>

            </div>


            {/* 5 */}

            <div className="terms-section">

              <h3>
                5. Third Parties
              </h3>

              <p>
                We work with a small number of trusted
                third-party services to operate the Platform.
              </p>

              <p>
                <strong>Payment processing</strong>
                <br />
                Stripe (or equivalent). Your payment data is
                subject to their privacy policy. We never
                see or store your full card details.
              </p>

              <p>
                <strong>AI model providers</strong>
                <br />
                We use third-party AI models to power
                features including your Mentor, quest
                generation, and Fit Score. Conversation data
                sent to these models is processed in accordance
                with those providers' data handling policies.
                We do not share personally identifiable
                information with AI providers beyond what is
                necessary to generate your response.
              </p>

              <p>
                <strong>Analytics</strong>
                <br />
                We may use privacy-focused analytics tools
                to understand aggregate usage patterns. We
                do not use Google Analytics or tools that
                track you across third-party sites.
              </p>

              <p>
                <strong>Email delivery</strong>
                <br />
                We use an email service provider to send you
                communications. Your email address is shared
                with this provider for this purpose only.
              </p>

              <p>
                We do not sell, rent, or trade your personal
                data with any third party for marketing
                purposes.
              </p>

            </div>


            {/* 6 */}

            <div className="terms-section">

              <h3>
                6. Your Rights
              </h3>

              <p>
                Regardless of where you are in the world,
                you have the following rights over your data.
              </p>

              <p>
                <strong>Access</strong> — You can request a
                copy of the personal data we hold about you.
                <br />
                <strong>Correction</strong> — You can ask us
                to correct inaccurate data.
                <br />
                <strong>Deletion</strong> — You can request
                that we delete your account and associated
                personal data.
                <br />
                <strong>Portability</strong> — You can request
                your data in a machine-readable format.
                <br />
                <strong>Opt-out</strong> — You can opt out of
                marketing emails at any time using the
                unsubscribe link in any email we send.
              </p>

              <p>
                <strong>California residents (CCPA)</strong>
                — You have the right to know what personal
                information we collect, to delete it, and
                to opt out of its sale. We do not sell
                personal information.
              </p>

              <p>
                <strong>European residents (GDPR)</strong>
                — You have the right to access, rectify,
                erase, restrict, or object to the processing
                of your personal data. You also have the
                right to lodge a complaint with your local
                data protection authority.
              </p>

              <p>
                To exercise any of these rights, contact us
                at: privacy@opusdevia.com. We will respond
                to all requests within 30 days.
              </p>

            </div>


            {/* 7 */}

            <div className="terms-section">

              <h3>
                7. Cookies
              </h3>

              <p>
                Our landing page may use minimal cookies for
                functionality, such as remembering your email
                capture state. We do not use tracking or
                advertising cookies. You can disable cookies
                in your browser settings without affecting
                your ability to use the landing page.
              </p>

              <p>
                The mobile app does not use browser cookies.
              </p>

            </div>


            {/* 8 */}

            <div className="terms-section">

              <h3>
                8. Children
              </h3>

              <p>
                Opus Devia is not intended for anyone under
                the age of 16. We do not knowingly collect
                personal data from anyone under 16. If you
                believe a minor has provided us with their
                data, please contact us and we will delete
                it promptly.
              </p>

            </div>


            {/* 9 */}

            <div className="terms-section">

              <h3>
                9. Changes to This Policy
              </h3>

              <p>
                We may update this policy as the Platform
                evolves. If we make material changes, we
                will notify you by email or through a
                prominent notice in the app before the
                changes take effect.
              </p>

              <p>
                The "Last updated" date at the top of this
                page reflects the most recent revision.
              </p>

              <p>
                Continued use of the Platform after changes
                take effect constitutes your acceptance of
                the updated policy.
              </p>

            </div>


            {/* 10 */}

            <div className="terms-section terms-section-last">

              <h3>
                10. Contact
              </h3>

              <p>
                If you have questions, concerns, or requests
                regarding this Privacy Policy or your data:
              </p>

              <p>
                <strong>Email:</strong> @opusdevia.com
                <br />
                <strong>Website:</strong> opusdevia.framer.website
              </p>

              <p>
                We're a small team and we take every message
                seriously. You'll hear back from a real person.
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
            This policy may be updated as Opus Devia
            evolves. The date above reflects the latest
            version.
          </span>

        </div>

      </main>

    </div>
  );
};

export default PrivacyPolicy;