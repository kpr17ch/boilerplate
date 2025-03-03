"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";

interface FarfetchProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  productUrl: string;
}

export default function DebugPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<FarfetchProduct[]>([]);

  const testFarfetchScraper = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      const searchTerm = "ugg palace";
      console.log(`Teste Farfetch Scraper mit Suchbegriff: "${searchTerm}"`);
      
      const response = await fetch('/api/farfetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fehler beim Farfetch Scraper: ${response.status}, Details: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Farfetch Scraper Ergebnisse:', data);
      
      setResults(data.products || []);
      toast.success(`${data.products?.length || 0} Produkte bei Farfetch gefunden`);
    } catch (error) {
      console.error('Fehler beim Testen des Farfetch Scrapers:', error);
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug-Seite</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Farfetch Scraper Test</h2>
        <button
          onClick={testFarfetchScraper}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isLoading ? "Lädt..." : "Teste Farfetch Scraper mit \"ugg palace\""}
        </button>
      </div>
      
      {isLoading && (
        <div className="my-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Ergebnisse ({results.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((product) => (
              <div key={product.productId} className="border rounded-lg p-4 hover:shadow-md">
                <div className="aspect-square overflow-hidden mb-3">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">Kein Bild</span>
                    </div>
                  )}
                </div>
                <h4 className="font-medium">{product.brand}</h4>
                <p className="text-sm text-gray-600 mb-2">{product.name}</p>
                <p className="font-bold">{product.price}</p>
                <a 
                  href={product.productUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm hover:underline mt-2 inline-block"
                >
                  Zum Produkt
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
