import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";
import Home from "../pages/Home";
import Onboarding from "../pages/Onboarding";
import Roadmap from "../pages/Roadmap";
import Tasks from "../pages/Tasks";
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";
import Notification from "../pages/Notification";
import XPGamification from "../pages/XPGamification";

import ProfileSettings from "../pages/ProfileSettings";
import Username from "../pages/Username";
import Email from "../pages/Email";
import DisplayName from "../pages/DisplayName";
import ChangePassword from "../pages/ChangePassword";

import Mentor from "../pages/Mentor";
import MentorChat from "../pages/MentorChat";
import YourMentor from "../pages/YourMentor";
import MentorSettings from "../pages/MentorSettings";

import DataPrivacy from "../pages/DataPrivacy";
import PrivacySettings from "../pages/PrivacySettings";
import UsageData from "../pages/UsageData.tsx";
import AIMentorData from "../pages/AIMentorData";
import Communications from "../pages/Communications";
import YourData from "../pages/YourData";
import ExportData from "../pages/ExportData";
import RequestDataDeletion from "../pages/RequestDataDeletion";
import TermsConditions from "../pages/TermsConditions";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import DeleteAccount from "../pages/DeleteAccount";

import ContactSupport from "../pages/ContactSupport";
import FrequentlyAskedQuestions from "../pages/FrequentlyAskedQuestions";

import Journal from "../pages/Journal";
import Community from "../pages/Community";


function AppRoutes() {
  const { session, loading, profile } = useAuth();

  const onboardingComplete =
    profile?.onboarding_complete ?? false;


  /* =========================================================
     AUTH LOADING
     ========================================================= */

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }


  return (
    <Routes>

      {/* =====================================================
          AUTH
          ===================================================== */}

      <Route
        path="/signin"
        element={
          session ? (
            onboardingComplete ? (
              <Navigate to="/home" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : (
            <SignIn />
          )
        }
      />

      <Route
        path="/signup"
        element={
          session ? (
            onboardingComplete ? (
              <Navigate to="/home" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : (
            <SignUp />
          )
        }
      />


      {/* =====================================================
          MAIN PAGES
          ===================================================== */}

      <Route
        path="/home"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Home />
          )
        }
      />

      <Route
        path="/onboarding"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : onboardingComplete ? (
            <Navigate to="/home" replace />
          ) : (
            <Onboarding />
          )
        }
      />

      <Route
        path="/roadmap"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Roadmap />
          )
        }
      />

      <Route
        path="/tasks"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Tasks />
          )
        }
      />

      <Route
        path="/profile"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Profile />
          )
        }
      />

      <Route
        path="/settings"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Settings />
          )
        }
      />

      <Route
        path="/settings/notifications"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Notification />
          )
        }
      />

      <Route
        path="/settings/xp"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <XPGamification />
          )
        }
      />


      {/* =====================================================
          MENTOR
          ===================================================== */}

      <Route
        path="/settings/mentor"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Mentor />
          )
        }
      />

      <Route
        path="/settings/mentor/your-mentor"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <YourMentor />
          )
        }
      />

      <Route
        path="/settings/mentor/settings"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <MentorSettings />
          )
        }
      />
      
      {/* =====================================================
          Profile Settings
          ===================================================== */}

      <Route
        path="/settings/profile"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <ProfileSettings />
          )
        }
      />

      <Route
        path="/settings/profile/username"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Username />
          )
        }
      />

      <Route
        path="/settings/profile/email"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Email />
          )
        }
      />

      <Route
        path="/settings/profile/display-name"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <DisplayName />
          )
        }
      />

      <Route
        path="/settings/profile/change-password"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <ChangePassword />
          )
        }
      />

      {/* =====================================================
          DATA & PRIVACY
          ===================================================== */}

      <Route
        path="/settings/data-privacy"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <DataPrivacy />
          )
        }
      />

      <Route
        path="/settings/data-privacy/privacy-settings"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <PrivacySettings />
          )
        }
      />

      {/* Usage Data */}

      <Route
        path="/settings/data-privacy/data-usage"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <UsageData />
          )
        }
      />
      
      <Route
        path="/settings/data-privacy/ai-mentor-data"
        element={
        !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <AIMentorData />
          )
        }
      />

      <Route
        path="/settings/data-privacy/communications"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Communications />
          )
        }
      />

      <Route
        path="/settings/data-privacy/your-data"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <YourData />
          )
        }
      />

      <Route
        path="/settings/data-privacy/your-data/export"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <ExportData />
          )
        }
      />

      <Route
        path="/settings/data-privacy/your-data/delete"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <RequestDataDeletion />
          )
        }
      />

      <Route
        path="/settings/data-privacy/terms"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <TermsConditions />
          )
        }
      />

      <Route
        path="/settings/data-privacy/delete-account"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <DeleteAccount />
          )
        }
      />

      <Route
        path="/settings/data-privacy/privacy-policy"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <PrivacyPolicy />
          )
        }
      />

      {/* =====================================================
          CONTACT SUPPORT
          ===================================================== */}

      <Route
        path="/settings/contact-support"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <ContactSupport />
          )
        }
      />

      <Route
        path="/settings/contact-support/faq"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <FrequentlyAskedQuestions />
          )
        }
      />

      {/* =====================================================
          MENTOR CHAT
          ===================================================== */}

      <Route
        path="/mentor"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <MentorChat />
          )
        }
      />


      {/* =====================================================
          OTHER PAGES
          ===================================================== */}

      <Route
        path="/journal"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Journal />
          )
        }
      />

      <Route
        path="/community"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <Community />
          )
        }
      />


      {/* =====================================================
          DEVELOPMENT PREVIEW ROUTES
          ===================================================== */}

      <Route
        path="/dev/home"
        element={<Home />}
      />

      <Route
        path="/dev/onboarding"
        element={<Onboarding />}
      />

      <Route
        path="/dev/roadmap"
        element={<Roadmap />}
      />

      <Route
        path="/dev/tasks"
        element={<Tasks />}
      />

      <Route
        path="/dev/profile"
        element={<Profile />}
      />

      <Route
        path="/dev/settings"
        element={<Settings />}
      />

      <Route
        path="/dev/mentor"
        element={<MentorChat />}
      />

      <Route
        path="/dev/journal"
        element={<Journal />}
      />

      <Route
        path="/dev/community"
        element={<Community />}
      />


      {/* =====================================================
          FALLBACK
          ===================================================== */}

      <Route
        path="*"
        element={<Navigate to="/signin" replace />}
      />

    </Routes>
  );
}


export default function Router() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}