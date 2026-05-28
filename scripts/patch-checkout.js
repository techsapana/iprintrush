const fs = require('fs');
const p = require('path').join(__dirname, '../app/checkout/page.js');
let s = fs.readFileSync(p, 'utf8');

s = s.replace(/  if \(false\) \{[\s\S]*?\n  \}\n\n  const handleInputChange/, '  const handleInputChange');

const guard = `  if (!sessionReady) {
    return (
      <motion.div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading checkout…</p>
      </motion.div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <motion.div className="min-h-screen bg-gray-50">
        <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Checkout</h1>
            <p className="text-gray-600 text-lg mb-8">
              {isBuyNow
                ? 'No items to check out. Please configure your product and try again.'
                : 'Your cart is empty'}
            </p>
            <Link href="/products">
              <Button className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold">
                Continue Shopping
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

`;

// Fix motion -> div in guard
const guardFixed = guard.replace(/motion\.div/g, 'motion.div').replace(/<motion\.div/g, '<div').replace(/<\/motion\.motion.div>/g, '</div>');
// Actually simpler rewrite guard with div only
const guardDiv = `  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading checkout…</p>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Checkout</h1>
            <p className="text-gray-600 text-lg mb-8">
              {isBuyNow
                ? 'No items to check out. Please configure your product and try again.'
                : 'Your cart is empty'}
            </p>
            <Link href="/products">
              <Button className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

`;

s = s.replace(
  '  const finalTotal = taxableBase + shippingAmount + taxAmount;\n\n  return (\n    <div className="min-h-screen bg-gray-50">\n      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">\n        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>',
  `  const finalTotal = taxableBase + shippingAmount + taxAmount;\n\n${guardDiv}  return (\n    <div className="min-h-screen bg-gray-50">\n      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">\n        <h1 className="text-3xl font-bold text-gray-900 mb-8">\n          {isBuyNow ? 'Checkout — your order' : 'Checkout'}\n        </h1>`,
);

fs.writeFileSync(p, s);
console.log('patched', p, 'has false:', s.includes('if (false)'));
