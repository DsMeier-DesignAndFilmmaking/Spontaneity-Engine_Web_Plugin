"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "./AuthContext";
import { logout } from "@/lib/auth";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    window.location.href = "/";
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-sm fixed top-0 left-0 right-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              🌍 TravelAI
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <Link
              href="/explore"
              className="text-gray-900 hover:text-blue-600 font-medium transition-colors px-3 py-2 rounded-md text-sm"
            >
              Explore
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-900 hover:text-blue-600 font-medium transition-colors px-3 py-2 rounded-md text-sm"
            >
              Dashboard
            </Link>
            <Link
              href="/design-system"
              className="text-gray-900 hover:text-blue-600 font-medium transition-colors px-3 py-2 rounded-md text-sm"
            >
              Design System
            </Link>
            {loading ? (
              <span className="text-gray-700 text-sm">Loading...</span>
            ) : user ? (
              <>
                <span className="text-sm text-gray-800 px-3 py-2 truncate max-w-[150px]">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-2 rounded-md transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-900 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white transition-all duration-200 ease-in-out">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/explore"
              className="text-gray-900 hover:bg-gray-100 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Explore
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-900 hover:bg-gray-100 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/design-system"
              className="text-gray-900 hover:bg-gray-100 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Design System
            </Link>
            {loading ? (
              <div className="px-3 py-2 text-gray-700 text-base">Loading...</div>
            ) : user ? (
              <>
                <div className="px-3 py-2 text-sm text-gray-800 border-b border-gray-200">
                  <div className="font-medium text-gray-900">Signed in as</div>
                  <div className="text-gray-600 truncate">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:bg-red-50 hover:text-red-800 w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-blue-600 text-white block px-3 py-2 rounded-lg hover:bg-blue-700 text-base font-medium transition-colors text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
