import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Google Search API Konfiguration
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
const GOOGLE_SEARCH_BASE_URL = 'https://www.googleapis.com/customsearch/v1';

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

    console.log(`Starte Google Search API-Suche für Suchbegriff: ${searchTerm}`);
    
    // Parameter für die Google Search API-Anfrage
    const params = new URLSearchParams({
      q: searchTerm,
      key: GOOGLE_SEARCH_API_KEY || '',
      cx: GOOGLE_SEARCH_CX || '',
      num: '10', // Anzahl der Ergebnisse
      hl: 'de' // Sprache (Deutsch)
    });

    // Google Search API-Anfrage senden
    const response = await fetch(`${GOOGLE_SEARCH_BASE_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Fehler bei der Google Search API-Anfrage: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ergebnisse in der Konsole loggen
    console.log('Google Search API-Ergebnisse:');
    console.log(JSON.stringify(data, null, 2));
    
    // Suchergebnisse extrahieren (falls vorhanden)
    const searchResults = data.items || [];
    console.log(`${searchResults.length} Suchergebnisse gefunden.`);
    
    if (searchResults.length > 0) {
      console.log('Erste 3 Suchergebnisse:');
      searchResults.slice(0, 3).forEach((result: any, index: number) => {
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
      const filename = `googlesearch_${sanitizedSearchTerm}_${timestamp}.json`;
      
      // Stelle sicher, dass das Verzeichnis existiert
      const dir = path.join(process.cwd(), 'scripts', 'output');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Vollständiger Pfad zur Datei
      const filePath = path.join(dir, filename);
      
      // Schreibe die Daten in die Datei
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`Google Search API-Ergebnisse wurden in ${filePath} gespeichert.`);
    } catch (fileError) {
      console.error('Fehler beim Schreiben der Google Search API-Ergebnisse in Datei:', fileError);
    }
    
    // Rückgabe der Ergebnisse (wird im Frontend nicht verwendet)
    return NextResponse.json({ success: true, message: 'Google Search API-Ergebnisse wurden in der Konsole geloggt und in eine JSON-Datei geschrieben' });

  } catch (error) {
    console.error('Fehler bei der Google Search API-Anfrage:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der Google Search API-Anfrage' },
      { status: 500 }
    );
  }
} 