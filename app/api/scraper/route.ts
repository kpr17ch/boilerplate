import { NextResponse } from 'next/server';
import puppeteer, { Page, Browser, ElementHandle } from 'puppeteer';

// Konfiguration für den Scraper
const config = {
  baseUrl: 'https://de.vestiairecollective.com/search/',
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
interface ProductData {
  productId: string;
  price: string;
  name: string;
  brand: string;
  imageUrl: string;
  size: string;
  productUrl: string;
}

export async function POST(request: Request) {
  let browser: Browser | null = null;
  
  try {
    // Suchbegriff aus dem Request-Body extrahieren
    const { searchTerm } = await request.json();

    if (!searchTerm || typeof searchTerm !== 'string') {
      return NextResponse.json(
        { error: 'Suchbegriff ist erforderlich' },
        { status: 400 }
      );
    }

    console.log(`Starte Scraping für Suchbegriff: ${searchTerm}`);
    
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

      // URL mit erhöhter Anzahl von Produkten pro Seite
      const url = `${config.baseUrl}?q=${searchTerm}&pageSize=96`;
      
      console.log(`Navigiere zu: ${url}`);
      
      // Navigiere zur Seite und warte, bis das Netzwerk inaktiv ist
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: config.browser.timeout
      });

      // Versuche, Cookie-Banner zu schließen, falls vorhanden
      await handleCookieBanner(page);

      // Führe einen kleinen Scroll durch, um das Laden der Elemente zu triggern
      await page.evaluate(() => {
        window.scrollBy(0, 100);
      });
      
      // Kurze Wartezeit nach dem Scrollen
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Warte auf das Laden der Produktkarten
      console.log('Warte auf das Laden der Produktkarten...');
      
      try {
        // Warte auf die Produktliste
        await page.waitForSelector('.product-search_catalog__flexContainer__d3ts_ li', { 
          timeout: 30000 
        });
      } catch (error) {
        console.error('Fehler beim Warten auf Produktkarten:', error);
        
        // Versuche alternative Selektoren
        console.log('Versuche alternative Selektoren...');
        const alternativeSelectors = [
          '.product-card_productCard__sGjCz',
          '.product-search_catalog__resultContainer__xKWF9 ul li',
          '[data-cy^="catalog__productCard__"]'
        ];
        
        let selectorFound = false;
        for (const selector of alternativeSelectors) {
          try {
            console.log(`Versuche Selektor: ${selector}`);
            await page.waitForSelector(selector, { timeout: 10000 });
            console.log(`Selektor gefunden: ${selector}`);
            selectorFound = true;
            break;
          } catch (err) {
            console.log(`Selektor nicht gefunden: ${selector}`);
          }
        }
        
        if (!selectorFound) {
          throw new Error('Keine Produktkarten gefunden. Möglicherweise hat sich die Seitenstruktur geändert.');
        }
      }

      // Extrahiere Produktdaten
      console.log(`Extrahiere Produktdaten...`);
      const products = await extractProductsFromPage(page);
      
      console.log(`${products.length} Produkte gefunden.`);

      // Browser schließen
      await browser.close();
      browser = null;
      console.log('Browser geschlossen. Scraping abgeschlossen.');

      // Rückgabe der Ergebnisse
      return NextResponse.json({ products });

    } catch (error) {
      console.error('Fehler beim Scrapen:', error);
      if (browser) await browser.close();
      browser = null;
      return NextResponse.json(
        { error: 'Fehler beim Scrapen der Daten' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung der Anfrage:', error);
    if (browser) await browser.close();
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der Anfrage' },
      { status: 500 }
    );
  }
}

/**
 * Extrahiert Produktdaten von der aktuellen Seite
 * @param page - Puppeteer Page-Objekt
 * @returns Array mit Produktdaten
 */
