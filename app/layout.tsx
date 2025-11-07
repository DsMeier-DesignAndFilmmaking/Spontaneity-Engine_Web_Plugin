import './globals.css';

import { ReactNode } from 'react';

import Navbar from './components/Navbar';
import { AuthProvider } from './components/AuthContext';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-800">
        <AuthProvider>
          <Navbar />
          <main className="w-full">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
