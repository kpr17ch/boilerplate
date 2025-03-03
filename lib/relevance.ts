import { Product } from '@/types';

interface ArticleClassification {
  kategorie: string;
  marke: string;
  modellname: string;
  farbe: string;
  collaboration: string;
}

export function calculateRelevanceScore(
  product: Product, 
  classification: ArticleClassification
): number {
  let score = 0;
  
  // Kategorie-Match (höchste Gewichtung)
  if (product.name.toLowerCase().includes(classification.kategorie.toLowerCase()) || 
      containsCategory(product, classification.kategorie)) {
    score += 3;
  }
  
  // Marken-Match
  if (classification.marke && 
      product.brand.toLowerCase().includes(classification.marke.toLowerCase())) {
    score += 2.5;
  }
  
  // Modellname-Match
  if (classification.modellname &&
      product.name.toLowerCase().includes(classification.modellname.toLowerCase())) {
    score += 2;
  }
  
  // Farb-Match
  if (classification.farbe && classification.farbe !== 'mehrere' &&
      (product.name.toLowerCase().includes(classification.farbe.toLowerCase()) ||
       product.brand.toLowerCase().includes(classification.farbe.toLowerCase()))) {
    score += 1.5;
  }
  
  // Collaboration-Match
  if (classification.collaboration &&
      (product.name.toLowerCase().includes(classification.collaboration.toLowerCase()) ||
       product.brand.toLowerCase().includes(classification.collaboration.toLowerCase()))) {
    score += 1;
  }
  
  return score;
}

// Hilfsfunktion um zu prüfen, ob ein Produkt zu einer Kategorie passt
function containsCategory(product: Product, category: string): boolean {
  const categoryMap: {[key: string]: string[]} = {
    'oberteil': ['shirt', 't-shirt', 'hemd', 'bluse', 'top', 'pullover', 'sweatshirt', 'hoodie'],
    'hose': ['jeans', 'hose', 'pants', 'shorts', 'leggings'],
    'jacke': ['jacke', 'jacket', 'mantel', 'coat', 'blazer'],
    'kleid': ['kleid', 'dress'],
    'rock': ['rock', 'skirt'],
    'schuhe': ['schuh', 'shoe', 'sneaker', 'boots', 'sandalen', 'high heels'],
    'tasche': ['tasche', 'bag', 'rucksack', 'backpack'],
    'accessoires': ['schmuck', 'kette', 'armband', 'ring', 'schal', 'tuch', 'gürtel', 'mütze']
  };
  
  // Normalisiere die Kategorie
  const normalizedCategory = category.toLowerCase();
  
  // Wenn die Kategorie direkt in der Map ist
  if (categoryMap[normalizedCategory]) {
    return categoryMap[normalizedCategory].some(term => 
      product.name.toLowerCase().includes(term)
    );
  }
  
  // Ansonsten prüfe, ob die Kategorie selbst im Produktnamen vorkommt
  return product.name.toLowerCase().includes(normalizedCategory);
} 