import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Clock, Printer, MapPin, Award, CheckCircle } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gray-50 py-20 md:py-32 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
            Print exactly what you need, <br className="hidden md:block" />
            <span className="text-[#29b6f6]">exactly when you need it.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            iPrintRush was built on a simple premise: commercial-grade printing shouldn't take weeks. We combine modern digital print technology with streamlined fulfillment to deliver your materials on schedule, every time.
          </p>
        </div>
      </section>

      {/* Our Story / Who we are */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Story</h2>
          <div className="space-y-6 text-lg text-gray-600 text-left">
            <p>
              We started iPrintRush because we saw a gap in the printing industry. Traditional print shops often had long turnaround times, while online giants lacked the personal touch and urgency required by local businesses.
            </p>
            <p>
              By investing heavily in state-of-the-art digital presses and building an efficient, local production workflow, we cut out the middleman. This means tighter quality control, faster production cycles, and the ability to confidently offer same-day printing without compromising on the final product.
            </p>
            <p>
              Today, we handle everything from emergency business cards for a sudden networking event to full-scale marketing collateral for corporate trade shows. 
            </p>
          </div>
        </div>
      </section>

      {/* Value Proposition Grid */}
      <section className="bg-gray-50 py-16 md:py-24 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The iPrintRush Standard</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We hold ourselves to strict operational standards to ensure your projects are handled properly from file upload to final delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-[#29b6f6]/10 text-[#29b6f6] rounded-lg flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Uncompromising Speed</h3>
              <p className="text-gray-600">
                Our facility is optimized for rapid job turnaround. Same-day orders aren't just an afterthought—they are the core of our production schedule.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-[#29b6f6]/10 text-[#29b6f6] rounded-lg flex items-center justify-center mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Commercial Quality</h3>
              <p className="text-gray-600">
                Speed doesn't mean cutting corners. We run industry-leading digital presses on premium paper stocks to ensure rich colors and crisp text on every print.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-[#29b6f6]/10 text-[#29b6f6] rounded-lg flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Local Fulfillment</h3>
              <p className="text-gray-600">
                Because we produce locally, you aren't waiting on cross-country shipping. Pick up your orders directly or rely on our fast local delivery network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-gray-700">In-house Production</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-gray-700">Dedicated Support</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-gray-700">Secure File Processing</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to start your next project?</h2>
          <p className="text-lg text-gray-300 mb-10">
            Upload your files today and let us handle the heavy lifting.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/products">
              <Button className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-6 px-10 text-lg rounded-xl h-auto">
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
