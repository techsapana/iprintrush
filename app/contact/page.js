'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const DEFAULT_FAQS = [
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

export default function ContactPage() {
  const [openingDay, setOpeningDay] = useState('Monday');
  const [closingDay, setClosingDay] = useState('Saturday');
  const [openingTime, setOpeningTime] = useState('8:00 AM');
  const [closingTime, setClosingTime] = useState('6:00 PM');
  const [contactPhone, setContactPhone] = useState('1-800-PRINT-24');
  const [contactEmail, setContactEmail] = useState('info@iprintrush.com');
  const [contactFaqs, setContactFaqs] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (data.openingDay) setOpeningDay(String(data.openingDay));
        if (data.closingDay) setClosingDay(String(data.closingDay));
        if (data.openingTime) setOpeningTime(String(data.openingTime));
        if (data.closingTime) setClosingTime(String(data.closingTime));
        if (data.contactPhone) setContactPhone(String(data.contactPhone));
        if (data.contactEmail) setContactEmail(String(data.contactEmail));
        if (Array.isArray(data.contactFaqs)) setContactFaqs(data.contactFaqs);
      } catch {
        // keep defaults
      }
    };
    loadSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would send to an API
    setSubmitted(true);
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-[rgba(41,182,246,0.1)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Contact Us</h1>
          <p className="text-xl text-gray-600">
            Have questions? We'd love to hear from you. Get in touch with our team.
          </p>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Get in Touch</h2>

              <div className="space-y-8">
                {/* Phone */}
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Phone</h3>
                  <p className="text-gray-700 text-lg">{contactPhone}</p>
                  <p className="text-gray-600">{openingDay} - {closingDay}, {openingTime} - {closingTime}</p>
                </div>

                {/* Email */}
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Email</h3>
                  <a href={`mailto:${contactEmail}`} className="text-[#29b6f6] hover:underline text-lg">
                    {contactEmail}
                  </a>
                  <p className="text-gray-600">We'll respond within 24 hours</p>
                </div>

                {/* Location */}
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Visit Us</h3>
                  <p className="text-gray-700">
                    8506 Madison Ave<br />
                    Fair Oaks, CA 95628
                  </p>
                  <p className="text-gray-600 mt-2">
                    Local pickup available<br />
                    Wheelchair accessible
                  </p>
                </div>

                {/* Hours */}
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Business Hours</h3>
                  <ul className="space-y-1 text-gray-700">
                    <li>{openingDay} - {closingDay}: {openingTime} - {closingTime}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>

                {submitted && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">
                      ✓ Thank you! We've received your message and will get back to you soon.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows="5"
                      className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700"
                    ></textarea>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-3"
                  >
                    Send Message
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Find Us</h2>
          <div className="rounded-lg overflow-hidden shadow-lg border border-gray-200">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3115.3500767228766!2d-121.2436118!3d38.663821899999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x809ae0b426a18407%3A0x629f8c5f9a5c0088!2s8506%20Madison%20Ave%2C%20Fair%20Oaks%2C%20CA%2095628%2C%20USA!5e0!3m2!1sen!2snp!4v1775912741447!5m2!1sen!2snp"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="iPrintRush — 8506 Madison Ave, Fair Oaks, CA 95628"
              className="w-full"
            ></iframe>
          </div>
          <div className="mt-6 text-center">
            <p className="text-gray-700 text-lg">
              <strong>8506 Madison Ave, Fair Oaks, CA 95628</strong>
            </p>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=8506+Madison+Ave%2C+Fair+Oaks%2C+CA+95628"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#29b6f6] hover:underline mt-2 inline-block"
            >
              Get Directions →
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[rgba(41,182,246,0.1)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Quick FAQ</h2>

          <div className="space-y-8">
            {(contactFaqs.length > 0 ? contactFaqs : DEFAULT_FAQS).map((faq, idx) => (
              <div key={`faq-${idx}`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-700">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
