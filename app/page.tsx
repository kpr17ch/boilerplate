"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { createClient } from "@/utils/supabase/client";

// Beispiel-Produkte für die Mockantwort
const MOCK_PRODUCTS = Array(20).fill(null).map((_, index) => ({
  id: index + 1,
  name: `Produkt ${index + 1}`,
  description: `Beschreibung für Produkt ${index + 1}`,
  price: Math.floor(Math.random() * 100) + 10,
  image: `/product-${(index % 5) + 1}.jpg`,
  rating: (Math.random() * 2 + 3).toFixed(1),
  category: ['Elektronik', 'Mode', 'Haushalt', 'Sport', 'Bücher'][Math.floor(Math.random() * 5)]
}));

// Produkttyp-Definition
interface Product {
  id: string | number;
  name: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  category: string;
}

// Chat-Nachrichtentypen
type ChatMessageType = 'query' | 'results' | 'loading';

// Chat-Nachricht-Interface
interface ChatMessage {
  id: string;
  type: ChatMessageType;
  query?: string;
  products?: Product[];
  timestamp: Date;
}

// Produktkachel-Komponente
const ProductCard = ({ product }: { product: Product }) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 transition-all duration-300 flex flex-col">
    <div className="h-40 bg-gradient-to-br from-[#5E6AD2]/20 to-[#5E6AD2]/5 flex items-center justify-center">
      <div className="text-3xl text-white/30">📦</div>
    </div>
    <div className="p-3 flex-1 flex flex-col">
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-white font-medium truncate text-sm">{product.name}</h3>
        <span className="bg-[#5E6AD2]/20 text-[#5E6AD2] px-1.5 py-0.5 text-xs rounded-full">
          {product.category}
        </span>
      </div>
      <p className="text-white/60 text-xs mb-2 line-clamp-2 flex-1">{product.description}</p>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-white font-semibold text-sm">{product.price}€</span>
        <div className="flex items-center">
          <span className="text-yellow-400 mr-1 text-xs">★</span>
          <span className="text-white/70 text-xs">{product.rating}</span>
        </div>
      </div>
    </div>
  </div>
);

// Komponente für Benutzeranfrage
const QueryMessage = ({ query }: { query: string }) => (
  <div className="mb-4">
    <div className="flex items-center mb-2">
      <div className="w-8 h-8 rounded-full bg-[#5E6AD2]/20 flex items-center justify-center text-[#5E6AD2] font-medium mr-2">
        Du
      </div>
      <span className="text-white/60 text-xs">Gerade eben</span>
    </div>
    <div className="pl-10">
      <p className="text-white">{query}</p>
    </div>
  </div>
);

// Lade-Komponente
const LoadingMessage = () => (
  <div className="mb-4">
    <div className="flex items-center mb-2">
      <div className="w-8 h-8 rounded-full bg-[#5E6AD2]/20 flex items-center justify-center mr-2">
        <svg className="w-5 h-5 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <span className="text-white/60 text-xs">KI sucht...</span>
    </div>
    <div className="pl-10">
      <div className="flex space-x-2">
        <div className="w-2 h-2 rounded-full bg-[#5E6AD2] animate-bounce"></div>
        <div className="w-2 h-2 rounded-full bg-[#5E6AD2] animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 rounded-full bg-[#5E6AD2] animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  </div>
);

// Komponente für Suchergebnisse
const ResultsMessage = ({ query, products }: { query: string, products: Product[] }) => (
  <div className="mb-6">
    <div className="flex items-center mb-2">
      <div className="w-8 h-8 rounded-full bg-[#5E6AD2]/20 flex items-center justify-center mr-2">
        <svg className="w-5 h-5 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <span className="text-white/60 text-xs">Gerade eben</span>
    </div>
    <div className="pl-10">
      <div className="mb-3">
        <p className="text-white mb-2">Hier sind einige Produkte für "{query}":</p>
      </div>
      {products && products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {products.length > 8 && (
            <p className="text-white/60 text-xs mt-2">
              {products.length - 8} weitere Produkte verfügbar. Verfeinere deine Suche für genauere Ergebnisse.
            </p>
          )}
        </>
      ) : (
        <p className="text-white/60">Keine Produkte gefunden. Bitte versuche es mit einer anderen Suchanfrage.</p>
      )}
    </div>
  </div>
);

