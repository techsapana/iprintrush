// Single Product API - MySQL-backed
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

function normalizeVideoRow(v: any) {
  if (!v) return null;
  const videoUrl = v.video_url ?? v.videoUrl ?? v.VIDEO_URL ?? v.url ?? v.videoURL;
  if (!videoUrl) return null;
  return {
    url: String(videoUrl),
    title: v.video_title != null ? String(v.video_title) : (v.videoTitle != null ? String(v.videoTitle) : ''),
    description:
      v.video_description != null
        ? String(v.video_description)
        : (v.videoDescription != null ? String(v.videoDescription) : ''),
  };
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

async function resolveProductIdOrSlug(idOrSlug: string) {
  const byId = await queryOne('SELECT id FROM products WHERE id = ? LIMIT 1', [idOrSlug]);
  if (byId?.id) return byId.id;
  const bySlug = await queryOne('SELECT id FROM products WHERE slug = ? LIMIT 1', [idOrSlug]);
  return bySlug?.id || null;
}

async function verifyProductIdOrSlug(productId: string, productSlug: string) {
  const dbVerifiedProduct = await queryOne(
    'SELECT id FROM products WHERE id = ? OR slug = ? LIMIT 1',
    [productId, productSlug]
  );
  if (!dbVerifiedProduct?.id) {
    throw new Error('Product update failed - no DB record found after save');
  }
  return dbVerifiedProduct.id;
}

export async function GET(
   request: NextRequest,
   { params }: { params: { id: string } | Promise<{ id: string }> }
 ) {
   try {
     await ensureLCategoryColumn();
     await ensureOutOfStockColumn();
     await ensureAllowCustomDimensionsColumn();
     await ensureShippingColumns();
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const includeVideos = await hasProductVideosTable();

     // Get product with category and features
     const product = await queryOne(
       `SELECT 
         p.*,
         c.name as category_name,
         c.slug as category_slug,
         GROUP_CONCAT(DISTINCT pf.feature ORDER BY pf.display_order SEPARATOR ',') as features,
         p.allow_custom_dimensions
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_features pf ON p.id = pf.product_id
       WHERE p.id = ? OR p.slug = ?
       GROUP BY p.id`,
       [id, id]
     );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get sizes for this product
    const sizes = (await query(
      `SELECT so.id, so.label, so.price_addon
       FROM product_size_options pso
       JOIN size_options so ON pso.size_option_id = so.id
       WHERE pso.product_id = ?
       ORDER BY so.display_order`,
      [product.id]
    )) as any[];

    // Get gallery images for this product
    const gallery = (await query(
      `SELECT image_url 
       FROM product_images 
       WHERE product_id = ? 
       ORDER BY display_order, id`,
      [product.id]
    )) as any[];

    // Get videos for this product
    const videosRaw = includeVideos
      ? ((await query(
          `SELECT video_url, video_title, video_description
           FROM product_videos
           WHERE product_id = ?
           ORDER BY display_order, id`,
          [product.id]
        )) as any[])
      : ([] as any[]);

const transformed: any = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: parseFloat(product.price),
        minQuantity: product.min_quantity != null ? Number(product.min_quantity) : null,
        maxQuantity: product.max_quantity != null ? Number(product.max_quantity) : null,
        minOrderValue: product.min_order_value != null ? Number(product.min_order_value) : null,
        maxOrderValue: product.max_order_value != null ? Number(product.max_order_value) : null,
        minWidthIn: product.min_width_in != null ? Number(product.min_width_in) : null,
        maxWidthIn: product.max_width_in != null ? Number(product.max_width_in) : null,
        minHeightIn: product.min_height_in != null ? Number(product.min_height_in) : null,
        maxHeightIn: product.max_height_in != null ? Number(product.max_height_in) : null,
        pricePerSqInch: product.price_per_sq_inch != null ? Number(product.price_per_sq_inch) : null,
        mailboxPricePerMonth:
          product.mailbox_price_per_month != null ? Number(product.mailbox_price_per_month) : null,
        oldPrice: product.old_price != null ? parseFloat(product.old_price) : null,
        weightLb: product.weight_lb != null ? Number(product.weight_lb) : null,
        packageLengthIn: product.package_length_in != null ? Number(product.package_length_in) : null,
        packageWidthIn: product.package_width_in != null ? Number(product.package_width_in) : null,
        packageHeightIn: product.package_height_in != null ? Number(product.package_height_in) : null,
        packageType: product.package_type || 'YOUR_PACKAGING',
        category: product.category_name || product.category_id,
        categoryId: product.category_id,
        linkedCategorySlug: product.l_category || null,
        categorySlug: product.category_slug,
        image: product.image || '/placeholder.jpg',
        sameDayEligible: Boolean(product.same_day_eligible),
        outOfStock: Boolean(product.out_of_stock),
        enabled: Boolean(product.enabled),
        featured: Boolean(product.featured),
        allowCustomDimensions: Boolean(product.allow_custom_dimensions),
        shippingEnabled: product.shipping_enabled !== false,
        localDeliveryEligible: Boolean(product.local_delivery_eligible),
        shippingCategory: product.shipping_category || 'standard',
        createdAt: product.created_at || null,
        features: product.features ? product.features.split(',') : [],
        sizes: sizes.map((s: any) => s.label),
        galleryImages: Array.isArray(gallery)
          ? gallery.map((g: any) => g.image_url).filter((url: string) => url && url.trim().length > 0)
          : [],
        ...(includeVideos
          ? {
              videos: Array.isArray(videosRaw)
                ? (videosRaw
                    .map(normalizeVideoRow)
                    .filter(Boolean) as Array<{ url: string; title: string; description: string }>)
                : [],
            }
          : {}),
        couponCodes: [],
      };

    const coupons = (await query(
      'SELECT coupon_code, discount_percent, is_active FROM product_coupon_codes WHERE product_id = ? ORDER BY id',
      [product.id],
    )) as any[];
    transformed.couponCodes = Array.isArray(coupons)
      ? coupons.map((c) => ({
          code: String(c.coupon_code || ''),
          discountPercent: Number(c.discount_percent || 0),
          isActive: c.is_active !== 0,
        }))
      : [];

    return NextResponse.json({ product: transformed });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: { id: string } | Promise<{ id: string }> }
 ) {
   try {
     await ensureLCategoryColumn();
     await ensureOutOfStockColumn();
     await ensureAllowCustomDimensionsColumn();
     await ensureShippingColumns();
    const body = await request.json();
    const resolvedParams = await params;
    
    const requestedProductId = resolvedParams.id && resolvedParams.id !== 'undefined' && resolvedParams.id !== 'null' 
      ? resolvedParams.id 
      : body.id;

    if (!requestedProductId) {
      throw new Error('Product ID is required');
    }

    const existingProductId = await resolveProductIdOrSlug(requestedProductId);
    let actualProductId = existingProductId || (body.id || `product-${Date.now()}`);
    const productId = actualProductId;
    const productSlug = body.slug || body.name?.toLowerCase().replace(/\s+/g, '-') || productId;
    
    // Get category ID if category is provided
    let categoryId = null;
    if (body.category) {
      const cat = await queryOne(
        'SELECT id FROM categories WHERE slug = ? OR name = ? LIMIT 1',
        [body.category, body.category]
      );
      categoryId = cat?.id || null;
    }

if (!existingProductId) {
      // Product doesn't exist - create it (upsert behavior)
      
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
           body.name,
           productSlug,
           body.description || '',
           nullableNumber(body.price) ?? 0,
           nullableNumber(body.minQuantity),
           nullableNumber(body.maxQuantity),
           nullableNumber(body.minOrderValue),
           nullableNumber(body.maxOrderValue),
           nullableNumber(body.minWidthIn),
           nullableNumber(body.maxWidthIn),
           nullableNumber(body.minHeightIn),
           nullableNumber(body.maxHeightIn),
           nullableNumber(body.pricePerSqInch),
           nullableNumber(body.mailboxPricePerMonth),
           nullableNumber(body.oldPrice),
           nullableNumber(body.weightLb),
           nullableNumber(body.packageLengthIn),
           nullableNumber(body.packageWidthIn),
           nullableNumber(body.packageHeightIn),
           categoryId,
           body.linkedCategorySlug || null,
           body.image || '/placeholder.jpg',
           body.sameDayEligible ? 1 : 0,
           body.outOfStock ? 1 : 0,
           body.featured ? 1 : 0,
           body.allow_custom_dimensions ? 1 : 0,
           body.shippingEnabled !== false,
           body.localDeliveryEligible ? 1 : 0,
           body.shippingCategory || 'standard',
]
       );

       actualProductId = await verifyProductIdOrSlug(productId, productSlug);
      } else {
       // Product exists - update it
       const updates: string[] = [];
       const values: any[] = [];

      if (body.name !== undefined) {
        updates.push('name = ?');
        values.push(body.name);
      }
      if (body.slug !== undefined) {
        updates.push('slug = ?');
        values.push(body.slug);
      }
      if (body.description !== undefined) {
        updates.push('description = ?');
        values.push(body.description);
      }
      if (body.price !== undefined) {
        updates.push('price = ?');
        values.push(nullableNumber(body.price) ?? 0);
      }
      if (body.minQuantity !== undefined) {
        updates.push('min_quantity = ?');
        values.push(nullableNumber(body.minQuantity));
      }
      if (body.maxQuantity !== undefined) {
        updates.push('max_quantity = ?');
        values.push(nullableNumber(body.maxQuantity));
      }
      if (body.minOrderValue !== undefined) {
        updates.push('min_order_value = ?');
        values.push(nullableNumber(body.minOrderValue));
      }
      if (body.maxOrderValue !== undefined) {
        updates.push('max_order_value = ?');
        values.push(nullableNumber(body.maxOrderValue));
      }
      if (body.minWidthIn !== undefined) {
        updates.push('min_width_in = ?');
        values.push(nullableNumber(body.minWidthIn));
      }
      if (body.maxWidthIn !== undefined) {
        updates.push('max_width_in = ?');
        values.push(nullableNumber(body.maxWidthIn));
      }
      if (body.minHeightIn !== undefined) {
        updates.push('min_height_in = ?');
        values.push(nullableNumber(body.minHeightIn));
      }
      if (body.maxHeightIn !== undefined) {
        updates.push('max_height_in = ?');
        values.push(nullableNumber(body.maxHeightIn));
      }
      if (body.pricePerSqInch !== undefined) {
        updates.push('price_per_sq_inch = ?');
        values.push(nullableNumber(body.pricePerSqInch));
      }
      if (body.mailboxPricePerMonth !== undefined) {
        updates.push('mailbox_price_per_month = ?');
        values.push(nullableNumber(body.mailboxPricePerMonth));
      }
      if (body.oldPrice !== undefined) {
        updates.push('old_price = ?');
        values.push(nullableNumber(body.oldPrice));
      }
      if (body.weightLb !== undefined) {
        updates.push('weight_lb = ?');
        values.push(nullableNumber(body.weightLb));
      }
      if (body.packageLengthIn !== undefined) {
        updates.push('package_length_in = ?');
        values.push(nullableNumber(body.packageLengthIn));
      }
      if (body.packageWidthIn !== undefined) {
        updates.push('package_width_in = ?');
        values.push(nullableNumber(body.packageWidthIn));
      }
      if (body.packageHeightIn !== undefined) {
        updates.push('package_height_in = ?');
        values.push(nullableNumber(body.packageHeightIn));
      }
      if (body.packageType !== undefined) {
        updates.push('package_type = ?');
        values.push(String(body.packageType || 'YOUR_PACKAGING'));
      }
      if (categoryId !== null) {
        updates.push('category_id = ?');
        values.push(categoryId);
      }
      if (body.linkedCategorySlug !== undefined || body.lCategory !== undefined) {
        updates.push('l_category = ?');
        values.push(body.linkedCategorySlug || body.lCategory || null);
      }
      if (body.image !== undefined) {
        updates.push('image = ?');
        values.push(body.image);
      }
      if (body.sameDayEligible !== undefined) {
        updates.push('same_day_eligible = ?');
        values.push(body.sameDayEligible ? 1 : 0);
      }
      if (body.outOfStock !== undefined) {
        updates.push('out_of_stock = ?');
        values.push(body.outOfStock ? 1 : 0);
      }
       if (body.featured !== undefined) {
         updates.push('featured = ?');
         values.push(body.featured ? 1 : 0);
       }
if (body.allow_custom_dimensions !== undefined) {
          updates.push('allow_custom_dimensions = ?');
          values.push(body.allow_custom_dimensions ? 1 : 0);
        }
        if (body.shippingEnabled !== undefined) {
          updates.push('shipping_enabled = ?');
          values.push(body.shippingEnabled ? 1 : 0);
        }
        if (body.localDeliveryEligible !== undefined) {
          updates.push('local_delivery_eligible = ?');
          values.push(body.localDeliveryEligible ? 1 : 0);
        }
        if (body.shippingCategory !== undefined) {
          updates.push('shipping_category = ?');
          values.push(body.shippingCategory || 'standard');
        }
        if (body.enabled !== undefined) {
          updates.push('enabled = ?');
          values.push(body.enabled ? 1 : 0);
        }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(actualProductId);
        await query(
          `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      actualProductId = await verifyProductIdOrSlug(productId, productSlug);
    }

    // Update features if provided
    if (body.features !== undefined && Array.isArray(body.features)) {
      await query('DELETE FROM product_features WHERE product_id = ?', [actualProductId]);
      if (body.features.length > 0) {
        const featureValues = body.features.map((f: string, idx: number) => [
          actualProductId,
          f.trim(),
          idx,
        ]);
        await query(
          'INSERT INTO product_features (product_id, feature, display_order) VALUES ?',
          [featureValues]
        );
      }
    }

    // Update gallery images if provided
    if (body.galleryImages !== undefined && Array.isArray(body.galleryImages)) {
      await query('DELETE FROM product_images WHERE product_id = ?', [actualProductId]);
      if (body.galleryImages.length > 0) {
        const values = body.galleryImages
          .map((url: string, idx: number) => [actualProductId, url, idx])
          .filter(([_id, url]: [string, string, number]) => url && String(url).trim().length > 0);
        if (values.length > 0) {
          await query(
            'INSERT INTO product_images (product_id, image_url, display_order) VALUES ?',
            [values]
          );
        }
      }
    }

    // Update videos if provided (only if table exists)
    if (body.videos !== undefined && Array.isArray(body.videos)) {
      const includeVideos = await hasProductVideosTable();
      if (includeVideos) {
        await query('DELETE FROM product_videos WHERE product_id = ?', [actualProductId]);
        if (body.videos.length > 0) {
          const values = body.videos
            .map((video: any, idx: number) => [
              actualProductId,
              video?.url,
              video?.title || `Video ${idx + 1}`,
              video?.description || '',
              idx,
            ])
            .filter(([_id, url]: [string, string, string, string, number]) =>
              url && String(url).trim().length > 0
            );
          if (values.length > 0) {
            await query(
              'INSERT INTO product_videos (product_id, video_url, video_title, video_description, display_order) VALUES ?',
              [values]
            );
          }
        }
      }
    }

    // Update coupon codes if provided
    if (body.couponCodes !== undefined && Array.isArray(body.couponCodes)) {
      await query('DELETE FROM product_coupon_codes WHERE product_id = ?', [actualProductId]);
      const values = body.couponCodes
        .map((c: any) => [
          actualProductId,
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

    return NextResponse.json({ success: true, id: actualProductId });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    await query('DELETE FROM products WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}