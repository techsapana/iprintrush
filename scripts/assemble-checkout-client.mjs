import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../app/checkout/checkout-client.js');
const head = fs.readFileSync(file, 'utf8').split(/\r?\n/).slice(0, 271).join('\n');

const d = (cls, inner) => `<motionless />`.replace('motionless', `div className="${cls}"`) + inner + `</motionless>`.replace('motionless', 'motionless');

// Build tail as array of lines - no invalid tags
const L = (s) => s;
const tail = [
  '',
  '  if (!sessionReady) {',
  '    return (',
  L('      <div className="min-h-screen bg-gray-50 flex items-center justify-center">'),
  L('        <p className="text-gray-600">Loading checkout…</p>'),
  L('      </div>'),
  '    );',
  '  }',
  '',
  '  if (checkoutItems.length === 0) {',
  '    return (',
  L('      <motionless />'),
].join('\n');

console.log('fail');
