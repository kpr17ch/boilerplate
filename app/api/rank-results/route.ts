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

// Farfetch Produkt-Interface
interface FarfetchProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  productUrl: string;
}

// SSENSE Produkt-Interface
interface SSENSEProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  productUrl: string;
}

// Perplexity Kategorisierungs-Interface
interface PerplexityResult {
  kategorie: string;
  marke: string;
  modellname: string;
  farbe: string;
  collaboration: string;
}

// Gemeinsames Produkt-Interface für die Ergebnisliste
interface RankedProduct {
  source: 'vestiaire' | 'vinted' | 'farfetch';
  productId: string;
  name: string;
  brand: string;
  price: string;
  size?: string;
  imageUrl: string;
  productUrl: string;
  condition?: string;
}

export async function POST(request: Request) {
  try {
    // Daten aus dem Request-Body extrahieren
    const { originalQuery, vestiaireProducts, vintedProducts, farfetchProducts, ssenseProducts, perplexityData } = await request.json();

    if (!originalQuery || typeof originalQuery !== 'string') {
      return NextResponse.json(
        { error: 'Ursprüngliche Benutzeranfrage ist erforderlich' },
        { status: 400 }
      );
    }

    if (!Array.isArray(vestiaireProducts) || !Array.isArray(vintedProducts) || !Array.isArray(farfetchProducts) || !Array.isArray(ssenseProducts)) {
      return NextResponse.json(
        { error: 'Produktlisten müssen Arrays sein' },
        { status: 400 }
      );
    }

    if (!perplexityData) {
      return NextResponse.json(
        { error: 'Perplexity-Kategorisierungsdaten sind erforderlich' },
        { status: 400 }
      );
    }

    console.log(`Ranking-API aufgerufen mit Anfrage: "${originalQuery}"`);
    console.log(`Anzahl Vestiaire-Produkte: ${vestiaireProducts.length}`);
    console.log(`Anzahl Vinted-Produkte: ${vintedProducts.length}`);
    console.log(`Anzahl Farfetch-Produkte: ${farfetchProducts.length}`);
    console.log(`Perplexity-Kategorisierung:`, perplexityData);

    // System-Prompt erstellen für die Bewertung der Produkte basierend auf Perplexity-Kategorisierung
const systemPrompt = `Du bist ein Experte für Mode und Shopping, der Produkte anhand detaillierter Suchkriterien bewertet.

Deine Aufgabe ist es, Produkte von Vestiaire Collective, Vinted und Farfetch und SSENSE zu analysieren und zu bewerten, wie gut sie mit den folgenden, aus der Benutzeranfrage extrahierten Kriterien übereinstimmen:
- Kategorie (z. B. Schuhe, Hose, Jacke, T-Shirt etc.)
- Marke
- Modellname
- Farbe
- Collaboration

Hinweis: Die Produktdaten enthalten kein explizites Kategorie-Feld. Informationen zur Kategorie finden sich überwiegend im "name"-Attribut. Ist die Kategorie dort klar erkennbar, besitzt sie die höchste Priorität.

Bewerte die Produkte anhand ihres Matching-Grades. Priorisiere vorrangig die Produkte, die den Kriterien am besten entsprechen. Unabhängig von der Quelle, sollten die Produkte in der Ausgabe immer absteigend nach ihrer Relevanz sortiert werden.

Gewichtung:
1. Übereinstimmung der Kategorie (basierend auf dem "name"-Attribut, höchste Priorität)
2. Übereinstimmung der Marke
3. Übereinstimmung des Modellnamens
4. Übereinstimmung der Farbe
5. Übereinstimmung der Collaboration-Informationen
Gib die Produkte als EINZIGES JSON-Objekt zurück, das genau ein Property "products" enthält. Der Wert dieses Properties ist ein JSON-Array, das die Produkt-IDs und ihre Quelle in absteigender Reihenfolge der Relevanz enthält, beispielsweise:
{
  "products": [
    {"source": "vestiaire", "id": 5235235},
    {"source": "vinted", "id": 12321432},
    {"source": "farfetch", "id": 4637634},
    {"source": "ssense", "id": 12321432},
    ...
  ]
}
Begrenze die Ausgabe auf maximal 20 Produkte.
Gib NUR das JSON-Objekt zurück, ohne zusätzliche Erklärungen.`;

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

    const farfetchProductsForPrompt = farfetchProducts.map((product: FarfetchProduct, index: number) => ({
      id: index,
      name: product.name,
      brand: product.brand,
      price: product.price
    }));

    const ssenseProductsForPrompt = ssenseProducts.map((product: SSENSEProduct, index: number) => ({
      id: index,
      name: product.name,
      brand: product.brand,
      price: product.price
    }));
    // Anfrage an OpenAI senden
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `
          Perplexity Kategorisierung:
          ${JSON.stringify(perplexityData, null, 2)}
          
          Vestiaire Collective Produkte:
          ${JSON.stringify(vestiaireProductsForPrompt, null, 2)}
          
          Vinted Produkte:
          ${JSON.stringify(vintedProductsForPrompt, null, 2)}
          
          Farfetch Produkte:
          ${JSON.stringify(farfetchProductsForPrompt, null, 2)}
          
          SSENSE Produkte:
          ${JSON.stringify(ssenseProductsForPrompt, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Niedrigere Temperatur für konsistentere Ergebnisse
    });

    // Antwort extrahieren und parsen
    const content = response.choices[0]?.message?.content || '[]';
    console.log('GPT-Antwort:', content);
    
    let rankedProducts: Array<{source: string, id: number}> = [];
    try {
      const parsedContent = JSON.parse(content);
      // Prüfen, ob die Antwort ein Array mit Produkten ist
      if (Array.isArray(parsedContent.products)) {
        rankedProducts = parsedContent.products;
      } else if (Array.isArray(parsedContent)) {
        rankedProducts = parsedContent;
      } else {
        console.error('Ungültiges Format der GPT-Antwort:', parsedContent);
        return NextResponse.json(
          { error: 'Ungültiges Format der GPT-Antwort' },
          { status: 500 }
        );
      }
    } catch (parseError) {
      console.error('Fehler beim Parsen der GPT-Antwort:', parseError);
      return NextResponse.json(
        { error: 'Fehler beim Parsen der GPT-Antwort' },
        { status: 500 }
      );
    }
    
    // Die vollständigen Produktobjekte basierend auf den IDs und Quellen zurückgeben
    const resultProducts: RankedProduct[] = [];
    
    for (const item of rankedProducts) {
      if (resultProducts.length >= 20) break; // Maximal 20 Ergebnisse zurückgeben
      
      if (item.source === 'vestiaire' && item.id >= 0 && item.id < vestiaireProducts.length) {
        const product = vestiaireProducts[item.id];
        resultProducts.push({
          source: 'vestiaire',
          ...product
        });
      } else if (item.source === 'vinted' && item.id >= 0 && item.id < vintedProducts.length) {
        const product = vintedProducts[item.id];
        resultProducts.push({
          source: 'vinted',
          ...product
        });
      } else if (item.source === 'farfetch' && item.id >= 0 && item.id < farfetchProducts.length) {
        const product = farfetchProducts[item.id];
        resultProducts.push({
          source: 'farfetch',
          ...product
        });
      } else if (item.source === 'ssense' && item.id >= 0 && item.id < ssenseProducts.length) {
        const product = ssenseProducts[item.id];
        resultProducts.push({
          source: 'ssense',
          ...product
        });
      } else {
        console.warn(`Ungültiges Produkt: ${JSON.stringify(item)}`);
      }
    }
    
    console.log(`Anzahl zurückgegebener Produkte: ${resultProducts.length}`);
    
    return NextResponse.json({
      products: resultProducts
    });
  } catch (error) {
    console.error('Fehler bei der Bewertung der Produkte:', error);
    
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der Anfrage' },
      { status: 500 }
    );
  }
} 