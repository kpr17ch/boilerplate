import { NextResponse } from 'next/server';
import puppeteer, { Page, Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Konfiguration für den Scraper
const config = {
  baseUrl: 'https://www.farfetch.com/de/shopping/men/search/items.aspx',
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
interface FarfetchProduct {
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
  
  const logFile = path.join(logDir, 'farfetch-scraper.log');
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

    logToFile(`[Farfetch Scraper] Starte Suche für: "${searchTerm}"`);
    
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

      // URL für Farfetch Suche erstellen
      const encodedSearchTerm = encodeURIComponent(searchTerm);
      const url = `${config.baseUrl}?q=${encodedSearchTerm}`;
      
      logToFile(`[Farfetch Scraper] Anfrage an URL: ${url}`);
      
      // Navigiere zur Seite und warte, bis das Netzwerk inaktiv ist
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: config.browser.timeout
      });

      // Warte auf das Laden der ersten Produktkarten
      logToFile('[Farfetch Scraper] Warte auf das Laden der Produktkarten...');
      
      try {
        // Warte auf die Produktliste
        await page.waitForSelector('li[data-testid="productCard"]', { 
          timeout: 30000 
        });
      } catch (error) {
        logToFile('[Farfetch Scraper] Fehler beim Warten auf Produktkarten: ' + error);
        throw new Error('Keine Farfetch-Produktkarten gefunden. Möglicherweise hat sich die Seitenstruktur geändert.');
      }

      // Automatisiertes Scrollen, um alle Produkte zu laden
      logToFile('[Farfetch Scraper] Starte intelligentes Scrollen, um alle Produkte zu laden...');
      
      // Funktion zum Scrollen und Warten auf neue Produkte
      const scrollAndWaitForProducts = async () => {
        // Zähle die aktuellen vollständig geladenen Produkte (keine Skeleton-Elemente)
        const initialLoadedProducts = await page.evaluate(() => {
          // Zähle nur Produkte, die keine Skeleton-Elemente sind
          const allCards = document.querySelectorAll('li[data-testid="productCard"]');
          const loadedCards = Array.from(allCards).filter(card => 
            !card.querySelector('[data-component="ProductCardSkeleton"]')
          );
          return loadedCards.length;
        });
        
        logToFile(`[Farfetch Scraper] Aktuell vollständig geladene Produkte: ${initialLoadedProducts}`);
        
        // Scrolle langsam nach unten, um das Laden zu triggern
        await page.evaluate(() => {
          // Langsames Scrollen, um das Laden zu triggern
          const scrollStep = 300;
          const scrollDelay = 100;
          const scrollHeight = document.body.scrollHeight;
          
          return new Promise((resolve) => {
            let currentPosition = window.pageYOffset;
            const scrollInterval = setInterval(() => {
              window.scrollBy(0, scrollStep);
              currentPosition += scrollStep;
              
              if (currentPosition >= scrollHeight) {
                clearInterval(scrollInterval);
                resolve(true);
              }
            }, scrollDelay);
          });
        });
        
        // Warte, damit die Seite reagieren kann
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Zähle die vollständig geladenen Produkte nach dem Scrollen
        const newLoadedProducts = await page.evaluate(() => {
          const allCards = document.querySelectorAll('li[data-testid="productCard"]');
          const loadedCards = Array.from(allCards).filter(card => 
            !card.querySelector('[data-component="ProductCardSkeleton"]')
          );
          return loadedCards.length;
        });
        
        logToFile(`[Farfetch Scraper] Neue Anzahl vollständig geladener Produkte: ${newLoadedProducts}`);
        
        // Prüfe, ob neue Produkte geladen wurden
        return {
          initialCount: initialLoadedProducts,
          newCount: newLoadedProducts,
          hasNewProducts: newLoadedProducts > initialLoadedProducts
        };
      };
      
      // Führe das Scrollen mehrmals durch, bis keine neuen Produkte mehr geladen werden
      let hasMoreProducts = true;
      let scrollAttempts = 0;
      const maxScrollAttempts = 15; // Erhöhte Anzahl von Scroll-Versuchen
      
      while (hasMoreProducts && scrollAttempts < maxScrollAttempts) {
        scrollAttempts++;
        logToFile(`[Farfetch Scraper] Scroll-Versuch ${scrollAttempts}/${maxScrollAttempts}`);
        
        const scrollResult = await scrollAndWaitForProducts();
        
        // Wenn keine neuen Produkte geladen wurden oder wir die maximale Anzahl erreicht haben, beenden wir das Scrollen
        if (!scrollResult.hasNewProducts) {
          // Versuche es noch einmal mit einem längeren Warten, falls es ein Timing-Problem ist
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Prüfe noch einmal, ob neue Produkte geladen wurden
          const retryResult = await scrollAndWaitForProducts();
          
          if (!retryResult.hasNewProducts) {
            logToFile('[Farfetch Scraper] Keine neuen Produkte mehr gefunden, beende Scrollen');
            hasMoreProducts = false;
          } else {
            logToFile(`[Farfetch Scraper] Nach Wartezeit ${retryResult.newCount - retryResult.initialCount} neue Produkte geladen`);
          }
        } else {
          logToFile(`[Farfetch Scraper] ${scrollResult.newCount - scrollResult.initialCount} neue Produkte geladen`);
        }
      }
      
      logToFile(`[Farfetch Scraper] Scrollen abgeschlossen nach ${scrollAttempts} Versuchen`);
      
      // Mache einen Screenshot für Debugging-Zwecke
      const screenshotDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      const screenshotPath = path.join(screenshotDir, `farfetch-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      logToFile(`[Farfetch Scraper] Screenshot gespeichert unter: ${screenshotPath}`);
      
      // Extrahiere Produktdaten
      logToFile(`[Farfetch Scraper] Extrahiere Produktdaten...`);
      const products = await extractProductsFromPage(page, logToFile);
      
      logToFile(`[Farfetch Scraper] ${products.length} Produkte gefunden.`);

      // Extrahierte Produkte auf max. 40 begrenzen
      const limitedProducts = products.slice(0, 40);

      logToFile(`[Farfetch Scraper] ${products.length} Produkte gefunden, begrenzt auf ${limitedProducts.length}`);

      // Für Testzwecke: Kurze Pause, damit der Browser sichtbar bleibt
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Browser schließen
      await browser.close();
      browser = null;
      logToFile('[Farfetch Scraper] Browser geschlossen. Scraping abgeschlossen.');

      // Rückgabe der Ergebnisse
      return NextResponse.json({
        products: limitedProducts
      });

    } catch (error) {
      logToFile('[Farfetch Scraper] Fehler beim Scrapen: ' + error);
      if (browser) await browser.close();
      browser = null;
      return NextResponse.json(
        { error: 'Fehler beim Scrapen der Farfetch-Daten' },
        { status: 500 }
      );
    }
  } catch (error) {
    logToFile('[Farfetch Scraper] Allgemeiner Fehler: ' + error);
    if (browser) await browser.close();
    return NextResponse.json(
      { error: 'Fehler beim Scrapen von Farfetch' },
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
async function extractProductsFromPage(page: Page, log: (message: string) => void): Promise<FarfetchProduct[]> {
  // Zuerst die Anzahl der Produkte protokollieren
  const productStats = await page.evaluate(() => {
    const allCards = document.querySelectorAll('li[data-testid="productCard"]');
    const loadedCards = Array.from(allCards).filter(card => 
      !card.querySelector('[data-component="ProductCardSkeleton"]')
    );
    const skeletonCards = Array.from(allCards).filter(card => 
      card.querySelector('[data-component="ProductCardSkeleton"]')
    );
    
    return {
      total: allCards.length,
      loaded: loadedCards.length,
      skeleton: skeletonCards.length
    };
  });
  
  log(`[Farfetch Scraper] Produktkarten-Statistik: Gesamt=${productStats.total}, Geladen=${productStats.loaded}, Skeleton=${productStats.skeleton}`);
  
  // Extrahiere nur die vollständig geladenen Produkte
  const products = await page.evaluate(() => {
    // Suche alle Produktkarten, die keine Skeleton-Elemente sind
    const allCards = document.querySelectorAll('li[data-testid="productCard"]');
    const productCards = Array.from(allCards).filter(card => 
      !card.querySelector('[data-component="ProductCardSkeleton"]')
    );
    
    console.log(`Gefundene vollständig geladene Produktkarten: ${productCards.length}`);
    
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
        const linkElement = card.querySelector('a[data-component="ProductCardLink"]');
        const productUrl = linkElement ? (linkElement as HTMLAnchorElement).href : '';
        if (productUrl) selectorStats.withLink++;
        
        // Produkt-ID aus URL extrahieren
        let productId = '';
        if (productUrl) {
          const match = productUrl.match(/item-(\d+)/);
          productId = match ? match[1] : '';
          if (productId) selectorStats.withValidId++;
        }
        
        // Bild-URL extrahieren
        const imageElement = card.querySelector('img[data-component="ProductCardImagePrimary"]');
        const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : '';
        if (imageUrl) selectorStats.withImage++;
        
        // Marke extrahieren
        const brandElement = card.querySelector('p[data-component="ProductCardBrandName"]');
        const brand = brandElement ? brandElement.textContent?.trim() || '' : '';
        if (brand) selectorStats.withBrand++;
        
        // Modellname extrahieren
        const nameElement = card.querySelector('p[data-component="ProductCardDescription"]');
        const name = nameElement ? nameElement.textContent?.trim() || '' : '';
        if (name) selectorStats.withName++;
        
        // Preis extrahieren
        const priceElement = card.querySelector('p[data-component="Price"]');
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
  
  log(`[Farfetch Scraper] Extrahierte Produkte: ${products.products.length}`);
  log(`[Farfetch Scraper] Selektor-Statistiken: ${JSON.stringify(products.selectorStats, null, 2)}`);
  
  // Filtere ungültige Produkte, aber behalte alle, die eine gültige ID haben
  const validProducts = products.products.filter(product => 
    product.productId && 
    !product.productId.startsWith('fehler-') && 
    !product.productId.startsWith('unbekannt-')
  );
  
  log(`[Farfetch Scraper] Gültige Produkte nach Filterung: ${validProducts.length}`);
  
  // Speichere alle Produkte in einer JSON-Datei für Debugging
  const productsPath = path.join(process.cwd(), 'logs', `farfetch-products-${Date.now()}.json`);
  fs.writeFileSync(productsPath, JSON.stringify({
    all: products.products,
    valid: validProducts,
    stats: products.selectorStats
  }, null, 2));
  log(`[Farfetch Scraper] Produkte gespeichert unter: ${productsPath}`);
  
  return validProducts;
}