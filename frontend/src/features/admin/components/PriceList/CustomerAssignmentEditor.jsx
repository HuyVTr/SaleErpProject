import React, { useState } from 'react';
import CustomerPickerDrawer from './CustomerPickerDrawer';

const getCustomerName = (c) => c.companyName || `${c.lastName || ''} ${c.firstName || ''}`.trim();

const CustomerAssignmentEditor = ({ customers, onChange }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePick = (cust) => {
    onChange([...customers, cust]);
  };

  const handleRemove = (customerID) => {
    onChange(customers.filter(c => c.customerID !== customerID));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Đối tượng áp dụng</h3>
          <p className="text-xs text-slate-400 mt-0.5">Khách hàng được gán sẽ tự động dùng bảng giá này khi Sales tạo báo giá/đơn hàng</p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#00288E] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#00288E]/90 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none shadow-sm whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">person_add</span>
          Gán khách hàng
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-200 rounded-2xl">
          <span className="material-symbols-outlined text-4xl" aria-hidden="true">groups</span>
          <p className="text-xs font-bold uppercase tracking-wider">Chưa gán bảng giá này cho khách hàng nào</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Liên hệ</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map(cust => (
                <tr key={cust.customerID}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-sm text-slate-800">{getCustomerName(cust)}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">ID: KH-{String(cust.customerID).padStart(5, '0')}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-500 tabular-nums">
                    {cust.phoneNumber || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(cust.customerID)}
                      title="Bỏ gán khách hàng"
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

      <CustomerPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludedIds={customers.map(c => c.customerID)}
        onPick={handlePick}
      />
    </div>
  );
};

export default CustomerAssignmentEditor;
