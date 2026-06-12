import React, { useEffect, useMemo, useState } from 'react';
import adminService from '../../services/adminService';

const getCustomerName = (c) => c.companyName || `${c.lastName || ''} ${c.firstName || ''}`.trim();

const CustomerPickerDrawer = ({ open, onClose, excludedIds, onPick }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    adminService.getCustomers().then(res => {
      setCustomers(Array.isArray(res) ? res : []);
    }).catch(err => {
      console.error('Load customers failed', err);
      setCustomers([]);
    }).finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const excluded = new Set((excludedIds || []).map(String));
    return customers.filter(c => {
      if (excluded.has(String(c.customerID))) return false;
      const name = getCustomerName(c).toLowerCase();
      return name.includes(search.toLowerCase()) || (c.phoneNumber || '').includes(search);
    });
  }, [customers, excludedIds, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end font-inter">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>

      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Gán khách hàng áp dụng</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Khách hàng được chọn sẽ dùng bảng giá này</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng bảng chọn khách hàng"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-950 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm khách hàng theo tên, SĐT…"
              className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-slate-700 shadow-sm"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true">search</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-none">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#00288E] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-2">
              <span className="material-symbols-outlined text-4xl">groups</span>
              <p className="text-xs font-bold">Không còn khách hàng phù hợp để thêm</p>
            </div>
          ) : (
            filtered.map(cust => (
              <div
                key={cust.customerID}
                className="p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-200 bg-white shadow-sm flex items-center gap-4 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-sm font-black text-[#00288E] shrink-0">
                  {getCustomerName(cust).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-tight truncate" title={getCustomerName(cust)}>{getCustomerName(cust)}</h4>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    SĐT: {cust.phoneNumber || 'N/A'} • ID: KH-{String(cust.customerID).padStart(5, '0')}
                  </p>
                  {cust.priceListId && (
                    <p className="text-[9px] font-bold text-amber-600 mt-1">Đang dùng bảng giá khác (BG-{String(cust.priceListId).padStart(3, '0')})</p>
                  )}
                </div>
                <button
                  onClick={() => onPick(cust)}
                  aria-label={`Gán bảng giá cho khách hàng ${getCustomerName(cust)}`}
                  className="bg-[#00288E] hover:bg-[#001D6E] text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-md shadow-blue-900/10 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPickerDrawer;
