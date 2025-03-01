"use client";

import React, { useState, useEffect } from "react";
import { UserProfile } from "@/app/api/user/route";
import { toast } from "react-toastify";

type UserData = {
  id?: string;
  email: string | null;
  profile?: UserProfile;
};

// Toggle-Komponente
const Toggle = ({ 
  label, 
  description, 
  checked = false,
  onChange = () => {},
}: { 
  label: string; 
  description: string; 
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) => {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <h4 className="text-sm font-medium text-white">{label}</h4>
        <p className="text-sm text-white/50">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#5E6AD2]/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/10 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5E6AD2]"></div>
      </label>
    </div>
  );
};

export default function SettingsPage() {
  const [userData, setUserData] = useState<UserData>({ email: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    email_notifications: true,
    security_alerts: true,
    marketing_emails: false,
    two_factor_auth: false,
    activity_tracking: true
  });

  // Benutzerdaten laden
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.user) {
          setUserData(data.user);
          // Einstellungen mit vorhandenen Daten füllen
          if (data.user.profile && data.user.profile.settings) {
            setSettings(data.user.profile.settings);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Benutzerdaten:', error);
        toast.error('Fehler beim Laden der Benutzerdaten');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Einstellungen ändern und speichern
  const handleToggleChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Änderungen in der Datenbank speichern
    saveSettings({
      ...settings,
      [key]: value
    });
  };

  // Speichern der Einstellungen in der Datenbank
  const saveSettings = async (newSettings: typeof settings) => {
    try {
      setIsSaving(true);
      
      const profileData: UserProfile = {
        settings: newSettings
      };
      
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Speichern');
      }
      
      toast.success('Einstellungen gespeichert');
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = () => {
    toast.info('Passwort ändern-Funktion wird implementiert...');
  };

  const handleDeleteAccount = () => {
    if (confirm('Bist du sicher, dass du dein Konto löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      toast.info('Konto löschen-Funktion wird implementiert...');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5E6AD2]"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8 text-white">Einstellungen</h1>

      <div className="bg-white/5 backdrop-blur-sm rounded-lg divide-y divide-white/10 border border-white/10">
        {/* Abschnitt: Konto */}
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4 text-white">Konto</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full md:w-96 px-3 py-2 bg-white/5 border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-[#5E6AD2] focus:border-[#5E6AD2] text-white/50"
                value={userData.email || ""}
                disabled
              />
            </div>
            
            <div>
              <button
                type="button"
                onClick={handleChangePassword}
                className="text-[#5E6AD2] hover:text-[#7380ee] text-sm font-medium transition-colors"
              >
                Passwort ändern
              </button>
            </div>
          </div>
        </div>
        
        {/* Abschnitt: Benachrichtigungen */}
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4 text-white">Benachrichtigungen</h2>
          
          <div className="space-y-1">
            <Toggle 
              label="E-Mail-Benachrichtigungen" 
              description="Erhalte wichtige Benachrichtigungen per E-Mail."
              checked={settings.email_notifications}
              onChange={(checked) => handleToggleChange('email_notifications', checked)}
            />
            
            <Toggle 
              label="Sicherheitshinweise" 
              description="Erhalte Benachrichtigungen über verdächtige Aktivitäten und Sicherheitsupdates."
              checked={settings.security_alerts}
              onChange={(checked) => handleToggleChange('security_alerts', checked)}
            />
            
            <Toggle 
              label="Marketing-E-Mails" 
              description="Erhalte Informationen über neue Funktionen und Angebote."
              checked={settings.marketing_emails}
              onChange={(checked) => handleToggleChange('marketing_emails', checked)}
            />
          </div>
        </div>
        
        {/* Abschnitt: Datenschutz und Sicherheit */}
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4 text-white">Datenschutz und Sicherheit</h2>
          
          <div className="space-y-1">
            <Toggle 
              label="Zwei-Faktor-Authentifizierung" 
              description="Erhöhe die Sicherheit deines Kontos durch einen zusätzlichen Verifizierungsschritt."
              checked={settings.two_factor_auth}
              onChange={(checked) => handleToggleChange('two_factor_auth', checked)}
            />
            
            <Toggle 
              label="Aktivitätsverlauf" 
              description="Speichere deine Aktivitäten zur besseren Nachverfolgung."
              checked={settings.activity_tracking}
              onChange={(checked) => handleToggleChange('activity_tracking', checked)}
            />
          </div>
        </div>
        
        {/* Abschnitt: Gefahrenzone */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-red-400 mb-4">Gefahrenzone</h2>
          
          <div>
            <p className="text-sm text-white/50 mb-4">
              Sobald du dein Konto löschst, werden alle deine Daten unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-transparent border border-red-400 text-red-400 rounded-md hover:bg-red-400/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-colors"
            >
              Konto löschen
            </button>
          </div>
        </div>
      </div>
      
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-md rounded-lg p-3 shadow-lg border border-white/10">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#5E6AD2]"></div>
            <span className="text-white/80 text-sm">Einstellungen werden gespeichert...</span>
          </div>
        </div>
      )}
    </div>
  );
} 