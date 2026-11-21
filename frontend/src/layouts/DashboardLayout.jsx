import React, { useState, useEffect } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer upon route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col justify-between">
          <div className="max-w-7xl mx-auto space-y-6 w-full flex-1">
            <Outlet />
          </div>
          {/* Dashboard Footer */}
          <footer className="mt-12 py-4 border-t border-slate-200/80 text-center text-xs text-slate-500">
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
              <span className="font-semibold text-slate-600">StudyMate AI v1.0.0</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <Link to="/help" className="hover:text-indigo-600 transition-colors">
                Help & FAQ
              </Link>
              <Link to="/privacy" className="hover:text-indigo-600 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-indigo-600 transition-colors">
                Terms of Service
              </Link>
              <Link to="/contact" className="hover:text-indigo-600 transition-colors">
                Support
              </Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}