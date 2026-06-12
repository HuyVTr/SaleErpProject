import React, { useState } from 'react';
import ProductPickerDrawer from './ProductPickerDrawer';

const formatCurrency = (val) => `${new Intl.NumberFormat('vi-VN').format(val || 0)} đ`;

const PriceListItemsEditor = ({ items, onChange }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePick = (prod) => {
    const id = prod.productID || prod.id;
    onChange([
      ...items,
      {
        productID: id,
        productName: prod.productName || prod.name,
        unit: prod.unit || 'cái',
        basePrice: prod.salePrice || 0,
        price: prod.salePrice || 0
      }
    ]);
  };

  const handlePriceChange = (productID, value) => {
    const price = Math.max(0, Number(value) || 0);
    onChange(items.map(item => item.productID === productID ? { ...item, price } : item));
  };

  const handleRemove = (productID) => {
    onChange(items.filter(item => item.productID !== productID));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Sản phẩm áp dụng</h3>
          <p className="text-xs text-slate-400 mt-0.5">Thiết lập giá bán cho từng sản phẩm trong bảng giá này</p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#00288E] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#00288E]/90 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none shadow-sm whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
          Thêm sản phẩm
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-200 rounded-2xl">
          <span className="material-symbols-outlined text-4xl" aria-hidden="true">production_quantity_limits</span>
          <p className="text-xs font-bold uppercase tracking-wider">Chưa có sản phẩm nào trong bảng giá</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sản phẩm</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá gốc</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá áp dụng</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr key={item.productID}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-sm text-slate-800">{item.productName}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">ĐVT: {item.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-500 tabular-nums">
                    {formatCurrency(item.basePrice)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) => handlePriceChange(item.productID, e.target.value)}
                      className="w-32 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-sm font-bold text-right text-slate-900 outline-none transition-[border-color,box-shadow] focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-[#00288E]/25 focus-visible:ring-offset-1 tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.productID)}
                      title="Xóa khỏi bảng giá"
                      className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-[background-color,color,border-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 outline-none active:scale-95 border border-red-100 hover:border-red-500 mx-auto"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludedIds={items.map(i => i.productID)}
        onPick={handlePick}
      />
    </div>
  );
};

export default PriceListItemsEditor;
