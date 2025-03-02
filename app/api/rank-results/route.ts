import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI-Client initialisieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Vestiaire Produkt-Interface
interface VestiaireProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  size: string;
  imageUrl: string;
  productUrl: string;
}

// Vinted Produkt-Interface
interface VintedProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  size: string;
  condition: string;
  imageUrl: string;
  productUrl: string;
}

export async function POST(request: Request) {
  try {
    // Daten aus dem Request-Body extrahieren
    const { originalQuery, vestiaireProducts, vintedProducts } = await request.json();

    if (!originalQuery || typeof originalQuery !== 'string') {
      return NextResponse.json(
        { error: 'Ursprüngliche Benutzeranfrage ist erforderlich' },
        { status: 400 }
      );
    }

    if (!Array.isArray(vestiaireProducts) || !Array.isArray(vintedProducts)) {
      return NextResponse.json(
        { error: 'Produktlisten müssen Arrays sein' },
        { status: 400 }
      );
    }

    console.log(`Ranking-API aufgerufen mit Anfrage: "${originalQuery}"`);
    console.log(`Anzahl Vestiaire-Produkte: ${vestiaireProducts.length}`);
    console.log(`Anzahl Vinted-Produkte: ${vintedProducts.length}`);

    // System-Prompt erstellen für die Bewertung der Produkte
    const systemPrompt = `Du bist ein Experte für Mode und Shopping, der Produkte basierend auf Benutzeranfragen bewertet.
    
    Deine Aufgabe ist es, die Produkte von Vestiaire Collective und Vinted zu analysieren und die jeweils 4 besten Produkte pro Plattform auszuwählen, die am besten zur ursprünglichen Benutzeranfrage passen.
    
    Bei der Bewertung solltest du folgende Kriterien berücksichtigen:
    1. Übereinstimmung der Marke, falls in der Anfrage genannt
    2. Übereinstimmung des Modellnamens, falls in der Anfrage genannt
    3. Übereinstimmung der Farbe, falls in der Anfrage genannt und Farbe irgendwo im Produktname enthalten ist
    4. Übereinstimmung der Größe, falls in der Anfrage genannt bzw. möglichst nahe an der Größe der Anfrage
    5. Allgemeine Relevanz zur Anfrage
    
    Gib die Produkte als JSON-Array zurück mit folgender Struktur:
    {
      "vestiaireProducts": [die IDs der 4 besten Vestiaire-Produkte als Zahlen],
      "vintedProducts": [die IDs der 4 besten Vinted-Produkte als Zahlen]
    }
    
    Beispiel:
    {
      "vestiaireProducts": [2, 5, 0, 8],
      "vintedProducts": [1, 3, 7, 4]
    }
    
    Falls weniger als 4 Produkte pro Plattform verfügbar sind, gib alle verfügbaren Produkte zurück.
    Gib NUR das JSON zurück, keine zusätzlichen Erklärungen.`;

    // Produkte für den Prompt vorbereiten
    const vestiaireProductsForPrompt = vestiaireProducts.map((product: VestiaireProduct, index: number) => ({
      id: index,
      name: product.name,
      brand: product.brand,
      price: product.price,
      size: product.size
    }));

    const vintedProductsForPrompt = vintedProducts.map((product: VintedProduct, index: number) => ({
      id: index,
      name: product.name,
      brand: product.brand,
      price: product.price,
      size: product.size,
      condition: product.condition
    }));

    // Anfrage an OpenAI senden
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Benutzeranfrage: "${originalQuery}"
          
          Vestiaire Collective Produkte:
          ${JSON.stringify(vestiaireProductsForPrompt, null, 2)}
          
          Vinted Produkte:
          ${JSON.stringify(vintedProductsForPrompt, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Niedrigere Temperatur für konsistentere Ergebnisse
    });

    // Antwort extrahieren und parsen
    const content = response.choices[0]?.message?.content || '{"vestiaireProducts":[],"vintedProducts":[]}';
    console.log('GPT-Antwort:', content);
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
      console.log('Geparste GPT-Antwort:', parsedContent);
    } catch (parseError) {
      console.error('Fehler beim Parsen der GPT-Antwort:', parseError);
      return NextResponse.json(
        { error: 'Fehler beim Parsen der GPT-Antwort' },
        { status: 500 }
      );
    }
    
    // Überprüfen, ob die erwarteten Arrays in der Antwort vorhanden sind
    if (!Array.isArray(parsedContent.vestiaireProducts) || !Array.isArray(parsedContent.vintedProducts)) {
      console.error('Ungültiges Format der GPT-Antwort:', parsedContent);
      return NextResponse.json(
        { error: 'Ungültiges Format der GPT-Antwort' },
        { status: 500 }
      );
    }
    
    // Die vollständigen Produktobjekte basierend auf den IDs zurückgeben
    const rankedVestiaireProducts = parsedContent.vestiaireProducts
      .map((id: number) => {
        if (id >= 0 && id < vestiaireProducts.length) {
          return vestiaireProducts[id];
        }
        console.warn(`Ungültige Vestiaire-Produkt-ID: ${id}`);
        return null;
      })
      .filter(Boolean);
      
    const rankedVintedProducts = parsedContent.vintedProducts
      .map((id: number) => {
        if (id >= 0 && id < vintedProducts.length) {
          return vintedProducts[id];
        }
        console.warn(`Ungültige Vinted-Produkt-ID: ${id}`);
        return null;
      })
      .filter(Boolean);
    
    console.log(`Anzahl bewerteter Vestiaire-Produkte: ${rankedVestiaireProducts.length}`);
    console.log(`Anzahl bewerteter Vinted-Produkte: ${rankedVintedProducts.length}`);
    
    return NextResponse.json({
      vestiaireProducts: rankedVestiaireProducts,
      vintedProducts: rankedVintedProducts
    });
  } catch (error) {
    console.error('Fehler bei der Bewertung der Produkte:', error);
    
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der Anfrage' },
      { status: 500 }
    );
  }
} 