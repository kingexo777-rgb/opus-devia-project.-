import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SettingsSubPage.css";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  questions: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    title: "Getting Started",
    questions: [
      {
        question: "What is Opus Devia?",
        answer:
          "Opus Devia is a platform designed to help you turn your goals into a clear path forward. It combines guidance, planning, and accountability to help you make progress.",
      },
      {
        question: "How does Opus Devia work?",
        answer:
          "Opus Devia uses information about your goals and situation to help create a personalized path. You can then use your roadmap, tasks, and other tools to stay focused and make progress.",
      },
      {
        question: "What is the Mentor?",
        answer:
          "The Mentor is designed to provide guidance and accountability while you work toward your goals. You can customize aspects of your Mentor to better match the type of support you want.",
      },
      {
        question: "How do I get started?",
        answer:
          "Create an account and complete the onboarding process. Your answers help Opus Devia understand your goals and provide a more personalized experience.",
      },
    ],
  },

  {
    title: "Account & Settings",
    questions: [
      {
        question: "How do I change my account information?",
        answer:
          "You can manage your available account information through the Profile section in Settings.",
      },
      {
        question: "How do I change my privacy settings?",
        answer:
          "Open Settings → Data & Privacy → Privacy Settings. From there, you can manage the available privacy and data preferences.",
      },
      {
        question: "What data does Opus Devia collect?",
        answer:
          "Opus Devia may collect information needed to provide the service, including account information, activity and usage data, and information related to your goals and Mentor experience. See the Privacy Policy for the full details.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "You can find the Delete Account option under Settings → Data & Privacy. Account deletion is permanent, so make sure you understand what will happen before confirming.",
      },
    ],
  },

  {
    title: "AI & Mentor",
    questions: [
      {
        question: "What does the AI Mentor do?",
        answer:
          "The AI Mentor is designed to provide guidance based on the goals, preferences, and context you provide. It can help you think through problems, stay accountable, and work toward your goals.",
      },
      {
        question: "Can I change my Mentor preferences?",
        answer:
          "Yes. Open Settings → Mentor → Mentor Settings to manage your Mentor focus, approach, and accountability preferences.",
      },
      {
        question: "How is my Mentor personalized?",
        answer:
          "Your Mentor can use information you provide about your goals, preferences, progress, and Mentor settings to make its guidance more relevant to your situation.",
      },
      {
        question: "Is my Mentor conversation private?",
        answer:
          "Information shared with AI and Mentor features may be processed as described in the Privacy Policy. Review the AI & Mentor Data settings and Privacy Policy for more information about how this data is handled.",
      },
    ],
  },

  {
    title: "Progress & Gamification",
    questions: [
      {
        question: "What is XP?",
        answer:
          "XP is part of Opus Devia's gamification system and is designed to represent your progress and engagement with the platform.",
      },
      {
        question: "How do levels work?",
        answer:
          "Levels are part of Opus Devia's progression system. As you make progress and earn XP, you can advance through the available levels.",
      },
      {
        question: "How do I earn XP?",
        answer:
          "XP can be connected to completing activities and making progress within Opus Devia. The exact XP rewards may vary depending on the feature.",
      },
      {
        question: "Where can I see my progress?",
        answer:
          "Your progress and available gamification information can be accessed through the XP & Gamification section in Settings.",
      },
    ],
  },

  {
    title: "Support",
    questions: [
      {
        question: "How do I contact support?",
        answer:
          "Open Settings → Contact Support. You can use Email Us or Live Chat to reach out for help.",
      },
      {
        question: "How do I report a bug?",
        answer:
          "Open Settings → Contact Support → Report a Bug and provide details about the issue you encountered.",
      },
      {
        question: "How long does support take to respond?",
        answer:
          "Response times may vary depending on the type of request and current support availability.",
      },
    ],
  },
];

const FrequentlyAskedQuestions: React.FC = () => {
  const navigate = useNavigate();

  const [openQuestions, setOpenQuestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleQuestion = (question: string) => {
    setOpenQuestions((current) =>
      current.includes(question)
        ? current.filter((item) => item !== question)
        : [...current, question]
    );
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (item) =>
          item.question.toLowerCase().includes(normalizedSearch) ||
          item.answer.toLowerCase().includes(normalizedSearch)
      ),
    }))
    .filter((category) => category.questions.length > 0);

  return (
    <div className="settings-subpage faq-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="subpage-header">

        <button
          className="back-button"
          onClick={() => navigate("/settings/contact-support")}
          aria-label="Back to Contact Support"
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

        <h1>Frequently Asked Questions</h1>

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
            ?
          </div>

          <p>
            Find answers to common questions about Opus Devia,
            your account, and the features available to you.
          </p>

        </div>


        {/* =================================================
            SEARCH
            ================================================= */}

        <div className="faq-search">

          <svg
            className="faq-search-icon"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>

          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search questions..."
            aria-label="Search frequently asked questions"
          />

          {searchQuery && (
            <button
              type="button"
              className="faq-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}

        </div>


        {/* =================================================
            FAQ CATEGORIES
            ================================================= */}

        {filteredCategories.length > 0 ? (

          filteredCategories.map((category) => (

            <div
              className="faq-section"
              key={category.title}
            >

              <div className="faq-section-label">
                {category.title}
              </div>

              <div className="settings-card faq-card">

                {category.questions.map((item, index) => {

                  const isOpen = openQuestions.includes(
                    item.question
                  );

                  const isLast =
                    index === category.questions.length - 1;

                  return (
                    <div
                      className={`faq-item ${
                        isOpen ? "faq-item-open" : ""
                      } ${isLast ? "faq-item-last" : ""}`}
                      key={item.question}
                    >

                      {/* QUESTION */}

                      <button
                        type="button"
                        className="faq-question"
                        onClick={() =>
                          toggleQuestion(item.question)
                        }
                        aria-expanded={isOpen}
                      >

                        <span className="faq-question-text">
                          {item.question}
                        </span>

                        <span
                          className={`faq-chevron ${
                            isOpen ? "faq-chevron-open" : ""
                          }`}
                        >
                          <svg
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </span>

                      </button>


                      {/* ANSWER */}

                      {isOpen && (

                        <div className="faq-answer">
                          {item.answer}
                        </div>

                      )}

                    </div>
                  );
                })}

              </div>

            </div>

          ))

        ) : (

          /* =================================================
             NO RESULTS
             ================================================= */

          <div className="faq-no-results">

            <div className="faq-no-results-icon">
              ?
            </div>

            <h3>
              No results found
            </h3>

            <p>
              Try searching with a different question or keyword.
            </p>

          </div>

        )}

      </div>

    </div>
  );
};

export default FrequentlyAskedQuestions;