'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';
import PoolsSection from './PoolsSection.js';

function QuoteConfigAdminPageInner() {
   const router = useRouter();
   const searchParams = useSearchParams();
   const { adminUser, adminLoading } = useAdmin();
   const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'decorations');
   const [loading, setLoading] = useState(true);
   const [config, setConfig] = useState(null);
   const [error, setError] = useState('');
   const [editing, setEditing] = useState(null);
   const [formData, setFormData] = useState({});

   useEffect(() => {
     if (!adminLoading && !adminUser) {
       router.push('/admin/login');
       return;
     }
     if (adminLoading) return;
     loadConfig();
   }, [adminUser, adminLoading, router]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab) setActiveTab(requestedTab);
  }, [searchParams]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quote-config/global');
      if (!res.ok) throw new Error('Failed to load quote configuration');
      const json = await res.json();
      setConfig(json.config);
    } catch (err) {
      setError(err.message || 'Failed to load quote configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config?.shipping) {
      setFormData({
        enabled: config.shipping.enabled ?? true,
        defaultFlatRate: config.shipping.defaultFlatRate ?? 0,
        under100Rate: config.shipping.under100Rate ?? 0,
        between100And199Rate: config.shipping.between100And199Rate ?? 0,
        over200Rate: config.shipping.over200Rate ?? 0,
        localUnder100Rate: config.shipping.localUnder100Rate ?? 0,
        localBetween100And199Rate: config.shipping.localBetween100And199Rate ?? 0,
        localOver200Rate: config.shipping.localOver200Rate ?? 0,
      });
    }
  }, [config?.shipping]);

  const handleSave = async (type, data) => {
    try {
      setError('');
      const isNew = editing === 'new';
      const endpoint = isNew
        ? `/api/quote-config/${type}`
        : `/api/quote-config/${type}/${editing}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      setEditing(null);
      setFormData({});
      await loadConfig();
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      setError('');
      const res = await fetch(`/api/quote-config/${type}/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }

      await loadConfig();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const startEdit = (type, item) => {
    if (type === 'new') {
      setEditing('new');
      setFormData(item);
    } else {
      setEditing(item.id);
      setFormData(item);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormData({});
  };

  const tabs = [
    { id: 'decorations', label: 'Print Types / Decorations', key: 'decorations', description: 'DTF Printed, Screen Printed, Embroidery, etc.' },
    { id: 'colors', label: 'Colors', key: 'colors', description: 'Product colors with hex codes' },
    { id: 'sizes', label: 'Sizes', key: 'sizes', description: 'All size options (S, M, L, XL, Custom sizes, etc.)' },
    { id: 'locations', label: 'Print Locations', key: 'printLocations', description: 'Front, Back, Sleeve, etc.' },
    { id: 'turnarounds', label: 'Turnarounds', key: 'turnarounds', description: 'Rush, Standard, Express delivery times' },
    { id: 'designer', label: 'Designer Help', key: 'designerHelp', description: 'Design assistance options' },
    { id: 'shipping', label: 'Shipping', key: 'shipping', description: 'Shipping rates and configuration' },
    { id: 'pools', label: 'Dynamic Pools', key: 'pools', description: 'Manage all customization pools and options dynamically' },
  ];

  if (adminLoading || !adminUser) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Checking authentication…</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quote Configuration</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage all quote customization options and pricing
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Click "Add New" in any tab to create custom options. All changes are saved immediately and available for use in product quotes.
            </p>
          </div>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-[#29b6f6] text-[#29b6f6]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  title={tab.description}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-gray-600">
            Loading configuration…
          </div>
        ) : (
          <div>
            {/* Decorations Tab */}
            {activeTab === 'decorations' && (
              <DecorationsSection
                items={config?.decorations || []}
                editing={editing}
                formData={formData}
                onEdit={startEdit}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={cancelEdit}
                setFormData={setFormData}
              />
            )}

            {/* Colors Tab */}
            {activeTab === 'colors' && (
              <ColorsSection
                items={config?.colors || []}
                editing={editing}
                formData={formData}
                onEdit={startEdit}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={cancelEdit}
                setFormData={setFormData}
              />
            )}

            {/* Sizes Tab */}
            {activeTab === 'sizes' && (
              <SizesSection
                items={config?.sizes || []}
                editing={editing}
                formData={formData}
                onEdit={startEdit}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={cancelEdit}
                setFormData={setFormData}
              />
            )}

            {/* Print Locations Tab */}
            {activeTab === 'locations' && (
              <PrintLocationsSection
                items={config?.printLocations || []}
                editing={editing}
                formData={formData}
                onEdit={startEdit}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={cancelEdit}
                setFormData={setFormData}
              />
            )}

            {/* Turnarounds Tab */}
            {activeTab === 'turnarounds' && (
              <TurnaroundsSection
                items={config?.turnarounds || []}
                editing={editing}
                formData={formData}
                onEdit={startEdit}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={cancelEdit}
                setFormData={setFormData}
              />
            )}

            {/* Designer Help Tab */}
            {activeTab === 'designer' && (
              <DesignerHelpSection
                items={config?.designerHelp || []}
                editing={editing}
                formData={formData}
                onEdit={startEdit}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={cancelEdit}
                setFormData={setFormData}
              />
            )}

{/* Shipping Tab */}
             {activeTab === 'shipping' && (
               <ShippingSection
                 shipping={config?.shipping}
                 onSave={handleSave}
                 setError={setError}
                 loadConfig={loadConfig}
               />
             )}

            {/* Dynamic Pools Tab */}
            {activeTab === 'pools' && (
              <PoolsSection
                editing={editing}
                formData={formData}
                onEdit={startEdit}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={cancelEdit}
                setFormData={setFormData}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuoteConfigAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading…</p>
        </div>
      }
    >
      <QuoteConfigAdminPageInner />
    </Suspense>
  );
}

// Section Components
function DecorationsSection({ items, editing, formData, onEdit, onSave, onDelete, onCancel, setFormData }) {
  return (
    <CRUDSection
      title="Print Types / Decoration Options"
      description="Manage print types and decoration methods (e.g., DTF Printed, Screen Printed, Embroidery, Vinyl, etc.). These appear in the quote builder when customers customize products."
      items={items}
      editing={editing}
      formData={formData}
      onEdit={onEdit}
      onSave={(data) => onSave('decorations', data)}
      onDelete={(id) => onDelete('decorations', id)}
      onCancel={onCancel}
      setFormData={setFormData}
      fields={[
        { key: 'name', label: 'Print Type Name', type: 'text', required: true, placeholder: 'e.g., DTF Printed, Screen Printed, Embroidery' },
        { key: 'priceModifier', label: 'Price Add-on per Piece ($)', type: 'number', step: '0.01', placeholder: '0.00' },
        { key: 'enabled', label: 'Enabled', type: 'checkbox' },
        { key: 'displayOrder', label: 'Display Order', type: 'number', placeholder: '0' },
      ]}
      columns={['Name', 'Price Modifier', 'Enabled', 'Actions']}
      renderRow={(item) => (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
          <td className="px-6 py-4 text-gray-600">${item.priceModifier.toFixed(2)}</td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 rounded text-xs ${item.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {item.enabled ? 'Yes' : 'No'}
            </span>
          </td>
        </>
      )}
    />
  );
}

function ColorsSection({ items, editing, formData, onEdit, onSave, onDelete, onCancel, setFormData }) {
  return (
    <CRUDSection
      title="Color Options"
      items={items}
      editing={editing}
      formData={formData}
      onEdit={onEdit}
      onSave={(data) => onSave('colors', data)}
      onDelete={(id) => onDelete('colors', id)}
      onCancel={onCancel}
      setFormData={setFormData}
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'hex', label: 'Hex Color', type: 'color' },
        { key: 'enabled', label: 'Enabled', type: 'checkbox' },
        { key: 'displayOrder', label: 'Display Order', type: 'number' },
      ]}
      columns={['Name', 'Color', 'Enabled', 'Actions']}
      renderRow={(item) => (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded border border-gray-300"
                style={{ backgroundColor: item.hex }}
              />
              <span className="text-gray-600">{item.hex}</span>
            </div>
          </td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 rounded text-xs ${item.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {item.enabled ? 'Yes' : 'No'}
            </span>
          </td>
        </>
      )}
    />
  );
}

function SizesSection({ items, editing, formData, onEdit, onSave, onDelete, onCancel, setFormData }) {
  return (
    <CRUDSection
      title="Size Options"
      description="Manage all available sizes for products. Add custom sizes like '24x36', 'Custom', 'A4', '11x17', or any size you need. These sizes will be available in the quote builder for all products that use sizes."
      items={items}
      editing={editing}
      formData={formData}
      onEdit={onEdit}
      onSave={(data) => onSave('sizes', data)}
      onDelete={(id) => onDelete('sizes', id)}
      onCancel={onCancel}
      setFormData={setFormData}
      fields={[
        { key: 'label', label: 'Size Label', type: 'text', required: true, placeholder: 'e.g., S, M, L, XL, 24x36, Custom' },
        { key: 'priceAddon', label: 'Price Add-on per Piece ($)', type: 'number', step: '0.01', placeholder: '0.00' },
        { key: 'baseEnabled', label: 'Enabled by Default', type: 'checkbox' },
        { key: 'displayOrder', label: 'Display Order', type: 'number', placeholder: '0' },
      ]}
      columns={['Label', 'Price Addon', 'Enabled', 'Actions']}
      renderRow={(item) => (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">{item.label}</td>
          <td className="px-6 py-4 text-gray-600">${item.priceAddon.toFixed(2)}</td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 rounded text-xs ${item.baseEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {item.baseEnabled ? 'Yes' : 'No'}
            </span>
          </td>
        </>
      )}
    />
  );
}

function TiersSection({ items, editing, formData, onEdit, onSave, onDelete, onCancel, setFormData }) {
   const pricingType = formData?.discountType || 'NONE';
   const unitPrice = formData?.unitPrice;
   const discountValue = Number(formData?.discountValue || 0);
   
   // Validation checks
   const hasUnitPrice = unitPrice != null && Number(unitPrice) > 0;
   const showHighDiscountWarning = pricingType === 'PERCENT' && discountValue > 50;
   const disableSave = !hasUnitPrice && pricingType !== 'NONE';
   const discountValueError = discountValue < 0 || (!Number.isFinite(discountValue) && formData?.discountValue !== undefined);
   
   const handleSave = (data) => {
     if (disableSave) {
       alert('Cannot save: Discount requires a valid unit price');
       return;
     }
     onSave('tiers', data);
   };
   
    return (
      <div>
        {showHighDiscountWarning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ High discount detected ({discountValue}%). Confirm this follows business rules.
            </p>
          </div>
        )}
        <CRUDSection
          title="Quantity Pricing Tiers"
          items={items}
          editing={editing}
          formData={formData}
          onEdit={onEdit}
          onSave={handleSave}
          onDelete={(id) => onDelete('tiers', id)}
          onCancel={onCancel}
          setFormData={setFormData}
          fields={[
            { key: 'minQty', label: 'Min Quantity', type: 'number', required: true },
            { key: 'maxQty', label: 'Max Quantity (leave empty for no limit)', type: 'number', optionalNumber: true },
            { key: 'unitPrice', label: 'Unit Price ($)', type: 'number', step: '0.01', required: true },
            { key: 'discountType', label: 'Discount Type', type: 'select', options: ['NONE', 'PERCENT', 'FIXED'] },
            { key: 'discountValue', label: 'Discount Value', type: 'number', step: '0.01', show: pricingType !== 'NONE', error: discountValueError, errorMessage: 'Must be 0-100 for percent, any positive value for fixed' },
            { key: 'enabled', label: 'Enabled', type: 'checkbox' },
            { key: 'displayOrder', label: 'Display Order', type: 'number' },
          ]}
          columns={['Min Qty', 'Max Qty', 'Unit Price', 'Discount', 'Enabled', 'Actions']}
          renderRow={(item) => (
            <>
              <td className="px-6 py-4 font-medium text-gray-900">{item.minQty}</td>
              <td className="px-6 py-4 text-gray-600">{item.maxQty || '∞'}</td>
              <td className="px-6 py-4 text-gray-600">${item.unitPrice.toFixed(2)}</td>
              <td className="px-6 py-4 text-gray-600">
                {item.discountType && item.discountType !== 'NONE' 
                  ? `${item.discountType === 'PERCENT' ? item.discountValue + '%' : '$' + item.discountValue} off`
                  : '—'}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-xs ${item.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {item.enabled ? 'Yes' : 'No'}
                </span>
              </td>
            </>
          )}
        />
      </div>
    );
  }

function PrintLocationsSection({ items, editing, formData, onEdit, onSave, onDelete, onCancel, setFormData }) {
  return (
    <CRUDSection
      title="Print Location Options"
      items={items}
      editing={editing}
      formData={formData}
      onEdit={onEdit}
      onSave={(data) => onSave('locations', data)}
      onDelete={(id) => onDelete('locations', id)}
      onCancel={onCancel}
      setFormData={setFormData}
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'priceModifier', label: 'Price Modifier ($)', type: 'number', step: '0.01' },
        { key: 'enabled', label: 'Enabled', type: 'checkbox' },
        { key: 'displayOrder', label: 'Display Order', type: 'number' },
      ]}
      columns={['Name', 'Price Modifier', 'Enabled', 'Actions']}
      renderRow={(item) => (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
          <td className="px-6 py-4 text-gray-600">${item.priceModifier.toFixed(2)}</td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 rounded text-xs ${item.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {item.enabled ? 'Yes' : 'No'}
            </span>
          </td>
        </>
      )}
    />
  );
}

