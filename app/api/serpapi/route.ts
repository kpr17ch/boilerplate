import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// SerpAPI-Konfiguration
const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_API_BASE_URL = 'https://serpapi.com/search';

export async function POST(request: Request) {
  try {
    // Suchbegriff aus dem Request-Body extrahieren
    const { searchTerm } = await request.json();

    if (!searchTerm || typeof searchTerm !== 'string') {
      return NextResponse.json(
        { error: 'Suchbegriff ist erforderlich' },
        { status: 400 }
      );
    }

    console.log(`Starte SerpAPI-Suche für Suchbegriff: ${searchTerm}`);
    
    // Parameter für die SerpAPI-Anfrage
    const params = new URLSearchParams({
      q: `${searchTerm}`,
      api_key: SERP_API_KEY || '',
      engine: 'google',
      num: '10', // Anzahl der Ergebnisse
      gl: 'de', // Geolocation (Deutschland)
      hl: 'de' // Sprache (Deutsch)
    });

    // SerpAPI-Anfrage senden
    const response = await fetch(`${SERP_API_BASE_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Fehler bei der SerpAPI-Anfrage: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ergebnisse in der Konsole loggen
    console.log('SerpAPI-Ergebnisse:');
    console.log(JSON.stringify(data, null, 2));
    
    // Organische Suchergebnisse extrahieren (falls vorhanden)
    const organicResults = data.organic_results || [];
    console.log(`${organicResults.length} organische Suchergebnisse gefunden.`);
    
    if (organicResults.length > 0) {
      console.log('Erste 3 organische Suchergebnisse:');
      organicResults.slice(0, 3).forEach((result: any, index: number) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   URL: ${result.link}`);
        console.log(`   Snippet: ${result.snippet}`);
      });
    }
    
    // Ergebnisse in eine JSON-Datei schreiben
    try {
      // Erstelle einen Dateinamen basierend auf dem Suchbegriff und Zeitstempel
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedSearchTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const filename = `serpapi_${sanitizedSearchTerm}_${timestamp}.json`;
      
      // Stelle sicher, dass das Verzeichnis existiert
      const dir = path.join(process.cwd(), 'scripts', 'output');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Vollständiger Pfad zur Datei
      const filePath = path.join(dir, filename);
      
      // Schreibe die Daten in die Datei
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`SerpAPI-Ergebnisse wurden in ${filePath} gespeichert.`);
    } catch (fileError) {
      console.error('Fehler beim Schreiben der SerpAPI-Ergebnisse in Datei:', fileError);
    }
    
    // Rückgabe der Ergebnisse (wird im Frontend nicht verwendet)
    return NextResponse.json({ success: true, message: 'SerpAPI-Ergebnisse wurden in der Konsole geloggt und in eine JSON-Datei geschrieben' });

  } catch (error) {
    console.error('Fehler bei der SerpAPI-Anfrage:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der SerpAPI-Anfrage' },
      { status: 500 }
    );
  }
} 