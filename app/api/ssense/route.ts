import { NextResponse } from 'next/server';
import puppeteer, { Page, Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Konfiguration für den Scraper
const config = {
  baseUrl: 'https://www.ssense.com/en-de/men',
  browser: {
    headless: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: {
      width: 1280,
      height: 800
    },
    timeout: 60000
  }
};

// Produktdaten Interface
interface SSENSEProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  productUrl: string;
}

// Logger-Funktion
function logToFile(message: string) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'ssense-scraper.log');
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  fs.appendFileSync(logFile, logMessage);
  console.log(message); // Auch in die Konsole loggen
}

export async function POST(request: Request) {
  let browser: Browser | null = null;
  
  try {
    // Suchbegriff aus dem Request-Body extrahieren
    const { searchTerm } = await request.json();

    if (!searchTerm || typeof searchTerm !== 'string') {
      return NextResponse.json(
        { error: 'Suchbegriff (searchTerm) ist erforderlich' },
        { status: 400 }
      );
    }

    logToFile(`[SSENSE Scraper] Starte Suche für: "${searchTerm}"`);
    
    // Browser-Konfiguration
    browser = await puppeteer.launch({
      headless: config.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Setze einen realistischen User-Agent
      await page.setUserAgent(config.browser.userAgent);
      
      // Setze HTTP-Header
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'Upgrade-Insecure-Requests': '1'
      });

      // Setze Viewport
      await page.setViewport(config.browser.viewport);

      // URL für SSENSE Suche erstellen
      const encodedSearchTerm = encodeURIComponent(searchTerm);
      const url = `${config.baseUrl}?q=${encodedSearchTerm}`;
      
      logToFile(`[SSENSE Scraper] Anfrage an URL: ${url}`);
      
      // Navigiere zur Seite und warte, bis das Netzwerk inaktiv ist
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: config.browser.timeout
      });       

      // Warte auf das Laden der ersten Produktkarten
      logToFile('[SSENSE Scraper] Warte auf das Laden der Produktkarten...');
      
      try {
        // Warte auf die Produktliste
        await page.waitForSelector('div.plp-products__column', { 
          timeout: 30000 
        });
      } catch (error) {
        logToFile('[SSENSE Scraper] Fehler beim Warten auf Produktkarten: ' + error);
        throw new Error('Keine SSENSE-Produktkarten gefunden. Möglicherweise hat sich die Seitenstruktur geändert.');
      }

      // Automatisiertes Scrollen, um alle Produkte zu laden
      logToFile('[SSENSE Scraper] Starte intelligentes Scrollen, um alle Produkte zu laden...');
      
      // Funktion zum Scrollen und Warten auf neue Produkte
      const scrollAndWaitForProducts = async () => {
        // Zähle die aktuellen vollständig geladenen Produkte
        const initialLoadedProducts = await page.evaluate(() => {
          const productCards = document.querySelectorAll('div.plp-products__column');
          return productCards.length;
        });
        
        logToFile(`[SSENSE Scraper] Aktuell geladene Produkte: ${initialLoadedProducts}`);
        
        // Warte, damit die Seite reagieren kann
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Zähle die Produkte nach dem Scrollen
        const newLoadedProducts = await page.evaluate(() => {
          const productCards = document.querySelectorAll('div.plp-products__column');
          return productCards.length;
        });
        
        logToFile(`[SSENSE Scraper] Neue Anzahl geladener Produkte: ${newLoadedProducts}`);
        
        // Prüfe, ob neue Produkte geladen wurden
        return {
          initialCount: initialLoadedProducts,
          newCount: newLoadedProducts,
          hasNewProducts: newLoadedProducts > initialLoadedProducts
        };
      };
      
      logToFile(`[SSENSE Scraper] Extrahiere Produktdaten...`);
      const products = await extractProductsFromPage(page, logToFile);
      
      logToFile(`[SSENSE Scraper] ${products.length} Produkte gefunden.`);

      // Extrahierte Produkte auf max. 40 begrenzen
      const limitedProducts = products.slice(0, 40);

      logToFile(`[SSENSE Scraper] ${products.length} Produkte gefunden, begrenzt auf ${limitedProducts.length}`);

      // Browser schließen
      await browser.close();
      browser = null;
      logToFile('[SSENSE Scraper] Browser geschlossen. Scraping abgeschlossen.');

      // Rückgabe der Ergebnisse
      return NextResponse.json({
        products: limitedProducts
      });

    } catch (error) {
      logToFile('[SSENSE Scraper] Fehler beim Scrapen: ' + error);
      if (browser) await browser.close();
      browser = null;
      return NextResponse.json(
        { error: 'Fehler beim Scrapen der SSENSE-Daten' },
        { status: 500 }
      );
    }
  } catch (error) {
    logToFile('[SSENSE Scraper] Allgemeiner Fehler: ' + error);
    if (browser) await browser.close();
    return NextResponse.json(
      { error: 'Fehler beim Scrapen von SSENSE' },
      { status: 500 }
    );
  }
}

/**
 * Extrahiert Produktdaten von der aktuellen Seite
 * @param page - Puppeteer Page-Objekt
 * @param log - Logging-Funktion
 * @returns Array mit Produktdaten
 */
