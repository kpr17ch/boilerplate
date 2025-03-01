"use client";

import React, { useState, useEffect } from "react";
import { signOutAction } from "@/app/actions";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [userData, setUserData] = useState<{ email: string | null }>({ email: null });
  const [isLoading, setIsLoading] = useState(false);

  // Laden der Benutzerdaten beim ersten Rendern
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        if (data.user) {
          setUserData({ email: data.user.email });
        }
      } catch (error) {
        console.error('Fehler beim Laden der Benutzerdaten:', error);
      }
    };

    fetchUserData();
  }, []);

  // Anzeige eines Ladeindikators während der Navigation
  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsLoading(true);
    };

    const handleRouteChangeComplete = () => {
      setIsLoading(false);
    };

    window.addEventListener('routeChangeStart', handleRouteChangeStart);
    window.addEventListener('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      window.removeEventListener('routeChangeStart', handleRouteChangeStart);
      window.removeEventListener('routeChangeComplete', handleRouteChangeComplete);
    };
  }, []);

  return (
    <div className="container mx-auto pt-28 px-4 lg:px-8 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="md:w-64 md:mr-8 mb-6 md:mb-0">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
          <div className="mb-4 pb-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Profil</h2>
            <p className="text-sm text-white/70">{userData.email}</p>
          </div>
          <nav>
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/profile" 
                  className={`block p-2 rounded transition-all duration-200 ${
                    pathname === '/profile' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  prefetch={true}
                >
                  Übersicht
                </Link>
              </li>
              <li>
                <Link 
                  href="/profile/info" 
                  className={`block p-2 rounded transition-all duration-200 ${
                    pathname === '/profile/info' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  prefetch={true}
                >
                  Profil
                </Link>
              </li>
              <li>
                <Link 
                  href="/profile/settings" 
                  className={`block p-2 rounded transition-all duration-200 ${
                    pathname === '/profile/settings' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  prefetch={true}
                >
                  Einstellungen
                </Link>
              </li>
              <li>
                <form action={signOutAction}>
                  <button 
                    type="submit"
                    className="w-full text-left block p-2 rounded text-red-400 hover:bg-white/10 hover:text-red-300 transition-all duration-200"
                  >
                    Abmelden
                  </button>
                </form>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content with loading indicator */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 backdrop-blur-sm rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5E6AD2]"></div>
          </div>
        )}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          {children}
        </div>
      </div>
    </div>
  );
} 