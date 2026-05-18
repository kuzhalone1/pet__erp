import React from 'react';
import { INDIAN_STATES } from '../constants/states';

export default function AddressBlock({ form, set, cities }) {
  const handleStateChange = (e) => {
    const selectedState = INDIAN_STATES.find(s => s.name === e.target.value);
    set('state_name')({ target: { value: e.target.value } });
    if (selectedState) {
      set('state_code')({ target: { value: selectedState.code } });
    }
  };

  return (
    <div className="space-y-4">
      <div className="pt-2 mt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Address Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Address Line 1 (Building/Street) *</label>
            <input className="input-field" value={form.address1 || ''} onChange={set('address1')} placeholder="H.No, Street Name" />
          </div>
          <div>
            <label className="label">Address Line 2 (Area/Locality)</label>
            <input className="input-field" value={form.address2 || ''} onChange={set('address2')} placeholder="Colony/Sector" />
          </div>
          <div>
            <label className="label">Address Line 3 (Landmark)</label>
            <input className="input-field" value={form.address3 || ''} onChange={set('address3')} placeholder="Near..." />
          </div>
          <div>
            <label className="label">City</label>
            <input list="city-list-addr" className="input-field" value={form.city_name || ''} onChange={set('city_name')} placeholder="Type or select city" />
            <datalist id="city-list-addr">{cities.map(c => <option key={c.city_id} value={c.city_name} />)}</datalist>
          </div>
          <div>
            <label className="label">District</label>
            <input className="input-field" value={form.district || ''} onChange={set('district')} placeholder="District" />
          </div>
          <div>
            <label className="label">State</label>
            <select className="input-field" value={form.state_name || ''} onChange={handleStateChange}>
              <option value="">Select State</option>
              {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">State Code</label>
              <input className="input-field bg-slate-50" value={form.state_code || ''} readOnly placeholder="Auto" />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input className="input-field" value={form.pincode || ''} onChange={set('pincode')} placeholder="500001" maxLength={6} />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 mt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tax & Compliance</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">GSTIN</label>
            <input className="input-field" value={form.gstin || ''} onChange={set('gstin')} placeholder="2digitState+PAN+..." maxLength={15} />
          </div>
          <div>
            <label className="label">PAN</label>
            <input className="input-field" value={form.pan || ''} onChange={set('pan')} placeholder="ABCDE1234F" maxLength={10} />
          </div>
        </div>
      </div>
    </div>
  );
}
