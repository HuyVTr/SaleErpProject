import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'

const LoginPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@gmail.com')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    const result = await authService.login(email, password)
    if (result.success) {
      const roleRedirects = {
        1: '/accounting',
        2: '/sales',
        3: '/admin',
        4: '/warehouse'
      }
      const redirectPath = roleRedirects[result.user.roleID] || '/home'
      navigate(redirectPath)
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="flex h-screen w-full font-sans bg-[#f7f9fb]">
      {/* Nửa bên trái - Thông tin giới thiệu */}
      <div className="flex-1 bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#1e40af] flex items-center justify-center p-10 relative overflow-hidden">
        {/* Hiệu ứng vòng tròn mờ (Glassmorphism / Aura effect) theo chuẩn UI/UX Pro Max */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 rounded-full filter blur-3xl opacity-20 translate-x-1/2 translate-y-1/2"></div>
        
        {/* Thêm một Grid pattern mờ nhẹ phía sau để tăng chiều sâu */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]"></div>

        <div className="max-w-[500px] text-white relative z-10">
          <h1 className="font-manrope text-[48px] font-bold leading-[1.2] mb-4 text-white">
            Giải pháp tối ưu cho<br />Doanh nghiệp.
          </h1>
          <p className="text-[18px] opacity-90 mb-10 text-blue-100">
            Hệ thống quản trị tài nguyên tập trung dành cho các bộ phận chuyên trách của Hola Group.
          </p>
          
          {/* Grid 4 Module - Đã đổi icon sang Material Symbols và thêm hiệu ứng Hover mượt mà */}
          <div className="grid grid-cols-2 gap-4">
            {/* Card Admin */}
            <div className="group bg-white/10 p-6 rounded-lg backdrop-blur-md border border-white/20 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:bg-white/20 hover:border-white/40 hover:scale-[1.03] hover:shadow-lg hover:shadow-blue-900/30">
              <div className="w-12 h-12 mb-3 rounded-xl flex items-center justify-center bg-white/20 text-white group-hover:bg-white group-hover:text-blue-700 transition-all duration-300 shadow-inner">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              </div>
              <h3 className="font-manrope text-base font-semibold mb-1 text-white">Admin</h3>
              <p className="text-xs opacity-80 text-blue-100">Quản trị hệ thống & Bảo mật</p>
            </div>

            {/* Card Sales */}
            <div className="group bg-white/10 p-6 rounded-lg backdrop-blur-md border border-white/20 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:bg-white/20 hover:border-white/40 hover:scale-[1.03] hover:shadow-lg hover:shadow-blue-900/30">
              <div className="w-12 h-12 mb-3 rounded-xl flex items-center justify-center bg-white/20 text-white group-hover:bg-white group-hover:text-blue-700 transition-all duration-300 shadow-inner">
                <span className="material-symbols-outlined text-2xl">trending_up</span>
              </div>
              <h3 className="font-manrope text-base font-semibold mb-1 text-white">Sales</h3>
              <p className="text-xs opacity-80 text-blue-100">Kinh doanh & Khách hàng</p>
            </div>

            {/* Card Warehouse */}
            <div className="group bg-white/10 p-6 rounded-lg backdrop-blur-md border border-white/20 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:bg-white/20 hover:border-white/40 hover:scale-[1.03] hover:shadow-lg hover:shadow-blue-900/30">
              <div className="w-12 h-12 mb-3 rounded-xl flex items-center justify-center bg-white/20 text-white group-hover:bg-white group-hover:text-blue-700 transition-all duration-300 shadow-inner">
                <span className="material-symbols-outlined text-2xl">warehouse</span>
              </div>
              <h3 className="font-manrope text-base font-semibold mb-1 text-white">Warehouse</h3>
              <p className="text-xs opacity-80 text-blue-100">Kho vận & Logistic</p>
            </div>

            {/* Card Accounting */}
            <div className="group bg-white/10 p-6 rounded-lg backdrop-blur-md border border-white/20 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:bg-white/20 hover:border-white/40 hover:scale-[1.03] hover:shadow-lg hover:shadow-blue-900/30">
              <div className="w-12 h-12 mb-3 rounded-xl flex items-center justify-center bg-white/20 text-white group-hover:bg-white group-hover:text-blue-700 transition-all duration-300 shadow-inner">
                <span className="material-symbols-outlined text-2xl">account_balance</span>
              </div>
              <h3 className="font-manrope text-base font-semibold mb-1 text-white">Accounting</h3>
              <p className="text-xs opacity-80 text-blue-100">Kế toán & Tài chính</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nửa bên phải - Form đăng nhập */}
      <div className="flex-1 flex flex-col justify-center items-center relative bg-[#f7f9fb]">
        <div className="bg-white p-12 rounded-[32px] shadow-[0_20px_40px_rgba(25,28,30,0.06)] w-full max-w-[496px]">
          <h2 className="font-manrope text-[30px] text-[#191c1e] mb-2 font-bold">
            Chào mừng trở lại!
          </h2>
          <p className="text-[14px] text-[#444653] mb-8">
            Vui lòng nhập thông tin để truy cập hệ thống.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="mb-6">
              <label className="block text-xs text-[#444653] mb-2 font-medium">EMAIL</label>
              <input 
                type="email" 
                placeholder="name@holagroup.vn" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-[#e6e8ea] border border-transparent rounded-lg text-base text-[#191c1e] outline-none transition-all duration-300 focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs text-[#444653] mb-2 font-medium">MẬT KHẨU</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-[#e6e8ea] border border-transparent rounded-lg text-base text-[#191c1e] outline-none transition-all duration-300 focus:border-blue-600 focus:bg-white"
              />
            </div>

            {error && (
              <div className="mb-4 text-red-500 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center mb-8 text-sm">
              <label className="text-[#444653] flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 cursor-pointer accent-blue-600" /> 
                Ghi nhớ đăng nhập
              </label>
              <a href="#" className="text-blue-600 no-underline font-medium hover:underline">
                Quên mật khẩu?
              </a>
            </div>

            <button 
              type="submit" 
              className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none rounded-lg text-[18px] font-semibold cursor-pointer transition-all duration-300 hover:opacity-90 shadow-lg shadow-blue-500/30"
            >
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
