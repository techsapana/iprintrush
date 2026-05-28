import pathlib

p = pathlib.Path(__file__).resolve().parent.parent / "app" / "checkout" / "checkout-client.js"
s = p.read_text(encoding="utf-8")

b = "mo" + "tion" + "less"
o = "<" + b + " />"
c = "</" + b + ">"

old = "\n".join(
    [
        "                " + o,
        "                " + o,
        "                " + o,
        "                " + o,
        "              " + c,
        "            " + c,
    ]
)

new = """
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
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
              </div>
            </div>""".strip()

if old not in s:
    raise SystemExit("old block not found")

p.write_text(s.replace(old, new, 1), encoding="utf-8")
print("billing fixed")
