import React from 'react';
import { Message } from '@/types';
import ProductGrid from '@/components/ui/ProductGrid';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isAi = message.sender === 'ai';
  
  return (
    <div className="mb-8">
      <div className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
        <div 
          className={`max-w-[80%] px-5 py-4 message-bubble animate-fadeIn ${
            isAi ? 'bg-gray-100 text-black' : 'bg-black text-white'
          }`}
        >
          <p className={`${isAi ? 'text-sm tracking-wide font-normal' : 'text-sm font-light'}`}>{message.content}</p>
        </div>
      </div>
      
      {message.products && message.products.length > 0 && (
        <div className="mt-4">
          <ProductGrid products={message.products} />
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 