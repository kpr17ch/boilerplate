import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onNewChat }) => {
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
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="py-3 px-4 hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center group"
          >
            <div>
              <p className="text-xs uppercase tracking-wider">Schwarze Lederjacke</p>
              <p className="text-[10px] text-gray-500 mt-1">Vor {i + 1} Stunden</p>
            </div>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
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