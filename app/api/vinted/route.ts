import { NextResponse } from 'next/server';
import puppeteer, { Page, Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Konfiguration für den Scraper
const config = {
  baseUrl: 'https://www.vinted.de/catalog',
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
interface VintedProductData {
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

    console.log(`Starte Vinted-Scraping für Suchbegriff: ${searchTerm}`);
    
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

      const url = `${config.baseUrl}?search_text=${searchTerm}`;
      
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
        window.scrollBy(0, 500);
      });
      
      // Kurze Wartezeit nach dem Scrollen
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Warte auf das Laden der Produktkarten
      console.log('Warte auf das Laden der Vinted-Produktkarten...');
      
      try {
        // Warte auf die Produktliste
        await page.waitForSelector('a.new-item-box__overlay.new-item-box__overlay--clickable', { 
          timeout: 30000 
        });
      } catch (error) {
        console.error('Fehler beim Warten auf Vinted-Produktkarten:', error);
        throw new Error('Keine Vinted-Produktkarten gefunden. Möglicherweise hat sich die Seitenstruktur geändert.');
      }

      // Extrahiere Produktdaten
      console.log(`Extrahiere Vinted-Produktdaten...`);
      const products = await extractProductsFromPage(page);
      
      console.log(`${products.length} Vinted-Produkte gefunden.`);

      // Speichere die Ergebnisse in einer JSON-Datei
      try {
        // Erstelle einen Dateinamen basierend auf dem Suchbegriff und Zeitstempel
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sanitizedSearchTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `vinted_${sanitizedSearchTerm}_${timestamp}.json`;
        
        // Stelle sicher, dass das Verzeichnis existiert
        const dir = path.join(process.cwd(), 'scripts', 'output');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Vollständiger Pfad zur Datei
        const filePath = path.join(dir, filename);
        
        // Schreibe die Daten in die Datei
        fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
        
        console.log(`Vinted-Ergebnisse wurden in ${filePath} gespeichert.`);
      } catch (fileError) {
        console.error('Fehler beim Schreiben der Vinted-Ergebnisse in Datei:', fileError);
      }

      // Browser schließen
      await browser.close();
      browser = null;
      console.log('Browser geschlossen. Vinted-Scraping abgeschlossen.');

      // Rückgabe der Ergebnisse
      return NextResponse.json({ products });

    } catch (error) {
      console.error('Fehler beim Scrapen von Vinted:', error);
      if (browser) await browser.close();
      browser = null;
      return NextResponse.json(
        { error: 'Fehler beim Scrapen der Vinted-Daten' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung der Vinted-Anfrage:', error);
    if (browser) await browser.close();
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der Vinted-Anfrage' },
      { status: 500 }
    );
  }
}

/**
 * Extrahiert Produktdaten von der aktuellen Seite
 * @param page - Puppeteer Page-Objekt
 * @returns Array mit Produktdaten
 */
async function extractProductsFromPage(page: Page): Promise<VintedProductData[]> {
  return await page.evaluate(() => {
    // Suche alle Produkt-Links, die nicht gesponsert sind (mit ?referrer=catalog im href)
    const productLinks = Array.from(document.querySelectorAll('a.new-item-box__overlay.new-item-box__overlay--clickable'))
      .filter(link => {
        const href = (link as HTMLAnchorElement).href;
        return href.includes('?referrer=catalog');
      });
    
    console.log(`Gefundene nicht-gesponserte Produkt-Links: ${productLinks.length}`);
    
    return productLinks.map(link => {
      const linkElement = link as HTMLAnchorElement;
      const title = linkElement.getAttribute('title') || '';
      const href = linkElement.href || '';
      
      // Extrahiere die Produkt-ID aus der URL
      const productId = href.split('/items/')[1]?.split('-')[0] || '';
      
      // Extrahiere den Namen (alles vor ", marke:")
      const name = title.split(', marke:')[0] || '';
      
      // Extrahiere die Marke
      const brandMatch = title.match(/marke: ([^,]+)/);
      const brand = brandMatch ? brandMatch[1] : '';
      
      // Extrahiere die Größe
      const sizeMatch = title.match(/größe: ([^,]+)/);
      const size = sizeMatch ? sizeMatch[1] : '';
      
      // Extrahiere den Zustand
      const conditionMatch = title.match(/zustand: ([^,]+)/);
      const condition = conditionMatch ? conditionMatch[1] : '';
      
      // Extrahiere den Preis (erster Preis, nicht der mit Käuferschutz)
      const priceMatch = title.match(/(\d+,\d+)\s*€/);
      const price = priceMatch ? priceMatch[1] + ' €' : '';
      
      // Finde das Bild-Element im übergeordneten Container
      let imageUrl = '';
      try {
        // Gehe zum übergeordneten Container und suche das img-Element
        const container = linkElement.closest('.new-item-box__container') || linkElement.parentElement?.parentElement?.parentElement;
        if (container) {
          const imgElement = container.querySelector('img');
          if (imgElement) {
            imageUrl = imgElement.src;
          }
        }
      } catch (error) {
        console.error('Fehler beim Extrahieren der Bild-URL:', error);
      }
      
      return {
        productId,
        name,
        brand,
        price,
        size,
        condition,
        imageUrl,
        productUrl: href
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
    
    // Verschiedene mögliche Selektoren für Cookie-Banner-Buttons
    const cookieSelectors = [
      'button[data-testid="consent-banner-accept-button"]',
      '#onetrust-accept-btn-handler',
      '.cookie-banner button[aria-label="accept cookies"]',
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
          console.log(`Vinted Cookie-Banner gefunden mit Selektor: ${selector}`);
          await page.click(selector);
          console.log('Vinted Cookie-Banner geschlossen');
          
          // Warte kurz, damit die Seite nach dem Schließen des Banners reagieren kann
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.log(`Fehler beim Prüfen des Selektors ${selector}: ${errorMessage}`);
      }
    }
    
    console.log('Kein Vinted Cookie-Banner gefunden oder bereits akzeptiert');
    return false;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Fehler beim Versuch, den Vinted Cookie-Banner zu schließen:', errorMessage);
    return false;
  }
} 