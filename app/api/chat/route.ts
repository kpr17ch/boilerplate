import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { Message, Product } from '@/types';

// Create a new chat
export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    const supabase = await createClient();
    
    // Get the current user's ID from the session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const userId = user.id;
    
    const { data, error } = await supabase
      .from('chats')
      .insert([{ 
        title,
        user_id: userId
      }])
      .select('id')
      .single();
      
    if (error) {
      console.error('Error inserting chat:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}

// Get chat list
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = await createClient();
    
    // Get the current user's ID from the session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const userId = user.id;
    
    const { data, error } = await supabase
      .from('chats')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching chat list:', error);
    return NextResponse.json({ error: 'Failed to fetch chat list' }, { status: 500 });
  }
} 