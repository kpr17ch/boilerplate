import React, { useEffect, useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { fetchChatList, deleteChat } from '@/utils/chat-client';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface ChatItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  onNewChat: () => void;
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onNewChat, onChatSelect, selectedChatId }) => {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  useEffect(() => {
    loadChats(true); // Force reset on initial load
  }, []);
  
  const loadChats = async (reset = false) => {
    try {
      setIsLoading(true);
      const newPage = reset ? 0 : page;
      const result = await fetchChatList(10, newPage * 10);
      
      if (result.length < 10) {
        setHasMore(false);
      }
      
      // Make sure we don't have duplicate IDs by using a Map
      if (reset) {
        setChats(result);
        setPage(1);
      } else {
        // Use a Map to ensure unique chat IDs
        const chatMap = new Map(chats.map(chat => [chat.id, chat]));
        
        // Add new chats, overwriting any duplicates
        result.forEach(chat => {
          chatMap.set(chat.id, chat);
        });
        
        // Convert back to array
        setChats(Array.from(chatMap.values()));
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadChats();
    }
  };
  
  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    
    try {
      const success = await deleteChat(chatId);
      if (success) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        // If the deleted chat was selected, tell the parent to create a new chat
        if (selectedChatId === chatId) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        locale: de 
      });
    } catch (e) {
      return 'Unbekanntes Datum';
    }
  };
  
  // Ensure chats are unique by ID and sorted by updated_at
  const uniqueSortedChats = React.useMemo(() => {
    const chatMap = new Map<string, ChatItem>();
    
    chats.forEach(chat => {
      chatMap.set(chat.id, chat);
    });
    
    return Array.from(chatMap.values())
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [chats]);
  
  return (
    <div 
      className={`w-72 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } absolute md:relative z-10 h-[calc(100%-4rem)] bg-white`}
    >
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-sm font-normal uppercase tracking-widest">Chat-Verlauf</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {uniqueSortedChats.length === 0 && !isLoading ? (
          <div className="text-center text-gray-500 text-sm py-8">
            Keine Chat-Verläufe vorhanden
          </div>
        ) : (
          <>
            {uniqueSortedChats.map(chat => (
              <div 
                key={chat.id} 
                className={`py-3 px-4 hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center group ${
                  selectedChatId === chat.id ? 'bg-gray-100' : ''
                }`}
                onClick={() => onChatSelect(chat.id)}
              >
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs uppercase tracking-wider truncate">{chat.title}</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {formatTimestamp(chat.updated_at)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div 
                className="py-3 px-4 text-center cursor-pointer hover:bg-gray-100"
                onClick={handleLoadMore}
              >
                {isLoading ? (
                  <span className="text-xs text-gray-500">Lade weitere Chats...</span>
                ) : (
                  <span className="text-xs text-gray-500">Weitere Chats laden</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-5 border-t border-gray-200">
        <button 
          onClick={onNewChat}
          className="w-full py-2 px-4 border border-gray-300 hover:bg-black hover:text-white transition-colors btn-fashion"
        >
          Neuer Chat
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 