// Initiale Lade-Animation
const InitialLoading = () => (
  <div className="min-h-screen pt-28 pb-8 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-white/5"></div>
        <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-t-[#5E6AD2] animate-spin"></div>
      </div>
      <p className="mt-4 text-white/70 text-sm">Lade Produktsuche...</p>
    </div>
  </div>
);

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Authentifizierungsstatus prüfen
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Vorab-Check im localStorage, falls verfügbar (schnellere Anzeige)
        const cachedSession = localStorage.getItem('supabase.auth.token');
        if (cachedSession) {
          setIsLoggedIn(true);
        }
        
        // Trotzdem offiziell prüfen und Status aktualisieren
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (error) {
        console.error("Fehler beim Prüfen des Auth-Status:", error);
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, []);

  // Zum Ende des Chats scrollen, wenn neue Nachrichten hinzugefügt werden
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Autofokus auf das Eingabefeld, wenn die Komponente geladen ist
  useEffect(() => {
    if (isLoggedIn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoggedIn]);

  // Suche durchführen und OpenAI-API verwenden
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;
    
    // Generiere eindeutige ID für die Nachricht
    const messageId = Date.now().toString();
    
    // Füge die Anfrage zum Chat-Verlauf hinzu
    setChatHistory(prev => [
      ...prev, 
      { 
        id: messageId, 
        type: 'query', 
        query: query.trim(), 
        timestamp: new Date() 
      },
      { 
        id: messageId + '-loading', 
        type: 'loading', 
        timestamp: new Date() 
      }
    ]);
    
    setIsSearching(true);
    
    try {
      // OpenAI-API aufrufen
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });
      
      if (!response.ok) {
        throw new Error(`Fehler bei der API-Anfrage: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Entferne die Ladeanzeige und füge die Ergebnisse hinzu
      setChatHistory(prev => {
        const filtered = prev.filter(msg => msg.id !== messageId + '-loading');
        return [
          ...filtered,
          {
            id: messageId + '-results',
            type: 'results',
            query: query.trim(),
            products: data.products || [],
            timestamp: new Date()
          }
        ];
      });
      
      // Erfolgsmeldung anzeigen
      if (data.products && data.products.length > 0) {
        toast.success(`${data.products.length} Produkte gefunden`);
      } else {
        toast.info('Keine passenden Produkte gefunden');
      }
    } catch (error) {
      console.error('Fehler bei der Produktsuche:', error);
      toast.error('Bei der Suche ist ein Fehler aufgetreten. Bitte versuche es erneut.');
      
      // Entferne die Ladeanzeige im Fehlerfall
      setChatHistory(prev => prev.filter(msg => msg.id !== messageId + '-loading'));
    } finally {
      setIsSearching(false);
      setQuery(""); // Eingabefeld leeren
    }
  };

  // Wenn der Auth-Status noch nicht bekannt ist, zeige einen Lade-Indikator
  if (isLoggedIn === null) {
    return <InitialLoading />;
  }

  // Nicht eingeloggte Benutzer sehen eine vereinfachte Oberfläche
  if (isLoggedIn === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Entdecke Produkte mit KI-Unterstützung
          </h1>
          <p className="text-xl text-white/70 mb-10">
            Melde dich an, um unseren KI-gestützten Produktassistenten zu nutzen und die perfekten Artikel für deine Bedürfnisse zu finden.
          </p>
          <div className="flex gap-4 justify-center">
            <a 
              href="/login" 
              className="px-6 py-3 bg-[#5E6AD2] text-white rounded-lg font-medium hover:bg-[#4A55C5] transition-colors"
            >
              Anmelden
            </a>
            <a 
              href="/register" 
              className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
            >
              Registrieren
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${chatHistory.length === 0 ? 'flex items-center justify-center' : ''}`}>
      <div className={`container mx-auto px-4 max-w-3xl ${chatHistory.length > 0 ? 'pt-28 pb-8' : ''} transition-all duration-700`}>
        {/* Header */}
        {chatHistory.length === 0 && (
          <div className="text-center mb-10 fade-in">
            <h1 className="text-3xl font-bold text-white mb-3">KI-Produktsuche</h1>
            <p className="text-md text-white/70 max-w-xl mx-auto">
              Beschreibe das Produkt, nach dem du suchst, und unser KI-Assistent findet passende Vorschläge für dich.
            </p>
          </div>
        )}
        
        {/* Chat-Bereich */}
        <div className={`${chatHistory.length > 0 ? 'mb-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-2' : ''} custom-scrollbar chat-container fade-in`}>
          {chatHistory.map((message) => {
            if (message.type === 'query') {
              return <QueryMessage key={message.id} query={message.query || ''} />;
            } else if (message.type === 'loading') {
              return <LoadingMessage key={message.id} />;
            } else if (message.type === 'results') {
              return <ResultsMessage key={message.id} query={message.query || ''} products={message.products || []} />;
            }
            return null;
          })}
          <div ref={chatEndRef} />
        </div>
        
        {/* Eingabebereich */}
        <div className={`${chatHistory.length > 0 ? 'sticky bottom-0' : ''} bg-transparent pt-4 fade-in`}>
          <form onSubmit={handleSearch} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Beschreibe, wonach du suchst..."
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full shadow-md focus:outline-none focus:ring-1 focus:ring-[#5E6AD2] text-white text-sm placeholder-white/50"
              disabled={isSearching}
            />
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-3 bg-[#5E6AD2] text-white rounded-full hover:bg-[#4A55C5] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
          <p className="text-xs text-white/40 text-center mt-2">
            Drücke Enter, um zu suchen. Sei möglichst präzise in deiner Anfrage.
          </p>
        </div>
      </div>
    </div>
  );
}
