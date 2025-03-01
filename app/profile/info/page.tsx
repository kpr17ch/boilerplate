"use client";

import React, { useState, useEffect } from "react";
import { UserProfile } from "@/app/api/user/route";
import { toast } from "react-toastify";

type UserData = {
  id?: string;
  email: string | null;
  profile?: UserProfile;
};

export default function ProfileInfoPage() {
  const [userData, setUserData] = useState<UserData>({ email: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    location: '',
    bio: ''
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
          // Formularfelder mit vorhandenen Daten füllen
          if (data.user.profile) {
            setFormData({
              first_name: data.user.profile.first_name || '',
              last_name: data.user.profile.last_name || '',
              phone: data.user.profile.phone || '',
              location: data.user.profile.location || '',
              bio: data.user.profile.bio || ''
            });
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

  // Formularfeld-Änderungshandler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Speichern');
      }
      
      toast.success('Profil erfolgreich gespeichert');
    } catch (error) {
      console.error('Fehler beim Speichern des Profils:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
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
      <h1 className="text-2xl font-bold mb-8 text-white">Dein Profil</h1>

      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/10">
        <div className="max-w-3xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex items-center space-x-6 mb-8">
              <div className="bg-white/10 rounded-full w-24 h-24 flex items-center justify-center text-3xl text-white">
                {userData.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{userData.email}</h2>
                <button type="button" className="mt-2 text-sm text-[#5E6AD2] hover:text-[#7380ee] transition-colors">
                  Profilbild ändern
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-white/70 mb-1">
                  Vorname
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-[#5E6AD2] focus:border-[#5E6AD2] text-white"
                  placeholder="Dein Vorname"
                />
              </div>
              
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-white/70 mb-1">
                  Nachname
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-[#5E6AD2] focus:border-[#5E6AD2] text-white"
                  placeholder="Dein Nachname"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-[#5E6AD2] focus:border-[#5E6AD2] text-white/50"
                  value={userData.email || ""}
                  disabled
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-white/70 mb-1">
                  Telefonnummer
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-[#5E6AD2] focus:border-[#5E6AD2] text-white"
                  placeholder="Deine Telefonnummer"
                />
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-white/70 mb-1">
                  Standort
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-[#5E6AD2] focus:border-[#5E6AD2] text-white"
                  placeholder="Dein Standort"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-white/70 mb-1">
                Über mich
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-[#5E6AD2] focus:border-[#5E6AD2] text-white"
                placeholder="Ein paar Worte über dich..."
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-[#5E6AD2] text-white rounded-md hover:bg-[#4a55c5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E6AD2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Wird gespeichert...' : 'Profil speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 