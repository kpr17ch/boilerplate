import { NextResponse } from 'next/server';

// Umgebungsvariable für Perplexity API-Schlüssel
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Perplexity API-Endpunkt
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Optimierter Systemprompt für Perplexity
const systemPrompt = `Du bist ein spezialisierter Mode-Analyst, der Suchanfragen für Fashionartikel präzise kategorisieren kann. Deine Aufgabe ist es, jede Suchanfrage zu analysieren und die relevanten Informationen im vorgegebenen Format zu liefern.

ANALYSIERE folgende Aspekte:

1. KATEGORIE: Identifiziere die exakte Produktkategorie (z.B. T-Shirt, Pullover, Jeans, Kleid, Schuhe, Gürtel, Jacke, etc.). Wähle aber nicht allzu spezifische Kategorien aus wie z.B. "Schnürsenkel" oder "Socken" oder "Hausschuhe".
2. MARKE: Erkenne die explizit genannte oder implizierte Marke. Gib nur den Namen zurück, keine Zusätze wie "Marke:" oder ähnliches. Falls der Nutzer eine Suchanfrage eingibt, die einen allgemeinen Produktbegriff oder eine Kategorie beschreibt, die nicht eindeutig einer spezifischen Marke zugeordnet werden kann (z.B. "raw denim", "bomber jacket", "camo pants"), soll das Feld "marke" leer bleiben.
3. MODELLNAME: Identifiziere spezifische Modellbezeichnungen, Kollektionen oder Produktlinien.
4. FARBE: 
   - Falls eine spezifische Farbe genannt wird, gib diese an.
   - Falls keine Farbe genannt wird, recherchiere die häufigsten Farbvarianten des Artikels.
   - Liste die Farben in der Reihenfolge ihrer Popularität auf, getrennt durch Kommas.
   - Beispiel für "Air Force 1": "weiß, schwarz, grau, rot, blau"
   - Wenn ein Artikel hauptsächlich in 1-2 ikonischen Farben bekannt ist (wie weiße Air Force 1), priorisiere diese.
5. COLLABORATION: Füge hier NUR Informationen ein, wenn es eine Kollaboration zwischen zwei Marken ist, wie:
   - Kollaborationen (z.B. "Supreme x The North Face")
   - Besondere Editionen oder limitierte Releases
   - Lasse dieses Feld leer, wenn keine solchen Kollaborationen vorhanden sind

METHODIK:
- Falls Information unklar ist, verwende dein Wissen über aktuelle Mode-Trends und bekannte Produkte
- Nutze bei Bedarf visuelle Erkenntnisse aus typischen Bildsuchen zu dem Artikel
- Bei unbekannten Artikeln oder Marken, versuche die wahrscheinlichste Interpretation anzugeben
- Wenn eine Information nicht ermittelbar ist, gib einen leeren String zurück

Antworte AUSSCHLIESSLICH mit folgendem JSON-Format ohne weitere Erklärungen oder Einleitungen:

{
  "kategorie": string,
  "marke": string,
  "modellname": string,
  "farbe": string,
  "collaboration": string
}`;

export async function POST(request: Request) {
  try {
    // Anfrage-Body parsen
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Eine Suchanfrage ist erforderlich' },
        { status: 400 }
      );
    }

    if (!PERPLEXITY_API_KEY) {
      console.error('Perplexity API-Schlüssel nicht konfiguriert');
      return NextResponse.json(
        { error: 'Dienst nicht verfügbar' },
        { status: 500 }
      );
    }

    // Anfrage an Perplexity API senden
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar-pro', // Sonar Pro-Modell
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Perplexity API-Fehler:', errorData);
      return NextResponse.json(
        { error: 'Fehler bei der Verarbeitung durch Perplexity' },
        { status: 502 }
      );
    }

    // Antwort verarbeiten
    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Versuche, den JSON-String zu parsen
    try {
      const parsedContent = JSON.parse(content);
      
      // Überprüfe, ob alle erforderlichen Felder vorhanden sind
      const requiredFields = ['kategorie', 'marke', 'modellname', 'farbe', 'collaboration'];
      for (const field of requiredFields) {
        if (!Object.prototype.hasOwnProperty.call(parsedContent, field)) {
          parsedContent[field] = '';
        }
      }

      return NextResponse.json(parsedContent);
    } catch (error) {
      console.error('Fehler beim Parsen der Antwort:', error);
      return NextResponse.json(
        { error: 'Fehler beim Verarbeiten der Perplexity-Antwort' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Fehler bei der Perplexity-Anfrage:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 