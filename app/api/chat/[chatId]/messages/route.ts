import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { Product } from '@/types';

// Add a message
export async function POST(
  request: Request,
  context: { params: { chatId: string } }
) {
  try {
    const { content, sender, products } = await request.json();
    const chatId = context.params.chatId;
    
    if (!chatId || chatId === 'null') {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // Get the current user's ID from the session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const userId = user.id;
    
    // First check if the chat belongs to the user
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();
      
    if (chatError) {
      if (chatError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }
      return NextResponse.json({ error: chatError.message }, { status: 500 });
    }
    
    // Create the message
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
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }
    
    // Update the chat's updated_at timestamp
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);
    
    // Insert products if provided
    if (products && products.length > 0) {
      const productEntries = products.map((product: Product) => ({
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
      }
    }
    
    return NextResponse.json({ id: messageData.id });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
  }
}

// Get messages for a chat
export async function GET(
  request: Request,
  context: { params: { chatId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const olderThan = searchParams.get('olderThan');
    
    const chatId = context.params.chatId;
    
    if (!chatId || chatId === 'null') {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // Get the current user's ID from the session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const userId = user.id;
    
    // First check if the chat belongs to the user
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();
      
    if (chatError) {
      if (chatError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }
      return NextResponse.json({ error: chatError.message }, { status: 500 });
    }
    
    // Query builder for messages
    let query = supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: false });
    
    // If we're loading older messages
    if (olderThan) {
      query = query.lt('timestamp', olderThan);
    }
    
    // Add pagination
    const { data: messagesData, error: messagesError } = await query
      .range(offset, offset + limit - 1);
      
    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }
    
    if (!messagesData || messagesData.length === 0) {
      return NextResponse.json([]);
    }
    
    // Get message IDs to fetch products
    const messageIds = messagesData.map(message => message.id);
    
    // Fetch products for these messages
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('message_id', messageIds);
      
    if (productsError) {
      console.error('Error fetching products:', productsError);
    }
    
    // Group products by message_id
    const productsByMessage: Record<string, any[]> = {};
    
    if (productsData) {
      productsData.forEach((product) => {
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
    
    // Map messages with their products
    const messages = messagesData.map((message) => ({
      id: message.id,
      content: message.content,
      sender: message.sender,
      timestamp: message.timestamp,
      products: productsByMessage[message.id] || undefined
    }));
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
} 