async function extractProductsFromPage(page: Page, log: (message: string) => void): Promise<SSENSEProduct[]> {
  // Zuerst die Anzahl der Produkte protokollieren
  const productStats = await page.evaluate(() => {
    const productCards = document.querySelectorAll('div.plp-products__column');
    return {
      total: productCards.length
    };
  });
  
  log(`[SSENSE Scraper] Produktkarten-Statistik: Gesamt=${productStats.total}`);
  
  // Extrahiere die Produkte
  const products = await page.evaluate(() => {
    // Suche alle Produktkarten
    const productCards = Array.from(document.querySelectorAll('div.plp-products__column'));
    
    console.log(`Gefundene Produktkarten: ${productCards.length}`);
    
    // Debugging: Prüfe die ersten 5 Karten auf ihre Struktur
    const sampleCards = productCards.slice(0, 5);
    console.log('Beispiel-Produktkarten HTML:', sampleCards.map(card => card.outerHTML).join('\n\n'));
    
    // Sammle Informationen über alle Selektoren
    const selectorStats = {
      totalCards: productCards.length,
      withLink: 0,
      withImage: 0,
      withBrand: 0,
      withName: 0,
      withPrice: 0,
      withValidId: 0
    };
    
    const products = productCards.map((card, index) => {
      try {
        // Produkt-URL extrahieren
        const linkElement = card.querySelector('a');
        const productUrl = linkElement ? (linkElement as HTMLAnchorElement).href : '';
        if (productUrl) selectorStats.withLink++;
        
        // Produkt-ID aus URL oder einer anderen Quelle extrahieren
        let productId = '';
        if (productUrl) {
          // Versuche, ID aus der URL zu extrahieren
          const urlParts = productUrl.split('/');
          productId = urlParts[urlParts.length - 1] || `produkt-${index}`;
          if (productId) selectorStats.withValidId++;
        }
        
        // Bild-URL extrahieren
        const imageElement = card.querySelector('picture source[media="(min-width: 2560px)"]');
        let imageUrl = '';
        if (imageElement) {
          const srcset = imageElement.getAttribute('srcset');
          imageUrl = srcset?.split(' ')[0] || '';
        }
        if (!imageUrl) {
          const imgElement = card.querySelector('img');
          if (imgElement) {
            imageUrl = imgElement.getAttribute('src') || '';
          }
        }
        if (imageUrl) selectorStats.withImage++;
        
        // Marke extrahieren - data-test="productBrandName0"
        const brandElement = card.querySelector('span[data-test^="productBrandName"]');
        const brand = brandElement ? brandElement.textContent?.trim() || '' : '';
        if (brand) selectorStats.withBrand++;
        
        // Modellname extrahieren - data-test="productName0"
        const nameElement = card.querySelector('span[data-test^="productName"]');
        let name = nameElement ? nameElement.textContent?.trim() || '' : '';
        // Entferne doppelte Elemente, wenn die Produktkachel doppelt ist
        if (name && name.includes('<div class="product-tile__description">')) {
          name = name.split('<div')[0].trim();
        }
        if (name) selectorStats.withName++;
        
        // Preis extrahieren - data-test="productCurrentPrice0"
        const priceElement = card.querySelector('span[data-test^="productCurrentPrice"]');
        const price = priceElement ? priceElement.textContent?.trim() || '' : '';
        if (price) selectorStats.withPrice++;
        
        // Debugging für jedes Produkt
        console.log(`Produkt ${index + 1}:`, { 
          productId, 
          name, 
          brand, 
          price, 
          hasUrl: !!productUrl,
          hasImage: !!imageUrl
        });
        
        return {
          productId: productId || `unbekannt-${index}`,
          name: name || `Produkt ${index + 1}`,
          brand: brand || 'Unbekannte Marke',
          price: price || 'Preis nicht verfügbar',
          imageUrl: imageUrl || '',
          productUrl: productUrl || ''
        };
      } catch (error) {
        console.error(`Fehler bei Produkt ${index + 1}:`, error);
        return {
          productId: `fehler-${index}`,
          name: `Extraktionsfehler bei Produkt ${index + 1}`,
          brand: 'Fehler',
          price: 'Fehler',
          imageUrl: '',
          productUrl: ''
        };
      }
    });
    
    console.log('Selektor-Statistiken:', selectorStats);
    
    return { products, selectorStats };
  });
  
  log(`[SSENSE Scraper] Extrahierte Produkte: ${products.products.length}`);
  log(`[SSENSE Scraper] Selektor-Statistiken: ${JSON.stringify(products.selectorStats, null, 2)}`);
  
  // Filtere ungültige Produkte, aber behalte alle, die eine gültige ID haben
  const validProducts = products.products.filter(product => 
    product.productId && 
    !product.productId.startsWith('fehler-') && 
    !product.productId.startsWith('unbekannt-')
  );
  
  log(`[SSENSE Scraper] Gültige Produkte nach Filterung: ${validProducts.length}`);
  
  // Speichere alle Produkte in einer JSON-Datei für Debugging
  const productsPath = path.join(process.cwd(), 'logs', `ssense-products-${Date.now()}.json`);
  fs.writeFileSync(productsPath, JSON.stringify({
    all: products.products,
    valid: validProducts,
    stats: products.selectorStats
  }, null, 2));
  log(`[SSENSE Scraper] Produkte gespeichert unter: ${productsPath}`);
  
  return validProducts;
} 