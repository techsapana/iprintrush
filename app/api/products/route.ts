// Products API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

async function hasProductVideosTable(): Promise<boolean> {
  try {
    const res: any = await query("SHOW TABLES LIKE 'product_videos'");
    return Array.isArray(res) && res.length > 0;
  } catch {
    return false;
  }
}

function safeParseJson<T>(value: unknown, fallback: T): T {
  try {
    if (value == null) return fallback;
    if (typeof value === 'string') return JSON.parse(value) as T;
    return value as T;
  } catch {
    return fallback;
  }
}

function nullableNumber(value: any): number | null {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function ensureLCategoryColumn() {
  const col: any = await queryOne("SHOW COLUMNS FROM products LIKE 'l_category'");
  if (!col) {
    await query('ALTER TABLE products ADD COLUMN l_category VARCHAR(191) NULL AFTER category_id');
  }
}

async function ensureOutOfStockColumn() {
  const col: any = await queryOne("SHOW COLUMNS FROM products LIKE 'out_of_stock'");
  if (!col) {
    await query('ALTER TABLE products ADD COLUMN out_of_stock TINYINT(1) NOT NULL DEFAULT 0 AFTER enabled');
  }
}

async function ensureAllowCustomDimensionsColumn() {
  const col: any = await queryOne("SHOW COLUMNS FROM products LIKE 'allow_custom_dimensions'");
  if (!col) {
    await query('ALTER TABLE products ADD COLUMN allow_custom_dimensions BOOLEAN NOT NULL DEFAULT FALSE AFTER featured');
  }
}

async function ensureShippingColumns() {
  const shippingEnabled: any = await queryOne("SHOW COLUMNS FROM products LIKE 'shipping_enabled'");
  if (!shippingEnabled) {
    await query('ALTER TABLE products ADD COLUMN shipping_enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER allow_custom_dimensions');
  }
  const localDeliveryEligible: any = await queryOne("SHOW COLUMNS FROM products LIKE 'local_delivery_eligible'");
  if (!localDeliveryEligible) {
    await query('ALTER TABLE products ADD COLUMN local_delivery_eligible BOOLEAN NOT NULL DEFAULT FALSE AFTER shipping_enabled');
  }
  const shippingCategory: any = await queryOne("SHOW COLUMNS FROM products LIKE 'shipping_category'");
  if (!shippingCategory) {
    await query("ALTER TABLE products ADD COLUMN shipping_category VARCHAR(50) DEFAULT 'standard' AFTER local_delivery_eligible");
  }
}

export async function GET(request: NextRequest) {
   try {
     await ensureLCategoryColumn();
     await ensureOutOfStockColumn();
     await ensureAllowCustomDimensionsColumn();
     await ensureShippingColumns();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const enabled = searchParams.get('enabled') !== 'false';

    const includeVideos = await hasProductVideosTable();

    let sql = `
     SELECT 
       p.*,
       c.name as category_name,
       c.slug as category_slug,
       GROUP_CONCAT(DISTINCT pf.feature ORDER BY pf.display_order SEPARATOR ',') as features,
       GROUP_CONCAT(DISTINCT pi.image_url ORDER BY pi.display_order SEPARATOR '|') as gallery_images,
       p.allow_custom_dimensions${
         includeVideos
           ? ",\n        JSON_ARRAYAGG(\n          JSON_OBJECT(\n            'url', pv.video_url,\n            'title', pv.video_title,\n            'description', pv.video_description,\n            'order', pv.display_order\n          )\n        ) as videos_json"
           : ''
       }
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_features pf ON p.id = pf.product_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      ${includeVideos ? '\n      LEFT JOIN product_videos pv ON p.id = pv.product_id' : ''}
      WHERE 1=1
    `;
    const params = [];

    if (enabled) {
      sql += ' AND p.enabled = TRUE';
    }

    if (category && category !== 'all') {
      sql += ' AND c.slug = ?';
      params.push(category);
    }

    sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

    let products: any[] = [];
    try {
      products = (await query(sql, params)) as any[];
    } catch (err: any) {
      // If JSON aggregation isn't supported (older MySQL), retry without videos
      if (includeVideos) {
        const sqlNoVideos = sql
          .replace(/,\s*JSON_ARRAYAGG[\s\S]*?\) as videos_json/m, '')
          .replace(/\n\s*LEFT JOIN product_videos pv ON p.id = pv.product_id/m, '');
        products = (await query(sqlNoVideos, params)) as any[];
      } else {
        throw err;
      }
    }

// Transform results
      const transformed = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: parseFloat(p.price),
        minQuantity: p.min_quantity != null ? Number(p.min_quantity) : null,
        maxQuantity: p.max_quantity != null ? Number(p.max_quantity) : null,
        minOrderValue: p.min_order_value != null ? Number(p.min_order_value) : null,
        maxOrderValue: p.max_order_value != null ? Number(p.max_order_value) : null,
        minWidthIn: p.min_width_in != null ? Number(p.min_width_in) : null,
        maxWidthIn: p.max_width_in != null ? Number(p.max_width_in) : null,
        minHeightIn: p.min_height_in != null ? Number(p.min_height_in) : null,
        maxHeightIn: p.max_height_in != null ? Number(p.max_height_in) : null,
        pricePerSqInch: p.price_per_sq_inch != null ? Number(p.price_per_sq_inch) : null,
        mailboxPricePerMonth:
          p.mailbox_price_per_month != null ? Number(p.mailbox_price_per_month) : null,
        oldPrice: p.old_price != null ? parseFloat(p.old_price) : null,
        weightLb: p.weight_lb != null ? Number(p.weight_lb) : null,
        packageLengthIn: p.package_length_in != null ? Number(p.package_length_in) : null,
        packageWidthIn: p.package_width_in != null ? Number(p.package_width_in) : null,
        packageHeightIn: p.package_height_in != null ? Number(p.package_height_in) : null,
        packageType: p.package_type || 'YOUR_PACKAGING',
        category: p.category_name || p.category_id,
        categoryId: p.category_id,
        linkedCategorySlug: p.l_category || null,
        categorySlug: p.category_slug,
        image: p.image || '/placeholder.jpg',
        sameDayEligible: Boolean(p.same_day_eligible),
        outOfStock: Boolean(p.out_of_stock),
        enabled: Boolean(p.enabled),
        featured: Boolean(p.featured),
        allowCustomDimensions: Boolean(p.allow_custom_dimensions),
        shippingEnabled: p.shipping_enabled !== false,
        localDeliveryEligible: Boolean(p.local_delivery_eligible),
        shippingCategory: p.shipping_category || 'standard',
        createdAt: p.created_at || null,
        features: p.features ? p.features.split(',') : [],
        galleryImages: p.gallery_images
          ? p.gallery_images
              .split('|')
              .map((url: string) => url.trim())
              .filter((url: string) => url.length > 0)
          : [],
        ...(includeVideos
          ? {
              videos: (() => {
                if (p.videos_json) {
                  const arr = safeParseJson<any[]>(p.videos_json, []);
                  return arr
                    .filter((v) => v && v.url)
                    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
                    .map((v) => ({
                      url: String(v.url),
                      title: v.title ? String(v.title) : '',
                      description: v.description ? String(v.description) : '',
                    }));
                }
      
                // Fallback if some DB returns only url concat (legacy)
                if (p.videos) {
                  return String(p.videos)
                    .split('|')
                    .map((url: string) => url.trim())
                    .filter((url: string) => url.length > 0)
                    .map((url: string) => ({ url, title: '', description: '' }));
                }
                return [];
              })(),
            }
          : {}),
        sizes: [], // Will be loaded separately if needed
      }));

    return NextResponse.json({ products: transformed });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
   try {
     await ensureLCategoryColumn();
     await ensureOutOfStockColumn();
     await ensureAllowCustomDimensionsColumn();
     await ensureShippingColumns();
     const body = await request.json();
const {
        id,
        name,
        slug,
        description,
        price,
        minQuantity,
        maxQuantity,
        minOrderValue,
        maxOrderValue,
        minWidthIn,
        maxWidthIn,
        minHeightIn,
        maxHeightIn,
        pricePerSqInch,
        mailboxPricePerMonth,
        oldPrice,
        weightLb,
        packageLengthIn,
        packageWidthIn,
        packageHeightIn,
        category,
        linkedCategorySlug,
        outOfStock,
        sameDayEligible,
        image,
        featured,
        allow_custom_dimensions,
        shippingEnabled,
        localDeliveryEligible,
        shippingCategory,
        features = [],
        sizes = [],
        galleryImages = [],
        videos,
        couponCodes = [],
      } = body;

    // Get category ID from slug or name
    let categoryId = null;
    if (category) {
      const cat = await queryOne(
        'SELECT id FROM categories WHERE slug = ? OR name = ? LIMIT 1',
        [category, category]
      );
      categoryId = cat?.id || null;
    }

const productId = id || `product-${Date.now()}`;
    const productSlug = slug || name.toLowerCase().replace(/\s+/g, '-');

    // Insert or update product
    console.log('Inserting product with ID:', productId);
    console.log('Product slug:', productSlug);
    console.log('Product name:', name);
    
      await query(
        `INSERT INTO products (id, name, slug, description, price, min_quantity, max_quantity, min_order_value, max_order_value, min_width_in, max_width_in, min_height_in, max_height_in, price_per_sq_inch, mailbox_price_per_month, old_price, weight_lb, package_length_in, package_width_in, package_height_in, category_id, l_category, image, same_day_eligible, out_of_stock, featured, allow_custom_dimensions, shipping_enabled, local_delivery_eligible, shipping_category, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          slug = VALUES(slug),
          description = VALUES(description),
          price = VALUES(price),
          min_quantity = VALUES(min_quantity),
          max_quantity = VALUES(max_quantity),
          min_order_value = VALUES(min_order_value),
          max_order_value = VALUES(max_order_value),
          min_width_in = VALUES(min_width_in),
          max_width_in = VALUES(max_width_in),
          min_height_in = VALUES(min_height_in),
         max_height_in = VALUES(max_height_in),
         price_per_sq_inch = VALUES(price_per_sq_inch),
         mailbox_price_per_month = VALUES(mailbox_price_per_month),
         old_price = VALUES(old_price),
         weight_lb = VALUES(weight_lb),
         package_length_in = VALUES(package_length_in),
         package_width_in = VALUES(package_width_in),
         package_height_in = VALUES(package_height_in),
         category_id = VALUES(category_id),
         l_category = VALUES(l_category),
         image = VALUES(image),
         same_day_eligible = VALUES(same_day_eligible),
         out_of_stock = VALUES(out_of_stock),
         featured = VALUES(featured),
         allow_custom_dimensions = VALUES(allow_custom_dimensions),
         shipping_enabled = VALUES(shipping_enabled),
         local_delivery_eligible = VALUES(local_delivery_eligible),
         shipping_category = VALUES(shipping_category),
         updated_at = CURRENT_TIMESTAMP`,
      [
        productId,
        name,
        productSlug,
        description || '',
        price || 0,
        nullableNumber(minQuantity),
        nullableNumber(maxQuantity),
        nullableNumber(minOrderValue),
        nullableNumber(maxOrderValue),
        nullableNumber(minWidthIn),
        nullableNumber(maxWidthIn),
        nullableNumber(minHeightIn),
        nullableNumber(maxHeightIn),
        nullableNumber(pricePerSqInch),
        nullableNumber(mailboxPricePerMonth),
        nullableNumber(oldPrice),
        nullableNumber(weightLb),
        nullableNumber(packageLengthIn),
        nullableNumber(packageWidthIn),
        nullableNumber(packageHeightIn),
        categoryId,
        linkedCategorySlug || null,
        image || '/placeholder.jpg',
        sameDayEligible ? 1 : 0,
        outOfStock ? 1 : 0,
        featured ? 1 : 0,
        allow_custom_dimensions ? 1 : 0,
        shippingEnabled !== false,
        localDeliveryEligible ? 1 : 0,
        shippingCategory || 'standard',
        true,
      ]
    );
    
    console.log('Product insertion completed');

    // Get the actual product ID (either from form or from database)
    let actualProductId;
    if (id) {
      // For existing products, use the provided ID
      actualProductId = { id };
      console.log('Using existing product ID:', id);
    } else {
      // For new products, find the inserted product by slug
      console.log('Looking for new product with slug:', productSlug);
      try {
        const insertedProduct = await queryOne('SELECT id FROM products WHERE slug = ? LIMIT 1', [productSlug]);
        console.log('Found inserted product:', insertedProduct);
        if (insertedProduct && insertedProduct.id) {
          actualProductId = insertedProduct;
        } else {
          console.error('Could not find inserted product with slug:', productSlug);
          // Try to find by name as fallback
          const productByName = await queryOne('SELECT id FROM products WHERE name = ? LIMIT 1', [name]);
          console.log('Found product by name:', productByName);
          if (productByName && productByName.id) {
            actualProductId = productByName;
          } else {
            throw new Error('Failed to retrieve created product');
          }
        }
      } catch (error) {
        console.error('Error finding inserted product:', error);
        throw new Error('Failed to retrieve created product');
      }
    }

    console.log('Final actualProductId:', actualProductId);

    // Update features
    await query('DELETE FROM product_features WHERE product_id = ?', [actualProductId.id]);
    if (features.length > 0) {
      const featureValues = features.map((f: string, idx: number) => [
        actualProductId.id,
        f.trim(),
        idx,
      ]);
      await query(
        'INSERT INTO product_features (product_id, feature, display_order) VALUES ?',
        [featureValues]
      );
    }

    // Update gallery images if provided
    if (Array.isArray(galleryImages)) {
      await query('DELETE FROM product_images WHERE product_id = ?', [actualProductId.id]);
      if (galleryImages.length > 0) {
        const values = galleryImages
          .map((url: string, idx: number) => [actualProductId.id, url, idx])
          .filter(([_, url]) => url && String(url).trim().length > 0);
        if (values.length > 0) {
          await query(
            'INSERT INTO product_images (product_id, image_url, display_order) VALUES ?',
            [values]
          );
        }
      }
    }

    // Update videos if provided (only if table exists)
    if (Array.isArray(videos)) {
      const includeVideos = await hasProductVideosTable();
      if (includeVideos) {
        await query('DELETE FROM product_videos WHERE product_id = ?', [actualProductId.id]);
        if (videos.length > 0) {
          const values = videos
            .map((video: any, idx: number) => [
              actualProductId.id,
              video?.url,
              video?.title || `Video ${idx + 1}`,
              video?.description || '',
            ]);
          if (values.length > 0) {
            await query(
              'INSERT INTO product_videos (product_id, video_url, video_title, video_description, display_order) VALUES ?',
              [values]
            );
          }
        }
      }
    }

    // Update per-product coupon codes
    await query('DELETE FROM product_coupon_codes WHERE product_id = ?', [actualProductId.id]);
    if (Array.isArray(couponCodes) && couponCodes.length > 0) {
      const values = couponCodes
        .map((c: any) => [
          actualProductId.id,
          String(c.code || '').trim().toUpperCase(),
          Number(c.discountPercent || 0),
          c.isActive === false ? 0 : 1,
        ])
        .filter((x: any[]) => x[1].length > 0 && Number.isFinite(x[2]) && x[2] > 0);
      if (values.length > 0) {
        await query(
          'INSERT INTO product_coupon_codes (product_id, coupon_code, discount_percent, is_active) VALUES ?',
          [values],
        );
      }
    }

    return NextResponse.json({ success: true, id: actualProductId.id });
  } catch (error: any) {
    console.error('Error creating/updating product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save product' },
      { status: 500 }
    );
  }
}