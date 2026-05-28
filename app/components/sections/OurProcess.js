import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    number: 1,
    title: 'Product Selection',
    description: 'Choose from custom apparel, signs, banners, marketing materials, and more.'
  },
  {
    number: 2,
    title: 'Design Upload or Create',
    description: 'Upload your artwork or work with our team to create a design from scratch.'
  },
  {
    number: 3,
    title: 'Proof Approval',
    description: 'Review and approve your digital proof before we start production.'
  },
  {
    number: 4,
    title: 'Production & Delivery',
    description: 'We print with care and prepare your order for pickup or shipping.'
  }
];

export function OurProcess() {
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Our Print Process
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From design to delivery - here's how we ensure quality and speed
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[50%] w-[calc(100%-2rem)] h-1 bg-[#29b6f6]" />
              )}
              <Card className="border-0 shadow-md relative z-10">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-[#29b6f6] text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Why Choose Us */}
        <div className="mt-14 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Why Choose Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-2 text-left">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span>Fast Turnaround</span>
              </div>
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span>Premium Print Quality</span>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-2 text-left">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">📍</span>
                <span>Local & Reliable</span>
              </div>
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">🖨️</span>
                <span>One-Stop Shop</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
