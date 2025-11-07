"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthContext";
import { logout } from "@/lib/auth";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/explore", label: "Explore" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/design-system", label: "Design System" },
];

export default function Navbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    window.location.href = "/";
  };

  const handleItemClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-between px-4 pt-4 sm:px-6 lg:px-8">
        <div className="pointer-events-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur transition hover:bg-white"
          >
            🌍 TravelAI
          </Link>
        </div>

        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="inline-flex items-center justify-center rounded-full bg-white/95 p-3 text-gray-900 shadow-lg backdrop-blur transition hover:bg-white"
            aria-label="Open navigation menu"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 transition ${isMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsMenuOpen(false)}
        />

        <aside
          ref={drawerRef}
          className={`absolute right-0 top-0 h-full w-80 max-w-[90vw] transform bg-white shadow-2xl transition-transform duration-200 ease-out ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Navigation</p>
              <h3 className="text-lg font-semibold text-gray-900">Spontaneity Engine</h3>
              <p className="text-xs text-gray-500">Quickly switch between experiences and tools.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <nav className="space-y-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleItemClick}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition hover:bg-gray-50 ${
                    pathname === item.href ? "border-blue-600 text-blue-600" : "border-gray-200 text-gray-800"
                  }`}
                >
                  {item.label}
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </nav>

            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Need help planning?</p>
              <p className="mt-1 text-xs text-gray-500">
                Discover curated hang outs tailored to the moment—they update with weather, time, and your preferences.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 px-5 py-4">
            {loading ? (
              <span className="text-sm text-gray-600">Loading...</span>
            ) : user ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  <p className="font-semibold text-gray-900">Signed in as</p>
                  <p className="truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={handleItemClick}
                className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Login
              </Link>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
