import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_TEXT =
  'Get it by Christmas: Up to 40% off select last-minute gifts | Ends Dec. 22';

const DEFAULT_CONTACT_PHONE = '1-800-PRINT-24';
const DEFAULT_CONTACT_EMAIL = 'info@iprintrush.com';
const DEFAULT_OPENING_DAY = 'Monday';
const DEFAULT_CLOSING_DAY = 'Saturday';
const DEFAULT_OPENING_TIME = '8:00 AM';
const DEFAULT_CLOSING_TIME = '6:00 PM';
const DEFAULT_CONTACT_FAQS = [
  {
    question: 'What is your order deadline for same-day printing?',
    answer:
      'Orders must be placed before 2:00 PM to qualify for same-day printing. After 2:00 PM, orders are available for the next business day.',
  },
  {
    question: 'Do you offer custom design services?',
    answer: 'Yes. We can help with design revisions and adjustments. Contact us for custom design pricing.',
  },
];

async function ensureSiteSettingsColumns() {
  const columns = [
    ['logo_image_url', 'TEXT NULL'],
    ['hero_desktop_image_url', 'TEXT NULL'],
    ['hero_mobile_image_url', 'TEXT NULL'],
    ['opening_day', 'VARCHAR(32) NULL'],
    ['closing_day', 'VARCHAR(32) NULL'],
    ['opening_time', 'VARCHAR(64) NULL'],
    ['closing_time', 'VARCHAR(64) NULL'],
    ['contact_phone', 'VARCHAR(64) NULL'],
    ['contact_email', 'VARCHAR(191) NULL'],
    ['contact_faqs_json', 'LONGTEXT NULL'],
  ];
  for (const [name, ddl] of columns) {
    const col: any = await queryOne(`SHOW COLUMNS FROM site_settings LIKE '${name}'`);
    if (!col) {
      await query(`ALTER TABLE site_settings ADD COLUMN ${name} ${ddl}`);
    }
  }
}

