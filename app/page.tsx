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

// Farfetch Produkt-Interface
interface FarfetchProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  size?: string;
  imageUrl: string;
  productUrl: string;
}

// Gemeinsames Produkt-Interface für die Ergebnisliste nach Ranking
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

// Chat-Nachrichtentypen
type ChatMessageType = 'query' | 'results' | 'loading';

// Chat-Nachricht-Interface
interface ChatMessage {
  id: string;
  type: ChatMessageType;
  query?: string;
  vestiaireProducts?: VestiaireProduct[];
  vintedProducts?: VintedProduct[];
  farfetchProducts?: FarfetchProduct[];
  searchTerm?: string;
  timestamp: Date;
}

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
      console.log('1. OpenAI-API aufrufen, um einen Suchbegriff zu generieren');
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
      
      console.log('OpenAI Response:', openaiData);
      
      if (!searchTerm) {
        throw new Error('Kein Suchbegriff von der OpenAI-API erhalten');
      }
      
      // Perplexity-API aufrufen, um Artikelklassifikation zu erhalten
      console.log('2. Perplexity-API aufrufen für Artikelklassifikation');
      const perplexityResponse = await fetch('/api/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm }),
      });
      
      if (!perplexityResponse.ok) {
        throw new Error(`Fehler bei der Perplexity-API-Anfrage: ${perplexityResponse.status}`);
      }
      
      const perplexityData = await perplexityResponse.json();
      console.log('Perplexity Response:', perplexityData);

      // 5. Farfetch Scraper aufrufen
      console.log('5. Farfetch Scraper mit dem Suchbegriff aufrufen:', searchTerm);
      const farfetchResponse = await fetch('/api/farfetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm }),
      });
      
      let farfetchProducts: FarfetchProduct[] = [];
      if (farfetchResponse.ok) {
        console.log('Farfetch-Scraper erfolgreich ausgeführt');
        const farfetchData = await farfetchResponse.json();
        farfetchProducts = farfetchData.products || [];
        
        console.log(`Gescrapte Farfetch-Produkte (${farfetchProducts.length}):`);
      } else {
        console.error('Fehler bei Farfetch-Scraper:', await farfetchResponse.text());
      }
      
      // 3. Vestiaire Scraper mit dem generierten Suchbegriff aufrufen
      console.log('3. Vestiaire Scraper mit dem Suchbegriff aufrufen:', searchTerm);
      const vestiaireResponse = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm }),
      });
      
      if (!vestiaireResponse.ok) {
        throw new Error(`Fehler bei der Vestiaire-Scraper-API-Anfrage: ${vestiaireResponse.status}`);
      }
      
      console.log('Vestiaire-Scraper erfolgreich ausgeführt');
      const vestiaireData = await vestiaireResponse.json();
      const vestiaireProducts: VestiaireProduct[] = vestiaireData.products || [];
      
      console.log(`Gescrapte Vestiaire-Produkte (${vestiaireProducts.length}):`);
      
      // 4. Vinted Scraper aufrufen
      console.log('4. Vinted Scraper mit dem Suchbegriff aufrufen:', searchTerm);
      const vintedResponse = await fetch('/api/vinted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm }),
      });
      
      let vintedProducts: VintedProduct[] = [];
      if (vintedResponse.ok) {
        console.log('Vinted-Scraper erfolgreich ausgeführt');
        const vintedData = await vintedResponse.json();
        vintedProducts = vintedData.products || [];
        
        console.log(`Gescrapte Vinted-Produkte (${vintedProducts.length}):`);
      } else {
        console.error('Fehler bei Vinted-Scraper:', await vintedResponse.text());
      }
      
      // 6. Ranking der Ergebnisse basierend auf Perplexity-Daten
      console.log('6. Ranking der Ergebnisse mit rank-results API');
      console.log('Daten für rank-results:', {
        originalQuery: userMessage.content,
        vestiaireProductsCount: vestiaireProducts.length,
        vintedProductsCount: vintedProducts.length,
        farfetchProductsCount: farfetchProducts.length,
        perplexityDataExists: !!perplexityData
      });
      
      const rankResponse = await fetch('/api/rank-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuery: userMessage.content,
          vestiaireProducts,
          vintedProducts,
          farfetchProducts,
          perplexityData
        }),
      });
      
      console.log('rank-results API Statuscode:', rankResponse.status);
      
      if (!rankResponse.ok) {
        const errorText = await rankResponse.text();
        console.error('rank-results API Fehler:', errorText);
        throw new Error(`Fehler bei der Ranking-API-Anfrage: ${rankResponse.status}, Details: ${errorText}`);
      }
      
      console.log('rank-results API erfolgreich aufgerufen');
      const rankData = await rankResponse.json();
      const rankedProducts = rankData.products || [];
      
      console.log(`Ergebnisse von rank-results (${rankedProducts.length}):`);
      
      // 7. Produkte in das richtige Format konvertieren für die UI-Anzeige
      const formattedProducts: Product[] = rankedProducts.map((product: RankedProduct): Product => ({
        id: product.productId,
        name: product.name,
        brand: product.brand,
        price: product.price,
        size: product.size || '',
        imageUrl: product.imageUrl,
        retailer: product.source === 'vestiaire' ? 'Vestiaire Collective' : product.source === 'vinted' ? 'Vinted' : 'Farfetch',
        condition: product.source === 'vinted' && product.condition ? product.condition : product.source === 'farfetch' && product.condition ? product.condition : 'Gebraucht',
        productUrl: product.productUrl
      }));
      
      // 8. AI-Antwort erstellen
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
        toast.success(`${totalProducts} Produkte gefunden (${vestiaireProducts.length} bei Vestiaire, ${vintedProducts.length} bei Vinted, ${farfetchProducts.length} bei Farfetch)`);
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
