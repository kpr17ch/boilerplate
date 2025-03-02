export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  products?: Product[];
}

export interface Product {
  id: string;
  imageUrl: string;
  retailer: string;
  brand: string;
  name: string;
  size: string;
  price: string;
  condition: string;
  productUrl?: string;
}

// Schnittstellen für die API-Rückgaben
export interface VestiaireProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  size: string;
  imageUrl: string;
  productUrl: string;
}

export interface VintedProduct {
  productId: string;
  name: string;
  brand: string;
  price: string;
  size: string;
  condition: string;
  imageUrl: string;
  productUrl: string;
} 