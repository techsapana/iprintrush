import { HeroBanner } from './components/sections/HeroBanner';
import { FeaturedProducts } from './components/sections/FeaturedProducts';
import { ShopByNeeds } from './components/sections/ShopByNeeds';
import { Testimonials } from './components/sections/Testimonials';
import { OurProcess } from './components/sections/OurProcess';

export default function Page() {
  return (
    <div>
      <HeroBanner />
      <FeaturedProducts />
      <ShopByNeeds />
      <OurProcess />
      <Testimonials />

      {/* CTA Section */}
      <section className="bg-[#29b6f6] text-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Place your order before 2:00 PM for same-day printing. Fast, reliable, professional.
          </p>
          <a href="/products" className="inline-block bg-white text-[#29b6f6] font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
            Shop Now
          </a>
        </div>
      </section>
    </div>
  );
}
