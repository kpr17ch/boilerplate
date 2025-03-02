"use client";

import React, { useState, useEffect, useRef } from "react";
import { Menu, X, Send } from 'lucide-react';
import { toast } from "react-toastify";
import { createClient } from "@/utils/supabase/client";
import ChatMessage from '@/components/ui/ChatMessage';
import Sidebar from '@/components/ui/Sidebar';
import { v4 as uuidv4 } from 'uuid';
import { Message, Product } from '@/types';

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

// Chat-Nachrichtentypen
type ChatMessageType = 'query' | 'results' | 'loading';

// Chat-Nachricht-Interface
interface ChatMessage {
  id: string;
  type: ChatMessageType;
  query?: string;
  vestiaireProducts?: VestiaireProduct[];
  vintedProducts?: VintedProduct[];
  searchTerm?: string;
  timestamp: Date;
}

// Produktkachel-Komponente für Vestiaire-Produkte
const ProductCard = ({ product, source }: { product: VestiaireProduct | VintedProduct, source: 'vestiaire' | 'vinted' }) => (
  <a 
    href={product.productUrl} 
    target="_blank" 
    rel="noopener noreferrer"
    className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 transition-all duration-300 flex flex-col relative"
  >
    <div className="h-48 bg-gradient-to-br from-[#5E6AD2]/20 to-[#5E6AD2]/5 flex items-center justify-center overflow-hidden relative">
      {product.imageUrl && product.imageUrl !== 'Bild nicht verfügbar' ? (
        <>
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-image.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </>
      ) : (
        <div className="text-3xl text-white/30">📦</div>
      )}
      <div className="absolute top-2 right-2">
        <span className={`text-xs px-2 py-1 rounded-full backdrop-blur-md ${
          source === 'vestiaire' 
            ? 'bg-[#5E6AD2]/20 text-[#5E6AD2] border border-[#5E6AD2]/30' 
            : 'bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/30'
        }`}>
          {source === 'vestiaire' ? 'Vestiaire' : 'Vinted'}
        </span>
      </div>
    </div>
    <div className="p-4 flex-1 flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white font-medium truncate text-sm group-hover:text-[#5E6AD2] transition-colors">
          {product.name}
        </h3>
      </div>
      <span className="bg-[#5E6AD2]/20 text-[#5E6AD2] px-2 py-1 text-xs rounded-full inline-block mb-2 border border-[#5E6AD2]/30">
        {product.brand}
      </span>
      <p className="text-white/60 text-xs mb-3 line-clamp-1 flex-1">{product.size}</p>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-white font-semibold text-sm group-hover:text-[#5E6AD2] transition-colors">
          {product.price}
        </span>
        <span className="text-white/40 text-xs group-hover:text-white/60 transition-colors">
          Zum Shop →
        </span>
      </div>
    </div>
  </a>
);

// Komponente für Benutzeranfrage
const QueryMessage = ({ query }: { query: string }) => (
  <div className="mb-6 transform hover:scale-[1.01] transition-transform">
    <div className="flex items-center mb-2">
      <div className="w-8 h-8 rounded-full bg-[#5E6AD2]/20 flex items-center justify-center text-[#5E6AD2] font-medium mr-2 border border-[#5E6AD2]/30">
        Du
      </div>
      <span className="text-white/60 text-xs">Gerade eben</span>
    </div>
    <div className="pl-10">
      <p className="text-white bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 inline-block">
        {query}
      </p>
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
      <span className="text-white/60 text-xs">Suche bei Vestiaire Collective...</span>
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
const ResultsMessage = ({ 
  query, 
  vestiaireProducts, 
  vintedProducts, 
  searchTerm 
}: { 
  query: string, 
  vestiaireProducts: VestiaireProduct[], 
  vintedProducts: VintedProduct[], 
  searchTerm?: string 
}) => (
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
        <p className="text-white mb-2">
          Hier sind Ergebnisse für "{query}":
          {searchTerm && (
            <span className="text-white/60 text-xs ml-2">
              (Suchbegriff: <span className="bg-[#5E6AD2]/20 text-[#5E6AD2] px-1.5 py-0.5 rounded-full">{searchTerm}</span>)
            </span>
          )}
        </p>
      </div>
      
      {(vestiaireProducts && vestiaireProducts.length > 0) || (vintedProducts && vintedProducts.length > 0) ? (
        <>
          {/* Vestiaire Collective Ergebnisse */}
          {vestiaireProducts && vestiaireProducts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-white/80 text-sm font-medium mb-2">Vestiaire Collective</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {vestiaireProducts.slice(0, 4).map((product, index) => (
                  <ProductCard key={`vestiaire-${product.productId}-${index}`} product={product} source="vestiaire" />
                ))}
              </div>
              {vestiaireProducts.length > 4 && (
                <p className="text-white/60 text-xs mt-2">
                  {vestiaireProducts.length - 4} weitere Produkte bei Vestiaire Collective verfügbar.
                </p>
              )}
            </div>
          )}
          
          {/* Vinted Ergebnisse */}
          {vintedProducts && vintedProducts.length > 0 && (
            <div>
              <h3 className="text-white/80 text-sm font-medium mb-2">Vinted</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {vintedProducts.slice(0, 4).map((product, index) => (
                  <ProductCard key={`vinted-${product.productId}-${index}`} product={product} source="vinted" />
                ))}
              </div>
              {vintedProducts.length > 4 && (
                <p className="text-white/60 text-xs mt-2">
                  {vintedProducts.length - 4} weitere Produkte bei Vinted verfügbar.
                </p>
              )}
            </div>
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
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      content: 'Willkommen bei Fashion AI. Wie kann ich dir heute helfen?', 
      sender: 'ai',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Authentifizierungsstatus prüfen
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (error) {
        console.error("Fehler beim Prüfen des Auth-Status:", error);
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, []);

  // Autofokus auf das Eingabefeld
  useEffect(() => {
    if (isLoggedIn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoggedIn]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 1. OpenAI-API aufrufen, um einen Suchbegriff zu generieren
      const openaiResponse = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.content }),
      });
      
      if (!openaiResponse.ok) {
        throw new Error(`Fehler bei der OpenAI-API-Anfrage: ${openaiResponse.status}`);
      }
      
      const openaiData = await openaiResponse.json();
      const searchTerm = openaiData.searchTerm;
      
      if (!searchTerm) {
        throw new Error('Kein Suchbegriff von der OpenAI-API erhalten');
      }
      
      // 2. Vestiaire Scraper mit dem generierten Suchbegriff aufrufen
      const vestiaireResponse = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm }),
      });
      
      if (!vestiaireResponse.ok) {
        throw new Error(`Fehler bei der Vestiaire-Scraper-API-Anfrage: ${vestiaireResponse.status}`);
      }
      
      const vestiaireData = await vestiaireResponse.json();
      const vestiaireProducts: VestiaireProduct[] = vestiaireData.products || [];
      
      // 3. Vinted Scraper aufrufen
      const vintedResponse = await fetch('/api/vinted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm }),
      });
      
      let vintedProducts: VintedProduct[] = [];
      if (vintedResponse.ok) {
        const vintedData = await vintedResponse.json();
        vintedProducts = vintedData.products || [];
      }
      
      // 4. Produkte in das richtige Format konvertieren
      const formattedProducts: Product[] = [
        ...vestiaireProducts.map((product): Product => ({
          id: product.productId,
          name: product.name,
          brand: product.brand,
          price: product.price,
          size: product.size,
          imageUrl: product.imageUrl,
          retailer: 'Vestiaire Collective',
          condition: 'Gebraucht',
          productUrl: product.productUrl
        })),
        ...vintedProducts.map((product): Product => ({
          id: product.productId,
          name: product.name,
          brand: product.brand,
          price: product.price,
          size: product.size,
          imageUrl: product.imageUrl,
          retailer: 'Vinted',
          condition: product.condition || 'Gebraucht',
          productUrl: product.productUrl
        }))
      ];
      
      // 5. AI-Antwort erstellen
      const aiResponse: Message = {
        id: uuidv4(),
        content: formattedProducts.length > 0
          ? `Hier sind einige Artikel, die deinen Wünschen für "${userMessage.content}" entsprechen:`
          : `Leider konnte ich keine Produkte finden, die deiner Anfrage "${userMessage.content}" entsprechen. Versuche es bitte mit einer anderen Beschreibung.`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        products: formattedProducts.length > 0 ? formattedProducts : undefined,
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Erfolgsmeldung anzeigen
      const totalProducts = formattedProducts.length;
      if (totalProducts > 0) {
        toast.success(`${totalProducts} Produkte gefunden (${vestiaireProducts.length} bei Vestiaire, ${vintedProducts.length} bei Vinted)`);
      } else {
        toast.info('Keine passenden Produkte gefunden');
      }
    } catch (error) {
      console.error('Fehler bei der Produktsuche:', error);
      toast.error('Bei der Suche ist ein Fehler aufgetreten. Bitte versuche es erneut.');
      
      // Fehlermeldung als AI-Nachricht anzeigen
      const errorMessage: Message = {
        id: uuidv4(),
        content: 'Es tut mir leid, bei der Suche ist ein Fehler aufgetreten. Bitte versuche es noch einmal.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([
      { 
        id: '1', 
        content: 'Willkommen bei Fashion AI. Wie kann ich dir heute helfen?', 
        sender: 'ai',
        timestamp: new Date().toISOString(),
      }
    ]);
  };

  // Wenn der Auth-Status noch nicht bekannt ist, zeige Ladeindikator
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen pt-28 pb-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-white/5"></div>
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-t-[#5E6AD2] animate-spin"></div>
          </div>
          <p className="mt-4 text-white/70 text-sm">Lade Fashion AI...</p>
        </div>
      </div>
    );
  }

  // Nicht eingeloggte Benutzer sehen eine vereinfachte Oberfläche
  if (isLoggedIn === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Fashion AI - Dein KI-Mode-Assistent
          </h1>
          <p className="text-xl text-white/70 mb-10">
            Melde dich an, um unseren KI-gestützten Produktassistenten zu nutzen und die perfekten Modeartikel zu finden.
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
    <div className="fashion-ai flex flex-col h-screen bg-white text-black font-neue-machina">
      {/* Navbar */}
      <header className="py-5 px-8 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-neue-machina font-light">
                Discover
              </a>
              <a href="#" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-neue-machina font-light">
                Trending
              </a>
              <a href="#" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-neue-machina font-light">
                Saved
              </a>
            </nav>
          </div>

          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-base uppercase tracking-[0.25em] font-medium">
            FASHION AI
          </h1>

          <div className="flex items-center gap-6">
            <a href="/profile" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-neue-machina font-light">
              Account
            </a>
            <a href="#" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-neue-machina font-light">
              Help
            </a>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onNewChat={handleNewChat} />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-8"
          >
            {messages.map((message) => (
              <div key={message.id}>
                <ChatMessage message={message} />
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-center items-center py-6">
                <div className="dot-flashing"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-5">
            <form onSubmit={handleSendMessage} className="flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Beschreibe deinen gewünschten Artikel..."
                className="flex-1 bg-transparent border-b border-gray-300 py-3 px-2 focus:outline-none focus:border-black text-sm tracking-wide placeholder:text-gray-400 placeholder:text-xs placeholder:tracking-wider font-neue-machina font-normal"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className={`ml-4 p-3 ${
                  !inputValue.trim() || isLoading ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-70'
                }`}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
