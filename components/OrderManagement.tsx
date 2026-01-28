
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, OrderStatus, Order, UserRole } from '../types';
import { CURRENCY } from '../constants';

interface OrderManagementProps {
  state: AppState;
  isHistoryMode?: boolean;
  initialFilter?: OrderStatus | 'Бүгд';
  onUpdateStatus: (orderId: string, updates: Partial<Order>) => Promise<void>;
  onAddDriver: (name: string) => void;
  onAddPaymentMethod: (name: string) => void;
  onRemovePaymentMethod: (name: string) => void;
  onRemoveDriver: (name: string) => void;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy} 
      className="p-1 hover:bg-slate-100 rounded transition-all text-slate-300 hover:text-indigo-600 flex-shrink-0"
      title="Хуулах"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );
};

const OrderManagement: React.FC<OrderManagementProps> = ({ 
  state, isHistoryMode = false, initialFilter = 'Бүгд', onUpdateStatus
}) => {
  const [filter, setFilter] = useState<OrderStatus | 'Бүгд'>(initialFilter);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [deliverOrderId, setDeliverOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryDriver, setDeliveryDriver] = useState('');
  const [activeSelect, setActiveSelect] = useState<'payment' | 'driver' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchRepId, setSearchRepId] = useState('');
  const [searchCustomerName, setSearchCustomerName] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdminOrManager = state.currentUser?.role === UserRole.ADMIN || state.currentUser?.role === UserRole.SALES_MANAGER;
  const salesReps = useMemo(() => state.users.filter(u => u.role === UserRole.SALES_REP), [state.users]);

  useEffect(() => { 
    setFilter(initialFilter); 
  }, [initialFilter]);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setActiveSelect(null); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelOrderId || !cancelReason.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onUpdateStatus(cancelOrderId, { status: OrderStatus.CANCELLED, cancelledReason: cancelReason });
      setCancelOrderId(null);
      setCancelReason('');
    } catch (err: any) { alert("Алдаа: " + err.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeliverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverOrderId || !paymentMethod || !deliveryDriver || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onUpdateStatus(deliverOrderId, { status: OrderStatus.DELIVERED, paymentMethod, deliveryDriver });
      setDeliverOrderId(null);
    } catch (err: any) { alert("Алдаа: " + err.message); } 
    finally { setIsSubmitting(false); }
  };

  const filteredOrders = useMemo(() => {
    return state.orders.filter(o => {
      if (isHistoryMode) {
        if (o.status !== OrderStatus.PAID && o.status !== OrderStatus.CANCELLED) return false;
      } else {
        if (o.status !== OrderStatus.PENDING && o.status !== OrderStatus.DELIVERED) return false;
      }
      const matchesStatus = filter === 'Бүгд' || o.status === filter;
      if (!matchesStatus) return false;
      if (startDate && o.date < startDate) return false;
      if (endDate && o.date > endDate) return false;
      if (searchCustomerName && !o.customerName?.toLowerCase().includes(searchCustomerName.toLowerCase())) return false;
      if (isHistoryMode && searchRepId && o.repId !== searchRepId) return false;
      return true;
    });
  }, [state.orders, isHistoryMode, filter, startDate, endDate, searchRepId, searchCustomerName]);

  const stats = useMemo(() => {
    return filteredOrders.reduce((acc, curr) => {
      acc.totalSales += Number(curr.amount || 0);
      acc.totalProfit += Number(curr.profit || 0);
      acc.orderCount += 1;
      acc.itemCount += curr.items.reduce((sum, i) => sum + i.quantity, 0);
      return acc;
    }, { totalSales: 0, totalProfit: 0, orderCount: 0, itemCount: 0 });
  }, [filteredOrders]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('mn-MN').format(val) + CURRENCY;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isHistoryMode ? 'Захиалгын түүх' : 'Идэвхтэй захиалга'}</h1>
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          {(isHistoryMode ? [OrderStatus.PAID, OrderStatus.CANCELLED] : [OrderStatus.PENDING, OrderStatus.DELIVERED]).map(s => (
            <button key={s} onClick={() => setFilter(s as any)} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${filter === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>{s}</button>
          ))}
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Эхлэх огноо</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Дуусах огноо</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
        </div>
        {isHistoryMode && (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Борлуулагч</label>
            <select value={searchRepId} onChange={e => setSearchRepId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none appearance-none cursor-pointer">
              <option value="">Бүгд</option>
              {salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.username}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Захиалагчийн нэр</label>
          <input type="text" placeholder="Хайх..." value={searchCustomerName} onChange={e => setSearchCustomerName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
        </div>
      </div>

      {/* Stats Dashboard - Only visible in History Mode */}
      {isHistoryMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4">
          <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Нийт борлуулалт</p>
            <p className="text-2xl font-black">{formatCurrency(stats.totalSales)}</p>
          </div>
          {isAdminOrManager && (
            <div className="bg-emerald-500 p-6 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Бохир ашиг</p>
              <p className="text-2xl font-black">{formatCurrency(stats.totalProfit)}</p>
            </div>
          )}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Барааны тоо / Захиалга</p>
              <p className="text-2xl font-black text-slate-900">{stats.itemCount} ш / {stats.orderCount} з</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Илэрц олдсонгүй</div>
        ) : filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 flex flex-col lg:flex-row gap-8 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            {/* Left: ID & User Details */}
            <div className="w-full lg:w-1/3 space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-black text-slate-900 tracking-tighter">#{order.id}</span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                  order.status === OrderStatus.CANCELLED ? 'bg-rose-50 text-rose-500' :
                  order.status === OrderStatus.PAID ? 'bg-emerald-50 text-emerald-400' :
                  'bg-blue-50 text-blue-500'
                }`}>{order.status}</span>
              </div>
              <p className="text-xs font-bold text-slate-400">{order.date}, {order.timestamp || '00:00:00'}</p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center text-slate-500 space-x-2">
                  <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  <CopyButton text={order.customerName} />
                  <span className="text-xs font-bold">{order.customerName}</span>
                </div>
                <div className="flex items-center text-slate-500 space-x-2">
                  <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  <CopyButton text={order.customerPhone} />
                  <span className="text-xs font-bold">{order.customerPhone}</span>
                </div>
                <div className="flex items-start text-indigo-600 space-x-2">
                  <svg className="w-4 h-4 opacity-30 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <CopyButton text={order.district || 'ДҮҮРЭГ БАЙХГҮЙ'} />
                  <span className="text-xs font-black uppercase tracking-tighter leading-tight">{(order.district || 'ДҮҮРЭГ БАЙХГҮЙ').toUpperCase()}</span>
                </div>
                <div className="flex items-start text-slate-500 space-x-2">
                  <svg className="w-4 h-4 opacity-30 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <CopyButton text={order.customerAddress} />
                  <span className="text-xs font-bold leading-tight">{order.customerAddress}</span>
                </div>
              </div>
            </div>

            {/* Middle: Items & Cancel Box */}
            <div className="flex-1 space-y-5">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ЗАХИАЛСАН БАРААНУУД:</h4>
                <div className="flex flex-wrap items-center gap-2">
                  {order.items.map((i, idx) => (
                    <span key={idx} className="bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl text-xs font-black text-slate-700 flex items-center">
                      {i.name} <span className="text-indigo-600 ml-1.5 font-black">x{i.quantity}</span>
                    </span>
                  ))}
                  {order.customerLink && (
                    <a 
                      href={order.customerLink} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                      ХОЛБООС
                    </a>
                  )}
                </div>
              </div>

              {order.status === OrderStatus.CANCELLED && (
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 space-y-2.5">
                  <div className="flex items-center text-rose-500 space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <h5 className="text-[10px] font-black uppercase tracking-widest">ЦУЦЛАГДАН ШАЛТГААН:</h5>
                  </div>
                  <p className="text-sm font-bold text-rose-800 leading-relaxed">{order.cancelledReason || 'Тайлбар байхгүй'}</p>
                </div>
              )}
            </div>

            {/* Right: Total & Final Actions */}
            <div className="w-full lg:w-1/4 flex flex-col items-end justify-center space-y-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">нийт дүн</p>
                <p className="text-4xl font-black text-indigo-600 tracking-tighter">{formatCurrency(order.amount)}</p>
              </div>
              
              {!isHistoryMode && (
                <div className="flex space-x-2.5 mt-2">
                  <button 
                    onClick={() => { setCancelOrderId(order.id); setCancelReason(''); }} 
                    className="p-3.5 border-2 border-rose-500 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-rose-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  {order.status === OrderStatus.PENDING && (
                    <button 
                      onClick={() => { setDeliverOrderId(order.id); setPaymentMethod(''); setDeliveryDriver(''); }} 
                      className="px-7 py-3.5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 text-sm"
                    >
                      Хүргэгдсэн
                    </button>
                  )}
                  {order.status === OrderStatus.DELIVERED && (
                    <button 
                      onClick={() => onUpdateStatus(order.id, { status: OrderStatus.PAID })} 
                      className="px-7 py-3.5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 text-sm"
                    >
                      Баталгаажуулах
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cancel Modal */}
      {cancelOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleCancelSubmit} className="space-y-6">
              <h2 className="text-xl font-black text-slate-900">Захиалга цуцлах</h2>
              <textarea 
                autoFocus 
                required 
                value={cancelReason} 
                onChange={e => setCancelReason(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none h-36 resize-none focus:ring-4 focus:ring-rose-500/10 transition-all" 
                placeholder="Цуцлах шалтгаан..." 
              />
              <div className="flex space-x-3">
                <button type="button" onClick={() => setCancelOrderId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Болих</button>
                <button type="submit" disabled={isSubmitting || !cancelReason.trim()} className="flex-[2] py-4 bg-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all active:scale-95">
                  {isSubmitting ? '...' : 'Цуцлах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deliver Modal */}
      {deliverOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleDeliverSubmit} className="space-y-6">
              <h2 className="text-xl font-black text-slate-900">Хүргэлтийн мэдээлэл</h2>
              <div className="space-y-4" ref={dropdownRef}>
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Төлбөрийн хэлбэр</label>
                  <div onClick={() => setActiveSelect(activeSelect === 'payment' ? null : 'payment')} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl cursor-pointer flex justify-between items-center mt-1 group hover:border-blue-300 transition-all">
                    <span className="font-bold text-sm">{paymentMethod || 'Сонгох...'}</span>
                    <svg className={`w-4 h-4 transition-transform ${activeSelect === 'payment' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                  </div>
                  {activeSelect === 'payment' && (
                    <div className="absolute w-full bg-white border border-slate-100 mt-2 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in slide-in-from-top-2 max-h-48 overflow-y-auto">
                      {state.paymentMethods.map(pm => (
                        <div key={pm} onClick={() => { setPaymentMethod(pm); setActiveSelect(null); }} className="p-4 hover:bg-slate-50 cursor-pointer font-bold text-sm border-b border-slate-50 last:border-0">{pm}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Хүргэгч</label>
                  <div onClick={() => setActiveSelect(activeSelect === 'driver' ? null : 'driver')} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl cursor-pointer flex justify-between items-center mt-1 group hover:border-blue-300 transition-all">
                    <span className="font-bold text-sm">{deliveryDriver || 'Сонгох...'}</span>
                    <svg className={`w-4 h-4 transition-transform ${activeSelect === 'driver' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                  </div>
                  {activeSelect === 'driver' && (
                    <div className="absolute w-full bg-white border border-slate-100 mt-2 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in slide-in-from-top-2 max-h-48 overflow-y-auto">
                      {state.drivers.map(d => (
                        <div key={d} onClick={() => { setDeliveryDriver(d); setActiveSelect(null); }} className="p-4 hover:bg-slate-50 cursor-pointer font-bold text-sm border-b border-slate-50 last:border-0">{d}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setDeliverOrderId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Болих</button>
                <button type="submit" disabled={!paymentMethod || !deliveryDriver || isSubmitting} className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                  {isSubmitting ? '...' : 'Баталгаажуулах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
