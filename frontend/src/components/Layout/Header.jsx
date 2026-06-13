import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../features/auth/services/authService';
import notificationService from '../../features/auth/services/notificationService';
import dbData from '../../../db.json';
import NotificationDropdown from '../common/NotificationDropdown';
import NotificationListModal from '../common/NotificationListModal';
import AccountModal from '../common/AccountModal';
import { getInitials, getAvatarGradient } from '../../utils/avatarHelper';

const Header = ({ onToggleSidebar, toggleBreakpoint = 'lg' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  // States cho Global Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    customers: [],
    products: [],
    orders: [],
    users: []
  });

  // States cho Notification & Account
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isNotificationListOpen, setIsNotificationListOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState('profile');
  const [unreadCount, setUnreadCount] = useState(0);

  const searchInputRef = useRef(null);
  const modalRef = useRef(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await authService.getMe();
      setUser(userData);
    };
    fetchUser();

    // Click outside to close dropdowns
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // Lắng nghe phím tắt Ctrl + K để mở nhanh ô tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tự động focus vào ô input trong modal khi mở ra
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSearchResults({ customers: [], products: [], orders: [], users: [] });
    }
  }, [isSearchOpen]);

  // Xử lý tìm kiếm real-time trên dữ liệu db.json + LocalStorage
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ customers: [], products: [], orders: [], users: [] });
      return;
    }

    // 1. Chuẩn hóa chuỗi truy vấn (loại bỏ tiền tố như ORD-, SP-, NK-, QUO-, INV- và dấu gạch ngang nếu có)
    let rawQuery = searchQuery.trim().toLowerCase();
    let query = rawQuery;
    
    // Regex tìm kiếm các mã tiền tố kèm số: ord-001, sp-002, quo-003, inv-004, nk-005, kh-004...
    // Có phân tách bằng dấu gạch ngang hoặc khoảng trắng hoặc viết liền với số
    const prefixWithNumMatch = rawQuery.match(/^(ord|sp|nk|quo|inv|kh)\s*[-_]?\s*(\d+)/i);
    if (prefixWithNumMatch) {
      // Nếu khớp mã hiển thị (ví dụ: kh-004), lấy phần số phía sau (ví dụ: '4')
      query = parseInt(prefixWithNumMatch[2], 10).toString();
    }

    // 2. Lấy dữ liệu từ LocalStorage
    let localCustomers = [];
    let localProducts = [];
    let localOrders = [];
    try {
      localCustomers = JSON.parse(localStorage.getItem('added_customers') || '[]');
      localProducts = JSON.parse(localStorage.getItem('added_products') || '[]');
      localOrders = JSON.parse(localStorage.getItem('added_orders') || '[]');
    } catch (e) {
      console.error("Lỗi khi đọc LocalStorage cho Global Search:", e);
    }

    // Gộp dữ liệu LocalStorage và db.json
    const allCustomers = [...localCustomers, ...(dbData.customers || [])];
    const allProducts = [...localProducts, ...(dbData.products || [])];
    const allOrders = [...localOrders, ...(dbData.orders || [])];
    const allUsers = dbData.users || [];

    // Lọc trùng ID
    const customerMap = new Map();
    allCustomers.forEach(c => customerMap.set(Number(c.customerID), c));
    const uniqueCustomers = Array.from(customerMap.values());

    const productMap = new Map();
    allProducts.forEach(p => productMap.set(Number(p.productID), p));
    const uniqueProducts = Array.from(productMap.values());

    const orderMap = new Map();
    allOrders.forEach(o => orderMap.set(Number(o.orderID), o));
    const uniqueOrders = Array.from(orderMap.values());

    // 3. Tiến hành tìm kiếm trên tập dữ liệu đã gộp
    // Tìm khách hàng
    const matchedCustomers = uniqueCustomers.filter(c => 
      c.companyName?.toLowerCase().includes(rawQuery) ||
      c.firstName?.toLowerCase().includes(rawQuery) ||
      c.lastName?.toLowerCase().includes(rawQuery) ||
      c.customerID?.toString() === query ||
      c.phoneNumber?.includes(rawQuery)
    ).slice(0, 3);

    // Tìm sản phẩm
    const matchedProducts = uniqueProducts.filter(p => 
      p.productName?.toLowerCase().includes(rawQuery) ||
      p.productID?.toString() === query ||
      p.unit?.toLowerCase().includes(rawQuery)
    ).slice(0, 3);

    // Tìm đơn hàng (tìm theo ID số thô hoặc mã hiển thị)
    const matchedOrders = uniqueOrders.filter(o => 
      o.orderID?.toString() === query ||
      o.orderID?.toString().includes(rawQuery) ||
      o.paymentMethod?.toLowerCase().includes(rawQuery)
    ).slice(0, 3);

    // Tìm nhân sự
    const matchedUsers = allUsers.filter(u => 
      u.firstName?.toLowerCase().includes(rawQuery) ||
      u.lastName?.toLowerCase().includes(rawQuery) ||
      u.email?.toLowerCase().includes(rawQuery) ||
      u.userID?.toString() === query
    ).slice(0, 3);

    setSearchResults({
      customers: matchedCustomers,
      products: matchedProducts,
      orders: matchedOrders,
      users: matchedUsers
    });
  }, [searchQuery]);

  const handleLogout = async () => {
    const result = await authService.logout();
    if (result.success) {
      navigate('/');
    }
  };

  const handleResultClick = (path) => {
    setIsSearchOpen(false);
    navigate(path);
  };

  const getRoleName = (roleID) => {
    switch (Number(roleID)) {
      case 1: return 'Kế toán';
      case 2: return 'Nhân viên Sales';
      case 3: return 'Quản trị viên';
      case 4: return 'Nhân viên kho';
      case 5: return 'Super Admin';
      default: return 'Nhân viên';
    }
  };

  // Giá trị mặc định nếu chưa load được user hoặc chưa đăng nhập
  const displayName = user ? `${user.lastName} ${user.firstName}` : 'Admin User';
  const displayRole = user ? (user.roleName || getRoleName(user.roleID)) : 'Quản trị viên';
  const avatarInitials = user ? getInitials(user.firstName, user.lastName) : 'AU';
  const avatarGradient = user ? getAvatarGradient(user.firstName, user.lastName) : 'from-indigo-500 to-blue-600';

  const hasResults = 
    searchResults.customers.length > 0 ||
    searchResults.products.length > 0 ||
    searchResults.orders.length > 0 ||
    searchResults.users.length > 0;

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0 w-full relative">
        {/* Bên trái Header: Menu Toggle và Kích hoạt Tìm kiếm toàn cục */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 sm:flex-initial">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`${toggleBreakpoint === 'xl' ? 'xl:hidden' : 'lg:hidden'} text-slate-600 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors flex items-center justify-center cursor-pointer`}
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
          )}
          
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 sm:gap-3 p-2.5 sm:px-4 sm:py-2 bg-[#f2f4f6] hover:bg-slate-200/70 border border-transparent rounded-xl text-slate-500 text-sm outline-none transition-all w-10 h-10 sm:w-auto justify-center sm:justify-start group cursor-pointer"
          >
            <div className="flex items-center justify-center h-5 shrink-0">
              <span className="material-symbols-outlined text-slate-400 group-hover:text-[#00288E] text-xl transition-colors leading-none">
                search
              </span>
            </div>
            <span className="hidden md:inline flex-1 font-medium text-xs text-slate-400 leading-none">Tìm kiếm hệ thống...</span>
            <kbd className="hidden lg:inline-block bg-white text-[10px] text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 font-mono shadow-sm leading-none">Ctrl K</kbd>
          </button>
        </div>

        {/* Bên phải Header: Thông báo & Profile */}
        <div className="flex items-center gap-2 sm:gap-5">
          {/* Nút thông báo */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative text-gray-500 hover:text-[#00288E] transition-colors flex items-center justify-center p-1 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">
                notifications
              </span>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <NotificationDropdown
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              onViewAll={() => {
                setIsNotificationOpen(false);
                setIsNotificationListOpen(true);
              }}
            />
          </div>
          
          {/* Profile User (Có Dropdown Hover mượt mà & Click mở trên mobile) */}
          <div 
            ref={profileRef}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="relative group flex items-center gap-1.5 sm:gap-3 cursor-pointer pl-2 sm:pl-4 border-l border-gray-200 py-2"
          >
            {/* Vùng hiển thị thông tin */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient} text-white flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-110`}>
                {avatarInitials}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-[#191c1e] leading-none group-hover:text-[#00288E] transition-colors">
                  {displayName}
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-none">
                  {displayRole}
                </p>
              </div>
              {/* Mũi tên chỉ xuống báo hiệu có dropdown */}
              <span className={`material-symbols-outlined text-gray-400 text-sm transition-transform duration-200 ${isProfileOpen ? 'rotate-180 text-blue-600' : 'xl:group-hover:rotate-180'}`}>
                expand_more
              </span>
            </div>

            {/* Nền tàng hình nối liền khoảng trống (Invisible Bridge) */}
            <div className="absolute top-full right-0 w-full h-3 bg-transparent"></div>

            {/* Dropdown Menu (Hiển thị khi Hover hoặc khi Click) */}
            <div className={`absolute right-0 top-[calc(100%+8px)] w-52 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-gray-100 transition-all duration-200 z-50 ${isProfileOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 xl:group-hover:opacity-100 xl:group-hover:visible xl:group-hover:translate-y-0'}`}>
              {/* Thêm một "đuôi nhọn" nhỏ cho dropdown xinh hơn */}
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-gray-100 rotate-45"></div>
              
              <div className="p-2 relative bg-white rounded-xl" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setAccountModalTab('profile');
                    setIsAccountModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#444653] hover:bg-[#f2f4f6] hover:text-[#00288E] rounded-lg flex items-center gap-3 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  Hồ sơ cá nhân
                </button>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setAccountModalTab('security');
                    setIsAccountModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#444653] hover:bg-[#f2f4f6] hover:text-[#00288E] rounded-lg flex items-center gap-3 transition-colors mt-1"
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                  Cài đặt tài khoản
                </button>

                <div className="my-1.5 border-t border-gray-100"></div>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notification List Modal */}
      <NotificationListModal
        isOpen={isNotificationListOpen}
        onClose={() => setIsNotificationListOpen(false)}
      />

      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        openTab={accountModalTab}
      />

      {/* GLOBAL SEARCH MODAL (POPUP UI) */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[10vh] animate-fade-in"
          onClick={() => setIsSearchOpen(false)}
        >
          <div 
            ref={modalRef}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[70vh] scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Thanh tìm kiếm trên Popup */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <span className="material-symbols-outlined text-slate-400 text-2xl">
                search
              </span>
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Nếu bấm Enter, tự động chuyển hướng đến kết quả đầu tiên tìm thấy
                    if (searchResults.customers.length > 0) {
                      handleResultClick('/sales/customers');
                    } else if (searchResults.products.length > 0) {
                      handleResultClick('/sales/products');
                    } else if (searchResults.orders.length > 0) {
                      handleResultClick('/sales/orders');
                    } else if (searchResults.users.length > 0) {
                      handleResultClick('/admin/staffs');
                    }
                  }
                }}
                placeholder="Nhập tên khách hàng, sản phẩm, mã đơn hàng, nhân sự..." 
                className="flex-1 text-slate-800 text-base font-medium outline-none bg-transparent"
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="text-[10px] font-black text-slate-400 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg uppercase transition-colors"
              >
                ESC
              </button>
            </div>

            {/* Nội dung kết quả tìm kiếm */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!searchQuery.trim() ? (
                <div className="text-center py-10 space-y-2 text-slate-400">
                  <span className="material-symbols-outlined text-4xl">travel_explore</span>
                  <p className="text-sm font-bold">Tìm kiếm nhanh trên Hizo Group ERP</p>
                  <p className="text-xs">Nhập từ khóa bất kỳ để truy xuất nhanh thông tin hệ thống.</p>
                </div>
              ) : !hasResults ? (
                <div className="text-center py-10 space-y-2 text-slate-400">
                  <span className="material-symbols-outlined text-4xl">find_in_page</span>
                  <p className="text-sm font-bold">Không tìm thấy kết quả nào phù hợp</p>
                  <p className="text-xs">Vui lòng kiểm tra lại từ khóa hoặc mã số tìm kiếm.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Kết quả: Khách hàng */}
                  {searchResults.customers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Khách hàng ({searchResults.customers.length})</p>
                      <div className="space-y-1">
                        {searchResults.customers.map(c => (
                          <div 
                            key={c.customerID}
                            onClick={() => handleResultClick('/sales/customers')}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-blue-600 bg-blue-50 p-2 rounded-xl">corporate_fare</span>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800">{c.companyName || `${c.lastName} ${c.firstName}`}</p>
                              <p className="text-xs text-slate-400">SĐT: {c.phoneNumber} | Email: {c.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kết quả: Sản phẩm */}
                  {searchResults.products.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Sản phẩm ({searchResults.products.length})</p>
                      <div className="space-y-1">
                        {searchResults.products.map(p => (
                          <div 
                            key={p.productID}
                            onClick={() => handleResultClick('/sales/products')}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-2 rounded-xl">inventory_2</span>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800">{p.productName}</p>
                              <p className="text-xs text-slate-400">Đơn giá: {p.salePrice.toLocaleString()} VND / {p.unit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kết quả: Đơn hàng */}
                  {searchResults.orders.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Đơn hàng ({searchResults.orders.length})</p>
                      <div className="space-y-1">
                        {searchResults.orders.map(o => (
                          <div 
                            key={o.orderID}
                            onClick={() => handleResultClick('/sales/orders')}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2 rounded-xl">receipt_long</span>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800">Đơn hàng #{o.orderID}</p>
                              <p className="text-xs text-slate-400">Giá trị: {o.totalAmount.toLocaleString()} VND | Thanh toán: {o.paymentMethod}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kết quả: Nhân sự */}
                  {searchResults.users.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Nhân sự ({searchResults.users.length})</p>
                      <div className="space-y-1">
                        {searchResults.users.map(u => (
                          <div 
                            key={u.userID}
                            onClick={() => handleResultClick('/admin/staffs')}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-purple-600 bg-purple-50 p-2 rounded-xl">badge</span>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800">{u.lastName} {u.firstName}</p>
                              <p className="text-xs text-slate-400">Email: {u.email} | SĐT: {u.phoneNumber}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer của Modal tìm kiếm */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Mẹo: Dùng phím ESC để đóng nhanh</span>
              <span>Hizo Group System</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;