function TurnaroundsSection({ items, editing, formData, onEdit, onSave, onDelete, onCancel, setFormData }) {
  const pricingType = formData?.pricingType || 'flat';
  
  return (
    <CRUDSection
      title="Turnaround Options"
      items={items}
      editing={editing}
      formData={formData}
      onEdit={onEdit}
      onSave={(data) => onSave('turnarounds', data)}
      onDelete={(id) => onDelete('turnarounds', id)}
      onCancel={onCancel}
      setFormData={setFormData}
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'pricingType', label: 'Pricing Type', type: 'select', options: ['flat', 'percentage'] },
        { key: 'priceModifier', label: 'Price Modifier ($)', type: 'number', step: '0.01', show: pricingType === 'flat' },
        { key: 'percentageValue', label: 'Percentage Value (%)', type: 'number', step: '0.01', show: pricingType === 'percentage' },
        { key: 'enabled', label: 'Enabled', type: 'checkbox' },
        { key: 'displayOrder', label: 'Display Order', type: 'number' },
      ]}
      columns={['Name', 'Pricing Type', 'Price/Percentage', 'Enabled', 'Actions']}
      renderRow={(item) => (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
          <td className="px-6 py-4 text-gray-600">{item.pricingType === 'percentage' ? 'Percentage' : 'Flat'}</td>
          <td className="px-6 py-4 text-gray-600">
            {item.pricingType === 'percentage'
              ? `${item.percentageValue ?? 0}%`
              : `$${item.priceModifier.toFixed(2)}`}
          </td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 rounded text-xs ${item.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {item.enabled ? 'Yes' : 'No'}
            </span>
          </td>
        </>
      )}
    />
  );
}

