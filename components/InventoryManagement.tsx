
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppState, InventoryItem, UserRole } from '../types';
import { CURRENCY } from '../constants';

interface InventoryManagementProps {
  state: AppState;
  onUpdateItem: (item: InventoryItem) => Promise<void>;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
}

type SortConfig = {
  key: keyof InventoryItem;
  direction: 'asc' | 'desc';
} | null;

const InventoryManagement: React.FC<InventoryManagementProps> = ({ state, onUpdateItem, onAddItem }) => {
  const isAdmin = state.currentUser.role === UserRole.ADMIN;
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [isSaving, setIsSaving] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    sku: '',
    category: '',
    stock: 0,
    reorderPoint: 5,
    price: 0,
    originalCost: 0,
    imageUrl: ''
  });

  const uniqueCategories = useMemo(() => {
    const cats = state.inventory.map(item => item.category);
    return Array.from(new Set(cats)).filter(Boolean);
  }, [state.inventory]);

  const categorySuggestions = useMemo(() => {
    if (formData.category.length < 3) return [];
    return uniqueCategories.filter(c => 
      c.toLowerCase().includes(formData.category.toLowerCase()) && 
      c.toLowerCase() !== formData.category.toLowerCase()
    );
  }, [formData.category, uniqueCategories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategorySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedInventory = useMemo(() => {
    let items = [...state.inventory];
    if (sortConfig !== null) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === undefined || valB === undefined) return 0;
        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return items;
  }, [state.inventory, sortConfig]);

  const requestSort = (key: keyof InventoryItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
        setSortConfig({ key, direction });
      } else {
        setSortConfig(null);
      }
    } else {
      setSortConfig({ key, direction });
    }
  };

  const getSortIcon = (key: keyof InventoryItem) => {
    if (!sortConfig || sortConfig.key !== key) {
      return (
        <svg className="w-3 h-3 text-slate-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-3 h-3 text-blue-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-blue-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const formatCurrency = (num: number) => new Intl.NumberFormat('mn-MN').format(num) + CURRENCY;

  const handleEditClick = (item: InventoryItem) => {
    if (!isAdmin) return;
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      stock: item.stock,
      reorderPoint: item.reorderPoint,
      price: item.price,
      originalCost: item.originalCost,
      imageUrl: item.imageUrl || ''
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isJpg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
    
    if (!isJpg) {
      alert('ЗӨВХӨН JPG форматтай зураг оруулах боломжтой!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!isAdmin || isSaving) return;
    setIsSaving(true);
    try {
      if (editingItem) {
        await onUpdateItem({ ...formData, id: editingItem.id });
        setEditingItem(null);
      } else {
        await onAddItem(formData);
        setShowAddModal(false);
      }
      setFormData({ name: '', sku: '', category: '', stock: 0, reorderPoint: 5, price: 0, originalCost: 0, imageUrl: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Бараа материалын хяналт</h1>
          <p className="text-slate-500">Борлуулалтын үнэ болон үлдэгдлийг хянах.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Бүтээгдэхүүн нэмэх</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {isAdmin && <th className="px-4 py-4 w-10"></th>}
                  <th className="px-6 py-4 font-bold text-slate-500">Зураг</th>
                  <th onClick={() => requestSort('name')} className="px-6 py-4 font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group">
                    <div className="flex items-center">
                      Бүтээгдэхүүн {getSortIcon('name')}
                    </div>
                  </th>
                  <th onClick={() => requestSort('sku')} className="px-6 py-4 font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group">
                    <div className="flex items-center">
                      SKU {getSortIcon('sku')}
                    </div>
                  </th>
                  <th onClick={() => requestSort('category')} className="px-6 py-4 font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group">
                    <div className="flex items-center">
                      Ангилал {getSortIcon('category')}
                    </div>
                  </th>
                  <th onClick={() => requestSort('stock')} className="px-6 py-4 font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group">
                    <div className="flex items-center">
                      Үлдэгдэл {getSortIcon('stock')}
                    </div>
                  </th>
                  <th onClick={() => requestSort('price')} className="px-6 py-4 font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group">
                    <div className="flex items-center">
                      Зарах үнэ {getSortIcon('price')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {isAdmin && (
                      <td className="px-4 py-4">
                        <button onClick={() => handleEditClick(item)} className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-slate-100 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{item.name}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{item.sku}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 uppercase">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${item.stock <= item.reorderPoint ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.stock}
                        </span>
                        {item.stock <= item.reorderPoint && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{formatCurrency(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl">
            <h3 className="text-rose-800 font-bold mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Яаралтай захиалах
            </h3>
            <div className="space-y-4">
              {state.inventory.filter(i => i.stock <= i.reorderPoint).map(item => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-rose-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    <p className="text-xs text-rose-500 font-medium">Хязгаар: {item.reorderPoint} ширхэг</p>
                  </div>
                  {isAdmin && <button className="bg-rose-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-rose-700">Захиалах</button>}
                </div>
              ))}
              {state.inventory.filter(i => i.stock <= i.reorderPoint).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Барааны үлдэгдэл хангалттай байна.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (editingItem || showAddModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-visible">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900">{editingItem ? 'Бараа засах' : 'Шинэ бараа'}</h2>
              <button onClick={() => { setEditingItem(null); setShowAddModal(false); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center space-y-4 mb-4">
                <div className="w-32 h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Зураг оруулах (JPG)</p>
                    </div>
                  )}
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".jpg,.jpeg" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                {!formData.imageUrl && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Файл сонгох
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Бүтээгдэхүүний нэр</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                  <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1 relative" ref={categoryRef}>
                  <label className="text-xs font-bold text-slate-500 uppercase">Ангилал</label>
                  <input 
                    type="text" 
                    value={formData.category} 
                    onFocus={() => setShowCategorySuggestions(true)}
                    onChange={e => {
                      setFormData({...formData, category: e.target.value});
                      setShowCategorySuggestions(true);
                    }} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Жишээ: Ундаа"
                  />
                  {showCategorySuggestions && categorySuggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-50 mt-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                      {categorySuggestions.map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            setFormData({...formData, category: cat});
                            setShowCategorySuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Үлдэгдэл</label>
                  <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Захиалах цэг</label>
                  <input type="number" value={formData.reorderPoint} onChange={e => setFormData({...formData, reorderPoint: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Зарах үнэ</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Өртөг</label>
                  <input type="number" value={formData.originalCost} onChange={e => setFormData({...formData, originalCost: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="pt-4 flex space-x-3">
                <button disabled={isSaving} onClick={() => { setEditingItem(null); setShowAddModal(false); }} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Цуцлах</button>
                <button disabled={isSaving} onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center space-x-2">
                  {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{isSaving ? 'Хадгалж байна...' : 'Хадгалах'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
