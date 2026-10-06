import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SettingsSubPage.css";

type ChatMessage = {
  id: number;
  sender: "support" | "user";
  text: string;
};

const ContactSupport: React.FC = () => {
  const navigate = useNavigate();

  // =========================
  // EMAIL SUPPORT
  // =========================

  const [showEmailSupport, setShowEmailSupport] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");

  // =========================
  // LIVE CHAT
  // =========================

  const [showLiveChat, setShowLiveChat] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "support",
      text: "Hi! 👋 Welcome to Opus Support. How can we help you today?",
    },
  ]);

  // =========================
  // REPORT A BUG
  // =========================

  const [showBugReport, setShowBugReport] = useState(false);

  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugExpected, setBugExpected] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [bugSeverity, setBugSeverity] = useState("Low");

  // =========================
  // SEND CHAT MESSAGE
  // =========================

  const handleSendChat = () => {
    const message = chatInput.trim();

    if (!message) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      text: message,
    };

    setChatMessages((previousMessages) => [
      ...previousMessages,
      newMessage,
    ]);

    setChatInput("");
  };

  const handleChatKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendChat();
    }
  };

  // =========================
  // SUBMIT BUG REPORT
  // =========================

  const handleSubmitBug = () => {
    if (!bugTitle.trim() || !bugDescription.trim()) {
      return;
    }

    console.log("Bug report submitted:", {
      title: bugTitle,
      description: bugDescription,
      expected: bugExpected,
      steps: bugSteps,
      severity: bugSeverity,
    });

    // Reset form
    setBugTitle("");
    setBugDescription("");
    setBugExpected("");
    setBugSteps("");
    setBugSeverity("Low");

    setShowBugReport(false);
  };

  return (
    <div className="settings-subpage">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="subpage-header">

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

        <h1>Contact Support</h1>

        <div className="header-spacer" />

      </div>


      {/* =====================================================
          CONTENT
          ===================================================== */}

      <div className="subpage-content">

        {/* =================================================
            HERO
            ================================================= */}

        <div className="subpage-hero">

          <div className="hero-icon">
            ◉
          </div>

          <p>
            Need help? We're here for you. Reach out to our support
            team and we'll get back to you as soon as possible.
          </p>

        </div>


        {/* =================================================
            SUPPORT OPTIONS
            ================================================= */}

        <div className="settings-card">

          {/* EMAIL US */}

          <button
            type="button"
            className="notification-row clickable-row"
            onClick={() => setShowEmailSupport(true)}
          >

            <div className="notification-icon">
              ✉
            </div>

            <div className="notification-info">

              <div className="notification-title">
                Email Us
              </div>

              <div className="notification-description">
                Send us a message and we'll get back to you as soon
                as possible.
              </div>

            </div>

            <svg
              className="settings-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>

          </button>


          {/* LIVE CHAT */}

          <button
            type="button"
            className="notification-row clickable-row"
            onClick={() => setShowLiveChat(true)}
          >

            <div className="notification-icon">
              ◯
            </div>

            <div className="notification-info">

              <div className="notification-title">
                Live Chat
              </div>

              <div className="notification-description">
                Chat with our support team in real time.
              </div>

            </div>

            <svg
              className="settings-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>

          </button>


          {/* FAQ */}

          <button
            type="button"
            className="notification-row clickable-row"
            onClick={() =>
              navigate("/settings/contact-support/faq")
            }
          >

            <div className="notification-icon">
              ?
            </div>

            <div className="notification-info">

              <div className="notification-title">
                Frequently Asked Questions
              </div>

              <div className="notification-description">
                Find answers to common questions and troubleshooting
                tips.
              </div>

            </div>

            <svg
              className="settings-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>

          </button>


          {/* REPORT A BUG */}

          <button
            type="button"
            className="notification-row last clickable-row"
            onClick={() => setShowBugReport(true)}
          >

            <div className="notification-icon">
              ⚙
            </div>

            <div className="notification-info">

              <div className="notification-title">
                Report a Bug
              </div>

              <div className="notification-description">
                Help us improve by reporting any issues you find.
              </div>

            </div>

            <svg
              className="settings-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>

          </button>

        </div>


        {/* =====================================================
            EMAIL SUPPORT MODAL
            ===================================================== */}

        {showEmailSupport && (

          <div
            className="support-modal-overlay"
            onClick={() => setShowEmailSupport(false)}
          >

            <div
              className="support-modal"
              onClick={(event) => event.stopPropagation()}
            >

              <div className="support-modal-icon">
                ✉
              </div>

              <h2>
                Email Support
              </h2>

              <p>
                Tell us how we can help and we'll get back to you
                as soon as possible.
              </p>

              <textarea
                className="support-message-input"
                placeholder="Describe your question or issue..."
                rows={5}
                value={supportMessage}
                onChange={(event) =>
                  setSupportMessage(event.target.value)
                }
              />

              <div className="support-modal-actions">

                <button
                  type="button"
                  className="support-cancel-button"
                  onClick={() => {
                    setShowEmailSupport(false);
                    setSupportMessage("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="support-send-button"
                  onClick={() => {
                    if (!supportMessage.trim()) return;

                    console.log(
                      "Support message submitted:",
                      supportMessage
                    );

                    setSupportMessage("");
                    setShowEmailSupport(false);
                  }}
                >
                  Send
                </button>

              </div>

            </div>

          </div>

        )}


        {/* =====================================================
            LIVE CHAT MODAL
            ===================================================== */}

        {showLiveChat && (

          <div
            className="live-chat-overlay"
            onClick={() => setShowLiveChat(false)}
          >

            <div
              className="live-chat-modal"
              onClick={(event) => event.stopPropagation()}
            >

              <div className="live-chat-header">

                <button
                  type="button"
                  className="live-chat-back"
                  onClick={() => setShowLiveChat(false)}
                  aria-label="Close live chat"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                <div className="live-chat-header-info">

                  <div className="live-chat-title">
                    Opus Support
                  </div>

                  <div className="live-chat-status">
                    <span className="live-chat-status-dot" />
                    Online
                  </div>

                </div>

                <div className="live-chat-header-spacer" />

              </div>


              <div className="live-chat-messages">

                {chatMessages.map((message) => (

                  <div
                    key={message.id}
                    className={
                      message.sender === "user"
                        ? "chat-message-wrapper user-message-wrapper"
                        : "chat-message-wrapper support-message-wrapper"
                    }
                  >

                    {message.sender === "support" && (
                      <div className="chat-support-avatar">
                        O
                      </div>
                    )}

                    <div
                      className={
                        message.sender === "user"
                          ? "chat-message user-message"
                          : "chat-message support-message"
                      }
                    >
                      {message.text}
                    </div>

                  </div>

                ))}

              </div>


              <div className="live-chat-input-area">

                <textarea
                  className="live-chat-input"
                  placeholder="Type a message..."
                  rows={1}
                  value={chatInput}
                  onChange={(event) =>
                    setChatInput(event.target.value)
                  }
                  onKeyDown={handleChatKeyDown}
                />

                <button
                  type="button"
                  className="live-chat-send"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                  aria-label="Send message"
                >

                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>

                </button>

              </div>

            </div>

          </div>

        )}


        {/* =====================================================
            REPORT A BUG MODAL
            ===================================================== */}

        {showBugReport && (

          <div
            className="bug-report-overlay"
            onClick={() => setShowBugReport(false)}
          >

            <div
              className="bug-report-modal"
              onClick={(event) => event.stopPropagation()}
            >

              {/* HEADER */}

              <div className="bug-report-header">

                <div className="bug-report-icon">
                  ⚙
                </div>

                <div>
                  <h2>
                    Report a Bug
                  </h2>

                  <p>
                    Help us improve Opus Devia by telling us
                    what went wrong.
                  </p>
                </div>

              </div>


              {/* FORM */}

              <div className="bug-report-form">

                {/* BUG TITLE */}

                <div className="bug-form-field">

                  <label htmlFor="bug-title">
                    Bug Title
                  </label>

                  <input
                    id="bug-title"
                    type="text"
                    value={bugTitle}
                    onChange={(event) =>
                      setBugTitle(event.target.value)
                    }
                    placeholder="e.g. Tasks aren't saving"
                  />

                </div>


                {/* DESCRIPTION */}

                <div className="bug-form-field">

                  <label htmlFor="bug-description">
                    What happened?
                  </label>

                  <textarea
                    id="bug-description"
                    rows={4}
                    value={bugDescription}
                    onChange={(event) =>
                      setBugDescription(event.target.value)
                    }
                    placeholder="Describe what went wrong..."
                  />

                </div>


                {/* EXPECTED */}

                <div className="bug-form-field">

                  <label htmlFor="bug-expected">
                    What did you expect to happen?
                  </label>

                  <textarea
                    id="bug-expected"
                    rows={3}
                    value={bugExpected}
                    onChange={(event) =>
                      setBugExpected(event.target.value)
                    }
                    placeholder="Describe what should have happened..."
                  />

                </div>


                {/* STEPS */}

                <div className="bug-form-field">

                  <label htmlFor="bug-steps">
                    How can we reproduce it?
                  </label>

                  <textarea
                    id="bug-steps"
                    rows={3}
                    value={bugSteps}
                    onChange={(event) =>
                      setBugSteps(event.target.value)
                    }
                    placeholder="1. Open...
2. Click...
3. ..."
                  />

                </div>


                {/* SEVERITY */}

                <div className="bug-form-field">

                  <label htmlFor="bug-severity">
                    Severity
                  </label>

                  <select
                    id="bug-severity"
                    value={bugSeverity}
                    onChange={(event) =>
                      setBugSeverity(event.target.value)
                    }
                  >
                    <option value="Low">
                      Low
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="High">
                      High
                    </option>

                    <option value="Critical">
                      Critical
                    </option>
                  </select>

                </div>

              </div>


              {/* ACTIONS */}

              <div className="bug-report-actions">

                <button
                  type="button"
                  className="bug-cancel-button"
                  onClick={() => {
                    setShowBugReport(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="bug-submit-button"
                  onClick={handleSubmitBug}
                  disabled={
                    !bugTitle.trim() ||
                    !bugDescription.trim()
                  }
                >
                  Submit Report
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  );
};

export default ContactSupport;