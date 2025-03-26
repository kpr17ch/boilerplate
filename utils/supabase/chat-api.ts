import { createClient } from './server';
import { Message, Product } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

interface ChatData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageData {
  id: string;
  chat_id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

interface ProductData {
  id: string;
  message_id: string;
  product_id: string;
  image_url: string;
  retailer: string;
  brand: string;
  name: string;
  size: string;
  price: string;
  condition: string;
  product_url: string;
}

/**
 * Creates a new chat for the current user
 */
export async function createChat(title: string): Promise<string | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chats')
    .insert([{ title }])
    .select('id')
    .single();
    
  if (error) {
    console.error('Error creating chat:', error);
    return null;
  }
  
  return data.id;
}

/**
 * Adds a new message to an existing chat
 */
export async function addMessage(
  chatId: string, 
  content: string, 
  sender: 'user' | 'ai',
  products?: Product[]
): Promise<string | null> {
  const supabase = await createClient();

  // Start a transaction by getting the connection
  const { data: messageData, error: messageError } = await supabase
    .from('messages')
    .insert([{ 
      chat_id: chatId, 
      content, 
      sender,
      timestamp: new Date().toISOString()
    }])
    .select('id')
    .single();
    
  if (messageError) {
    console.error('Error adding message:', messageError);
    return null;
  }
  
  // Update the chat's updated_at timestamp
  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);

  // If we have products, insert them
  if (products && products.length > 0) {
    const productEntries = products.map(product => ({
      message_id: messageData.id,
      product_id: product.id,
      image_url: product.imageUrl,
      retailer: product.retailer,
      brand: product.brand,
      name: product.name,
      size: product.size || '',
      price: product.price,
      condition: product.condition || '',
      product_url: product.productUrl || ''
    }));
    
    const { error: productsError } = await supabase
      .from('products')
      .insert(productEntries);
      
    if (productsError) {
      console.error('Error adding products:', productsError);
      // We don't return null here as the message was still created
    }
  }
  
  return messageData.id;
}

/**
 * Deletes a chat and all associated messages and products
 */
export async function deleteChat(chatId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);
    
  if (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
  
  return true;
}

/**
 * Fetches a list of chats for the sidebar
 */
export async function fetchChatList(limit = 10, offset = 0): Promise<ChatData[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) {
    console.error('Error fetching chat list:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Fetches a specific chat with its messages and products
 */
export async function fetchChat(chatId: string, messageLimit = 20, messageOffset = 0): Promise<{
  chat: ChatData | null;
  messages: Message[];
}> {
  const supabase = await createClient();
  
  // Fetch the chat data
  const { data: chatData, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();
    
  if (chatError) {
    console.error('Error fetching chat:', chatError);
    return { chat: null, messages: [] };
  }
  
  // Fetch the messages for this chat with pagination
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('timestamp', { ascending: false })
    .range(messageOffset, messageOffset + messageLimit - 1);
    
  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    return { chat: chatData, messages: [] };
  }
  
  // If there are no messages, return early
  if (!messagesData || messagesData.length === 0) {
    return { chat: chatData, messages: [] };
  }
  
  // Get all message IDs to fetch their products
  const messageIds = messagesData.map(message => message.id);
  
  // Fetch products for these messages
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*')
    .in('message_id', messageIds);
    
  if (productsError) {
    console.error('Error fetching products:', productsError);
    // Continue without products
  }
  
  // Group products by message_id for easier lookup
  const productsByMessage: Record<string, Product[]> = {};
  
  if (productsData) {
    productsData.forEach((product: ProductData) => {
      if (!productsByMessage[product.message_id]) {
        productsByMessage[product.message_id] = [];
      }
      
      productsByMessage[product.message_id].push({
        id: product.product_id,
        imageUrl: product.image_url,
        retailer: product.retailer,
        brand: product.brand,
        name: product.name,
        size: product.size,
        price: product.price,
        condition: product.condition,
        productUrl: product.product_url
      });
    });
  }
  
  // Map the messages with their products
  const messages: Message[] = messagesData.map((message: MessageData) => ({
    id: message.id,
    content: message.content,
    sender: message.sender,
    timestamp: message.timestamp,
    products: productsByMessage[message.id] || undefined
  }));
  
  return {
    chat: chatData,
    messages
  };
}

/**
 * Loads older messages for a chat (for infinite scrolling)
 */
export async function loadOlderMessages(chatId: string, lastMessageTimestamp: string, limit = 20): Promise<Message[]> {
  const supabase = await createClient();
  
  // Fetch older messages based on the timestamp of the oldest currently displayed message
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .lt('timestamp', lastMessageTimestamp)
    .order('timestamp', { ascending: false })
    .limit(limit);
    
  if (messagesError) {
    console.error('Error fetching older messages:', messagesError);
    return [];
  }
  
  // If there are no older messages, return empty array
  if (!messagesData || messagesData.length === 0) {
    return [];
  }
  
  // Get all message IDs to fetch their products
  const messageIds = messagesData.map(message => message.id);
  
  // Fetch products for these messages
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*')
    .in('message_id', messageIds);
    
  if (productsError) {
    console.error('Error fetching products for older messages:', productsError);
    // Continue without products
  }
  
  // Group products by message_id for easier lookup
  const productsByMessage: Record<string, Product[]> = {};
  
  if (productsData) {
    productsData.forEach((product: ProductData) => {
      if (!productsByMessage[product.message_id]) {
        productsByMessage[product.message_id] = [];
      }
      
      productsByMessage[product.message_id].push({
        id: product.product_id,
        imageUrl: product.image_url,
        retailer: product.retailer,
        brand: product.brand,
        name: product.name,
        size: product.size,
        price: product.price,
        condition: product.condition,
        productUrl: product.product_url
      });
    });
  }
  
  // Map the messages with their products
  const messages: Message[] = messagesData.map((message: MessageData) => ({
    id: message.id,
    content: message.content,
    sender: message.sender,
    timestamp: message.timestamp,
    products: productsByMessage[message.id] || undefined
  }));
  
  return messages;
} 