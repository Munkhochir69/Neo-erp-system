
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppState, InventoryItem } from '../types';
import { CURRENCY } from '../constants';

interface RestockManagementProps {
  state: AppState;
  onRestock: (itemId: string, quantity: number, mntCost: number, yuanCost: number, exchangeRate: number, date: string) => Promise<void>;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
}

type SortConfig = {
  key: 'stock';
  direction: 'asc' | 'desc';
} | null;

const RestockManagement: React.FC<RestockManagementProps> = ({ state, onRestock, onAddItem }) => {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [restockQty, setRestockQty] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // New Restock Metadata Fields
  const [costYuan, setCostYuan] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(485); // Default common rate
  const [restockDate, setRestockDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mntCost, setMntCost] = useState<number>(0);
  
  // New Item Form State
  const [newItemData, setNewItemData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    sku: '',
    category: '',
    stock: 0,
    reorderPoint: 5,
    price: 0,
    originalCost: 0,
    imageUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    let items = state.inventory.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig) {
      items.sort((a, b) => {
        if (sortConfig.direction === 'asc') return a.stock - b.stock;
        return b.stock - a.stock;
      });
    }

    return items;
  }, [state.inventory, searchQuery, sortConfig]);

  const selectedItem = useMemo(() => 
    state.inventory.find(i => i.id === selectedItemId), 
    [selectedItemId, state.inventory]
  );

  // Юань эсвэл ханш өөрчлөгдөхөд Төгрөг өртөгийг автоматаар тооцоолох
  useEffect(() => {
    if (costYuan > 0 && exchangeRate > 0) {
      setMntCost(Math.round(costYuan * exchangeRate));
    }
  }, [costYuan, exchangeRate]);

  // Бараа сонгогдох үед өмнөх өртөгийг талбарт оноох
  useEffect(() => {
    if (selectedItem) {
      setMntCost(selectedItem.originalCost || 0);
    }
  }, [selectedItemId, selectedItem]);

  const toggleSort = () => {
    if (!sortConfig) setSortConfig({ key: 'stock', direction: 'asc' });
    else if (sortConfig.direction === 'asc') setSortConfig({ key: 'stock', direction: 'desc' });
    else setSortConfig(null);
  };

  const handleSubmitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || restockQty <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onRestock(selectedItemId, restockQty, mntCost, costYuan, exchangeRate, restockDate);
      setShowSuccess(true);
      setRestockQty(0);
      setCostYuan(0);
      setMntCost(0);
      setSelectedItemId('');
      setSearchQuery('');
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      alert("Алдаа гарлаа: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddItem(newItemData);
      setShowAddModal(false);
      setNewItemData({
        name: '',
        sku: '',
        category: '',
        stock: 0,
        reorderPoint: 5,
        price: 0,
        originalCost: 0,
        imageUrl: ''
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      alert("Алдаа: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewItemData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const totalCostMNT = (mntCost * restockQty);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Бараа татан авалт</h1>
          <p className="text-slate-500 font-medium">Шинээр ирсэн бараануудыг системд бүртгэх.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 flex items-center space-x-2 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          <span>Шинэ бараа нэмэх</span>
        </button>
      </header>

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
          <span className="font-bold">Амжилттай бүртгэгдлээ.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-[700px]">
          <div className="mb-6 space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Бараа хайх / Сонгох</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Барааны нэр эсвэл SKU..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
              <svg className="w-5 h-5 absolute right-4 top-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-3xl bg-slate-50/30">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Зураг</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Нэр / SKU</th>
                  <th 
                    onClick={toggleSort}
                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center justify-end">
                      <span>Үлдэгдэл</span>
                      <svg className={`w-3 h-3 ml-1 transition-colors ${sortConfig ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
                        {sortConfig?.direction === 'desc' ? <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /> : <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />}
                      </svg>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                  <tr 
                    key={item.id} 
                    onClick={() => {
                      if (selectedItemId === item.id) {
                        setSelectedItemId('');
                        setSearchQuery('');
                      } else {
                        setSelectedItemId(item.id);
                        setSearchQuery(item.name);
                      }
                    }}
                    className={`cursor-pointer transition-all ${selectedItemId === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 bg-white rounded-lg overflow-hidden border border-slate-200">
                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-[10px]">N</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`font-bold text-xs ${selectedItemId === item.id ? 'text-white' : 'text-slate-900'}`}>{item.name}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-tighter ${selectedItemId === item.id ? 'text-white/70' : 'text-slate-400'}`}>SKU: {item.sku}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-xs">
                      {item.stock} ш
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest opacity-50">Бүртгэлтэй бараа олдсонгүй</div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-12 rounded-[3rem] text-white flex flex-col justify-center relative overflow-hidden h-[700px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl font-black tracking-tighter">Сонгосон бараанд нөөц нэмэх</h2>
            
            {selectedItem ? (
              <form onSubmit={handleSubmitRestock} className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 overflow-y-auto max-h-[550px] pr-2 custom-scrollbar">
                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 flex items-center space-x-6">
                  <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden shadow-2xl">
                    {selectedItem.imageUrl ? <img src={selectedItem.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-indigo-300 font-black text-2xl">N</div>}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white">{selectedItem.name}</h4>
                    <p className="text-sm text-indigo-400 font-bold">Одоо байгаа үлдэгдэл: {selectedItem.stock} ш</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Өмнөх өртөг: {new Intl.NumberFormat('mn-MN').format(selectedItem.originalCost)}₮</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Нэмэх тоо ширхэг</label>
                    <input 
                      required 
                      type="number" 
                      min="1"
                      value={restockQty} 
                      onChange={e => setRestockQty(parseInt(e.target.value) || 0)}
                      placeholder="Тоо..." 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-700" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Юань (Нэгж үнэ)</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      value={costYuan} 
                      onChange={e => setCostYuan(parseFloat(e.target.value) || 0)}
                      placeholder="¥0.00" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-700 text-amber-400" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ханш (₮)</label>
                    <input 
                      required 
                      type="number" 
                      value={exchangeRate} 
                      onChange={e => setExchangeRate(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all text-emerald-400" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Татан авалтын огноо</label>
                    <input 
                      required 
                      type="date" 
                      value={restockDate} 
                      onChange={e => setRestockDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Шинэ нэгж өртөг (₮)</label>
                  <input 
                    required 
                    type="number" 
                    value={mntCost} 
                    onChange={e => setMntCost(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-emerald-500/30 rounded-2xl px-5 py-4 text-2xl font-black outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all text-emerald-400" 
                  />
                  <p className="text-[9px] text-slate-500 font-bold ml-1 italic">* Юань болон ханшаас тооцоологдсон, засварлаж болно.</p>
                </div>

                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Шинэ үлдэгдэл болох нь:</span>
                    <span className="text-white font-black text-lg">{(selectedItem.stock + (restockQty || 0))} ш</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 border-t border-white/5 pt-4">
                    <span>Нийт зардал (Монгол мөнгөөр):</span>
                    <span className="text-emerald-400 font-black text-xl">{new Intl.NumberFormat('mn-MN').format(totalCostMNT)}₮</span>
                  </div>
                </div>

                <button
                  disabled={restockQty <= 0 || isSubmitting}
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white py-5 rounded-2xl font-black shadow-2xl shadow-indigo-500/40 transition-all flex items-center justify-center space-x-3 active:scale-[0.98]"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <span>Нөөц нэмэх & Өртөг шинэчлэх</span>}
                </button>
              </form>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-[2.5rem]">
                <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em]">Жагсаалтаас бараа сонгоно уу</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restock History Section */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Татан авалтын түүх</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Сүүлийн 100 татан авалт</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-y border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Огноо</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Барааны нэр</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Тоо ширхэг</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Юань (Нэгж)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ханш</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-indigo-600">Төгрөг (Өртөг)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {state.restockLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-500 whitespace-nowrap">{log.restock_date}</td>
                  <td className="px-6 py-4 font-black text-slate-900">{log.item_name}</td>
                  <td className="px-6 py-4 text-right font-black text-indigo-500">{log.quantity} ш</td>
                  <td className="px-6 py-4 text-right font-bold text-amber-500">¥{log.cost_yuan}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-400">{log.exchange_rate}₮</td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">{new Intl.NumberFormat('mn-MN').format(log.mnt_cost)}₮</td>
                </tr>
              ))}
              {state.restockLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Түүх байхгүй байна</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl my-auto animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900">Шинэ бараа бүртгэх</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddNewItem} className="p-8 space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0">
                  <div className="w-40 h-40 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {newItemData.imageUrl ? (
                      <img src={newItemData.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Зураг</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Барааны нэр</label>
                    <input required type="text" value={newItemData.name} onChange={e => setNewItemData({...newItemData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU код</label>
                    <input required type="text" value={newItemData.sku} onChange={e => setNewItemData({...newItemData, sku: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ангилал</label>
                    <input required type="text" value={newItemData.category} onChange={e => setNewItemData({...newItemData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Зарах үнэ</label>
                    <input required type="number" value={newItemData.price} onChange={e => setNewItemData({...newItemData, price: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Өртөг (Болзошгүй)</label>
                    <input required type="number" value={newItemData.originalCost} onChange={e => setNewItemData({...newItemData, originalCost: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Анхны үлдэгдэл</label>
                    <input required type="number" value={newItemData.stock} onChange={e => setNewItemData({...newItemData, stock: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Захиалах цэг</label>
                    <input required type="number" value={newItemData.reorderPoint} onChange={e => setNewItemData({...newItemData, reorderPoint: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex space-x-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4.5 bg-slate-100 text-slate-500 font-black rounded-2xl">Болих</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4.5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-100 active:scale-95 transition-all">
                  {isSubmitting ? 'Бүртгэж байна...' : 'Бараа нэмэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestockManagement;
