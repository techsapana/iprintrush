// Helper function to get featured products (only those with featured=true)
export function getFeaturedProducts(products, count = 6) {
  return products.filter((p) => p.featured === true).slice(0, count);
}

// This file now serves as a helper module. The actual product data is managed
// dynamically through AdminContext. Use the useAdmin hook in client components
// to access and manage products.
