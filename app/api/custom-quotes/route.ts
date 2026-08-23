import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { sendEmail } from '@/app/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Submit a new quote request
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate required fields based on our schema
    const requiredFields = ['full_name', 'email', 'phone', 'product_category', 'specifications', 'quantity', 'needs_customization', 'timing_requirement', 'delivery_method'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const uploadedFilesJson = data.uploaded_files && data.uploaded_files.length > 0 
      ? JSON.stringify(data.uploaded_files) 
      : null;

    const sql = `
      INSERT INTO custom_quotes (
        full_name, company, email, phone,
        product_category, reference_link, brand_model_sku, specifications, quantity, preferred_size, preferred_color, uploaded_files,
        needs_customization, decoration_method, decoration_location, decoration_colors,
        timing_requirement, delivery_method, delivery_address,
        budget_range, additional_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.full_name,
      data.company || null,
      data.email,
      data.phone,
      data.product_category,
      data.reference_link || null,
      data.brand_model_sku || null,
      data.specifications,
      data.quantity,
      data.preferred_size || null,
      data.preferred_color || null,
      uploadedFilesJson,
      data.needs_customization,
      data.decoration_method || null,
      data.decoration_location || null,
      data.decoration_colors || null,
      data.timing_requirement,
      data.delivery_method,
      data.delivery_address || null,
      data.budget_range || null,
      data.additional_notes || null
    ];

    await query(sql, values);

    // Send email to admin
    try {
      const adminEmail = process.env.MAIL_FROM || 'info@iprintrush.com';
      await sendEmail({
        to: adminEmail,
        subject: `New Custom Quote Request: ${data.product_category}`,
        text: `You have received a new custom quote request from ${data.full_name} (${data.email}).\n\nProduct: ${data.product_category}\nQuantity: ${data.quantity}\n\nPlease check the admin dashboard for full details.`,
        html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #ddd;border-radius:8px;">
                 <h2 style="color:#29b6f6;">New Custom Quote Request</h2>
                 <p><strong>Customer:</strong> ${data.full_name} (${data.email})</p>
                 <p><strong>Phone:</strong> ${data.phone}</p>
                 <p><strong>Product Category:</strong> ${data.product_category}</p>
                 <p><strong>Quantity:</strong> ${data.quantity}</p>
                 <br/>
                 <p>Please log in to the admin dashboard to view the full specifications and attached files.</p>
               </div>`
      });

      // Send confirmation to customer
      await sendEmail({
        to: data.email,
        subject: `We received your quote request - iPrintRush`,
        text: `Hi ${data.full_name},\n\nThank you for requesting a custom quote! Our team is reviewing your requirements for ${data.product_category} and will get back to you shortly.\n\nBest,\nThe iPrintRush Team`,
        html: `<div style="font-family:sans-serif;padding:20px;">
                 <h2>Thank you for your request, ${data.full_name}!</h2>
                 <p>Our team has received your custom quote request for <strong>${data.product_category}</strong>.</p>
                 <p>We are currently reviewing your specifications and will get back to you shortly with pricing and availability.</p>
                 <br/>
                 <p>Best regards,<br/><strong>The iPrintRush Team</strong></p>
               </div>`
      });
    } catch (emailErr) {
      console.error('Failed to send quote emails:', emailErr);
      // We don't fail the request if email fails, because the quote is saved.
    }

    return NextResponse.json({ success: true, message: 'Quote request submitted successfully' });
  } catch (error: any) {
    console.error('Submit quote request error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit quote request' }, { status: 500 });
  }
}

// Fetch all quote requests (Admin only)
export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = `SELECT * FROM custom_quotes ORDER BY created_at DESC`;
    const results = await query(sql);

    return NextResponse.json({ success: true, quotes: results || [] });
  } catch (error: any) {
    console.error('Fetch quotes error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quotes' }, { status: 500 });
  }
}
