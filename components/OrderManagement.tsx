
import React, { useState, useRef, useEffect } from 'react';
import { AppState, OrderStatus, Order } from '../types';
import { CURRENCY } from '../constants';
import * as XLSX from 'xlsx';

interface OrderManagementProps {
  state: AppState;
  initialFilter?: OrderStatus | 'Бүгд';
  onUpdateStatus: (orderId: string, updates: Partial<Order>) => Promise<void>;
  onAddDriver: (name: string) => void;
  onAddPaymentMethod: (name: string) => void;
  onRemovePaymentMethod: (name: string) => void;
  onRemoveDriver: (name: string) => void;
}

// Copy Button Component for cleaner code
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents card click (multi-select) when copying
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy} 
      className="mx-1.5 p-1 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-indigo-600 active:scale-90"
      title="Хуулж авах"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
};

const OrderManagement: React.FC<OrderManagementProps> = ({ 
  state, 
  initialFilter = 'Бүгд',
  onUpdateStatus, 
  onAddDriver, 
  onAddPaymentMethod, 
  onRemovePaymentMethod, 
  onRemoveDriver 
}) => {
  const [filter, setFilter] = useState<OrderStatus | 'Бүгд'>(initialFilter);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  
  const [deliverOrderId, setDeliverOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryDriver, setDeliveryDriver] = useState('');

  const [activeSelect, setActiveSelect] = useState<'payment' | 'driver' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Multi-selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilter(initialFilter);
    setSelectedOrderIds(new Set()); // Clear selection when filter changes
  }, [initialFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveSelect(null);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOrders = state.orders.filter(o => filter === 'Бүгд' || o.status === filter);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('mn-MN').format(value) + CURRENCY;
  };

  const handleCancelSubmit = async () => {
    if (cancelOrderId && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onUpdateStatus(cancelOrderId, { 
          status: OrderStatus.CANCELLED, 
          cancelledReason: cancelReason 
        });
        setCancelOrderId(null);
        setCancelReason('');
      } catch (err: any) {
        alert("Захиалга цуцлахад алдаа гарлаа: " + err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeliverSubmit = async () => {
    if (deliverOrderId && paymentMethod && deliveryDriver && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onUpdateStatus(deliverOrderId, { 
          status: OrderStatus.DELIVERED, 
          paymentMethod, 
          deliveryDriver 
        });
        setDeliverOrderId(null);
        setPaymentMethod('');
        setDeliveryDriver('');
        setSearchTerm('');
      } catch (err: any) {
        alert("Төлөв шинэчлэхэд алдаа гарлаа: " + err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const toggleSelectOrder = (id: string) => {
    const newSelection = new Set(selectedOrderIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedOrderIds(newSelection);
  };

  const selectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const downloadXlsx = () => {
    if (selectedOrderIds.size === 0) return;

    const selectedOrders = state.orders.filter(o => selectedOrderIds.has(o.id));
    
    // Helper function to capitalize first letter
    const capitalize = (val: any) => {
      if (typeof val !== 'string' || !val) return val;
      return val.charAt(0).toUpperCase() + val.slice(1);
    };

    const excelData = selectedOrders.map(order => ({
      'Хүлээн авагчийн нэр': capitalize(order.customerName),
      'Хүлээн авагчийн утас': order.customerPhone,
      'Дүүрэг': '',
      'Дэлгэрэнгүй хаяг': capitalize(order.customerAddress),
      'Ачааны нэр': capitalize(order.items.map(i => i.name).join(', ')),
      'Хүргэлт хийх үнэ': 8000,
      'Ангилал': 'Бусад',
      'Шинж чанар': 'Энгийн',
      'Тоо ширхэг': order.items.reduce((sum, item) => sum + item.quantity, 0),
      'Хэмжих нэгж': 'Ширхэг',
      'Төлбөр төлөгч тал': 'Илгээгч'
    }));

    // Create worksheet and add data starting from A2 (Row 2) to leave Row 1 empty
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.sheet_add_json(worksheet, excelData, { origin: "A2" });
    
    // 1. Merge Row 1 from A1 to K1
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }
    ];

    // 2. Format cells (Borders and Center alignment)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:K1");
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[addr]) continue;
        
        if (R >= 1) { 
          worksheet[addr].s = {
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            }
          };
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    const wscols = [
      {wch: 25}, {wch: 15}, {wch: 15}, {wch: 40}, {wch: 35}, {wch: 18}, {wch: 12}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 18}
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Захиалгууд_${new Date().toLocaleDateString()}.xlsx`);
  };

  const getFilteredItems = () => {
    const items = activeSelect === 'payment' ? state.paymentMethods : state.drivers;
    return items.filter(i => i.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-black text-slate-900">Захиалга</h1>
        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
          {['Бүгд', OrderStatus.PENDING, OrderStatus.DELIVERED, OrderStatus.CANCELLED].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`px-5 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                filter === s 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {s === OrderStatus.PENDING ? `Илгээх (${state.orders.filter(o => o.status === OrderStatus.PENDING).length})` : s}
            </button>
          ))}
        </div>
      </header>

      {/* Bulk Actions Header */}
      {selectedOrderIds.size > 0 && (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border border-indigo-100 p-4 rounded-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
              {selectedOrderIds.size} захиалга сонгосон
            </span>
            <button onClick={selectAll} className="text-xs font-bold text-slate-500 hover:text-slate-900">
              {selectedOrderIds.size === filteredOrders.length ? 'Сонголтыг цуцлах' : 'Бүгдийг сонгох'}
            </button>
          </div>
          <button 
            onClick={downloadXlsx}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>Excel файл татаж авах</span>
          </button>
        </div>
      )}

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div 
            key={order.id} 
            onClick={() => filter === OrderStatus.PENDING && toggleSelectOrder(order.id)}
            className={`bg-white rounded-xl border transition-all overflow-hidden flex flex-col md:flex-row min-h-[180px] relative cursor-pointer ${
              selectedOrderIds.has(order.id) ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-100 hover:border-slate-300 shadow-sm'
            }`}
          >
            {/* Multi-select indicator */}
            {filter === OrderStatus.PENDING && (
              <div className="absolute top-4 left-4 z-10">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  selectedOrderIds.has(order.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'
                }`}>
                  {selectedOrderIds.has(order.id) && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                  )}
                </div>
              </div>
            )}

            <div className={`w-full md:w-1/4 p-6 border-r border-slate-50 space-y-3 ${filter === OrderStatus.PENDING ? 'pl-14' : ''}`}>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black text-slate-900">#{order.id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center ${
                  order.status === OrderStatus.PENDING ? 'bg-orange-50 text-orange-400' :
                  order.status === OrderStatus.DELIVERED ? 'bg-emerald-50 text-emerald-400' :
                  'bg-rose-50 text-rose-400'
                }`}>
                  {order.status === OrderStatus.PENDING && <span className="w-2 h-2 rounded-full bg-orange-400 mr-1 animate-pulse" />}
                  {order.status === OrderStatus.DELIVERED && <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                  {order.status === OrderStatus.CANCELLED && <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>}
                  {order.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {order.date}, {order.timestamp}
              </div>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center text-xs text-slate-600 font-bold group/row">
                  <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                  <CopyButton text={order.customerName} />
                  <span className="truncate">{order.customerName}</span>
                </div>
                <div className="flex items-center text-xs text-slate-600 font-bold group/row">
                  <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 005.47 5.47l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                  <CopyButton text={order.customerPhone} />
                  <span>{order.customerPhone}</span>
                </div>
                <div className="flex items-start text-xs text-slate-600 font-bold group/row">
                  <svg className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                  <CopyButton text={order.customerAddress} />
                  <span className="flex-1 line-clamp-2 leading-relaxed">{order.customerAddress}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Захиалсан бараанууд:</p>
              <div className="flex flex-wrap gap-2">
                {order.items.map((item, idx) => (
                  <span key={idx} className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-700">
                    {item.name} <span className="text-slate-400 ml-1">x{item.quantity}</span>
                  </span>
                ))}
              </div>

              {order.status === OrderStatus.CANCELLED && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                    Цуцлах шалтгаан:
                  </p>
                  <p className="text-xs text-rose-600 font-bold mt-1">{order.cancelledReason || 'Мэдээлэлгүй'}</p>
                  <p className="text-[9px] text-rose-400 mt-2 font-black uppercase">Цуцалсан: {order.processedBy}</p>
                </div>
              )}

              {order.status === OrderStatus.DELIVERED && (
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[11px] font-bold gap-2">
                    <span className="text-emerald-700">Төлбөр: <span className="text-slate-900 ml-1">{order.paymentMethod}</span></span>
                    <span className="text-emerald-700">Хүргэсэн: <span className="text-slate-900 ml-1">{order.deliveryDriver}</span></span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-100/50">
                    <p className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-tighter">Төлөв шинэчилсэн: {order.processedBy}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full md:w-1/4 p-6 flex flex-col items-end justify-between border-l border-slate-50">
              <span className="text-2xl font-black text-indigo-600">{formatCurrency(order.amount)}</span>
              
              {order.status === OrderStatus.PENDING && (
                <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => setCancelOrderId(order.id)}
                    className="p-2.5 rounded-lg border-2 border-rose-500 text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  <button 
                    onClick={() => setDeliverOrderId(order.id)}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-[#10b981] hover:bg-[#0da070] text-white font-bold rounded-lg shadow-lg shadow-emerald-100 transition-all active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V14a1 1 0 01-1 1H13z"/></svg>
                    <span>Хүргэсэн</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {cancelOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Захиалга цуцлах</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Шалтгаан оруулах</label>
                <textarea 
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all h-24 resize-none"
                  placeholder="Жишээ: Буцаасан, Сонголт буруу..."
                />
              </div>
              <div className="flex space-x-2.5 pt-1">
                <button disabled={isSubmitting} onClick={() => setCancelOrderId(null)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Болих</button>
                <button disabled={isSubmitting || !cancelReason} onClick={handleCancelSubmit} className="flex-1 py-3 bg-rose-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-100 active:scale-95 transition-all flex items-center justify-center space-x-2">
                  {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{isSubmitting ? 'Хүлээх...' : 'Цуцлах'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deliverOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-visible p-8 relative mx-auto">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-emerald-100 text-[#10b981] rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V14a1 1 0 01-1 1H13z"/></svg>
              </div>
              <h2 className="text-xl font-black text-slate-800">Хүргэлтийн мэдээлэл</h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5 relative" ref={activeSelect === 'payment' ? dropdownRef : null}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Төлбөрийн хэлбэр</label>
                <div 
                  className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center cursor-pointer transition-all ${activeSelect === 'payment' ? 'ring-2 ring-emerald-500/10 border-emerald-400' : ''}`}
                  onClick={() => { setActiveSelect(activeSelect === 'payment' ? null : 'payment'); setSearchTerm(''); }}
                >
                  <span className={`text-sm font-bold ${paymentMethod ? 'text-slate-800' : 'text-slate-400'}`}>{paymentMethod || 'Сонгох...'}</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                </div>
                {activeSelect === 'payment' && (
                  <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-1">
                    <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                      <input 
                        autoFocus
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-xs p-1 bg-transparent outline-none font-bold"
                        placeholder="Хайх..."
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {getFilteredItems().map(pm => (
                        <div 
                          key={pm}
                          onClick={() => { setPaymentMethod(pm); setActiveSelect(null); setSearchTerm(''); }}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 group cursor-pointer"
                        >
                          <span className="text-sm font-bold text-slate-700">{pm}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onRemovePaymentMethod(pm); }}
                            className="text-rose-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      ))}
                      {searchTerm && !state.paymentMethods.includes(searchTerm) && (
                        <button 
                          onClick={() => { onAddPaymentMethod(searchTerm); setPaymentMethod(searchTerm); setActiveSelect(null); }}
                          className="w-full text-left px-5 py-3.5 border-t border-slate-50 text-indigo-600 font-black text-xs hover:bg-indigo-50"
                        >
                          + "{searchTerm}" нэмэх
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 relative" ref={activeSelect === 'driver' ? dropdownRef : null}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Хүргэлтийн ажилтан</label>
                <div 
                  className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center cursor-pointer transition-all ${activeSelect === 'driver' ? 'ring-2 ring-emerald-500/10 border-emerald-400' : ''}`}
                  onClick={() => { setActiveSelect(activeSelect === 'driver' ? null : 'driver'); setSearchTerm(''); }}
                >
                  <span className={`text-sm font-bold ${deliveryDriver ? 'text-slate-800' : 'text-slate-400'}`}>{deliveryDriver || 'Сонгох...'}</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                </div>
                {activeSelect === 'driver' && (
                  <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-1">
                    <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                      <input 
                        autoFocus
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-xs p-1 bg-transparent outline-none font-bold"
                        placeholder="Хайх..."
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {getFilteredItems().map(d => (
                        <div 
                          key={d}
                          onClick={() => { setDeliveryDriver(d); setActiveSelect(null); setSearchTerm(''); }}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 group cursor-pointer"
                        >
                          <span className="text-sm font-bold text-slate-700">{d}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveDriver(d); }}
                            className="text-rose-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      ))}
                      {searchTerm && !state.drivers.includes(searchTerm) && (
                        <button 
                          onClick={() => { onAddDriver(searchTerm); setDeliveryDriver(searchTerm); setActiveSelect(null); }}
                          className="w-full text-left px-5 py-3.5 border-t border-slate-50 text-indigo-600 font-black text-xs hover:bg-indigo-50"
                        >
                          + "{searchTerm}" нэмэх
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3 mt-10">
              <button 
                disabled={isSubmitting}
                onClick={() => setDeliverOrderId(null)} 
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all"
              >
                Болих
              </button>
              <button 
                disabled={!paymentMethod || !deliveryDriver || isSubmitting}
                onClick={handleDeliverSubmit} 
                className="flex-[2] py-4 bg-[#10b981] disabled:opacity-50 text-white font-black rounded-2xl hover:bg-[#0da070] transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2"
              >
                {isSubmitting && <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{isSubmitting ? 'Бүртгэж байна...' : 'Баталгаажуулах'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
