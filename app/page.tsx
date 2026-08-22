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

      {/* Split CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Standard Shopping CTA */}
            <div className="bg-[#29b6f6] text-white rounded-3xl p-10 md:p-14 flex flex-col justify-center shadow-xl relative overflow-hidden group">
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
                <p className="text-lg md:text-xl mb-8 opacity-90 leading-relaxed">
                  Place your order before 2:00 PM for same-day printing. Fast, reliable, professional.
                </p>
                <a href="/products" className="inline-block bg-white text-[#29b6f6] font-bold py-4 px-10 rounded-full hover:scale-105 transition-transform duration-300 shadow-md">
                  Shop Now
                </a>
              </div>
              {/* Decorative background circle */}
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
            </div>

            {/* Custom Quote CTA */}
            <div className="bg-gray-900 text-white rounded-3xl p-10 md:p-14 flex flex-col justify-center shadow-xl relative overflow-hidden group">
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Can't Find It?</h2>
                <p className="text-lg md:text-xl mb-8 text-gray-300 leading-relaxed">
                  Tell us what you're looking for. Share a photo or description, and we'll send you a custom quote.
                </p>
                <a href="/request-quote" className="inline-block bg-[#29b6f6] text-white font-bold py-4 px-10 rounded-full hover:bg-[#1e8fc4] hover:scale-105 transition-all duration-300 shadow-md">
                  Request a Quote
                </a>
              </div>
              {/* Decorative background circle */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-white opacity-[0.03] rounded-full group-hover:scale-110 transition-transform duration-700"></div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
