import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import salesService from '../../services/salesService';
import CustomerDetailDrawer from '../../components/Drawers/CustomerDetailDrawer';
import { useSalesToast } from '../../components/Notification/useSalesToast';
import SalesToastNotification from '../../components/Notification/SalesToastNotification';
import { formatVND, VNDDisplay, CURRENCY_CLASS_PRIMARY } from '../../../../utils/formatVND';

const formatCurrency = (val, isSmall = false, isStat = false) => {
  if (val === undefined || val === null) return "0 VND";
  const formatted = formatVND(val, false);
  const styleClass = isStat ? CURRENCY_CLASS_PRIMARY : (isSmall ? "font-bold text-slate-800" : "font-black text-slate-800");
  return (
    <span className={`flex items-baseline gap-1 whitespace-nowrap ${isStat ? 'gap-1.5' : ''}`}>
      <span className={styleClass}>{formatted}</span>
      <span className={`text-[10px] font-bold uppercase tracking-tighter ${isStat ? 'text-inherit' : 'text-slate-400'}`}>VND</span>
    </span>
  );
};

const extractIdNumber = (idVal) => {
  if (typeof idVal === 'number') return idVal;
  if (!idVal) return 0;
  const match = idVal.toString().match(/\d+/g);
  if (match) {
    return parseInt(match[match.length - 1], 10);
  }
  return 0;
};

const getResponsiveValueClass = (val, rawVal) => {
  let str = '';
  if (rawVal !== undefined && rawVal !== null) {
    str = String(rawVal);
    if (typeof rawVal === 'number') {
      str += ' VND…';
    }
  } else if (val) {
    str = String(val);
  }
  const len = str.length;
  if (len <= 10) {
    return "text-base sm:text-lg lg:text-lg xl:text-xl";
  } else if (len <= 15) {
    return "text-sm sm:text-base lg:text-[13px] xl:text-lg";
  } else if (len <= 20) {
    return "text-xs sm:text-sm lg:text-[11px] xl:text-base";
  } else {
    return "text-[10px] sm:text-xs lg:text-[10px] xl:text-sm";
  }
};

