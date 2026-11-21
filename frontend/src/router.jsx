import React, { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";
import LoadingFallback from "./components/common/LoadingFallback";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";

// Lazy-loaded route components for optimal bundle splitting and performance
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Documents = lazy(() => import("./pages/Documents"));
const Chat = lazy(() => import("./pages/Chat"));
const Summary = lazy(() => import("./pages/Summary"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const Progress = lazy(() => import("./pages/Progress"));
const Settings = lazy(() => import("./pages/Settings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Forbidden = lazy(() => import("./pages/Forbidden"));
const ServerError = lazy(() => import("./pages/ServerError"));

// Helper wrapper to provide suspense boundary per route
const withSuspense = (Component, message) => (
  <Suspense fallback={<LoadingFallback message={message} />}>
    <Component />
  </Suspense>
);

// Intelligent root router: authenticated users view dashboard; visitors view Landing page
function RootRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <LoadingFallback message="Initializing StudyMate AI..." />;
  }
  return isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    withSuspense(Landing, "Loading StudyMate AI...")
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <RootRoute />,
      },
      {
        path: "landing",
        element: withSuspense(Landing, "Loading StudyMate AI..."),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              {
                path: "dashboard",
                element: withSuspense(Dashboard, "Loading Dashboard..."),
              },
              {
                path: "documents",
                element: withSuspense(Documents, "Loading Documents..."),
              },
              {
                path: "chat",
                element: withSuspense(Chat, "Connecting to AI Tutor..."),
              },
              {
                path: "summary",
                element: withSuspense(Summary, "Loading Summaries..."),
              },
              {
                path: "quiz",
                element: withSuspense(Quiz, "Preparing Quiz & Exams..."),
              },
              {
                path: "flashcards",
                element: withSuspense(Flashcards, "Loading Flashcards..."),
              },
              {
                path: "progress",
                element: withSuspense(Progress, "Loading Analytics..."),
              },
              {
                path: "settings",
                element: withSuspense(Settings, "Loading Preferences..."),
              },
            ],
          },
        ],
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "reset-password",
        element: <ResetPassword />,
      },
      {
        path: "verify-email",
        element: <VerifyEmail />,
      },
      {
        path: "privacy",
        element: withSuspense(PrivacyPolicy, "Loading Privacy Policy..."),
      },
      {
        path: "terms",
        element: withSuspense(TermsOfService, "Loading Terms of Service..."),
      },
      {
        path: "contact",
        element: withSuspense(Contact, "Loading Contact Page..."),
      },
      {
        path: "help",
        element: withSuspense(Help, "Loading Help Center..."),
      },
      {
        path: "403",
        element: withSuspense(Forbidden, "Loading..."),
      },
      {
        path: "500",
        element: withSuspense(ServerError, "Loading..."),
      },
      {
        path: "*",
        element: withSuspense(NotFound, "Loading..."),
      },
    ],
  },
]);

export default router;
