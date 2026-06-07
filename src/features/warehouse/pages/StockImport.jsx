import React, { useState, useEffect } from 'react';
import warehouseService, { formatCurrency, formatDate } from '../services/warehouseService';

const StockImport = () => {
  const [products, setProducts] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    supplier: '',
    items: [{ productId: '', productName: '', quantity: 0, unitPrice: 0 }],
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prods, history] = await Promise.all([
          warehouseService.getInventory(),
          warehouseService.getImportHistory(),
        ]);
        setProducts(prods);
        setImportHistory(history);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', productName: '', quantity: 0, unitPrice: 0 }],
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Auto-fill price when product selected
      if (field === 'productId') {
        const product = products.find(p => String(p.id) === String(value));
        if (product) {
          newItems[index].productName = product.name;
          newItems[index].unitPrice = product.unitPrice;
        }
      }
      return { ...prev, items: newItems };
    });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier.trim()) return;
    if (formData.items.some(item => !item.productId || item.quantity <= 0)) return;

    setSubmitting(true);
    try {
      const receipt = {
        supplier: formData.supplier,
        items: formData.items.map(item => ({
          productId: Number(item.productId),
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        totalValue: calculateTotal(),
        notes: formData.notes,
      };

      await warehouseService.createImportReceipt(receipt);

      // Refresh data
      const [prods, history] = await Promise.all([
        warehouseService.getInventory(),
        warehouseService.getImportHistory(),
      ]);
      setProducts(prods);
      setImportHistory(history);

      // Reset form
      setFormData({ supplier: '', items: [{ productId: '', productName: '', quantity: 0, unitPrice: 0 }], notes: '' });
      setShowForm(false);
      toast('Tạo phiếu nhập kho thành công!');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-extrabold text-gray-400 uppercase tracking-[0.2em]">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="font-inter flex-1 flex flex-col gap-5 min-h-0">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[300] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 wh-animate-scale-in">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span className="text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Quản lý nhập kho</h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium mt-1">Tạo phiếu nhập kho mới và xem lịch sử nhập hàng</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="wh-btn-primary">
          <span className="material-symbols-outlined text-lg">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Đóng form' : 'Tạo phiếu nhập kho'}
        </button>
      </div>

      {/* Import Form */}
      {showForm && (
        <div className="wh-card p-6 wh-animate-fade-up">
          <h3 className="text-base font-extrabold text-gray-900 uppercase tracking-tight mb-1">Phiếu nhập kho mới</h3>
          <p className="text-xs text-gray-400 font-bold mb-5">Điền thông tin nhà cung cấp và sản phẩm cần nhập</p>

          <form onSubmit={handleSubmit}>
            {/* Supplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="wh-label">Nhà cung cấp *</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="Tên nhà cung cấp..."
                  className="wh-input"
                  required
                />
              </div>
              <div>
                <label className="wh-label">Ghi chú</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ghi chú thêm..."
                  className="wh-input"
                />
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="wh-label mb-0">Danh sách sản phẩm *</label>
                <button type="button" onClick={handleAddItem} className="wh-btn-secondary text-xs px-3 py-1.5">
                  <span className="material-symbols-outlined text-sm">add</span> Thêm dòng
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-[3]">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        className="wh-select text-sm"
                        required
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.sku} - {p.name} (Tồn: {p.stockQuantity})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="Số lượng"
                        min="1"
                        className="wh-input text-sm"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={formatCurrency(item.unitPrice)}
                        className="wh-input text-sm bg-gray-100"
                        readOnly
                      />
                    </div>
                    <div className="flex-1 flex items-center">
                      <span className="text-sm font-bold text-emerald-600">{formatCurrency(item.quantity * item.unitPrice)}</span>
                    </div>
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600 p-1 self-center">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total & Submit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tổng giá trị:</span>
                <span className="text-xl font-extrabold text-emerald-600">{formatCurrency(calculateTotal())}</span>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="wh-btn-secondary">Hủy</button>
                <button type="submit" disabled={submitting} className="wh-btn-primary">
                  <span className={`material-symbols-outlined text-lg ${submitting ? 'animate-spin' : ''}`}>
                    {submitting ? 'sync' : 'save'}
                  </span>
                  {submitting ? 'Đang xử lý…' : 'Xác nhận nhập kho'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Import History */}
      <div className="wh-card flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-base font-extrabold text-gray-900 uppercase tracking-tight">Lịch sử nhập kho</h3>
          <p className="text-xs text-gray-400 font-bold mt-0.5">Các phiếu nhập kho đã thực hiện</p>
        </div>

        {importHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-200 mb-3">inventory_2</span>
            <p className="text-sm font-bold text-gray-400">Chưa có phiếu nhập kho nào</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="wh-table">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Mã phiếu</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Ngày nhập</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Nhà cung cấp</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Sản phẩm</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Tổng giá trị</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Người tạo</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider">
                        {receipt.id}
                      </span>
                    </td>
                    <td className="text-gray-500 whitespace-nowrap">{formatDate(receipt.date)}</td>
                    <td className="font-semibold">{receipt.supplier}</td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        {receipt.items.map((item, i) => (
                          <span key={i} className="text-xs text-gray-600">
                            {item.productName} <span className="text-gray-400">×{item.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="font-bold whitespace-nowrap">{formatCurrency(receipt.totalValue)}</td>
                    <td className="text-gray-500 text-sm">{receipt.createdBy}</td>
                    <td>
                      <span className="wh-badge delivered"><span className="wh-badge-dot" />Hoàn thành</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockImport;
