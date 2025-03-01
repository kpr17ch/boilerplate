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

    // System-Prompt erstellen, der das gewünschte JSON-Format vorgibt
    const systemPrompt = `Du bist ein hilfreicher Produktberater. Basierend auf der Benutzereingabe, empfehle 8 passende Produkte.
    Gib deine Antwort AUSSCHLIESSLICH als JSON-Objekt im folgenden Format zurück:
    {
      "products": [
        {
          "id": "1",
          "name": "Produktname",
          "description": "Kurze Produktbeschreibung",
          "price": 99.99,
          "rating": 4.5,
          "category": "Kategoriename",
          "image": "product-1.jpg"
        },
        ...
      ]
    }
    Stelle sicher, dass die Preise realistisch sind und die Bewertungen zwischen 1 und 5 liegen.
    Verwende für die Bilder Platzhalternamen wie "product-1.jpg" bis "product-5.jpg".
    Gib KEINE zusätzlichen Erklärungen oder Text außerhalb des JSON-Objekts zurück.`;

    // Anfrage an OpenAI senden
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
    });

    // Antwort extrahieren
    const content = response.choices[0]?.message?.content || '';
    
    // Versuchen, JSON aus der Antwort zu extrahieren
    try {
      // Suche nach JSON-Objekt in der Antwort
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      const data = JSON.parse(jsonString);
      
      return NextResponse.json(data);
    } catch (error) {
      console.error('Fehler beim Parsen der JSON-Antwort:', error);
      console.log('Erhaltene Antwort:', content);
      
      return NextResponse.json(
        { error: 'Fehler beim Parsen der Antwort', rawContent: content },
        { status: 500 } 
      );
    }
  } catch (error) {
    console.error('Fehler bei der OpenAI-Anfrage:', error);
    
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der Anfrage' },
      { status: 500 }
    );
  }
} 