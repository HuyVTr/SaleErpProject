import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import salesService from '../../services/salesService';

const customerSchema = z.object({
  firstName: z.string().min(1, "Vui lòng nhập tên"),
  lastName: z.string().min(1, "Vui lòng nhập họ"),
  phoneNumber: z.string().regex(/^(0)[0-9]{9,10}$/, "Số điện thoại phải bắt đầu bằng số 0 và gồm 10-11 chữ số"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal('')),
  address: z.string().optional(),
  companyName: z.string().optional(),
  customerType: z.enum(['INDIVIDUAL', 'CORPORATE']),
  membership: z.enum(['VIP', 'GOLD', 'SILVER']),
  notes: z.string().max(500, "Ghi chú không quá 500 ký tự").optional()
});

const CustomerCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerType: 'INDIVIDUAL',
      membership: 'SILVER',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      address: '',
      companyName: '',
      notes: ''
    }
  });

  const customerType = watch('customerType');
  const membership = watch('membership');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // 1. Lấy danh sách khách hàng hiện tại để check trùng SĐT và Email
      const customers = await salesService.getCustomers();
      
      const phoneInputClean = data.phoneNumber.trim().replace(/\s+/g, '');
      const emailInputClean = data.email ? data.email.trim().toLowerCase() : '';
      
      let hasError = false;
      
      // 2. Kiểm tra trùng SĐT
      const phoneDuplicate = customers.find(c => {
        const cPhone = c.phoneNumber ? c.phoneNumber.trim().replace(/\s+/g, '') : 
                       c.phone ? c.phone.trim().replace(/\s+/g, '') : '';
        return cPhone === phoneInputClean;
      });
      
      if (phoneDuplicate) {
        setError('phoneNumber', {
          type: 'manual',
          message: 'Số điện thoại này đã được đăng ký bởi khách hàng khác!'
        });
        hasError = true;
      }
      
      // 3. Kiểm tra trùng Email (nếu người dùng có nhập email)
      if (emailInputClean) {
        const emailDuplicate = customers.find(c => {
          const cEmail = c.email ? c.email.trim().toLowerCase() : '';
          return cEmail === emailInputClean;
        });
        
        if (emailDuplicate) {
          setError('email', {
            type: 'manual',
            message: 'Email này đã được đăng ký bởi khách hàng khác!'
          });
          hasError = true;
        }
      }
      
      if (hasError) {
        setLoading(false);
        return; // Dừng lại không tạo mới
      }

      await salesService.createCustomer({
        ...data,
        status: 'ACTIVE',
        createAt: new Date().toISOString()
      });
      navigate('/sales/customers', { 
        state: { 
          toastMessage: `Đã thêm khách hàng "${data.lastName} ${data.firstName}" thành công!`,
          toastType: 'success'
        } 
      });
    } catch (error) {
      console.error("Lỗi khi tạo khách hàng:", error);
      navigate('/sales/customers', { 
        state: { 
          toastMessage: "Có lỗi xảy ra khi tạo khách hàng. Vui lòng thử lại.",
          toastType: 'error'
        } 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-10">
      
      {/* 1. Header Section */}
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4 px-2 md:px-0">
        <div className="space-y-1 max-w-full sm:max-w-[50%] lg:max-w-none">
          <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
            Thêm khách hàng mới
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Hệ thống đang{' '}
            <span className="inline-block text-[#00288E] font-bold bg-blue-50 px-2 py-0.5 rounded-lg animate-fade-in mx-1 align-middle">
              sẵn sàng thiết lập
            </span>{' '}
            hồ sơ khách hàng tiềm năng mới
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 lg:relative lg:top-0 lg:translate-y-0">
          <button 
            onClick={() => navigate('/sales/customers')}
            className="px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-slate-300 text-slate-400 bg-white hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95 shrink-0"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="group flex items-center justify-center gap-2 bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-900/10 border-2 border-[#00288E] active:scale-95 disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current rounded-full animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined text-sm sm:text-base group-hover:rotate-12 transition-transform" aria-hidden="true">save</span>
            )}
            <span className="inline sm:hidden lg:inline">Lưu hồ sơ khách hàng</span>
            <span className="hidden sm:inline lg:hidden">Lưu hồ sơ</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1 md:pr-2 pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col xl:flex-row gap-8 mx-2 md:mx-0">
          
          {/* CỘT TRÁI (Nội dung chính) */}
          <div className="xl:flex-[2] flex flex-col gap-8">
          
            {/* Box Thông tin định danh */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">person</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thông tin định danh</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Họ tên & Liên lạc cơ bản</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label htmlFor="customer_last_name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Họ & Tên đệm *</label>
                  <input 
                    id="customer_last_name"
                    {...register('lastName')}
                    type="text" 
                    placeholder="VD: Nguyễn Văn" 
                    autoComplete="family-name"
                    className={`w-full bg-slate-50 border-2 ${errors.lastName ? 'border-red-100' : 'border-transparent'} rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700`} 
                  />
                  {errors.lastName && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="customer_first_name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tên gọi *</label>
                  <input 
                    id="customer_first_name"
                    {...register('firstName')}
                    type="text" 
                    placeholder="VD: An" 
                    autoComplete="given-name"
                    className={`w-full bg-slate-50 border-2 ${errors.firstName ? 'border-red-100' : 'border-transparent'} rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700`} 
                  />
                  {errors.firstName && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.firstName.message}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="customer_phone" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Số điện thoại *</label>
                  <input 
                    id="customer_phone"
                    {...register('phoneNumber')}
                    type="tel" 
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="090 123 4567" 
                    className={`w-full bg-slate-50 border-2 ${errors.phoneNumber ? 'border-red-100' : 'border-transparent'} rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700`} 
                  />
                  {errors.phoneNumber && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.phoneNumber.message}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="customer_email" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Địa chỉ Email</label>
                  <input 
                    id="customer_email"
                    {...register('email')}
                    type="email" 
                    placeholder="example@hizo.group" 
                    autoComplete="email"
                    spellCheck={false}
                    className={`w-full bg-slate-50 border-2 ${errors.email ? 'border-red-100' : 'border-transparent'} rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700`} 
                  />
                  {errors.email && <p className="text-[10px] font-black text-red-500 uppercase mt-1 ml-1">{errors.email.message}</p>}
                </div>
              </div>
            </div>

            {/* Box Địa chỉ & Công ty */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-600">location_on</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Địa chỉ & Công tác</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nơi cư trú và thông tin doanh nghiệp</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {customerType === 'CORPORATE' && (
                  <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                    <label htmlFor="customer_company_name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tên doanh nghiệp / Công ty</label>
                    <input 
                      id="customer_company_name"
                      {...register('companyName')}
                      type="text" 
                      placeholder="Công ty TNHH Hizo Group" 
                      autoComplete="organization"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700" 
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="customer_address" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Địa chỉ thường trú / Trụ sở</label>
                  <textarea 
                    id="customer_address"
                    {...register('address')}
                    rows="3" 
                    placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện…" 
                    autoComplete="street-address"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700 resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (Phân loại & Ghi chú) */}
          <div className="xl:flex-[1] flex flex-col gap-8">
            
            {/* Box Phân loại đối tượng */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-600">sell</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Phân loại</h3>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">Loại khách hàng</label>
                  <div className="flex bg-slate-50 rounded-2xl p-1.5 gap-1" role="radiogroup" aria-label="Loại khách hàng">
                    <button 
                      type="button"
                      role="radio"
                      aria-checked={customerType === 'INDIVIDUAL'}
                      onClick={() => setValue('customerType', 'INDIVIDUAL')}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${customerType === 'INDIVIDUAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Cá nhân
                    </button>
                    <button 
                      type="button"
                      role="radio"
                      aria-checked={customerType === 'CORPORATE'}
                      onClick={() => setValue('customerType', 'CORPORATE')}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${customerType === 'CORPORATE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Doanh nghiệp
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">Hạng thành viên</label>
                  <div className="flex flex-col gap-3" role="radiogroup" aria-label="Hạng thành viên">
                    <MembershipCard 
                      id="VIP" 
                      active={membership === 'VIP'} 
                      onClick={() => setValue('membership', 'VIP')}
                      title="VIP Member" 
                      desc="Ưu tiên phục vụ hạng A"
                      icon={<span className="material-symbols-outlined text-[24px] font-black text-amber-500">diamond</span>}
                    />
                    <MembershipCard 
                      id="GOLD" 
                      active={membership === 'GOLD'} 
                      onClick={() => setValue('membership', 'GOLD')}
                      title="Gold Member" 
                      desc="Khách hàng thân thiết"
                      icon={<span className="material-symbols-outlined text-[24px] font-black text-yellow-500">workspace_premium</span>}
                    />
                    <MembershipCard 
                      id="SILVER" 
                      active={membership === 'SILVER'} 
                      onClick={() => setValue('membership', 'SILVER')}
                      title="Silver Member" 
                      desc="Khách hàng phổ thông"
                      icon={<span className="material-symbols-outlined text-[24px] font-black text-slate-400">military_tech</span>}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Box Ghi chú */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600">edit_note</span>
                </div>
                <label htmlFor="customer_notes" className="text-lg font-black text-slate-900 uppercase tracking-tight cursor-pointer">Ghi chú nội bộ</label>
              </div>
              <textarea 
                id="customer_notes"
                {...register('notes')}
                rows="4" 
                placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt…" 
                autoComplete="off"
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-all text-slate-700 resize-none mb-3"
              ></textarea>
              <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest px-1">
                <span>Tối đa 500 ký tự</span>
                <span className={watch('notes')?.length > 500 ? 'text-red-500' : ''}>
                  Đã nhập: {watch('notes')?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const MembershipCard = ({ active, onClick, title, desc, icon }) => (
  <div 
    onClick={onClick}
    role="radio"
    aria-checked={active}
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${active ? 'border-blue-600 bg-blue-50/30 shadow-md shadow-blue-500/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-blue-600 bg-white' : 'border-slate-300 bg-white'}`}>
        {active && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-in zoom-in duration-200"></div>}
      </div>
      <div>
        <p className={`font-black text-sm uppercase tracking-tight ${active ? 'text-blue-600' : 'text-slate-900'}`}>{title}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{desc}</p>
      </div>
    </div>
    <div className={`transition-all ${active ? 'scale-110' : 'opacity-80'}`} aria-hidden="true">{icon}</div>
  </div>
);

export default CustomerCreate;