export async function GET() {
  try {
    await ensureSiteSettingsColumns();
    const row: any = await queryOne(
      'SELECT announcement_text, announcement_enabled, tax_rate_percent, promo_headline, promo_subheadline, promo_banner_image_url, notary_image_url, mailbox_image_url, logo_image_url, hero_desktop_image_url, hero_mobile_image_url, opening_day, closing_day, opening_time, closing_time, contact_phone, contact_email, contact_faqs_json FROM site_settings ORDER BY id ASC LIMIT 1',
    );
    let faqs = DEFAULT_CONTACT_FAQS;
    if (row?.contact_faqs_json) {
      try {
        const parsed = JSON.parse(String(row.contact_faqs_json));
        if (Array.isArray(parsed)) {
          faqs = parsed
            .map((x) => ({
              question: String(x?.question || '').trim(),
              answer: String(x?.answer || '').trim(),
            }))
            .filter((x) => x.question && x.answer);
        }
      } catch {
        faqs = DEFAULT_CONTACT_FAQS;
      }
    }

    return NextResponse.json({
      success: true,
      announcementText: row?.announcement_text || DEFAULT_TEXT,
      announcementEnabled: row?.announcement_enabled !== 0,
      taxRatePercent: row?.tax_rate_percent != null ? Number(row.tax_rate_percent) : 0,
      promoHeadline: row?.promo_headline || '',
      promoSubheadline: row?.promo_subheadline || '',
      promoBannerImageUrl: row?.promo_banner_image_url || '',
      notaryImageUrl: row?.notary_image_url || '',
      mailboxImageUrl: row?.mailbox_image_url || '',
      logoImageUrl: row?.logo_image_url || '',
      heroDesktopImageUrl: row?.hero_desktop_image_url || '',
      heroMobileImageUrl: row?.hero_mobile_image_url || '',
      openingDay: row?.opening_day || DEFAULT_OPENING_DAY,
      closingDay: row?.closing_day || DEFAULT_CLOSING_DAY,
      openingTime: row?.opening_time || DEFAULT_OPENING_TIME,
      closingTime: row?.closing_time || DEFAULT_CLOSING_TIME,
      contactPhone: row?.contact_phone || DEFAULT_CONTACT_PHONE,
      contactEmail: row?.contact_email || DEFAULT_CONTACT_EMAIL,
      contactFaqs: faqs,
    });
  } catch {
    return NextResponse.json({
      success: true,
      announcementText: DEFAULT_TEXT,
      announcementEnabled: true,
      taxRatePercent: 0,
      promoHeadline: '',
      promoSubheadline: '',
      promoBannerImageUrl: '',
      notaryImageUrl: '',
      mailboxImageUrl: '',
      logoImageUrl: '',
      heroDesktopImageUrl: '',
      heroMobileImageUrl: '',
      openingDay: DEFAULT_OPENING_DAY,
      closingDay: DEFAULT_CLOSING_DAY,
      openingTime: DEFAULT_OPENING_TIME,
      closingTime: DEFAULT_CLOSING_TIME,
      contactPhone: DEFAULT_CONTACT_PHONE,
      contactEmail: DEFAULT_CONTACT_EMAIL,
      contactFaqs: DEFAULT_CONTACT_FAQS,
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureSiteSettingsColumns();
    const admin = getAdminFromRequest(req);
    if (!admin?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const announcementText = String(body.announcementText || '').trim();
    const announcementEnabled = body.announcementEnabled !== false;
    const taxRatePercent = Number.isFinite(Number(body.taxRatePercent))
      ? Math.max(0, Number(body.taxRatePercent))
      : 0;
    const promoHeadline = String(body.promoHeadline || '').trim();
    const promoSubheadline = String(body.promoSubheadline || '').trim();
    const promoBannerImageUrl = String(body.promoBannerImageUrl || '').trim();
    const notaryImageUrl = String(body.notaryImageUrl || '').trim();
    const mailboxImageUrl = String(body.mailboxImageUrl || '').trim();
    const logoImageUrl = String(body.logoImageUrl || '').trim();
    const heroDesktopImageUrl = String(body.heroDesktopImageUrl || '').trim();
    const heroMobileImageUrl = String(body.heroMobileImageUrl || '').trim();
    const openingDay = String(body.openingDay || '').trim();
    const closingDay = String(body.closingDay || '').trim();
    const openingTime = String(body.openingTime || '').trim();
    const closingTime = String(body.closingTime || '').trim();
    const contactPhone = String(body.contactPhone || '').trim();
    const contactEmail = String(body.contactEmail || '').trim();
    const contactFaqs = Array.isArray(body.contactFaqs)
      ? body.contactFaqs
          .map((x: any) => ({
            question: String(x?.question || '').trim(),
            answer: String(x?.answer || '').trim(),
          }))
          .filter((x: any) => x.question && x.answer)
      : [];

    await query(
      `INSERT INTO site_settings (id, announcement_text, announcement_enabled, tax_rate_percent, promo_headline, promo_subheadline, promo_banner_image_url, notary_image_url, mailbox_image_url, logo_image_url, hero_desktop_image_url, hero_mobile_image_url, opening_day, closing_day, opening_time, closing_time, contact_phone, contact_email, contact_faqs_json)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         announcement_text = VALUES(announcement_text),
         announcement_enabled = VALUES(announcement_enabled),
         tax_rate_percent = VALUES(tax_rate_percent),
         promo_headline = VALUES(promo_headline),
         promo_subheadline = VALUES(promo_subheadline),
         promo_banner_image_url = VALUES(promo_banner_image_url),
         notary_image_url = VALUES(notary_image_url),
         mailbox_image_url = VALUES(mailbox_image_url),
        logo_image_url = VALUES(logo_image_url),
        hero_desktop_image_url = VALUES(hero_desktop_image_url),
        hero_mobile_image_url = VALUES(hero_mobile_image_url),
        opening_day = VALUES(opening_day),
        closing_day = VALUES(closing_day),
         opening_time = VALUES(opening_time),
         closing_time = VALUES(closing_time),
         contact_phone = VALUES(contact_phone),
         contact_email = VALUES(contact_email),
         contact_faqs_json = VALUES(contact_faqs_json),
         updated_at = CURRENT_TIMESTAMP`,
      [
        announcementText || DEFAULT_TEXT,
        announcementEnabled ? 1 : 0,
        taxRatePercent,
        promoHeadline || null,
        promoSubheadline || null,
        promoBannerImageUrl || null,
        notaryImageUrl || null,
        mailboxImageUrl || null,
        logoImageUrl || null,
        heroDesktopImageUrl || null,
        heroMobileImageUrl || null,
        openingDay || null,
        closingDay || null,
        openingTime || null,
        closingTime || null,
        contactPhone || null,
        contactEmail || null,
        JSON.stringify(contactFaqs),
      ],
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update announcement settings' },
      { status: 500 },
    );
  }
}

