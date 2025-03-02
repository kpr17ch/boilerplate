import React from 'react';
import { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 animate-fadeIn">
      {products.map((product) => (
        <a 
          key={product.id} 
          href={product.productUrl || '#'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="product-card overflow-hidden cursor-pointer"
        >
          <div className="aspect-square overflow-hidden bg-gray-100">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-image.jpg';
              }}
            />
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between items-start">
              <p className="text-[10px] uppercase tracking-wider text-gray-600 font-light">{product.retailer}</p>
              <p className="text-[10px] uppercase tracking-wider font-light">{product.condition}</p>
            </div>
            <p className="text-xs uppercase tracking-wider font-normal">{product.brand}</p>
            <p className="text-[11px] text-gray-700 font-light">{product.name}</p>
            <div className="flex justify-between items-center pt-1">
              <p className="text-[10px] text-gray-500 font-light">Größe: {product.size}</p>
              <p className="text-xs font-normal">{product.price}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default ProductGrid; 