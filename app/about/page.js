import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-[rgba(41,182,246,0.1)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            About iPrintRush
          </h1>
          <p className="text-xl text-gray-600">
            Fast, reliable, professional printing solutions for businesses of all sizes
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            At iPrintRush, we believe that time is money. That's why we've made it our mission to deliver
            high-quality printing solutions on the same day you need them. Whether you're a small business
            owner, marketing professional, or event planner, we understand the pressure of tight deadlines.
          </p>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            Founded in 2023, iPrintRush has grown to become a trusted partner for businesses across multiple
            industries. We invest in the latest printing technology and employ expert craftspeople to ensure
            every product meets our high standards of quality.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Our commitment to speed, quality, and customer service has made us the go-to choice for same-day
            printing in the region.
          </p>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 tracking-tight">
            WHY CHOOSE US
          </h2>
          <ul className="space-y-5 text-xl md:text-2xl text-gray-900">
            <li className="flex items-start gap-3">
              <span className="text-3xl leading-none">⚡</span>
              <span>Fast Turnaround</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-3xl leading-none">🎯</span>
              <span>Premium Print Quality</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-3xl leading-none">📍</span>
              <span>Local &amp; Reliable</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-3xl leading-none">🖨️</span>
              <span>One-Stop Print Solution</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-[#29b6f6] text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">5000+</div>
              <p className="text-lg opacity-90">Happy Customers</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">50K+</div>
              <p className="text-lg opacity-90">Orders Completed</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">99%</div>
              <p className="text-lg opacity-90">Satisfaction Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Experience the Difference?</h2>
          <p className="text-lg text-gray-700 mb-8">
            Join thousands of satisfied customers who trust iPrintRush for their printing needs.
          </p>
          <Link href="/products">
            <Button className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-3 px-8 text-lg">
              Shop Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