function DesignerHelpSection({ items, editing, formData, onEdit, onSave, onDelete, onCancel, setFormData }) {
  return (
    <CRUDSection
      title="Designer Help Options"
      items={items}
      editing={editing}
      formData={formData}
      onEdit={onEdit}
      onSave={(data) => onSave('designer', data)}
      onDelete={(id) => onDelete('designer', id)}
      onCancel={onCancel}
      setFormData={setFormData}
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'priceModifier', label: 'Price Modifier ($)', type: 'number', step: '0.01' },
        { key: 'enabled', label: 'Enabled', type: 'checkbox' },
        { key: 'displayOrder', label: 'Display Order', type: 'number' },
      ]}
      columns={['Name', 'Price Modifier', 'Enabled', 'Actions']}
      renderRow={(item) => (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
          <td className="px-6 py-4 text-gray-600">${item.priceModifier.toFixed(2)}</td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 rounded text-xs ${item.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {item.enabled ? 'Yes' : 'No'}
            </span>
          </td>
        </>
      )}
    />
  );
}

function ShippingSection({ shipping, onSave, setError, loadConfig }) {
  const [formData, setFormData] = useState({
    enabled: shipping?.enabled ?? true,
    defaultFlatRate: shipping?.defaultFlatRate ?? 0,
    under100Rate: shipping?.under100Rate ?? 0,
    between100And199Rate: shipping?.between100And199Rate ?? 0,
    over200Rate: shipping?.over200Rate ?? 0,
    localUnder100Rate: shipping?.localUnder100Rate ?? 0,
    localBetween100And199Rate: shipping?.localBetween100And199Rate ?? 0,
    localOver200Rate: shipping?.localOver200Rate ?? 0,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const res = await fetch('/api/quote-config/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipping: formData }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      await loadConfig();
    } catch (err) {
      setError(err.message || 'Failed to save shipping configuration');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Shipping Configuration</h2>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="rounded"
            />
            <span className="font-medium text-gray-700">Enable Shipping</span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Flat Rate ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.defaultFlatRate}
            onChange={(e) =>
              setFormData({ ...formData, defaultFlatRate: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Under $100 Standard Shipping Rate ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.under100Rate}
            onChange={(e) =>
              setFormData({ ...formData, under100Rate: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            $100-$199 Standard Shipping Rate ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.between100And199Rate}
            onChange={(e) =>
              setFormData({ ...formData, between100And199Rate: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            $200+ Standard Shipping Rate ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.over200Rate}
            onChange={(e) =>
              setFormData({ ...formData, over200Rate: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Local Delivery Under $100
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.localUnder100Rate}
            onChange={(e) =>
              setFormData({ ...formData, localUnder100Rate: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Local Delivery $100-$199
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.localBetween100And199Rate}
            onChange={(e) =>
              setFormData({ ...formData, localBetween100And199Rate: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Local Delivery $200+
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.localOver200Rate}
            onChange={(e) =>
              setFormData({ ...formData, localOver200Rate: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          type="submit"
          className="bg-[#29b6f6] text-white px-6 py-2 rounded-lg hover:bg-[#1e8fc4] transition"
        >
          Save Shipping Configuration
        </button>
      </form>
    </div>
  );
}

// Reusable CRUD Section Component
function CRUDSection({
  title,
  description,
  items,
  editing,
  formData,
  onEdit,
  onSave,
  onDelete,
  onCancel,
  setFormData,
  fields,
  columns,
  renderRow,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
          {!editing && (
            <button
              onClick={() => {
                setFormData({});
                onEdit('new', {});
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
            >
              + Add New
            </button>
          )}
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSubmit} className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              if (field.show === false) return null;
              return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={formData[field.key] ?? false}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.key]: e.target.checked })
                    }
                    className="rounded"
                  />
                ) : field.type === 'color' ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData[field.key] || '#000000'}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.value })
                      }
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData[field.key] || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.value })
                      }
                      placeholder="#000000"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono"
                    />
                    {formData[field.key] && (
                      <div
                        className="w-10 h-10 rounded border border-gray-300"
                        style={{ backgroundColor: formData[field.key] }}
                      />
                    )}
                  </div>
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] ?? field.options?.[0] ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.key]: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    step={field.step}
                    value={formData[field.key] ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [field.key]: (() => {
                          if (field.type !== 'number') return e.target.value;
                          if (e.target.value === '') return field.optionalNumber ? null : 0;
                          const parsed = parseFloat(e.target.value);
                          return Number.isFinite(parsed) ? parsed : (field.optionalNumber ? null : 0);
                        })(),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required={field.required}
                  />
                )}
              </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="bg-[#29b6f6] text-white px-6 py-2 rounded-lg hover:bg-[#1e8fc4] transition"
            >
              {editing === 'new' ? 'Create' : 'Update'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-300 text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  No items found. Click "Add New" to create one.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {renderRow(item)}
                  <td className="px-6 py-4 text-sm space-x-3">
                    <button
                      onClick={() => onEdit('edit', item)}
                      className="text-[#29b6f6] hover:text-[#1a7ba3] font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}