async function extractProductsFromPage(page: Page): Promise<ProductData[]> {
  return await page.evaluate(() => {
    // Versuche verschiedene Selektoren für Produktkarten
    let productCards: Element[] = [];
    
    // Primärer Selektor basierend auf der HTML-Struktur
    productCards = Array.from(document.querySelectorAll('.product-search_catalog__flexContainer__d3ts_ li'));
    
    // Fallback-Selektoren, falls der primäre nicht funktioniert
    if (productCards.length === 0) {
      productCards = Array.from(document.querySelectorAll('.product-card_productCard__sGjCz'));
    }
    
    if (productCards.length === 0) {
      productCards = Array.from(document.querySelectorAll('[data-cy^="catalog__productCard__"]'));
    }
    
    if (productCards.length === 0) {
      productCards = Array.from(document.querySelectorAll('.product-search_catalog__resultContainer__xKWF9 ul li'));
    }
    
    // Protokolliere die Anzahl der gefundenen Produktkarten
    console.log(`Gefundene Produktkarten: ${productCards.length}`);
    
    return productCards.map(card => {
      // Preis extrahieren
      const priceElement = card.querySelector('[data-cy="productCard__text__price__discount"]');
      const price = priceElement && priceElement.textContent ? priceElement.textContent.trim() : 'Preis nicht verfügbar';
      
      // Name extrahieren
      const nameElement = card.querySelector('[data-cy="productCard__text__name"]');
      const name = nameElement && nameElement.textContent ? nameElement.textContent.trim() : 'Name nicht verfügbar';
      
      // Marke extrahieren
      const brandElement = card.querySelector('[data-cy="productCard__text__brand"]');
      const brand = brandElement && brandElement.textContent ? brandElement.textContent.trim() : 'Marke nicht verfügbar';
      
      // Bild-URL extrahieren
      const imageElement = card.querySelector('img') as HTMLImageElement | null;
      const imageUrl = imageElement && imageElement.src ? imageElement.src : 'Bild nicht verfügbar';
      
      // Größe extrahieren
      const sizeElement = card.querySelector('[data-cy="productCard__text__size"]');
      const size = sizeElement && sizeElement.textContent ? sizeElement.textContent.trim() : 'Größe nicht verfügbar';
      
      // Produktlink extrahieren
      const linkElement = card.querySelector('a[href]') as HTMLAnchorElement | null;
      const productUrl = linkElement && linkElement.href ? linkElement.href : 'URL nicht verfügbar';
      
      // Produkt-ID aus der URL extrahieren (Format: https://de.vestiairecollective.com/path/to/product-12345678.shtml)
      let productId = 'ID nicht verfügbar';
      if (productUrl && productUrl !== 'URL nicht verfügbar') {
        // Extrahiere die Zahl vor .shtml
        const match = productUrl.match(/(\d+)\.shtml/);
        if (match && match[1]) {
          productId = match[1];
        }
      }
      
      return {
        productId,
        price,
        name,
        brand,
        imageUrl,
        size,
        productUrl
      };
    });
  });
}

/**
 * Versucht, Cookie-Banner zu schließen, falls vorhanden
 * @param page - Puppeteer Page-Objekt
 */
async function handleCookieBanner(page: Page): Promise<boolean> {
  try {
    // Warte kurz, damit der Cookie-Banner Zeit hat zu erscheinen
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Spezifischer Selektor für den "Das ist OK"-Button im Vestiaire Cookie-Banner
    const vestiaireOkButton = '#popin_tc_privacy_button_2';
    
    // Prüfe, ob der Vestiaire-spezifische Cookie-Banner vorhanden ist
    const vestiaireButtonExists = await page.evaluate((sel: string) => {
      const button = document.querySelector(sel);
      return !!button;
    }, vestiaireOkButton);
    
    if (vestiaireButtonExists) {
      console.log('Vestiaire Cookie-Banner gefunden mit "Das ist OK"-Button');
      await page.click(vestiaireOkButton);
      console.log('Cookie-Banner mit "Das ist OK" geschlossen');
      
      // Führe einen kleinen Scroll durch, um das Laden der Elemente zu triggern
      await page.evaluate(() => {
        window.scrollBy(0, 100);
      });
      
      // Warte kurz, damit die Seite nach dem Schließen des Banners reagieren kann
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    }
    
    // Fallback für andere mögliche Cookie-Banner-Selektoren
    const cookieSelectors = [
      '#onetrust-accept-btn-handler',
      '.cookie-banner button[aria-label="accept cookies"]',
      'button[data-cy="cookie-banner-accept"]',
      'button[data-cy="cookie-banner-accept-all"]',
      'button.accept-cookies',
      'button.accept-all-cookies',
      '#accept-cookies',
      '#accept-all-cookies'
    ];
    
    for (const selector of cookieSelectors) {
      try {
        const buttonExists = await page.evaluate((sel: string) => {
          const button = document.querySelector(sel);
          return !!button;
        }, selector);
        
        if (buttonExists) {
          console.log(`Cookie-Banner gefunden mit Selektor: ${selector}`);
          await page.click(selector);
          console.log('Cookie-Banner geschlossen');
          
          // Führe einen kleinen Scroll durch, um das Laden der Elemente zu triggern
          await page.evaluate(() => {
            window.scrollBy(0, 100);
          });
          
          // Warte kurz, damit die Seite nach dem Schließen des Banners reagieren kann
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.log(`Fehler beim Prüfen des Selektors ${selector}: ${errorMessage}`);
      }
    }
    
    console.log('Kein Cookie-Banner gefunden oder bereits akzeptiert');
    return false;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Fehler beim Versuch, den Cookie-Banner zu schließen:', errorMessage);
    return false;
  }
} 