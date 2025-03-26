import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Get a specific chat
export async function GET(
  request: Request,
  context: { params: { chatId: string } }
) {
  try {
    const supabase = await createClient();
    // Correctly access chatId
    const chatId = context.params.chatId;
    
    if (!chatId || chatId === 'null') {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }
    
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const userId = user.id;
    
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// Delete a chat
export async function DELETE(
  request: Request,
  context: { params: { chatId: string } }
) {
  try {
    const supabase = await createClient();
    // Correctly access chatId
    const chatId = context.params.chatId;
    
    if (!chatId || chatId === 'null') {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }
    
    // Get the current user's ID
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
    
    // Now proceed with deletion
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId);
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
} 