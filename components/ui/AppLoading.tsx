"use client";

import { useState, useEffect } from 'react';

export default function AppLoading() {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  
  useEffect(() => {
    // Erst Fade-Out starten
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1500);
    
    // Dann komplett entfernen
    const removeTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);
  
  if (!isLoading) return null;
  
  return (
    <div 
      className={`fixed inset-0 bg-white text-black z-50 transition-opacity duration-500
                 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Header - genau wie in der Homepage */}
      <header className="py-5 px-8 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <nav className="flex items-center gap-8">
              <span className="text-xs uppercase tracking-[0.15em] text-gray-500">
                Discover
              </span>
              <span className="text-xs uppercase tracking-[0.15em] text-gray-500">
                Trending
              </span>
              <span className="text-xs uppercase tracking-[0.15em] text-gray-500">
                Saved
              </span>
            </nav>
          </div>

          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-base uppercase tracking-[0.25em] font-medium">
            FASHION AI
          </h1>

          <div className="flex items-center gap-6">
            <span className="text-xs uppercase tracking-[0.15em] text-gray-500">
              Account
            </span>
            <span className="text-xs uppercase tracking-[0.15em] text-gray-500">
              Help
            </span>
          </div>
        </div>
      </header>
      
      {/* Main Content mit Chat-Verlauf-Sidebar und Loading-Bereich */}
      <div className="flex h-[calc(100vh-61px)]">
        {/* Sidebar */}
        <div className="w-60 border-r border-gray-200 p-4">
          <h2 className="text-xs uppercase tracking-wider mb-4">Chat-Verlauf</h2>
          <div className="space-y-4 opacity-50">
            <div className="text-sm">
              <div>SCHWARZE LEDERJACKE</div>
              <div className="text-xs text-gray-500">Vor 1 Stunden</div>
            </div>
            <div className="text-sm">
              <div>SCHWARZE LEDERJACKE</div>
              <div className="text-xs text-gray-500">Vor 2 Stunden</div>
            </div>
            <div className="text-sm">
              <div>SCHWARZE LEDERJACKE</div>
              <div className="text-xs text-gray-500">Vor 3 Stunden</div>
            </div>
          </div>
        </div>
        
        {/* Main Chat Area mit Ladeanimation */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="flex justify-center items-center py-6">
                <div className="dot-flashing"></div>
              </div>
              <p className="mt-4 text-gray-500 text-sm">Lade Fashion AI...</p>
            </div>
          </div>
          
          {/* Input Area (ausgegraut) */}
          <div className="border-t border-gray-200 p-5">
            <div className="flex items-center opacity-50">
              <div className="flex-1 bg-transparent border-b border-gray-300 py-3 px-2 text-sm tracking-wide text-gray-400 text-xs tracking-wider">
                Beschreibe deinen gewünschten Artikel...
              </div>
              <div className="ml-4 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 