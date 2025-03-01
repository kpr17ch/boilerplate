-- Erstelle die 'profiles' Tabelle
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  settings JSONB DEFAULT '{"email_notifications": true, "security_alerts": true, "marketing_emails": false, "two_factor_auth": false, "activity_tracking": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktiviere Row-Level-Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Erstelle Richtlinien für Row-Level-Security
-- Nur der eigene Benutzer kann sein Profil lesen
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Nur der eigene Benutzer kann sein Profil aktualisieren
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Nur der eigene Benutzer kann sein Profil erstellen
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Nur der eigene Benutzer kann sein Profil löschen
CREATE POLICY "Users can delete own profile" 
ON profiles FOR DELETE 
USING (auth.uid() = id);

-- Erstelle Funktion zur automatischen Aktualisierung des updated_at-Feldes
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Erstelle Trigger zum Automatischen Aktualisieren von updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Erstelle Trigger zum Automatischen Erstellen eines Profils nach Benutzerregistrierung
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 