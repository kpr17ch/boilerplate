import { Message, Product } from '@/types';

interface ChatData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Creates a new chat
 */
export async function createChat(title: string): Promise<string | null> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create chat: ${response.status}`);
    }
    
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error creating chat:', error);
    return null;
  }
}

/**
 * Adds a new message to a chat
 */
export async function addMessage(
  chatId: string,
  content: string,
  sender: 'user' | 'ai',
  products?: Product[]
): Promise<string | null> {
  try {
    const response = await fetch(`/api/chat/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, sender, products }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add message: ${response.status}`);
    }
    
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error adding message:', error);
    return null;
  }
}

/**
 * Fetches a list of chats for the sidebar
 */
export async function fetchChatList(limit = 10, offset = 0): Promise<ChatData[]> {
  try {
    const response = await fetch(`/api/chat?limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chat list: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching chat list:', error);
    return [];
  }
}

/**
 * Fetches a specific chat
 */
export async function fetchChat(chatId: string): Promise<ChatData | null> {
  try {
    const response = await fetch(`/api/chat/${chatId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chat: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
}

/**
 * Fetches messages for a chat
 */
export async function fetchMessages(
  chatId: string,
  limit = 20,
  offset = 0
): Promise<Message[]> {
  try {
    const response = await fetch(`/api/chat/${chatId}/messages?limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

/**
 * Loads older messages for a chat
 */
export async function loadOlderMessages(
  chatId: string,
  lastMessageTimestamp: string,
  limit = 20
): Promise<Message[]> {
  try {
    const response = await fetch(
      `/api/chat/${chatId}/messages?limit=${limit}&olderThan=${encodeURIComponent(lastMessageTimestamp)}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to load older messages: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error loading older messages:', error);
    return [];
  }
}

/**
 * Deletes a chat
 */
export async function deleteChat(chatId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/chat/${chatId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete chat: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
} 