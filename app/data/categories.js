// Category definitions with descriptions and icons
export const categories = [
  {
    id: 'all',
    name: 'All Products',
    slug: 'all',
    description: 'Browse our complete range of same-day printing services'
  },
  {
    id: 'custom-apparels',
    name: 'Custom Apparels',
    slug: 'custom-apparels',
    description: 'Branded t-shirts, hoodies, and apparel for your business or event'
  },
  {
    id: 'signs-banners',
    name: 'Signs & Banners',
    slug: 'signs-banners',
    description: 'Vinyl banners, corrugated signs, and outdoor signage'
  },
  {
    id: 'marketing',
    name: 'Marketing Materials',
    slug: 'marketing',
    description: 'Flyers, business cards, postcards, and promotional materials'
  },
  {
    id: 'dtf-uvdtf',
    name: 'DTF & UV DTF',
    slug: 'dtf-uvdtf',
    description: 'Direct-to-Film printing for apparel and hard surfaces'
  },
  {
    id: 'labels-stickers',
    name: 'Labels & Stickers',
    slug: 'labels-stickers',
    description: 'Custom labels, vinyl stickers, and product branding solutions'
  },
  {
    id: 'trade-show',
    name: 'Trade Show & Events',
    slug: 'trade-show',
    description: 'Promotional items and branded merchandise for events'
  },
  {
    id: 'mailbox-notary',
    name: 'Mailbox & Notary',
    slug: 'mailbox-notary',
    description: 'Mailbox services and notary solutions'
  }
];

export const businessNeeds = [
  {
    id: 'restaurant',
    name: 'Restaurants & Cafes',
    description: 'Menus, flyers, signage, and promotional materials',
    icon: '🍽️'
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    description: 'Property postcards, business cards, and signage',
    icon: '🏠'
  },
  {
    id: 'sports',
    name: 'Sports Clubs',
    description: 'Team apparel, banners, and event materials',
    icon: '⚽'
  },
  {
    id: 'salon',
    name: 'Salons & Spas',
    description: 'Business cards, flyers, and appointment reminders',
    icon: '💇'
  },
  {
    id: 'retail',
    name: 'Retail Stores',
    description: 'Point-of-sale materials, labels, and packaging',
    icon: '🛍️'
  },
  {
    id: 'events',
    name: 'Event Planning',
    description: 'Invitations, signage, and promotional materials',
    icon: '🎉'
  }
];

export function getCategoryBySlug(slug) {
  return categories.find((c) => c.slug === slug);
}

export function getBusinessNeedById(id) {
  return businessNeeds.find((b) => b.id === id);
}
