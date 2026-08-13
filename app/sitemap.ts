import { MetadataRoute } from 'next';
import { query } from './lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://iprintrush.com';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, priority: 1.0, changeFrequency: 'daily' },
    { url: `${baseUrl}/products`, priority: 0.9, changeFrequency: 'daily' },
    { url: `${baseUrl}/portfolio`, priority: 0.8, changeFrequency: 'weekly' },
    { url: `${baseUrl}/about`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/contact`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/faq`, priority: 0.7, changeFrequency: 'monthly' },
    // Lowest priority for legal pages to discourage them from appearing as sitelinks
    { url: `${baseUrl}/terms`, priority: 0.1, changeFrequency: 'yearly' },
    { url: `${baseUrl}/privacy-policy`, priority: 0.1, changeFrequency: 'yearly' },
  ];

  let categoryUrls: MetadataRoute.Sitemap = [];
  try {
    const categories = await query<{slug: string}>('SELECT slug FROM categories WHERE enabled = 1');
    categoryUrls = categories.map((cat) => ({
      url: `${baseUrl}/products?category=${cat.slug}`,
      priority: 0.9,
      changeFrequency: 'weekly',
    }));
  } catch (err) {
    console.error('Error fetching categories for sitemap:', err);
  }
  
  let productUrls: MetadataRoute.Sitemap = [];
  try {
    const products = await query<{slug: string}>('SELECT slug FROM products WHERE enabled = 1');
    productUrls = products.map((prod) => ({
      url: `${baseUrl}/products/${prod.slug}`,
      priority: 0.8,
      changeFrequency: 'weekly',
    }));
  } catch (err) {
    console.error('Error fetching products for sitemap:', err);
  }

  return [...staticPages, ...categoryUrls, ...productUrls];
}
