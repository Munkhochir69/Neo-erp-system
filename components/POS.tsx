
import React, { useState, useMemo } from 'react';
import { AppState, InventoryItem, UserRole } from '../types';
import { CURRENCY } from '../constants';

// Define interface for cart items to fix type inference issues
interface CartItem {
  item: InventoryItem;
  quantity: number;
}

interface POSProps {
  state: AppState;
  onOrder: (orderData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    district?: string;
    customerLink?: string;
    repId?: string;
    items: { productId: string; name: string; quantity: number; price: number }[];
  }) => Promise<boolean>;
  onFinish: () => void;
}

const DISTRICTS = [
  'Баянгол', 'Баянзүрх', 'Сонгинохайрхан', 'Сүхбаатар', 'Хан-Уул', 'Чингэлтэй', 'Налайх', 'Багануур', 'Багахангай'
];

const POS: React.FC<POSProps> = ({ state, onOrder, onFinish }) => {
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    district: '',
    detailedAddress: '',
    link: '',
    repId: ''
  });

  const categories = useMemo(() => {
    const cats = state.inventory.map(item => item.category).filter(Boolean);
    return ['All', ...Array.from(new Set(cats))];
  }, [state.inventory]);

  const isAdminOrManager = state.currentUser.role === UserRole.ADMIN || state.currentUser.role === UserRole.SALES_MANAGER;
  const salesReps = useMemo(() => state.users.filter(u => u.role === UserRole.SALES_REP), [state.users]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('mn-MN').format(value) + CURRENCY;
  };

  const addToCart = (item: InventoryItem) => {
    if (item.stock <= 0) return;
    const newCart = new Map<string, CartItem>(cart);
    const entry = newCart.get(item.id);
    if (entry) {
      if (entry.quantity < item.stock) {
        newCart.set(item.id, { ...entry, quantity: entry.quantity + 1 });
      }
    } else {
      newCart.set(item.id, { item, quantity: 1 });
    }
    setCart(newCart);
  };

  const removeFromCart = (itemId: string) => {
    const newCart = new Map<string, CartItem>(cart);
    newCart.delete(itemId);
    setCart(newCart);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const newCart = new Map<string, CartItem>(cart);
    const entry = newCart.get(itemId);
    if (entry) {
      const newQty = Math.max(1, entry.quantity + delta);
      if (newQty <= entry.item.stock) {
        newCart.set(itemId, { ...entry, quantity: newQty });
        setCart(newCart);
      }
    }
  };

  const filteredItems = useMemo(() => {
    return state.inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [state.inventory, searchQuery, selectedCategory]);

  const totalAmount: number = Array.from(cart.values()).reduce<number>((sum, entry: CartItem) => sum + entry.item.price * entry.quantity, 0);
  const totalItemsCount: number = Array.from(cart.values()).reduce<number>((sum, entry: CartItem) => sum + entry.quantity, 0);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length <= 8) {
      setFormData({ ...formData, phone: val });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    // Explicit Validation
    if (cart.size === 0) {
      alert('Сагс хоосон байна. Бараа сонгоно уу.');
      return;
    }
    if (!formData.name.trim()) {
      alert('Үйлчлүүлэгчийн нэрийг оруулна уу.');
      return;
    }
    if (formData.phone.length !== 8) {
      alert('Утасны дугаар заавал 8 оронтой тоо байх ёстой.');
      return;
    }
    if (!formData.district) {
      alert('Дүүрэг сонгоно уу.');
      return;
    }
    if (!formData.detailedAddress.trim()) {
      alert('Дэлгэрэнгүй хаяг оруулна уу.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onOrder({
        customerName: formData.name,
        customerPhone: formData.phone,
        customerAddress: formData.detailedAddress,
        district: formData.district,
        customerLink: formData.link,
        repId: formData.repId || undefined,
        items: Array.from(cart.values()).map((entry: CartItem) => ({
          productId: entry.item.id,
          name: entry.item.name,
          quantity: entry.quantity,
          price: entry.item.price
        }))
      });

      if (success) {
        setCart(new Map());
        setFormData({ name: '', phone: '', district: '', detailedAddress: '', link: '', repId: '' });
        setShowOrderModal(false);
        setShowSuccessPopup(true);
      }
    } catch (err: any) {
      console.error("POS Submission error:", err);
      alert("Захиалга бүртгэхэд алдаа гарлаа: " + (err.message || "Мэдээллийн сантай холбогдож чадсангүй."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setShowSuccessPopup(false);
    onFinish();
  };

  const handleStay = () => {
    setShowSuccessPopup(false);
  };

  return (
    <div className="flex flex-col xl:flex-row h-full overflow-hidden gap-6 animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Борлуулалт</h1>
          <div className="relative w-full md:w-64 lg:w-80">
            <input
              type="text"
              placeholder="Бараа хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-10 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            />
            <svg className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-6 overflow-x-auto custom-scrollbar pb-2 no-wrap whitespace-nowrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all border flex-shrink-0 ${
                selectedCategory === cat 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[400px]">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                className={`bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col ${item.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="aspect-square bg-slate-50 flex items-center justify-center p-2 relative overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  {item.stock <= 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">Дууссан</span>
                    </div>
                  )}
                </div>
                <div className="p-3 md:p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-800 text-[11px] md:text-sm mb-1 truncate">{item.name}</h3>
                  <p className="text-[10px] md:text-[11px] text-slate-400 mb-2">Үлдэгдэл: {item.stock}</p>
                  <p className="mt-auto text-blue-600 font-bold text-xs md:text-sm">{formatCurrency(item.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full xl:w-96 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex-shrink-0 lg:max-h-[80vh] xl:max-h-full">
        <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="font-bold text-slate-800">Сагс</h2>
          </div>
          <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{totalItemsCount}</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-[150px]">
          {cart.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-30">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              <p className="text-xs font-bold uppercase tracking-widest">Хоосон байна</p>
            </div>
          ) : Array.from(cart.values()).map((entry: CartItem) => (
            <div key={entry.item.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2 overflow-hidden">
                   <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{entry.item.name}</h4>
                    <p className="text-[10px] text-slate-400">{formatCurrency(entry.item.price)}</p>
                  </div>
                </div>
                <button onClick={() => removeFromCart(entry.item.id)} className="text-rose-400 hover:text-rose-600 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button onClick={() => updateQuantity(entry.item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm">-</button>
                <span className="text-sm font-black w-6 text-center">{entry.quantity}</span>
                <button onClick={() => updateQuantity(entry.item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-50 bg-white">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-500 font-bold text-sm">Нийт дүн</span>
            <span className="text-xl md:text-2xl font-black text-slate-900">{formatCurrency(totalAmount)}</span>
          </div>
          <button
            disabled={cart.size === 0 || isSubmitting}
            onClick={() => setShowOrderModal(true)}
            className="w-full bg-blue-600 disabled:bg-slate-200 hover:bg-blue-700 text-white py-4.5 rounded-2xl font-black text-sm md:text-base transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
          >
            {isSubmitting ? 'Бүртгэж байна...' : 'Захиалга баталгаажуулах'}
          </button>
        </div>
      </div>

      {showOrderModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            <div className="bg-[#0f172a] p-6 md:p-8 text-white flex justify-between items-center">
              <h2 className="text-xl font-black">Захиалгын мэдээлэл</h2>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                {isAdminOrManager && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Борлуулагч сонгох</label>
                    <select 
                      value={formData.repId} 
                      onChange={e => setFormData({...formData, repId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Өөрийн нэр дээр бүртгэх</option>
                      {salesReps.map(rep => (
                        <option key={rep.id} value={rep.id}>{rep.username}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Үйлчлүүлэгчийн нэр</label>
                  <input required type="text" placeholder="Д.Бат" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Утасны дугаар (8 оронтой тоо)</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="99112233" 
                    value={formData.phone} 
                    onChange={handlePhoneChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                  />
                </div>
                
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Дүүрэг</label>
                  <select 
                    required 
                    value={formData.district} 
                    onChange={e => setFormData({...formData, district: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Сонгох...</option>
                    {DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Дэлгэрэнгүй хаяг</label>
                  <textarea required rows={2} placeholder="Хороо, гудамж, байр, тоот..." value={formData.detailedAddress} onChange={e => setFormData({...formData, detailedAddress: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Линк (Facebook гэх мэт)</label>
                  <input type="text" placeholder="https://facebook.com/..." value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setShowOrderModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4.5 rounded-2xl font-black text-sm transition-all">Буцах</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all">
                  {isSubmitting ? 'Бүртгэж байна...' : 'Баталгаажуулах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Амжилттай!</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">Шинэ захиалга системд бүртгэгдлээ.</p>
            <div className="space-y-3">
              <button 
                onClick={handleStay}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-lg transition-all"
              >
                Дахин борлуулалт хийх
              </button>
              <button 
                onClick={handleFinish}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black transition-all"
              >
                Захиалгууд харах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
