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

// SSENSE Produkt-Interface
interface SSENSEProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  productUrl: string;
}

// Gemeinsames Produkt-Interface für die Ergebnisliste nach Ranking
interface RankedProduct {
  source: 'vestiaire' | 'vinted' | 'farfetch' | 'ssense';
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
  ssenseProducts?: SSENSEProduct[];
  searchTerm?: string;
  timestamp: string;
  content?: string;
  sender?: 'user' | 'ai';
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
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Function to handle scroll to check if we need to load older messages
  const handleScroll = () => {
    if (!chatContainerRef.current || !hasOlderMessages || isLoadingOlderMessages) return;
    
    const { scrollTop } = chatContainerRef.current;
    if (scrollTop === 0 && currentChatId) {
      loadOlderMessages();
    }
  };
  
  // Observer setup for infinite scrolling
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [currentChatId, hasOlderMessages, isLoadingOlderMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isLoadingOlderMessages) {
      scrollToBottom();
    }
  }, [messages, isLoadingOlderMessages]);

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
  
  // Load older messages when scrolling to the top
  const loadOlderMessages = async () => {
    if (!currentChatId || !messages.length || isLoadingOlderMessages) return;
    
    try {
      setIsLoadingOlderMessages(true);
      const oldestMessage = messages[0];
      
      // Use our client API helper
      const { loadOlderMessages: fetchOlderMessages } = await import('@/utils/chat-client');
      const olderMessages = await fetchOlderMessages(currentChatId, oldestMessage.timestamp);
      
      if (olderMessages.length === 0) {
        setHasOlderMessages(false);
        return;
      }
      
      // Preserve scroll position
      const chatContainer = chatContainerRef.current;
      const scrollPos = chatContainer?.scrollHeight || 0;
      
      // Add older messages to the beginning of the array
      setMessages(prev => [...olderMessages, ...prev]);
      
      // Restore scroll position
      setTimeout(() => {
        if (chatContainer) {
          const newScrollPos = chatContainer.scrollHeight - scrollPos;
          chatContainer.scrollTop = newScrollPos;
        }
        setIsLoadingOlderMessages(false);
      }, 100);
      
    } catch (error) {
      console.error('Error loading older messages:', error);
      setIsLoadingOlderMessages(false);
    }
  };
  
  // Handle chat selection from sidebar
  const handleChatSelect = async (chatId: string) => {
    if (chatId === currentChatId) return;
    
    try {
      setIsLoading(true);
      setCurrentChatId(chatId);
      setHasOlderMessages(true);
      
      // Use our client API helpers
      const { fetchMessages } = await import('@/utils/chat-client');
      const chatMessages = await fetchMessages(chatId);
      
      if (chatMessages.length > 0) {
        // Sort messages by timestamp in ascending order
        const sortedMessages = [...chatMessages].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sortedMessages);
      } else {
        // If no messages (unusual case), set to default welcome message
        setMessages([
          { 
            id: '1', 
            content: 'Willkommen bei Fashion AI. Wie kann ich dir heute helfen?', 
            sender: 'ai',
            timestamp: new Date().toISOString(),
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

    // Track the chat ID to ensure it's set outside the try/catch
    let activeChatId = currentChatId;

    try {
      // Create a new chat if we don't have one yet
      if (!activeChatId) {
        const { createChat } = await import('@/utils/chat-client');
        activeChatId = await createChat(inputValue);
        
        if (!activeChatId) {
          throw new Error('Failed to create chat');
        }
        
        // Update state with the new chat ID
        setCurrentChatId(activeChatId);
      }
      
      // Save the user message to database
      const { addMessage } = await import('@/utils/chat-client');
      await addMessage(activeChatId, userMessage.content, 'user');
      
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

      // Alle Scraper parallel aufrufen
      console.log('Starte alle Scraper parallel mit dem Suchbegriff:', searchTerm);
      
      // Scraper-Funktionen definieren
      const fetchFarfetchProducts = async () => {
        try {
          console.log('Farfetch Scraper wird ausgeführt...');
          const response = await fetch('/api/farfetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm }),
          });
          
          if (!response.ok) {
            console.error('Fehler bei Farfetch-Scraper:', await response.text());
            return { products: [] };
          }
          
          const data = await response.json();
          console.log(`Gescrapte Farfetch-Produkte (${data.products?.length || 0}):`);
          return data;
        } catch (error) {
          console.error('Fehler bei Farfetch-Scraper:', error);
          return { products: [] };
        }
      };

      const fetchSsenseProducts = async () => {
        try {
          console.log('SSENSE Scraper wird ausgeführt...');
          const response = await fetch('/api/ssense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm }),
          });
          
          if (!response.ok) {
            console.error('Fehler bei SSENSE-Scraper:', await response.text());
            return { products: [] };
          }
          
          const data = await response.json();
          console.log(`Gescrapte SSENSE-Produkte (${data.products?.length || 0}):`);
          return data;
        } catch (error) {
          console.error('Fehler bei SSENSE-Scraper:', error);
          return { products: [] };
        }
      };

      const fetchVestiaireProducts = async () => {
        try {
          console.log('Vestiaire Scraper wird ausgeführt...');
          const response = await fetch('/api/scraper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm }),
          });
          
          if (!response.ok) {
            console.error('Fehler bei Vestiaire-Scraper:', await response.text());
            return { products: [] };
          }
          
          const data = await response.json();
          console.log(`Gescrapte Vestiaire-Produkte (${data.products?.length || 0}):`);
          return data;
        } catch (error) {
          console.error('Fehler bei Vestiaire-Scraper:', error);
          return { products: [] };
        }
      };

      const fetchVintedProducts = async () => {
        try {
          console.log('Vinted Scraper wird ausgeführt...');
          const response = await fetch('/api/vinted', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm }),
          });
          
          if (!response.ok) {
            console.error('Fehler bei Vinted-Scraper:', await response.text());
            return { products: [] };
          }
          
          const data = await response.json();
          console.log(`Gescrapte Vinted-Produkte (${data.products?.length || 0}):`);
          return data;
        } catch (error) {
          console.error('Fehler bei Vinted-Scraper:', error);
          return { products: [] };
        }
      };

      // Alle Scraper parallel ausführen
      const [farfetchResult, ssenseResult, vestiaireResult, vintedResult] = await Promise.allSettled([
        fetchFarfetchProducts(),
        fetchSsenseProducts(),
        fetchVestiaireProducts(),
        fetchVintedProducts()
      ]);

      // Ergebnisse extrahieren
      let farfetchProducts: FarfetchProduct[] = farfetchResult.status === 'fulfilled' ? farfetchResult.value.products || [] : [];
      let ssenseProducts: SSENSEProduct[] = ssenseResult.status === 'fulfilled' ? ssenseResult.value.products || [] : [];
      let vestiaireProducts: VestiaireProduct[] = vestiaireResult.status === 'fulfilled' ? vestiaireResult.value.products || [] : [];
      let vintedProducts: VintedProduct[] = vintedResult.status === 'fulfilled' ? vintedResult.value.products || [] : [];

      console.log('Alle Scraper abgeschlossen:');
      console.log(`- Farfetch: ${farfetchProducts.length} Produkte`);
      console.log(`- SSENSE: ${ssenseProducts.length} Produkte`);
      console.log(`- Vestiaire: ${vestiaireProducts.length} Produkte`);
      console.log(`- Vinted: ${vintedProducts.length} Produkte`);
      
      // 7. Ranking der Ergebnisse durchführen
      console.log('7. Ranking der Ergebnisse aufrufen...');
      const rankingResponse = await fetch('/api/rank-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuery: userMessage.content,
          vestiaireProducts,
          vintedProducts,
          farfetchProducts,
          ssenseProducts,
          perplexityData: perplexityData
        }),
      });
      
      console.log('rank-results API Statuscode:', rankingResponse.status);
      
      if (!rankingResponse.ok) {
        const errorText = await rankingResponse.text();
        console.error('rank-results API Fehler:', errorText);
        throw new Error(`Fehler bei der Ranking-API-Anfrage: ${rankingResponse.status}, Details: ${errorText}`);
      }
      
      console.log('rank-results API erfolgreich aufgerufen');
      const rankData = await rankingResponse.json();
      const rankedProducts = rankData.products || [];
      
      console.log(`Ergebnisse von rank-results (${rankedProducts.length}):`);
      
      // Produkte in das richtige Format konvertieren für die UI-Anzeige
      const formattedProducts: Product[] = rankedProducts.map((product: RankedProduct): Product => ({
        id: product.productId,
        name: product.name,
        brand: product.brand,
        price: product.price,
        size: product.size || '',
        imageUrl: product.imageUrl,
        retailer: product.source === 'vestiaire' ? 'Vestiaire Collective' : product.source === 'vinted' ? 'Vinted' : product.source === 'farfetch' ? 'Farfetch' : 'SSENSE',
        condition: product.source === 'vinted' && product.condition ? product.condition : product.source === 'farfetch' && product.condition ? product.condition : product.source === 'ssense' && product.condition ? product.condition : 'Gebraucht',
        productUrl: product.productUrl
      }));
      
      // Create AI response message with product results
      const aiResponseMessage: Message = {
        id: uuidv4(),
        content: formattedProducts.length > 0
          ? `Hier sind einige Artikel, die deinen Wünschen für "${userMessage.content}" entsprechen:`
          : `Leider konnte ich keine Produkte finden, die deiner Anfrage "${userMessage.content}" entsprechen. Versuche es bitte mit einer anderen Beschreibung.`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        products: formattedProducts.length > 0 ? formattedProducts : undefined,
      };
      
      // Add AI response to messages state
      setMessages(prev => [...prev, aiResponseMessage]);
      
      // Save the AI response to database
      await addMessage(
        activeChatId, 
        aiResponseMessage.content, 
        'ai',
        aiResponseMessage.products
      );
      
      // Erfolgsmeldung anzeigen
      const totalProducts = formattedProducts.length;
      if (totalProducts > 0) {
        toast.success(`${totalProducts} Produkte gefunden (${vestiaireProducts.length} bei Vestiaire, ${vintedProducts.length} bei Vinted, ${farfetchProducts.length} bei Farfetch, ${ssenseProducts.length} bei SSENSE)`);
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
      
      // Save error message to database if we have a chat
      if (activeChatId) {
        const { addMessage } = await import('@/utils/chat-client');
        await addMessage(activeChatId, errorMessage.content, 'ai');
      }
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
    setCurrentChatId(null);
    setHasOlderMessages(true);
  };

  return (
    <div className="fashion-ai flex flex-col h-screen bg-white text-black">
      {/* Navbar */}
      <header className="py-5 px-8 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-light">
                Discover
              </a>
              <a href="#" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-light">
                Trending
              </a>
              <a href="#" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-light">
                Saved
              </a>
            </nav>
          </div>

          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-base uppercase tracking-[0.25em] font-medium">
            FASHION AI
          </h1>

          <div className="flex items-center gap-6">
            <a href="/profile" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-light">
              Account
            </a>
            <a href="#" className="text-xs uppercase tracking-[0.15em] hover:text-gray-500 transition-colors font-light">
              Help
            </a>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onNewChat={handleNewChat} 
          onChatSelect={handleChatSelect}
          selectedChatId={currentChatId || undefined}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-8"
          >
            {isLoggedIn === null ? (
              <div className="h-full flex justify-center items-center">
                <div className="inline-block relative w-16 h-16">
                  <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-white/5"></div>
                  <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-t-[#5E6AD2] animate-spin"></div>
                </div>
              </div>
            ) : (
              <>
                {isLoadingOlderMessages && (
                  <div className="flex justify-center items-center py-4">
                    <div className="dot-flashing"></div>
                  </div>
                )}
                
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
              </>
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
                className="flex-1 bg-transparent border-b border-gray-300 py-3 px-2 focus:outline-none focus:border-black text-sm tracking-wide placeholder:text-gray-400 placeholder:text-xs placeholder:tracking-wider font-normal"
                disabled={isLoggedIn === null}
              />
              <button 
                type="submit"
                disabled={!inputValue.trim() || isLoading || isLoggedIn === null}
                className={`ml-4 p-3 ${
                  !inputValue.trim() || isLoading || isLoggedIn === null ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-70'
                }`}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Only render the "not logged in" view if we're sure the user isn't logged in */}
      {isLoggedIn === false && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-6">
              Fashion AI - Dein KI-Mode-Assistent
            </h1>
            <p className="text-xl text-black/70 mb-10">
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
                className="px-6 py-3 bg-black/10 text-black rounded-lg font-medium hover:bg-black/20 transition-colors"
              >
                Registrieren
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