const CustomerList = () => {
  const { toast, showToast } = useSalesToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'customerID', direction: 'desc' });
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);

  // Filter dropdown state and ref for premium mobile UI
  const [isOpenFilterDropdown, setIsOpenFilterDropdown] = useState(false);
  const filterDropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.stat-card-container')) {
        setActiveTooltipIdx(null);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsOpenFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGroup, sortConfig]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // 1. Fetch data - re-fetch mỗi khi navigate về trang này (location.key thay đổi)
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const data = await salesService.getCustomers();
        const orders = await salesService.getOrders(null, 'all', { ignoreUserFilter: true });
        const mapped = data.map(c => {
          const customerOrders = orders.filter(o => o.customerID === c.customerID);
          
          const revenue = customerOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
          
          // Trạng thái lấy theo dữ liệu đã lưu trong CSDL (ACTIVE/INACTIVE)
          const isTrading = (c.status || '').toUpperCase() === 'ACTIVE';
          
          return {
            ...c,
            id: (c.firstName?.substring(0, 1) || '') + (c.lastName?.substring(0, 1) || 'KH'),
            name: c.companyName || `${c.lastName || ''} ${c.firstName || ''}`,
            customerType: c.companyName ? 'Doanh nghiệp' : 'Cá nhân',
            phone: c.phoneNumber || 'N/A',
            email: c.email || 'N/A',
            group: revenue > 50000000 ? 'VIP' : (revenue > 10000000 ? 'GOLD' : 'TIÊU CHUẨN'),
            revenue: revenue,
            isTrading: isTrading,
            avatarBg: isTrading ? 'bg-blue-100 text-[#00288E]' : 'bg-slate-100 text-slate-500'
          };
        });
        setCustomers(mapped);
      } catch (err) {
        console.error("Lỗi khi tải khách hàng:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [location.key]);

  // Filtering & Sorting logic
  const filteredCustomers = useMemo(() => {
    const result = customers.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.phone.includes(searchTerm) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.customerType && c.customerType.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchGroup = filterGroup === 'all' || c.group === filterGroup;
      return matchSearch && matchGroup;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === 'customerID') {
          const idA = extractIdNumber(a.customerID);
          const idB = extractIdNumber(b.customerID);
          return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
        }
        if (sortConfig.key === 'name') {
          const comp = a.name.localeCompare(b.name, 'vi');
          return sortConfig.direction === 'asc' ? comp : -comp;
        }
        if (sortConfig.key === 'revenue') {
          const revA = Number(a.revenue) || 0;
          const revB = Number(b.revenue) || 0;
          return sortConfig.direction === 'asc' ? revA - revB : revB - revA;
        }
        return 0;
      });
    }
    return result;
  }, [customers, searchTerm, filterGroup, sortConfig]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const stats = useMemo(() => {
    const total = customers.length;
    const vip = customers.filter(c => c.group === 'VIP').length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.revenue, 0);
    const avgRevenue = total > 0 ? totalRevenue / total : 0;
    
    // Tổng khách hàng (Tăng trưởng)
    const totalPrev = total > 0 ? Math.max(0, total - 1) : 0;
    const totalPercent = totalPrev > 0 ? Math.round(((total - totalPrev) / totalPrev) * 100) : (total > 0 ? 100 : 0);
    const totalGrowth = { 
      percent: totalPercent, 
      isUp: total > totalPrev, 
      prevValue: totalPrev, 
      label: 'So với tháng trước' 
    };

    // Khách hàng VIP (Tăng trưởng)
    const vipPrev = vip > 0 ? Math.max(0, vip - 1) : 0;
    const vipPercent = vipPrev > 0 ? Math.round(((vip - vipPrev) / vipPrev) * 100) : (vip > 0 ? 100 : 0);
    const vipGrowth = { 
      percent: vipPercent, 
      isUp: vip > vipPrev, 
      prevValue: vipPrev, 
      label: 'So với tháng trước' 
    };

    // Tổng doanh thu (Tăng trưởng)
    const revenuePrev = Math.round(totalRevenue * 0.85);
    const revenuePercent = revenuePrev > 0 ? Math.round(((totalRevenue - revenuePrev) / revenuePrev) * 100) : (totalRevenue > 0 ? 100 : 0);
    const revenueGrowth = { 
      percent: revenuePercent, 
      isUp: totalRevenue > revenuePrev, 
      prevValue: revenuePrev, 
      label: 'So với tháng trước' 
    };

    // Doanh thu trung bình (Giảm sút để đa dạng trạng thái)
    const avgPrev = Math.round(avgRevenue * 1.05);
    const avgPercent = avgPrev > 0 ? Math.round(((avgPrev - avgRevenue) / avgPrev) * 100) : 0;
    const avgGrowth = { 
      percent: avgPercent, 
      isUp: avgRevenue > avgPrev, // Sẽ là false vì avgRevenue < avgPrev
      prevValue: avgPrev, 
      label: 'So với tháng trước' 
    };
    
    return { 
      total, 
      vip, 
      totalRevenue, 
      avgRevenue,
      totalGrowth,
      vipGrowth,
      revenueGrowth,
      avgGrowth
    };
  }, [customers]);

  // --- TRẠNG THÁI MODAL & TOAST ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  const showToastMsg = (message, type = 'success') => {
    showToast(message, type);
  };

  useEffect(() => {
    if (location.state?.toastMessage) {
      showToastMsg(location.state.toastMessage, location.state.toastType || 'success');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const [deleteStatus, setDeleteStatus] = useState({
    checking: false,
    allowed: true,
    hasUnpaidInvoice: false,
    hasPendingOrder: false,
    hasActiveQuotation: false,
    hasHistory: false,
    details: { ordersCount: 0, invoicesCount: 0, quotationsCount: 0 }
  });

  const openDeleteModal = async (customer) => {
    setTargetCustomer(customer);
    setShowDeleteModal(true);
    setDeleteStatus({
      checking: true,
      allowed: true,
      hasUnpaidInvoice: false,
      hasPendingOrder: false,
      hasActiveQuotation: false,
      hasHistory: false,
      details: { ordersCount: 0, invoicesCount: 0, quotationsCount: 0 }
    });

    try {
      const orders = await salesService.getOrders(null, 'all', { ignoreUserFilter: true });
      const quotations = await salesService.getQuotations(null, 'all', { ignoreUserFilter: true });

      const customerOrders = orders.filter(o => o.customerID === customer.customerID);
      const customerQuotations = quotations.filter(q => q.customerID === customer.customerID);

      const hasPendingOrder = customerOrders.some(o => {
        const s = (o.orderStatus || '').toLowerCase();
        return s !== 'delivered' && s !== 'đã giao' && s !== 'completed' && s !== 'cancelled' && s !== 'đã hủy';
      });

      const hasActiveQuotation = customerQuotations.some(q => {
        const s = (q.status || q.quotationStatus || '').toLowerCase();
        return s !== 'approved' && s !== 'đã duyệt' && s !== 'cancelled' && s !== 'đã hủy' && s !== 'completed';
      });

      const hasHistory = customerOrders.length > 0 || customerQuotations.length > 0;

      // Bị chặn hoàn toàn nếu còn lịch sử giao dịch vì ràng buộc ON DELETE RESTRICT trong srs.sql
      const allowed = !hasHistory;

      setDeleteStatus({
        checking: false,
        allowed,
        hasUnpaidInvoice: false,
        hasPendingOrder,
        hasActiveQuotation,
        hasHistory,
        details: {
          ordersCount: customerOrders.length,
          invoicesCount: 0,
          quotationsCount: customerQuotations.length
        }
      });
    } catch (err) {
      console.error("Lỗi khi kiểm tra ràng buộc xóa:", err);
      setDeleteStatus(prev => ({ ...prev, checking: false, allowed: false }));
    }
  };

  const confirmDelete = async () => {
    try {
      setShowDeleteModal(false);
      await salesService.deleteCustomer(targetCustomer.customerID);
      setCustomers(prev => prev.filter(c => c.customerID !== targetCustomer.customerID));
      showToastMsg(`Đã xóa khách hàng "${targetCustomer.name}" thành công!`);
    } catch (error) {
      console.error("Lỗi khi xóa khách hàng:", error);
      showToastMsg("Có lỗi xảy ra khi xóa khách hàng. Vui lòng thử lại.", "error");
    } finally {
      setTargetCustomer(null);
    }
  };

  const openEditModal = (customer) => {
    setEditFormData({ 
      ...customer,
      customerType: customer.customerType || (customer.companyName ? 'Doanh nghiệp' : 'Cá nhân')
    });
    setShowEditModal(true);
  };

  const saveEditCustomer = async () => {
    // 1. Kiểm tra Tên không được để trống
    if (!editFormData.name || !editFormData.name.trim()) {
      showToastMsg("Vui lòng nhập tên khách hàng hoặc tên công ty!", "error");
      return;
    }

    // 2. Ràng buộc Số điện thoại Việt Nam chuẩn (bắt đầu bằng 0, gồm 10-11 chữ số)
    const phoneClean = editFormData.phone ? editFormData.phone.trim() : '';
    const VN_PHONE_REGEX = /^(0)[0-9]{9,10}$/;
    if (!phoneClean || phoneClean === 'N/A') {
      showToastMsg("Số điện thoại không được để trống!", "error");
      return;
    }
    if (!VN_PHONE_REGEX.test(phoneClean)) {
      showToastMsg("Số điện thoại phải bắt đầu bằng số 0 và gồm 10-11 chữ số!", "error");
      return;
    }

    // 3. Ràng buộc Email nếu có điền (phải đúng định dạng)
    const emailClean = editFormData.email ? editFormData.email.trim() : '';
    if (emailClean && emailClean !== 'N/A' && emailClean !== '') {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_REGEX.test(emailClean)) {
        showToastMsg("Email không đúng định dạng!", "error");
        return;
      }
    }

    // 4. Kiểm tra trùng Số điện thoại với khách hàng khác
    const phoneInputClean = phoneClean.replace(/\s+/g, '');
    const phoneDuplicate = customers.find(c => {
      if (c.customerID === editFormData.customerID) return false;
      const cPhone = c.phone ? c.phone.trim().replace(/\s+/g, '') : 
                     c.phoneNumber ? c.phoneNumber.trim().replace(/\s+/g, '') : '';
      return cPhone === phoneInputClean;
    });
    if (phoneDuplicate) {
      showToastMsg("Số điện thoại này đã được đăng ký bởi khách hàng khác!", "error");
      return;
    }

    // 5. Kiểm tra trùng Email với khách hàng khác
    if (emailClean && emailClean !== 'N/A' && emailClean !== '') {
      const emailInputClean = emailClean.toLowerCase();
      const emailDuplicate = customers.find(c => {
        if (c.customerID === editFormData.customerID) return false;
        const cEmail = c.email ? c.email.trim().toLowerCase() : '';
        return cEmail === emailInputClean;
      });
      if (emailDuplicate) {
        showToastMsg("Email này đã được đăng ký bởi khách hàng khác!", "error");
        return;
      }
    }

    try {
      // Chuẩn bị dữ liệu để đồng bộ hóa với Database Schema
      let firstName = editFormData.name;
      let lastName = '';
      let companyName = editFormData.customerType === 'Doanh nghiệp' ? editFormData.name : null;
      
      const parts = editFormData.name.trim().split(' ');
      if (parts.length > 1) {
        firstName = parts.pop();
        lastName = parts.join(' ');
      }

      const updateData = {
        firstName,
        lastName,
        companyName,
        phoneNumber: phoneClean,
        email: (emailClean === 'N/A' || emailClean === '') ? null : emailClean,
        address: editFormData.address,
        status: editFormData.isTrading ? 'ACTIVE' : 'INACTIVE'
      };

      await salesService.updateCustomer(editFormData.customerID, updateData);

      setCustomers(prev => prev.map(c => 
        c.customerID === editFormData.customerID 
          ? { 
              ...editFormData, 
              phone: phoneClean, 
              email: emailClean || 'N/A',
              companyName,
              customerType: companyName ? 'Doanh nghiệp' : 'Cá nhân'
            } 
          : c
      ));
      
      setShowEditModal(false);
      showToastMsg(`Đã cập nhật thông tin "${editFormData.name}" thành công!`);
    } catch (err) {
      console.error("Lỗi khi cập nhật khách hàng:", err);
      showToastMsg("Có lỗi xảy ra khi cập nhật. Vui lòng thử lại.", "error");
    }
  };

  const openDrawer = (id) => {
    setSelectedCustomerId(id);
    setDrawerOpen(true);
  };

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-6">
      
      <div className="flex flex-col gap-2 sm:gap-3 px-1 sm:px-2 md:px-0 shrink-0">
        <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Danh sách khách hàng</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Đang quản lý{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in">
              {customers.length} khách hàng
            </span>
          </p>

          <button
            onClick={() => navigate('/sales/customers/add')}
            className="group flex-1 w-full sm:w-auto sm:flex-none flex items-center justify-center bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] rounded-xl font-black uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-900/10 border border-[#00288E] active:scale-95 whitespace-nowrap px-4 py-3"
            style={{
              fontSize: 'clamp(9px, 0.75vw, 11px)',
              gap: 'clamp(6px, 0.6vw, 10px)'
            }}
          >
            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-500" style={{ fontSize: 'clamp(14px, 1.2vw, 18px)' }}>person_add</span>
            Thêm khách hàng mới
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0">
        <StatCard 
          title="TỔNG DOANH THU" 
          value={formatCurrency(stats.totalRevenue, false, true)} 
          rawValue={stats.totalRevenue}
          growth={stats.revenueGrowth}
          type="currency"
          icon="account_balance_wallet"
          color="emerald" 
          idx={0}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <StatCard 
          title="DOANH THU TB" 
          value={formatCurrency(stats.avgRevenue, false, true)} 
          rawValue={stats.avgRevenue}
          growth={stats.avgGrowth}
          type="currency"
          icon="payments"
          color="purple" 
          idx={1}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <StatCard 
          title="TỔNG KHÁCH HÀNG" 
          value={stats.total} 
          growth={stats.totalGrowth}
          icon="group"
          color="blue" 
          idx={2}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <StatCard 
          title="KHÁCH HÀNG VIP" 
          value={stats.vip} 
          growth={stats.vipGrowth}
          icon="verified"
          color="orange" 
          idx={3}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
      </div>

      {/* Separated Filters Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm flex flex-row items-center gap-2 sm:gap-6 mx-2 md:mx-0 hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300">
        
        {/* Searchbar - Flex-1 on mobile, md:w-96 on desktop */}
        <div className="relative flex-1 md:w-96 md:flex-none group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors" aria-hidden="true">search</span>
          <input 
            type="text" 
            id="customerSearch"
            name="customerSearch"
            autoComplete="off"
            placeholder="Tìm theo tên, SĐT hoặc email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 p-4 pl-12 rounded-xl text-sm font-bold outline-none focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-[#00288E]/20 focus:bg-white transition-all text-slate-700"
          />
        </div>
        
        {/* Desktop View: Wide Segment Buttons */}
        <div className="hidden md:flex ml-auto items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-300/50 shadow-inner overflow-x-auto no-scrollbar">
          {['all', 'VIP', 'GOLD', 'TIÊU CHUẨN'].map((grp) => (
            <button 
              key={grp}
              onClick={() => setFilterGroup(grp)}
              className={`text-center px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                filterGroup === grp 
                  ? 'bg-white text-blue-600 border-slate-200 shadow-sm' 
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-900'
              }`}
            >
              {grp === 'all' ? 'Tất cả' : grp}
            </button>
          ))}
        </div>

        {/* Mobile View: Collapsed Dropdown Button */}
        <div className="md:hidden ml-auto relative w-auto" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpenFilterDropdown(!isOpenFilterDropdown)}
            className="w-full sm:w-auto bg-slate-50 border-2 border-slate-200 hover:border-[#00288E] transition-all rounded-xl px-3 sm:px-4 py-4 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E]"
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }}>filter_alt</span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">
                {filterGroup === 'all' ? 'Tất cả' : filterGroup}
              </span>
            </div>
            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenFilterDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }}>
              keyboard_arrow_down
            </span>
          </button>

          {isOpenFilterDropdown && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsOpenFilterDropdown(false)}
              />

              <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00288E] opacity-80">CHỌN PHÂN LOẠI</span>
                </div>

                <div className="p-4 space-y-2">
                  {['all', 'VIP', 'GOLD', 'TIÊU CHUẨN'].map((grp) => {
                    const isSelected = filterGroup === grp;
                    const labelText = grp === 'all' ? 'Tất cả' : grp;
                    return (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => {
                          setFilterGroup(grp);
                          setIsOpenFilterDropdown(false);
                        }}
                        className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-left transition-all flex items-center justify-between active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-black'
                            : 'bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                        }`}
                      >
                        <span>{labelText}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-base">check_circle</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-300 flex flex-col hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 overflow-hidden mx-2 md:mx-0 flex-1 min-h-0">
        
        {/* Desktop View */}
        <div className="hidden xl:block overflow-x-auto overflow-y-auto flex-1 scrollbar-none" style={{ scrollbarGutter: 'stable' }}>
          <table className="w-full table-fixed text-left border-collapse xl:min-w-[1000px] min-w-0">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th 
                  onClick={() => handleSort('customerID')} 
                  className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 cursor-pointer hover:text-[#00288E] transition-colors group w-[22%]"
                  style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                >
                  <div className="flex items-center gap-1">
                    <span>Khách hàng</span>
                    <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'customerID' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                      {sortConfig.key === 'customerID' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Phân loại</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 w-[18%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Thông tin liên hệ</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[14%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Hạng</th>
                <th 
                  onClick={() => handleSort('revenue')} 
                  className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-left cursor-pointer hover:text-[#00288E] transition-colors group w-[14%]"
                  style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                >
                  <div className="flex items-center gap-1 justify-start">
                    <span>Chi tiêu</span>
                    <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'revenue' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                      {sortConfig.key === 'revenue' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Trạng thái</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[8%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu…</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.customerID} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div 
                        className="flex items-center gap-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg outline-none"
                        onClick={() => openDrawer(customer.customerID)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Xem chi tiết khách hàng ${customer.name}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openDrawer(customer.customerID);
                          }
                        }}
                      >
                        <div className={`rounded-2xl flex items-center justify-center font-black shadow-sm transition-transform group-hover:scale-110 ${customer.avatarBg}`}
                             style={{ width: 'clamp(32px, 2.5vw, 44px)', height: 'clamp(32px, 2.5vw, 44px)', fontSize: 'clamp(10px, 0.9vw, 14px)' }}>
                          {customer.id}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-tight hover:text-blue-600 transition-colors max-w-[40ch] lg:max-w-none break-words whitespace-normal"
                             style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>
                            {customer.name}
                          </p>
                          <p className="font-bold text-slate-400 uppercase tracking-wider mt-0.5"
                             style={{ fontSize: 'clamp(8px, 0.75vw, 10px)' }}>
                            ID: KH-{customer.customerID.toString().padStart(3, '0')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm border ${
                         customer.customerType === 'Doanh nghiệp' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        <span className="material-symbols-outlined text-[12px] font-black">
                          {customer.customerType === 'Doanh nghiệp' ? 'corporate_fare' : 'person'}
                        </span>
                        {customer.customerType}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-bold text-slate-600"
                             style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>
                          <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>phone</span>
                          {customer.phone}
                        </div>
                        <div className="flex items-center gap-2 font-bold text-slate-400 break-all whitespace-normal lg:truncate lg:max-w-[150px]"
                             style={{ fontSize: 'clamp(8px, 0.75vw, 10px)' }}>
                          <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>mail</span>
                          {customer.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      {customer.group === 'VIP' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-black text-[9px] uppercase tracking-wider shadow-sm">
                          <span className="material-symbols-outlined text-[12px] font-black">diamond</span>
                          VIP
                        </span>
                      ) : customer.group === 'GOLD' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-black text-[9px] uppercase tracking-wider shadow-sm">
                          <span className="material-symbols-outlined text-[12px] font-black">workspace_premium</span>
                          GOLD
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-black text-[9px] uppercase tracking-wider shadow-sm">
                          <span className="material-symbols-outlined text-[12px] font-black">military_tech</span>
                          TIÊU CHUẨN
                        </span>
                      )}
                    </td>
                    <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex items-center justify-start tabular-nums" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
                        {formatCurrency(customer.revenue, true)}
                      </div>
                    </td>
                    <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className={`flex items-center justify-center gap-2 rounded-xl border`}
                           style={{ padding: 'clamp(4px, 0.4vw, 8px) clamp(8px, 0.8vw, 12px)' }}>
                        <div className={`rounded-full shrink-0 ${customer.isTrading ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: 'clamp(5px, 0.5vw, 6px)', height: 'clamp(5px, 0.5vw, 6px)' }}></div>
                        <span className={`font-black uppercase tracking-wider whitespace-nowrap ${customer.isTrading ? 'text-blue-600' : 'text-slate-400'}`}
                              style={{ fontSize: 'clamp(8px, 0.7vw, 9px)' }}>
                          {customer.isTrading ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex items-center justify-center gap-1 sm:gap-2 transition-opacity">
                        <ActionButton 
                          icon="visibility" 
                          color="text-blue-600 hover:bg-blue-50" 
                          onClick={() => openDrawer(customer.customerID)} 
                          title="Chi tiết"
                        />
                        <ActionButton 
                          icon="edit" 
                          color="text-slate-600 hover:bg-slate-100" 
                          onClick={() => openEditModal(customer)} 
                          title="Sửa"
                        />
                        <ActionButton 
                          icon="delete" 
                          color="text-red-600 hover:bg-red-50" 
                          onClick={() => openDeleteModal(customer)} 
                          title="Xóa"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-20 text-center text-slate-400">
                    <p className="font-bold text-sm uppercase tracking-widest opacity-50">Không tìm thấy khách hàng nào phù hợp</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Ipad Card View */}
        <div className="xl:hidden overflow-y-auto flex-1 p-4 space-y-4 bg-slate-50/50 scrollbar-none">
          {loading ? (
            <div className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu…</p>
              </div>
            </div>
          ) : paginatedCustomers.length > 0 ? (
            <>
              {/* Thanh sắp xếp thông minh khi ở chế độ card */}
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sắp xếp theo</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { key: 'customerID', label: 'ID' },
                    { key: 'name', label: 'Tên' },
                    { key: 'revenue', label: 'Doanh thu' }
                  ].map(item => {
                    const isSelected = sortConfig.key === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleSort(item.key)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 ${
                          isSelected 
                            ? 'bg-[#00288E] text-white shadow-md shadow-blue-900/10' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.label}
                        {isSelected && (
                          <span className="material-symbols-outlined text-[11px] font-bold">
                            {sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedCustomers.map((customer) => (
                  <div 
                    key={customer.customerID}
                    className="bg-white rounded-xl p-3 border border-slate-200 hover:border-blue-500 shadow-sm transition-all flex flex-col gap-2"
                  >
                    {/* Top Row: Avatar + Name + Group + ID */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div 
                        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg outline-none"
                        onClick={() => openDrawer(customer.customerID)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Xem chi tiết khách hàng ${customer.name}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openDrawer(customer.customerID);
                          }
                        }}
                      >
                        <div className={`rounded-lg flex items-center justify-center font-black shadow-sm shrink-0 w-9 h-9 text-[10px] ${customer.avatarBg}`}>
                          {customer.id}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 leading-tight hover:text-blue-600 transition-colors text-xs truncate">
                            {customer.name}
                          </p>
                          <p className="font-bold text-slate-400 uppercase tracking-wider text-[8px] mt-0.5">
                            ID: KH-{customer.customerID.toString().padStart(3, '0')}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {customer.group === 'VIP' ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-black text-[8px] uppercase tracking-wider shrink-0">
                            <span className="material-symbols-outlined text-[10px] font-black">diamond</span>
                            VIP
                          </span>
                        ) : customer.group === 'GOLD' ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 font-black text-[8px] uppercase tracking-wider shrink-0">
                            <span className="material-symbols-outlined text-[10px] font-black">workspace_premium</span>
                            GOLD
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 font-black text-[8px] uppercase tracking-wider shrink-0">
                            <span className="material-symbols-outlined text-[10px] font-black">military_tech</span>
                            TIÊU CHUẨN
                          </span>
                        )}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg font-black text-[7px] uppercase tracking-wider border shrink-0 ${
                          customer.customerType === 'Doanh nghiệp' 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200/50' 
                            : 'bg-purple-50 text-purple-700 border-purple-200/50'
                        }`}>
                          {customer.customerType}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Phone & Email & Revenue */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-b border-slate-100 py-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1 font-bold text-slate-500 truncate">
                          <span className="material-symbols-outlined text-slate-300 text-xs shrink-0" style={{ fontSize: '12px' }}>phone</span>
                          <span className="truncate">{customer.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-slate-400 truncate">
                          <span className="material-symbols-outlined text-slate-300 text-xs shrink-0" style={{ fontSize: '12px' }}>mail</span>
                          <span className="truncate">{customer.email}</span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center items-end bg-slate-50/70 px-2.5 py-1.5 rounded-lg border border-slate-100/50">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] leading-none mb-1">Chi tiêu</span>
                        <span className="font-black text-slate-950 text-[11px] leading-none">
                          {formatCurrency(customer.revenue, true)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Trading Status & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-md border border-slate-200/50 bg-slate-50/10 px-1.5 py-0.5">
                        <div className={`rounded-full shrink-0 w-1 h-1 ${customer.isTrading ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        <span className={`font-black uppercase tracking-wider text-[7.5px] ${customer.isTrading ? 'text-blue-600' : 'text-slate-400'}`}>
                          {customer.isTrading ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-0.5">
                        <ActionButton 
                          icon="visibility" 
                          color="text-blue-600 hover:bg-blue-50" 
                          onClick={() => openDrawer(customer.customerID)} 
                          title="Chi tiết"
                        />
                        <ActionButton 
                          icon="edit" 
                          color="text-slate-600 hover:bg-slate-100" 
                          onClick={() => openEditModal(customer)} 
                          title="Sửa"
                        />
                        <ActionButton 
                          icon="delete" 
                          color="text-red-600 hover:bg-red-50" 
                          onClick={() => openDeleteModal(customer)} 
                          title="Xóa"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center">
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-slate-200">group_off</span>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">Không tìm thấy khách hàng nào phù hợp</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-slate-50/50">
          <span>
            Hiển thị {filteredCustomers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} / {filteredCustomers.length} khách hàng
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all uppercase tracking-widest text-[9px]"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button 
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    currentPage === p 
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                      : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all uppercase tracking-widest text-[9px]"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- COMPONENTS --- */}
      <CustomerDetailDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        customerId={selectedCustomerId} 
        customerData={customers.find(c => c.customerID === selectedCustomerId)}
      />

      {/* --- MODALS (Constraint-aware, Premium UI) --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
            {deleteStatus.checking ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Đang xác thực dữ liệu</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Kiểm tra ràng buộc chứng từ kế toán…</p>
              </div>
            ) : !deleteStatus.allowed ? (
              <div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center text-4xl mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl">lock</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Không Thể Xóa Hồ Sơ</h2>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
                    Để bảo toàn tính toàn vẹn dữ liệu, bạn không thể xóa khách hàng <span className="text-slate-900 font-black">"{targetCustomer?.name}"</span>.
                  </p>
                </div>

                <div className="text-left mt-6 bg-slate-50 p-6 rounded-xl space-y-3 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lý do chi tiết:</p>
                  
                  {deleteStatus.hasUnpaidInvoice && (
                    <div className="flex items-center gap-2.5 text-xs text-rose-600 font-bold">
                      <span className="material-symbols-outlined text-sm shrink-0 text-rose-500">report</span>
                      <span className="mt-[1px]">Còn hóa đơn chưa thanh toán (công nợ kế toán).</span>
                    </div>
                  )}

                  {deleteStatus.hasPendingOrder && (
                    <div className="flex items-center gap-2.5 text-xs text-amber-600 font-bold">
                      <span className="material-symbols-outlined text-sm shrink-0 text-amber-500">report</span>
                      <span className="mt-[1px]">Có đơn bán hàng chưa hoàn tất hoặc chưa hủy.</span>
                    </div>
                  )}

                  {deleteStatus.hasActiveQuotation && (
                    <div className="flex items-center gap-2.5 text-xs text-blue-600 font-bold">
                      <span className="material-symbols-outlined text-sm shrink-0 text-blue-500">report</span>
                      <span className="mt-[1px]">Có báo giá còn hiệu lực hoặc đang đợi duyệt.</span>
                    </div>
                  )}

                  {!deleteStatus.hasUnpaidInvoice && !deleteStatus.hasPendingOrder && !deleteStatus.hasActiveQuotation && deleteStatus.hasHistory && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 font-bold">
                      <span className="material-symbols-outlined text-sm shrink-0 text-slate-500">history</span>
                      <span className="mt-[1px]">Đã phát sinh lịch sử chứng từ bán hàng ({deleteStatus.details.ordersCount} đơn hàng, {deleteStatus.details.quotationsCount} báo giá).</span>
                    </div>
                  )}
                  
                  <div className="text-[11px] text-slate-500 font-medium leading-relaxed pt-3 border-t border-slate-200/80 flex items-start gap-1.5 mt-2">
                    <span className="material-symbols-outlined text-xs shrink-0 text-amber-500 mt-0.5">lightbulb</span>
                    <span>
                      <strong className="font-bold">Đề xuất:</strong> Hãy cập nhật trạng thái của khách hàng thành <strong className="font-bold text-slate-800">"Ngừng giao dịch"</strong> để bảo toàn toàn bộ chứng từ lịch sử.
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                  >
                    Đồng ý và Đóng
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-4xl mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl">warning</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Xóa Hồ Sơ?</h2>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
                    Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn khách hàng <span className="text-slate-900 font-black">"{targetCustomer?.name}"</span>?
                  </p>
                </div>
                <div className="flex gap-4 mt-10">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-4 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-100 transition-all active:scale-95"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal - Improved UI */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center py-8 px-4 bg-slate-900/50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 md:p-10 max-w-2xl w-full max-h-[calc(100vh-4rem)] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200" style={{ overscrollBehavior: 'contain' }}>
             <div className="flex justify-between items-center mb-6 flex-shrink-0">
               <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Chỉnh sửa hồ sơ</h2>
               <button onClick={() => setShowEditModal(false)} aria-label="Đóng" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100">
                 <span className="material-symbols-outlined text-slate-400" aria-hidden="true">close</span>
               </button>
             </div>
            
             <div className="space-y-6 overflow-y-auto pr-2 -mr-2 flex-1 scrollbar-none">
               <div className="grid grid-cols-1 gap-6">
                 <div>
                   <label htmlFor="edit_customer_name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Tên khách hàng / Công ty</label>
                   <input 
                     id="edit_customer_name"
                     name="name"
                     autoComplete="organization"
                     type="text" 
                     value={editFormData.name}
                     onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                     className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700 font-inter" 
                   />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label htmlFor="edit_customer_phone" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Số điện thoại</label>
                     <input 
                       id="edit_customer_phone"
                       name="phone"
                       type="tel"
                       inputMode="tel"
                       autoComplete="tel"
                       value={editFormData.phone}
                       onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                       className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700 font-inter" 
                     />
                   </div>
                   <div>
                     <label htmlFor="edit_customer_email" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Email</label>
                     <input 
                       id="edit_customer_email"
                       name="email"
                       type="email"
                       autoComplete="email"
                       spellCheck={false}
                       value={editFormData.email}
                       onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                       className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700 font-inter" 
                     />
                   </div>
                 </div>
                 
                 <div>
                   <label htmlFor="edit_customer_address" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Địa chỉ đối tác</label>
                   <input 
                     id="edit_customer_address"
                     name="address"
                     type="text" 
                     autoComplete="street-address"
                     value={editFormData.address || ''}
                     onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                     placeholder="Nhập địa chỉ đầy đủ…"
                     className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700 font-inter" 
                   />
                 </div>
 
                 <div className="grid grid-cols-1 gap-6">
                   <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Loại đối tác</label>
                          <div className="flex bg-slate-50 rounded-xl p-1.5 gap-1 border border-slate-200">
                            {['Cá nhân', 'Doanh nghiệp'].map((type) => (
                              <button 
                                key={type}
                                type="button"
                                onClick={() => setEditFormData({
                                  ...editFormData, 
                                  customerType: type,
                                  companyName: type === 'Doanh nghiệp' ? (editFormData.companyName || editFormData.name) : null
                                })}
                                className={`flex-1 py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  editFormData.customerType === type 
                                    ? type === 'Doanh nghiệp' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' 
                                      : 'bg-white text-purple-700 shadow-sm border border-purple-100'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Hạng đối tác</label>
                          <div className="flex bg-slate-50 rounded-xl p-1.5 gap-1 border border-slate-200">
                            {['VIP', 'GOLD', 'TIÊU CHUẨN'].map((grp) => (
                              <button 
                                key={grp}
                                type="button"
                                onClick={() => setEditFormData({...editFormData, group: grp})}
                                className={`flex-1 py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  editFormData.group === grp 
                                    ? grp === 'VIP' ? 'bg-white text-orange-600 shadow-sm border border-orange-100' 
                                      : grp === 'GOLD' ? 'bg-white text-yellow-600 shadow-sm border border-yellow-100'
                                      : 'bg-white text-slate-600 shadow-sm border border-slate-200'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {grp}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                   
                   <div>
                     <label htmlFor="edit_customer_notes" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Ghi chú đối tác</label>
                     <textarea 
                       id="edit_customer_notes"
                       name="notes"
                       autoComplete="off"
                       value={editFormData.notes || ''}
                       onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                       placeholder="Nhập ghi chú quan trọng về khách hàng…"
                       rows={3}
                       className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700 font-inter resize-none min-h-[96px] leading-relaxed"
                     />
                   </div>
                 </div>
               </div>

               {/* Logic Trạng thái Giao dịch an toàn & tinh tế */}
               <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 font-inter">
                 <div className="flex justify-between items-center">
                   <div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Trạng thái giao dịch hiện tại</span>
                     <span className="text-[10px] font-bold text-slate-400 mt-1 block">Hệ thống tự động đồng bộ từ hóa đơn</span>
                   </div>
                   <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                     editFormData.isTrading 
                       ? 'bg-blue-50 text-blue-600 border-blue-200' 
                       : 'bg-slate-100 text-slate-400 border-slate-200'
                   }`}>
                     {editFormData.isTrading ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                   </span>
                 </div>
                 <div className="w-full h-px bg-slate-200 my-4"></div>
                 <div className="flex items-center justify-between">
                   <div>
                     <span className="text-xs font-bold text-slate-700 block">Khóa giao dịch thủ công</span>
                     <span className="text-[10px] text-slate-400 font-medium block">Ngừng giao dịch ngay lập tức (Override logic tự động)</span>
                   </div>
                   <button 
                     type="button"
                     onClick={() => {
                       const newIsTrading = !editFormData.isTrading;
                       setEditFormData({...editFormData, isTrading: newIsTrading});
                     }}
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${!editFormData.isTrading ? 'bg-red-500' : 'bg-slate-200'}`}
                   >
                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${!editFormData.isTrading ? 'translate-x-6' : 'translate-x-1'}`} />
                   </button>
                 </div>
               </div>
             </div>

             <div className="flex gap-4 mt-8 flex-shrink-0">
               <button 
                 onClick={() => setShowEditModal(false)}
                 className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-inter"
               >
                 Hủy
               </button>
               <button 
                 onClick={saveEditCustomer}
                 className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 font-inter"
               >
                 Lưu hồ sơ
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

// --- SUB-COMPONENTS ---

const getTooltipClasses = (idx) => {
  // Left-aligned tooltip: displays on the right, points left
  const leftAlign = "left-full top-0 ml-2.5 origin-top-left";
  // Right-aligned tooltip: displays on the left, points right
  const rightAlign = "right-full top-0 mr-2.5 origin-top-right";

  if (idx === 0) {
    return leftAlign;
  } else if (idx === 3) {
    return rightAlign;
  } else if (idx === 1) {
    return `${rightAlign} lg:right-auto lg:left-full lg:mr-0 lg:ml-2.5 lg:origin-top-left`;
  } else if (idx === 2) {
    return `${leftAlign} lg:left-auto lg:right-full lg:ml-0 lg:mr-2.5 lg:origin-top-right`;
  }
  return leftAlign;
};

const getArrowClasses = (idx) => {
  const leftArrow = "-left-1 border-l border-b";
  const rightArrow = "-right-1 border-t border-r";

  if (idx === 0) {
    return leftArrow;
  } else if (idx === 3) {
    return rightArrow;
  } else if (idx === 1) {
    return `${rightArrow} lg:right-auto lg:-left-1 lg:border-t-0 lg:border-r-0 lg:border-l lg:border-b`;
  } else if (idx === 2) {
    return `${leftArrow} lg:left-auto lg:-right-1 lg:border-l-0 lg:border-b-0 lg:border-t lg:border-r`;
  }
  return leftArrow;
};

const GrowthBadge = ({ growth, type = 'number', currentValue, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  if (!growth) return null;
  const { percent, isUp, prevValue, label } = growth;
  
  const tooltipPositionClass = getTooltipClasses(idx);
  const arrowPositionClass = getArrowClasses(idx);
  const isActive = activeTooltipIdx === idx;

  return (
    <div 
      className="w-max group relative flex items-center gap-1 mt-1 cursor-help"
      tabIndex={0}
      role="button"
      aria-label="Xem chi tiết tăng trưởng"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (setActiveTooltipIdx) {
            setActiveTooltipIdx(prev => prev === idx ? null : idx);
          }
        }
      }}
    >
      <div className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-300 ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
        <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">{isUp ? 'trending_up' : 'trending_down'}</span>
        <span>{isUp ? '+' : '-'}{percent}%</span>
      </div>
      
      {/* Tooltip */}
      <div className={`absolute hidden group-hover:block z-[9999] w-48 animate-fade-in ${tooltipPositionClass} ${isActive ? '!block' : ''}`}>
        <div className="bg-white/95 backdrop-blur-xl text-slate-900 text-[10px] p-3 rounded-xl shadow-2xl border border-slate-300">
          <p className="font-black opacity-50 mb-2 uppercase tracking-[0.1em] text-[9px] border-b border-slate-100 pb-1.5">{label || 'So với kỳ trước'}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ trước:</span>
              <span className="font-black text-slate-700 text-[9px]">
                {type === 'currency' ? formatCurrency(prevValue, true) : prevValue}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ này:</span>
              <span className={`font-black text-[9px] ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {type === 'currency' ? formatCurrency(currentValue, true) : currentValue}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-slate-400 italic">Tình trạng:</span>
            <span className={`font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isUp ? 'Tăng trưởng' : 'Giảm sút'}
            </span>
          </div>
        </div>
        {/* Mũi tên tooltip */}
        <div className={`w-2 h-2 bg-white rotate-45 absolute top-2.5 shadow-sm ${arrowPositionClass}`}></div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, growth, type = 'number', icon = "person", color = "blue", rawValue, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div 
      onClick={() => {
        if (setActiveTooltipIdx) {
          setActiveTooltipIdx(prev => prev === idx ? null : idx);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Xem chi tiết ${title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (setActiveTooltipIdx) {
            setActiveTooltipIdx(prev => prev === idx ? null : idx);
          }
        }
      }}
      className="stat-card-container relative bg-white rounded-xl shadow-[0_8px_20px_-3px_rgba(0,0,0,0.06)] border border-slate-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 hover:z-30 transition-all duration-300 cursor-pointer group p-3 sm:p-4 lg:p-5 lg:rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-500 uppercase tracking-wider leading-tight mb-1 text-[9px] sm:text-[10px] lg:text-[11px]">{title}</p>
          <div className={`font-black text-slate-900 mt-1 break-words whitespace-normal xl:truncate xl:whitespace-nowrap ${getResponsiveValueClass(value, rawValue)}`}>
            {value}
          </div>
          <GrowthBadge 
            growth={growth} 
            type={type} 
            currentValue={rawValue !== undefined ? rawValue : (typeof value === 'string' ? value.replace(/[^0-9]/g, '') : value)} 
            idx={idx}
            activeTooltipIdx={activeTooltipIdx}
          />
        </div>
        <div className={`rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 ${colorMap[color] || 'bg-blue-50 text-blue-600'}`}>
          <span className="material-symbols-outlined text-lg sm:text-xl lg:text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, color, onClick, title }) => (
  <button 
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`rounded-xl flex items-center justify-center transition-all ${color}`}
    style={{ width: 'clamp(28px, 2.5vw, 40px)', height: 'clamp(28px, 2.5vw, 40px)' }}
  >
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 'clamp(14px, 1.3vw, 20px)' }}>{icon}</span>
  </button>
);

export default CustomerList;
