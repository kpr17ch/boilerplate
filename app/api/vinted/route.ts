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

      // Führe einen kleinen Scroll durch, um das Laden der Elemente zu triggern
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      // Kurze Wartezeit nach dem Scrollen
      await new Promise(resolve => setTimeout(resolve, 1000));

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

      // Extrahierte Produkte auf max. 40 begrenzen
      const limitedProducts = products.slice(0, 40);

      console.log(`Vinted: ${products.length} Produkte gefunden, begrenzt auf ${limitedProducts.length}`);

      // Browser schließen
      await browser.close();
      browser = null;
      console.log('Browser geschlossen. Vinted-Scraping abgeschlossen.');

      // Rückgabe der Ergebnisse
      return NextResponse.json({
        searchTerm,
        products: limitedProducts
      });

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
        
        // Logge alle verfügbaren Bilder im Container
        const allImages = container ? Array.from(container.querySelectorAll('img')) : [];
        console.log(`Produkt ID ${productId}: ${allImages.length} Bilder im Container gefunden`);
        
        // Suche spezifisch nach dem Produkt-Bild mit den richtigen Attributen
        const productImages = container ? Array.from(container.querySelectorAll('img.web_ui_Image__content[data-testid^="product-item-id-"]')) : [];
        console.log(`Produkt ID ${productId}: ${productImages.length} Produkt-Bilder mit korrekten Attributen gefunden`);
        
        if (productImages.length > 0) {
          // Bevorzuge Bilder mit dem korrekten data-testid Attribut
          const correctImage = productImages.find(img => img.getAttribute('data-testid')?.includes(productId));
          if (correctImage) {
            imageUrl = (correctImage as HTMLImageElement).src;
            console.log(`Produkt ID ${productId}: Korrektes Bild mit passender ID gefunden: ${imageUrl}`);
          } else {
            imageUrl = (productImages[0] as HTMLImageElement).src;
            console.log(`Produkt ID ${productId}: Erstes Produkt-Bild verwendet: ${imageUrl}`);
          }
        } else if (allImages.length > 0) {
          // Fallback: Nimm das erste Bild, wenn keine spezifischen Produkt-Bilder gefunden wurden
          imageUrl = allImages[0].src;
          console.log(`Produkt ID ${productId}: Fallback auf erstes gefundenes Bild: ${imageUrl}`);
          
          // Logge Details zu diesem Bild
          console.log(`Bild-Details für ${productId}:`, {
            class: allImages[0].className,
            dataTestId: allImages[0].getAttribute('data-testid'),
            alt: allImages[0].alt,
            width: allImages[0].width,
            height: allImages[0].height
          });
        } else {
          console.log(`Produkt ID ${productId}: Keine Bilder gefunden`);
        }
      } catch (error) {
        console.error(`Fehler beim Extrahieren der Bild-URL für Produkt ${productId}:`, error);
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