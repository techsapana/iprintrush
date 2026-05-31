'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Card, CardContent } from '@/components/ui/card';

const staticTestimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    company: 'Local Restaurant Owner',
    quote:
      'iPrintRush saved our event! We needed menus printed same-day and they delivered perfect quality in hours. Highly recommend!',
    rating: 5,
    imageUrl: null,
  },
  {
    id: 2,
    name: 'Michael Chen',
    company: 'Real Estate Agent',
    quote:
      'As a real estate professional, timing is everything. iPrintRush consistently delivers my marketing materials on the same day.',
    rating: 5,
    imageUrl: null,
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    company: 'Event Planner',
    quote:
      'I love the reliability and quality. Whether I need banners, shirts, or signage - iPrintRush is my go-to for last-minute orders.',
    rating: 5,
    imageUrl: null,
  },
];

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/testimonials', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load testimonials');
        const data = await res.json();
        const items = Array.isArray(data.testimonials) ? data.testimonials : [];
        if (items.length > 0) {
          setTestimonials(items);
        } else {
          setTestimonials(staticTestimonials);
        }
      } catch {
        setTestimonials(staticTestimonials);
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join hundreds of satisfied businesses who trust iPrintRush
            </p>
          </div>
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-600">Loading testimonials...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join hundreds of satisfied businesses who trust iPrintRush
          </p>
        </div>

        <div className="relative">
          <div className="flex justify-end gap-2 mb-4">
            <button
              type="button"
              onClick={scrollPrev}
              className="w-10 h-10 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition"
              aria-label="Previous testimonial"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="w-10 h-10 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition"
              aria-label="Next testimonial"
            >
              ›
            </button>
          </div>

          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="min-w-0 flex-[0_0_100%] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)]"
                >
                  <Card className="border-0 shadow-md h-full">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <span key={i} className="text-yellow-400">
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="text-gray-700 mb-6 italic">&quot;{testimonial.quote}&quot;</p>
                      <div>
                        <p className="font-semibold text-gray-900">{testimonial.name}</p>
                        <p className="text-sm text-gray-600">{testimonial.company}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}