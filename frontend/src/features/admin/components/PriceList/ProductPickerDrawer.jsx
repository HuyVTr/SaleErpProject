import React, { useEffect, useMemo, useState } from 'react';
import adminService from '../../services/adminService';
import { VNDDisplay } from '../../../../utils/formatVND';

const ProductPickerDrawer = ({ open, onClose, excludedIds, onPick }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    adminService.getProducts().then(res => {
      setProducts(Array.isArray(res) ? res : []);
    }).catch(err => {
      console.error('Load products failed', err);
      setProducts([]);
    }).finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const excluded = new Set((excludedIds || []).map(String));
    return products.filter(p => {
      const id = p.productID || p.id;
      if (excluded.has(String(id))) return false;
      const name = p.productName || p.name || '';
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [products, excludedIds, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end font-inter">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>

      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thêm sản phẩm vào bảng giá</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Chọn sản phẩm để thiết lập giá áp dụng</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng bảng chọn sản phẩm"
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
              placeholder="Tìm kiếm sản phẩm theo tên…"
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
              <span className="material-symbols-outlined text-4xl">inventory_2</span>
              <p className="text-xs font-bold">Không còn sản phẩm phù hợp để thêm</p>
            </div>
          ) : (
            filtered.map(prod => {
              const id = prod.productID || prod.id;
              return (
                <div
                  key={id}
                  className="p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-200 bg-white shadow-sm flex items-center gap-4 transition-all"
                >
                  <div className="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center text-[#00288E] border border-blue-100/50 shadow-inner shrink-0">
                    <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-xs text-slate-900 uppercase tracking-tight truncate" title={prod.productName}>{prod.productName}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ĐVT: {prod.unit || 'cái'}</p>
                    <div className="mt-1">
                      <VNDDisplay value={prod.salePrice} customColorClass="text-blue-600" textSizeClass="text-xs" />
                    </div>
                  </div>
                  <button
                    onClick={() => onPick(prod)}
                    aria-label={`Thêm sản phẩm ${prod.productName} vào bảng giá`}
                    className="bg-[#00288E] hover:bg-[#001D6E] text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-md shadow-blue-900/10 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPickerDrawer;
