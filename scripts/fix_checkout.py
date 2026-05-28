# -*- coding: utf-8 -*-
import pathlib

p = pathlib.Path(__file__).resolve().parent.parent / "app" / "checkout" / "checkout-client.js"
s = p.read_text(encoding="utf-8")

bad = "mo" + "tion" + "less"
open_tag = "<" + bad + " />"
close_tag = "</" + bad + ">"

replacements = [
    (
        "  if (!sessionReady) {\n    return (\n      " + open_tag + "\n    );",
        """  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading checkout…</p>
      </div>
    );""",
    ),
    (
        "          </Link>\n        " + close_tag + "\n    );",
        "          </Link>\n        </motionless>\n      </motionless>\n    );".replace(
            "</" + bad + ">", "</div>"
        ),
    ),
    (
        '              <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Method</h2>\n              '
        + open_tag,
        """              <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="deliveryMethod" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={handleInputChange} />
                  <span>Store pickup</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="deliveryMethod" value="shipping" checked={formData.deliveryMethod === 'shipping'} onChange={handleInputChange} />
                  <span>Ship to address</span>
                </label>
              </div>""",
    ),
    (
        "                </div>\n                " + open_tag + "\n              " + close_tag + "\n            " + close_tag,
        """                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
                  <input name="address" value={formData.address} onChange={handleInputChange} required className={inputClass} />
                </div>
                <motionless />
                <motionless />
                <motionless />
              </motionless>
            </motionless>""".replace("</" + bad + ">", "</motionless>").replace(
            "<" + bad + " />", ""
        ),
    ),
]

# Simpler approach: replace open/close globally with markers then fix markers
s = s.replace(open_tag, "<<<OPEN>>>")
s = s.replace(close_tag, "<<<CLOSE>>>")

# Fix known sequences
s = s.replace(
    "  if (!sessionReady) {\n    return (\n      <<<OPEN>>>\n    );",
    """  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading checkout…</p>
      </div>
    );""",
)

s = s.replace(
    "          </Link>\n        <<<CLOSE>>>\n    );",
    "          </Link>\n        </div>\n      </motionless>\n    );".replace(
        "</" + bad + ">", "</div>"
    ),
)

s = s.replace(
    '              <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Method</h2>\n              <<<OPEN>>>',
    """              <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="deliveryMethod" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={handleInputChange} />
                  <span>Store pickup</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="deliveryMethod" value="shipping" checked={formData.deliveryMethod === 'shipping'} onChange={handleInputChange} />
                  <span>Ship to address</span>
                </label>
              </div>""",
)

s = s.replace(
    "                </div>\n                <<<OPEN>>>\n              <<<CLOSE>>>\n            <<<CLOSE>>>",
    """                </motionless>
                <motionless />
                <motionless />
                <motionless />
              </motionless>
            </motionless>""",
)

# billing fields fix - manual block
billing = """                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
                  <input name="address" value={formData.address} onChange={handleInputChange} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input name="city" value={formData.city} onChange={handleInputChange} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input name="state" value={formData.state} onChange={handleInputChange} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input name="zip" value={formData.zip} onChange={handleInputChange} required className={inputClass} maxLength={5} />
                </div>
              </div>
            </div>"""

if "                <<<OPEN>>>" in s and "Contact &amp; Billing" in s:
    s = s.replace(
        "                </div>\n                <<<OPEN>>>\n              <<<CLOSE>>>\n            <<<CLOSE>>>",
        billing,
        1,
    )

shipping = """                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input name="shippingAddress" value={formData.shippingAddress} onChange={handleInputChange} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apt (optional)</label>
                    <input name="shippingApt" value={formData.shippingApt} onChange={handleInputChange} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input name="shippingCity" value={formData.shippingCity} onChange={handleInputChange} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input name="shippingState" value={formData.shippingState} onChange={handleInputChange} required className={inputClass} />
                  </motionless>
                  <motionless />
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                    <input name="shippingZip" value={formData.shippingZip} onChange={handleInputChange} required className={inputClass} maxLength={5} />
                  </motionless>
                </motionless>""".replace(
    "</" + bad + ">", "</div>"
).replace("<" + bad + " />", "<div>")

if '                <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Address</h2>\n                <<<OPEN>>>' in s:
    s = s.replace(
        '                <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Address</h2>\n                <<<OPEN>>>',
        '                <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Address</h2>\n' + shipping,
        1,
    )

s = s.replace(
    "            {payError && (\n              <<<OPEN>>>\n            )}",
    '            {payError && (\n              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{payError}</div>\n            )}',
)

s = s.replace(
    "                {discount > 0 && (\n                  <<<OPEN>>>\n                )}",
    '                {discount > 0 && (\n                  <div className="flex justify-between text-sm text-emerald-700">\n                    <span>Discount ({appliedCoupon}):</span>\n                    <span>- ${(discount || 0).toFixed(2)}</span>\n                  </div>\n                )}',
)

# Any leftover markers
if "<<<OPEN>>>" in s or "<<<CLOSE>>>" in s:
    raise SystemExit("Unresolved markers remain: " + s[s.find("<<<"): s.find("<<<") + 80])

p.write_text(s, encoding="utf-8")
print("fixed", p)
