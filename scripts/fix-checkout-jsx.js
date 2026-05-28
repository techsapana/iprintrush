const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../app/checkout/checkout-client.js');
const lines = fs.readFileSync(file, 'utf8').split('\n');
const head = lines.slice(0, 271).join('\n');

const tail = `
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading checkout…</p>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <motionless />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <motionless />
    </div>
  );
}
`;

fs.writeFileSync(file, head + tail, 'utf8');
