import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI-Client initialisieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Benutzereingabe aus dem Request-Body extrahieren
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Benutzereingabe ist erforderlich' },
        { status: 400 }
      );
    }

    // System-Prompt erstellen, der nur einen Suchbegriff für Vestiaire Collective zurückgibt
    const systemPrompt = `Du bist ein hilfreicher Assistent, der Benutzereingaben in effektive Suchbegriffe für die Vestiaire Collective Plattform umwandelt.
    Vestiaire Collective ist ein Online-Marktplatz für gebrauchte Luxusmode und Designerkleidung.
    
    Deine Aufgabe ist es, die Benutzereingabe zu analysieren und einen präzisen Suchbegriff zu generieren, der auf Vestiaire Collective verwendet werden kann.
    
    Gib NUR den Suchbegriff zurück, ohne zusätzliche Erklärungen oder Formatierungen.
    Der Suchbegriff sollte:
    - Kurz und präzise sein
    - Relevante Marken, Kategorien oder Produkttypen enthalten
    - Keine Sonderzeichen enthalten (außer + für Leerzeichen)
    - Keine Anführungszeichen enthalten
    
    Beispiele:
    Eingabe: "Ich suche eine schwarze Gucci Handtasche"
    Ausgabe: gucci+black+bag
    
    Eingabe: "Rote Louboutin High Heels"
    Ausgabe: louboutin+red+heels`;

    // Anfrage an OpenAI senden
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3, // Niedrigere Temperatur für konsistentere Ergebnisse
    });

    // Antwort extrahieren und bereinigen
    const content = response.choices[0]?.message?.content || '';
    const searchTerm = content.trim();
    
    return NextResponse.json({ searchTerm });
  } catch (error) {
    console.error('Fehler bei der OpenAI-Anfrage:', error);
    
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der Anfrage' },
      { status: 500 }
    );
  }
} 