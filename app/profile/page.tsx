"use client";

import React, { useState, useEffect } from "react";

// Widget-Komponente
const ProfileWidget = ({ 
  title, 
  children, 
  className = "" 
}: { 
  title: string; 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={`bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10 ${className}`}>
    <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
    <div>{children}</div>
  </div>
);

// Beispieldaten für Aktivitäten
const DEMO_ACTIVITIES = [
  { id: 1, action: "Login", date: "Heute, 14:30" },
  { id: 2, action: "Profilaktualisierung", date: "Gestern, 10:15" },
  { id: 3, action: "Passwortänderung", date: "15. Mai 2023, 09:20" },
];

export default function ProfilePage() {
  const [userData, setUserData] = useState<{ email: string | null }>({ email: null });
  const [isLoading, setIsLoading] = useState(true);
  const [activities] = useState(DEMO_ACTIVITIES);
  
  // Registrierungsdatum formatieren
  const memberSince = new Date().toLocaleDateString('de-DE');

  // Benutzerdaten laden
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user');
        const data = await response.json();
        if (data.user) {
          setUserData({ email: data.user.email });
        }
      } catch (error) {
        console.error('Fehler beim Laden der Benutzerdaten:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5E6AD2]"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8 text-white">Willkommen zurück!</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <ProfileWidget title="Profil-Zusammenfassung" className="lg:col-span-2">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-white/10 rounded-full w-16 h-16 flex items-center justify-center text-2xl text-white">
              {userData.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h4 className="font-medium text-white">{userData.email}</h4>
              <p className="text-sm text-white/50">Mitglied seit {memberSince}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-white/70">
              Vervollständige dein Profil, um alle Funktionen nutzen zu können.
            </p>
            <div className="mt-2 w-full bg-white/10 rounded-full h-2.5">
              <div className="bg-[#5E6AD2] h-2.5 rounded-full" style={{ width: '45%' }}></div>
            </div>
            <p className="text-xs text-white/50 mt-1">45% abgeschlossen</p>
          </div>
        </ProfileWidget>

        <ProfileWidget title="Statistiken">
          <div className="space-y-4 text-white/70">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Logins diesen Monat</span>
                <span className="text-sm font-semibold text-white">12</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Letzte Aktivität</span>
                <span className="text-sm font-semibold text-white">Heute</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Status</span>
                <span className="text-sm font-semibold text-green-400">Aktiv</span>
              </div>
            </div>
          </div>
        </ProfileWidget>
      </div>

      <ProfileWidget title="Letzte Aktivitäten">
        <div className="divide-y divide-white/10">
          {activities.map((activity) => (
            <div key={activity.id} className="py-3 flex justify-between">
              <span className="text-white/70">{activity.action}</span>
              <span className="text-sm text-white/50">{activity.date}</span>
            </div>
          ))}
        </div>
      </ProfileWidget>
    </div>
  );
} 