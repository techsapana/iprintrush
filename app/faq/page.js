'use client';

import { useState } from 'react';

const faqs = [
  {
    category: 'Same-Day Printing',
    items: [
      {
        q: 'What is the cutoff time for same-day printing?',
        a: 'Orders must be placed and approved before 2:00 PM to qualify for same-day printing. After 2:00 PM, orders are available for the next business day.'
      },
      {
        q: 'Is same-day printing available on weekends?',
        a: 'Same-day printing is available Monday through Saturday. Orders placed after 2:00 PM Saturday are available for Monday delivery.'
      },
      {
        q: 'What if I miss the 2:00 PM deadline?',
        a: 'Your order will be available for pickup the next business day. You can still order and we\'ll prioritize your project for next-day completion.'
      }
    ]
  },
  {
    category: 'File Requirements',
    items: [
      {
        q: 'What file formats do you accept?',
        a: 'We accept PDF, AI, PSD, PNG, JPG, TIFF, and other standard formats. PDF is preferred as it ensures consistent printing results.'
      },
      {
        q: 'What are the resolution requirements?',
        a: 'For best results, we recommend 300 DPI (dots per inch) for all print files. We can work with lower resolution files, but quality may be affected.'
      },
      {
        q: 'Can you help with file preparation?',
        a: 'Yes! Our team can help you prepare your files for printing. Contact us if you need guidance on color modes, bleeds, or other technical specifications.'
      }
    ]
  },
  {
    category: 'Ordering & Pricing',
    items: [
      {
        q: 'Is there a minimum order quantity?',
        a: 'No minimum! We can print single items or large orders. Bulk orders may qualify for volume discounts.'
      },
      {
        q: 'Do you offer bulk discounts?',
        a: 'Yes! Contact our sales team for custom pricing on large orders. We\'ll give you a quote based on your specific needs.'
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards, PayPal, and bank transfers. Payment is required at checkout.'
      }
    ]
  },
  {
    category: 'Delivery & Pickup',
    items: [
      {
        q: 'Do you offer local pickup?',
        a: 'Yes! Same-day local pickup is available for orders placed before 2:00 PM. We\'re located at 8506 Madison Ave, Fair Oaks, CA 95628.'
      },
      {
        q: 'How much does shipping cost?',
        a: 'Shipping costs vary based on location and weight. You\'ll see shipping options and costs at checkout before finalizing your order.'
      },
      {
        q: 'How long does shipping take?',
        a: 'Standard shipping typically takes 2-3 business days. We also offer expedited shipping options for an additional fee.'
      }
    ]
  },
  {
    category: 'Quality & Returns',
    items: [
      {
        q: 'What is your quality guarantee?',
        a: 'We guarantee professional-quality printing. If you\'re not satisfied with the result, contact us within 48 hours and we\'ll reprint at no charge.'
      },
      {
        q: 'What if there\'s an error in my order?',
        a: 'Contact us immediately if you notice any issues. We\'ll investigate and make it right - whether that\'s a reprint, refund, or replacement.'
      },
      {
        q: 'Can I preview my order before printing?',
        a: 'Yes! We provide digital proofs for all orders. You\'ll have the opportunity to review and approve your proof before we print.'
      }
    ]
  },
  {
    category: 'Custom Services',
    items: [
      {
        q: 'Do you offer design services?',
        a: 'We can help with minor design adjustments and revisions. For full design services, please contact our team for custom quotes.'
      },
      {
        q: 'Can I order custom sizes or materials?',
        a: 'Absolutely! We work with custom sizes and materials. Let us know what you need and we\'ll provide a quote.'
      },
      {
        q: 'What about special finishes (matte, gloss, lamination)?',
        a: 'We offer various finishes including matte, gloss, and spot UV. Some special finishes may require additional time or charge.'
      }
    ]
  }
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (category, index) => {
    const key = `${category}-${index}`;
    setOpenItems((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-[rgba(41,182,246,0.1)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600">
            Find answers to common questions about our services
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {faqs.map((category) => (
              <div key={category.category}>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {category.category}
                </h2>

                <div className="space-y-3">
                  {category.items.map((item, idx) => {
                    const isOpen = openItems[`${category.category}-${idx}`];

                    return (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleItem(category.category, idx)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition text-left"
                        >
                          <h3 className="font-semibold text-gray-900">
                            {item.q}
                          </h3>
                          <span className="text-[#29b6f6] font-bold ml-4">
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="p-4 bg-white border-t border-gray-200">
                            <p className="text-gray-700 leading-relaxed">
                              {item.a}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still have questions? */}
      <section className="bg-[rgba(41,182,246,0.1)] py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Still have questions?
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Can't find what you're looking for? Our team is here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/contact" className="inline-block bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-3 px-8 rounded-lg transition">
              Contact Us
            </a>
            <a href="mailto:info@iprintrush.com" className="inline-block border border-[#29b6f6] text-[#29b6f6] hover:bg-[rgba(41,182,246,0.1)] font-semibold py-3 px-8 rounded-lg transition">
              Email Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
