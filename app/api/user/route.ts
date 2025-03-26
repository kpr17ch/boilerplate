import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Benutzerprofiltyp
export type UserProfile = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  location?: string;
  bio?: string;
  settings?: {
    email_notifications: boolean;
    security_alerts: boolean;
    marketing_emails: boolean;
    two_factor_auth: boolean;
    activity_tracking: boolean;
  };
};

// Profildaten des Benutzers abrufen
export async function GET() {
  try {
    // Erstelle Supabase-Client mit Server-Cookies
    const supabase = await createClient();
    
    // Hole Benutzerdaten
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }
    
    // Hole Profildaten aus der profiles-Tabelle
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Fehler beim Laden des Profils:", profileError);
    }
    
    // Standardeinstellungen, falls noch keine existieren
    const defaultSettings = {
      email_notifications: true,
      security_alerts: true,
      marketing_emails: false,
      two_factor_auth: false,
      activity_tracking: true
    };
    
    // Gib Benutzerdaten zurück (nur die notwendigen Felder)
    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        profile: profile || {
          id: user.id,
          first_name: '',
          last_name: '',
          phone: '',
          location: '',
          bio: '',
          settings: defaultSettings
        }
      } 
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Benutzerdaten:", error);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

// Profildaten des Benutzers aktualisieren
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Benutzerdaten abrufen
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }
    
    // Daten aus dem Request-Body extrahieren
    const profileData: UserProfile = await request.json();
    
    // Überprüfe, ob das Profil existiert
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();
    
    let result;
    
    if (existingProfile) {
      // Profil aktualisieren
      result = await supabase
        .from('users')
        .update(profileData)
        .eq('id', user.id);
    } else {
      // Neues Profil erstellen
      result = await supabase
        .from('users')
        .insert({
          id: user.id,
          ...profileData
        });
    }
    
    if (result.error) {
      console.error("Fehler beim Speichern der Profildaten:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Profil erfolgreich aktualisiert"
    });
  } catch (error) {
    console.error("Fehler beim Speichern der Benutzerdaten:", error);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
} 