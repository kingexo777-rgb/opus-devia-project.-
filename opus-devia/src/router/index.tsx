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
import MentorChat from "../pages/MentorChat";
import Journal from "../pages/Journal";
import Community from "../pages/Community";

function AppRoutes() {
  const { session, loading, profile } = useAuth();
  const onboardingComplete = profile?.onboarding_complete ?? false;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
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
        path="/mentor"
        element={
          !session ? (
            <Navigate to="/signin" replace />
          ) : (
            <MentorChat />
          )
        }
      />
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

      {/* Development preview routes */}
<Route path="/dev/home" element={<Home />} />
<Route path="/dev/onboarding" element={<Onboarding />} />
<Route path="/dev/roadmap" element={<Roadmap />} />
<Route path="/dev/tasks" element={<Tasks />} />
<Route path="/dev/profile" element={<Profile />} />
<Route path="/dev/settings" element={<Settings />} />
<Route path="/dev/mentor" element={<MentorChat />} />
<Route path="/dev/journal" element={<Journal />} />
<Route path="/dev/community" element={<Community />} />

      <Route path="*" element={<Navigate to="/signin" replace />} />
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
