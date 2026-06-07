import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import salesService from '../../services/salesService';
import { useSalesToast } from '../../components/Notification/useSalesToast';
import SalesToastNotification from '../../components/Notification/SalesToastNotification';

const formatCurrency = (val, isSmall = false, colorClass = "text-slate-800") => {
  if (val === undefined || val === null) return "0 VND";
  const num = typeof val === 'number' ? val : Number(val.toString().replace(/[đ₫\sVND.]/g, ''));
  const formatted = new Intl.NumberFormat('vi-VN').format(num);
  return (
    <span className="flex items-baseline gap-1">
      <span className={isSmall ? `font-bold ${colorClass}` : `font-black ${colorClass}`}>{formatted}</span>
      <span className={`text-[10px] font-black uppercase tracking-tighter ${colorClass === "text-white" ? "text-white/70" : "text-slate-400"}`}>VND</span>
    </span>
  );
};

const CreateOrder = () => {
  const { toast, showToast } = useSalesToast();
  const location = useLocation();
  const navigate = useNavigate();
  const quotation = location.state?.quotation;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDrawer, setShowProductDrawer] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [notes, setNotes] = useState(quotation ? `Chuyển đổi từ Báo giá ${quotation.displayID}` : '');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isOpenCategoryDropdown, setIsOpenCategoryDropdown] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const showToastMsg = (message, type = 'success') => {
    showToast(message, type);
  };

  const [selectedCustomer, setSelectedCustomer] = useState(() => {
    if (quotation) {
      return {
        id: `KH-${quotation.customerID.toString().padStart(5, '0')}`,
        name: quotation.customerName || 'Khách hàng',
        phone: '0982 • 334 • 999',
        address: '123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. HCM',
        membership: quotation.customerGroup || 'STANDARD',
        avatar: (quotation.customerName || 'KH').split(' ').pop().slice(0, 2).toUpperCase()
      };
    }
    const autoCust = location.state?.autoSelectCustomer;
    if (autoCust) {
      return {
        id: `KH-${autoCust.customerID.toString().padStart(5, '0')}`,
        name: autoCust.companyName || `${autoCust.lastName} ${autoCust.firstName}`,
        phone: autoCust.phoneNumber || 'N/A',
        address: autoCust.address || 'N/A',
        membership: autoCust.status === 'ACTIVE' ? 'VIP MEMBER' : 'STANDARD',
        avatar: (autoCust.companyName || autoCust.firstName || 'KH').split(' ').pop().slice(0, 2).toUpperCase()
      };
    }
    return null;
  });

  const [cart, setCart] = useState(() => {
    if (quotation) {
      return [
        { 
          id: 999, 
          sku: `QT-${quotation.quotationID.toString().padStart(3, '0')}`, 
          name: `Hàng hóa theo Báo giá ${quotation.displayID || `QUO-${quotation.quotationID}`}`, 
          icon: '📦', 
          price: quotation.totalAmount || 100000000, 
          quantity: 1 
        }
      ];
    }
    return [];
  });

  // Load customers, products and categories on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [custs, prods, cats] = await Promise.all([
          salesService.getCustomers(),
          salesService.getProducts(),
          salesService.getCategories()
        ]);
        setAllCustomers(custs);
        setAllProducts(prods);
        setCategories(cats);
      } catch (e) {
        console.error("Failed to load initial data in CreateOrder", e);
      }
    };
    loadInitialData();
  }, []);

  // Update dynamic steps
  useEffect(() => {
    if (selectedCustomer && cart.length > 0) {
      setStep(3);
    } else if (selectedCustomer) {
      setStep(2);
    } else {
      setStep(1);
    }
  }, [selectedCustomer, cart]);

  useEffect(() => {
    if (quotation && quotation.customerID) {
      const fetchCustomer = async () => {
        try {
          const customers = await salesService.getCustomers();
          const customer = customers.find(c => c.customerID === quotation.customerID);
          if (customer) {
            setSelectedCustomer({
              id: `KH-${customer.customerID.toString().padStart(5, '0')}`,
              name: customer.companyName || `${customer.lastName} ${customer.firstName}`,
              phone: customer.phoneNumber || '0982 • 334 • 999',
              address: customer.address || '123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. HCM',
              membership: customer.status === 'ACTIVE' ? 'VIP MEMBER' : 'STANDARD',
              avatar: (customer.companyName || customer.firstName || 'KH').split(' ').pop().slice(0, 2).toUpperCase()
            });
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchCustomer();
    }
  }, [quotation]);

  const updateQuantity = (id, delta) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer({
      id: `KH-${customer.customerID.toString().padStart(5, '0')}`,
      name: customer.companyName || `${customer.lastName} ${customer.firstName}`,
      phone: customer.phoneNumber || 'N/A',
      address: customer.address || 'N/A',
      membership: customer.status === 'ACTIVE' ? 'VIP MEMBER' : 'STANDARD',
      avatar: (customer.companyName || customer.firstName || 'KH').split(' ').pop().slice(0, 2).toUpperCase()
    });
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const handleAddProduct = (prod) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === prod.productID);
      if (existing) {
        return prevCart.map(item => 
          item.id === prod.productID 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          id: prod.productID,
          sku: `SP-${prod.productID.toString().padStart(3, '0')}`,
          name: prod.productName,
          icon: '📦',
          price: prod.salePrice,
          quantity: 1
        }
      ];
    });
  };

  // Filter lists
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(c => {
      const q = customerSearch.toLowerCase();
      const name = (c.companyName || `${c.lastName} ${c.firstName}`).toLowerCase();
      const phone = (c.phoneNumber || '').toLowerCase();
      const id = `KH-${c.customerID.toString().padStart(5, '0')}`.toLowerCase();
      return name.includes(q) || phone.includes(q) || id.includes(q);
    });
  }, [allCustomers, customerSearch]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      const q = productSearch.toLowerCase();
      const name = p.productName.toLowerCase();
      const sku = `SP-${p.productID.toString().padStart(3, '0')}`.toLowerCase();
      const matchesSearch = name.includes(q) || sku.includes(q);

      if (selectedCategory !== 'ALL' && p.categoryID !== Number(selectedCategory)) {
        return false;
      }

      return matchesSearch;
    });
  }, [allProducts, productSearch, selectedCategory]);

  const filteredCategoryOptions = useMemo(() => {
    const allOptions = [
      { categoryID: 'ALL', categoryName: 'Tất cả' },
      ...categories
    ];
    if (!categorySearchQuery) return allOptions;
    return allOptions.filter(opt => 
      opt.categoryName.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [categories, categorySearchQuery]);

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'ALL') return 'Tất cả';
    const found = categories.find(c => c.categoryID === selectedCategory);
    return found ? found.categoryName : 'Tất cả';
  }, [categories, selectedCategory]);

  const subTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = quotation ? (quotation.taxAmount || 0) : Math.round(subTotal * 0.1);
  const discount = quotation 
    ? (quotation.discountAmount || 0) 
    : (selectedCustomer?.membership === 'VIP MEMBER' ? Math.round(subTotal * 0.05) : 0);
  const finalTotal = subTotal + tax - discount;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = () => {
    if (!selectedCustomer) {
      showToastMsg("Vui lòng chọn khách hàng!", 'error');
      return;
    }
    if (cart.length === 0) {
      showToastMsg("Vui lòng thêm ít nhất một sản phẩm vào giỏ hàng!", 'error');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmCreateOrder = async () => {
    setShowConfirmModal(false);
    try {
      setLoading(true);
      
      const rawUser = localStorage.getItem('current_user') || localStorage.getItem('user');
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const userID = currentUser?.userID || 1;
      
      const orderData = {
        customerID: Number(selectedCustomer.id.replace(/[^\d]/g, '')) || 1,
        userID: userID,
        totalAmount: subTotal,
        taxAmount: tax,
        discountAmount: discount,
        paymentMethod: quotation ? (quotation.paymentMethod || 'TRANSFER') : 'TRANSFER',
        paymentTerm: quotation ? (quotation.paymentTerm || 'NET_30') : 'NET_30',
        orderStatus: 'PENDING',
        paidAmount: 0,
        notes: notes.trim(),
        items: cart.map(item => ({
          productID: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: 0
        }))
      };
      
      await salesService.createOrder(orderData);
      navigate('/sales/orders', {
        state: {
          toastMessage: quotation ? `Đơn hàng đã được khởi tạo thành công từ Báo giá ${quotation.displayID}!` : "Đơn hàng đã được khởi tạo thành công!",
          toastType: 'success'
        }
      });
    } catch (error) {
      console.error(error);
      showToastMsg("Có lỗi xảy ra khi tạo đơn hàng!", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-8 pb-10">
      
      {/* 1. Header Area */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/sales/orders')} 
            className="w-14 h-14 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 group"
          >
            <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-600 transition-colors">arrow_back</span>
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Khởi tạo đơn hàng</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              Mã đơn: ORD-2024-8892{" "}
              <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in">
                Bản nháp hệ thống
              </span>
            </p>
          </div>
        </div>

        {/* Multi-step Visual */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-[1.5rem] border-2 border-slate-300">
          <StepItem active={step >= 1} number="1" label="Khách hàng" />
          <div className={`w-8 h-[2px] ${step >= 2 ? 'bg-blue-600' : 'bg-slate-100'}`}></div>
          <StepItem active={step >= 2} number="2" label="Sản phẩm" />
          <div className={`w-8 h-[2px] ${step >= 3 ? 'bg-blue-600' : 'bg-slate-100'}`}></div>
          <StepItem active={step >= 3} number="3" label="Thanh toán" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1 md:pr-2 pt-4">
        <div className="flex flex-col xl:flex-row gap-8 mx-2 md:mx-0 xl:items-stretch">
          
          {/* CỘT TRÁI */}
          <div className="xl:flex-[2] flex flex-col gap-8">
          
          {/* Box 1: Khách hàng */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">person_search</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Đối tượng giao dịch</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Xác định khách hàng thụ hưởng</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tìm kiếm khách hàng</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Tên, SĐT hoặc Mã khách hàng..." 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700" 
                    />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">search</span>
                  </div>

                  {/* Dropdown list for Customer Search */}
                  {showCustomerDropdown && customerSearch && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl z-30 max-h-64 overflow-y-auto scrollbar-none divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-xs font-bold text-slate-400">Không tìm thấy khách hàng nào</div>
                      ) : (
                        filteredCustomers.map(c => (
                          <div 
                            key={c.customerID}
                            onClick={() => handleSelectCustomer(c)}
                            tabIndex={0}
                            role="button"
                            aria-label={`Chọn khách hàng ${c.companyName || `${c.lastName} ${c.firstName}`}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectCustomer(c);
                              }
                            }}
                            className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors focus:bg-slate-100 focus:outline-none"
                          >
                            <div>
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{c.companyName || `${c.lastName} ${c.firstName}`}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">SĐT: {c.phoneNumber || 'N/A'} • Mã: KH-{c.customerID.toString().padStart(5, '0')}</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedCustomer ? (
                  <div className="bg-[#00288E] rounded-xl p-6 text-white flex items-center gap-4 animate-in zoom-in duration-300 shadow-xl shadow-blue-900/10 relative group/card overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                    <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center font-black text-lg z-10">
                      {selectedCustomer.avatar}
                    </div>
                    <div className="flex-1 overflow-hidden z-10">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm uppercase tracking-tight break-words whitespace-normal lg:truncate lg:whitespace-nowrap">{selectedCustomer.name}</h4>
                        {selectedCustomer.membership?.toUpperCase().includes('VIP') ? (
                          <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg bg-white text-amber-500 border border-amber-200 font-black text-[8px] uppercase tracking-wider shrink-0 shadow-sm">
                            <span className="material-symbols-outlined text-[10px] font-black">diamond</span>
                            VIP
                          </span>
                        ) : selectedCustomer.membership?.toUpperCase().includes('GOLD') ? (
                          <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg bg-white text-yellow-600 border border-yellow-200 font-black text-[8px] uppercase tracking-wider shrink-0 shadow-sm">
                            <span className="material-symbols-outlined text-[10px] font-black">workspace_premium</span>
                            GOLD
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg bg-white text-slate-500 border border-slate-200 font-black text-[8px] uppercase tracking-wider shrink-0 shadow-sm">
                            <span className="material-symbols-outlined text-[10px] font-black">military_tech</span>
                            TIÊU CHUẨN
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1 break-all whitespace-normal lg:truncate lg:whitespace-nowrap">{selectedCustomer.phone}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5 break-words whitespace-normal lg:truncate lg:whitespace-nowrap">{selectedCustomer.address}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedCustomer(null)}
                      className="text-white/20 hover:text-red-500 transition-colors z-10 active:scale-95"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50">
                    <span className="material-symbols-outlined text-slate-400 text-2xl mb-2 animate-bounce">group</span>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chưa chọn khách hàng</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">Sử dụng thanh tìm kiếm bên trái để chọn đối tượng</p>
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Giỏ hàng */}
            <div className={`bg-white rounded-xl sm:rounded-2xl p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500 flex flex-col ${
              cart.length >= 5 ? 'flex-1' : ''
            }`}>
              <div className="flex justify-between items-center mb-8 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600">shopping_cart</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Giỏ hàng</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chi tiết các hạng mục sản phẩm</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProductDrawer(true)}
                  className="bg-[#00288E] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#001D6E] transition-all active:scale-95 shadow-lg shadow-blue-900/10"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Thêm SP
                </button>
              </div>
              
              <div className={`overflow-x-auto transition-all duration-300 flex-1 min-h-0 ${
                cart.length >= 5 
                  ? 'max-h-[450px] overflow-y-auto scrollbar-none pr-1' 
                  : ''
              }`}>
                <table className="w-full text-left whitespace-nowrap relative border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Sản phẩm</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Đơn giá</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Số lượng</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Thành tiền</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-16 sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-12 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Chưa có sản phẩm nào trong giỏ hàng. Nhấn "Thêm SP" để bắt đầu!
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr key={item.id} className="group border-b border-slate-100 last:border-none hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100/50 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                                <span className="material-symbols-outlined text-[20px]">image</span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-slate-900 uppercase tracking-tight text-sm truncate max-w-[180px] sm:max-w-[220px]" title={item.name}>{item.name}</p>
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">SKU: {item.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {formatCurrency(item.price, true)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-3 bg-slate-50 p-1 rounded-2xl w-fit mx-auto border border-slate-100 hover:border-blue-100 transition-all">
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <span className="material-symbols-outlined text-sm">remove</span>
                              </button>
                              <span className="font-black text-slate-900 w-6 text-center text-xs">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-8 h-8 flex items-center justify-center bg-[#00288E] rounded-xl shadow-md shadow-blue-900/10 text-white hover:bg-[#001D6E] transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end justify-center">
                              {formatCurrency(item.price * item.quantity, true, "text-blue-600")}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 border border-red-100 hover:border-red-500 shadow-sm hover:shadow-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                              title="Xóa khỏi giỏ hàng"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Summary */}
          <div className="xl:flex-[1] flex flex-col gap-8">
            <div className="bg-[#00288E] rounded-xl sm:rounded-2xl p-10 text-white shadow-2xl shadow-[#00288E]/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">Thanh toán <span className="text-amber-400">.</span></h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Tổng kết giá trị đơn hàng</p>
                  </div>
                  <span className="material-symbols-outlined text-white/80 text-3xl font-black">payments</span>
                </div>

                <div className="space-y-6">
                  <SummaryLine label={`Tạm tính (${totalItems} sp)`} value={formatCurrency(subTotal, true, "text-white")} />
                  <SummaryLine label="Thuế GTGT (10%)" value={formatCurrency(tax, true, "text-white")} />
                  
                  <div className="bg-white/10 rounded-xl p-6 border border-white/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Chiết khấu thành viên</span>
                      <span className="text-amber-400 font-black text-xs">-{formatCurrency(discount, true, "text-amber-400")}</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Nhập mã ưu đãi..." 
                        className="w-full bg-white/10 border-2 border-transparent rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-white/30 transition-all placeholder:text-white/30 text-white" 
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-slate-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-400 hover:text-slate-950 transition-all">Áp dụng</button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/20 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Tổng thanh toán</p>
                      <div className="text-3xl font-black text-white tracking-tighter leading-none">
                        {formatCurrency(finalTotal, false, "text-white")}
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Bảo mật
                    </span>
                  </div>

                  <div className="pt-8">
                    <button 
                      onClick={handleSubmit}
                      disabled={loading}
                      className="w-full bg-white hover:bg-blue-50 text-[#00288E] py-6 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-black/10 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-[#00288E]/30 border-t-[#00288E] rounded-full animate-spin"></div>
                      ) : (
                        <>Xác nhận đặt hàng <span className="material-symbols-outlined text-lg">chevron_right</span></>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-10 shadow-sm border border-slate-300 xl:flex-1 flex flex-col">
               <h4 className="font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2 shrink-0">
                <span className="material-symbols-outlined text-slate-400">description</span> Ghi chú
              </h4>
              <textarea 
                rows="4" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lưu ý về giao nhận, hóa đơn..." 
                className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-5 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700 resize-none flex-1"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Product Selector Drawer */}
      {showProductDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end font-inter">
          {/* Overlay */}
          <div 
            onClick={() => setShowProductDrawer(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          ></div>
          
          {/* Drawer Content */}
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thêm sản phẩm</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chọn từ danh mục sản phẩm của hệ thống</p>
              </div>
              <button 
                onClick={() => setShowProductDrawer(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-950 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {/* Search & Category Filter */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm theo tên, SKU..." 
                  className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-4 pr-10 text-xs font-bold outline-none focus:border-blue-500 transition-all text-slate-700 shadow-sm"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              </div>

              {/* Category Dropdown Filter */}
              <div className="relative w-full">
                <button 
                  onClick={() => setIsOpenCategoryDropdown(!isOpenCategoryDropdown)}
                  className="w-full bg-white border-2 border-slate-200 hover:border-blue-500 rounded-xl px-4 py-3 flex items-center justify-between text-left transition-all font-black text-slate-700 active:scale-[0.98] shadow-sm cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Danh mục</span>
                    <span className="text-xs font-black truncate max-w-[280px] text-[#00288E]">
                      {selectedCategoryName}
                    </span>
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenCategoryDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }}>
                    keyboard_arrow_down
                  </span>
                </button>

                {isOpenCategoryDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => {
                        setIsOpenCategoryDropdown(false);
                        setCategorySearchQuery('');
                      }}
                    />
                    
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-30 overflow-hidden flex flex-col max-h-[300px] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#00288E] opacity-80">CHỌN DANH MỤC</span>
                        
                        <div className="relative w-36 group">
                          <input
                            type="text"
                            value={categorySearchQuery}
                            onChange={(e) => setCategorySearchQuery(e.target.value)}
                            placeholder="Tìm nhanh..."
                            className="w-full bg-slate-100 border border-slate-200 text-[10px] font-bold rounded-lg pl-7 pr-5 py-1.5 outline-none focus:bg-white focus:border-blue-600 transition-all text-slate-700 placeholder:text-slate-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">search</span>
                          {categorySearchQuery && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategorySearchQuery('');
                              }}
                              className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 text-xs font-bold flex items-center justify-center"
                            >
                              close
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="overflow-y-auto p-3 flex-1 scrollbar-none max-h-[200px]">
                        {filteredCategoryOptions.length === 0 ? (
                          <div className="py-6 text-center text-xs font-bold text-slate-400 italic">
                            Không tìm thấy danh mục
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {filteredCategoryOptions.map((cat) => {
                              const isSelected = selectedCategory === cat.categoryID;
                              return (
                                <button
                                  key={cat.categoryID}
                                  type="button"
                                  title={cat.categoryName}
                                  onClick={() => {
                                    setSelectedCategory(cat.categoryID);
                                    setIsOpenCategoryDropdown(false);
                                    setCategorySearchQuery('');
                                  }}
                                  className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center min-h-[40px] leading-tight active:scale-95 cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#00288E] text-white shadow-lg shadow-blue-500/30 font-black'
                                      : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                                  }`}
                                >
                                  <span className="truncate max-w-full">{cat.categoryName}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Product List */}
            <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-4">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">inventory_2</span>
                  <p className="text-xs font-bold text-slate-400">Không tìm thấy sản phẩm phù hợp</p>
                </div>
              ) : (
                filteredProducts.map(prod => {
                  const cartItem = cart.find(item => item.id === prod.productID);
                  const qty = cartItem ? cartItem.quantity : 0;
                  return (
                    <div 
                      key={prod.productID} 
                      className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300 ${
                        qty > 0 ? 'border-blue-500/20 bg-blue-50/30' : 'border-slate-100 hover:border-slate-200 bg-white shadow-sm'
                      }`}
                    >
                      <div className="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100/50 shadow-inner group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[20px]">image</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-xs text-slate-900 uppercase tracking-tight truncate">{prod.productName}</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">SKU: SP-{prod.productID.toString().padStart(3, '0')}</p>
                        <p className="text-xs font-black text-blue-600 mt-1">{new Intl.NumberFormat('vi-VN').format(prod.salePrice)} VND</p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {qty > 0 ? (
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button 
                              onClick={() => updateQuantity(prod.productID, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 hover:text-red-500 transition-all"
                            >
                              <span className="material-symbols-outlined text-xs">remove</span>
                            </button>
                            <span className="font-black text-[11px] text-slate-800 w-6 text-center">{qty}</span>
                            <button 
                              onClick={() => updateQuantity(prod.productID, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-[#00288E] shadow-sm text-white hover:bg-[#001D6E] transition-all"
                            >
                              <span className="material-symbols-outlined text-xs">add</span>
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleAddProduct(prod)}
                            className="bg-[#00288E] hover:bg-[#001D6E] text-white w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-md shadow-blue-900/10"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300 border border-slate-100 font-inter">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-[#00288E] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">
                <span className="material-symbols-outlined text-3xl">shopping_cart_checkout</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Xác nhận tạo đơn hàng?</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">
                Vui lòng xác nhận thông tin đơn hàng bên dưới trước khi khởi tạo.
              </p>
            </div>

            {/* Order Summary Info */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3 border border-slate-100">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Khách hàng</span>
                <span className="text-slate-700 font-black normal-case text-xs">{selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Số lượng thực thể</span>
                <span className="text-slate-700 font-black">{totalItems} thực thể</span>
              </div>
              <div className="h-px bg-slate-200/60 my-2" />
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Tổng tiền thanh toán</span>
                <span className="text-[#00288E] font-black text-sm flex items-baseline gap-1">
                  {new Intl.NumberFormat('vi-VN').format(finalTotal)} 
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">VND</span>
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 hover:text-slate-600 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmCreateOrder}
                className="flex-1 px-4 py-3 bg-[#00288E] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-[#001D6E] transition-all active:scale-95"
              >
                Xác nhận tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <SalesToastNotification toast={toast} />
    </div>
  );
};

const SummaryLine = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</span>
    <span className="font-black text-sm">{value}</span>
  </div>
);

const StepItem = ({ active, number, label }) => (
  <div className="flex items-center gap-2 px-4 py-2">
    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-300'}`}>
      {number}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'text-slate-900' : 'text-slate-300'}`}>
      {label}
    </span>
  </div>
);

export default CreateOrder;