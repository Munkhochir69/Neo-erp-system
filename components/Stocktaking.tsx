
import React, { useState, useMemo } from 'react';
import { AppState, InventoryItem } from '../types';
import { CURRENCY } from '../constants';

interface StocktakingProps {
  state: AppState;
}

const Stocktaking: React.FC<StocktakingProps> = ({ state }) => {
  const [countedValues, setCountedValues] = useState<{ [key: string]: string }>({});
  const [results, setResults] = useState<{ [key: string]: 'match' | 'mismatch' | null }>({});
  const [isVerified, setIsVerified] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInventory = useMemo(() => {
    return state.inventory.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [state.inventory, searchQuery]);

  const handleInputChange = (id: string, value: string) => {
    setCountedValues(prev => ({ ...prev, [id]: value }));
    // If user changes value after verification, reset status for that item
    if (isVerified) {
      setResults(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleVerify = () => {
    const newResults: { [key: string]: 'match' | 'mismatch' | null } = {};
    state.inventory.forEach(item => {
      const counted = countedValues[item.id];
      if (counted !== undefined && counted !== '') {
        newResults[item.id] = parseInt(counted) === item.stock ? 'match' : 'mismatch';
      } else {
        newResults[item.id] = null;
      }
    });
    setResults(newResults);
    setIsVerified(true);
  };

  const resetStocktaking = () => {
    setCountedValues({});
    setResults({});
    setIsVerified(false);
  };

  const summary = useMemo(() => {
    const entries = Object.values(results);
    return {
      matches: entries.filter(r => r === 'match').length,
      mismatches: entries.filter(r => r === 'mismatch').length,
      totalCounted: entries.filter(r => r !== null).length
    };
  }, [results]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Барааны тооллого</h1>
          <p className="text-slate-500 font-medium">Агуулахын үлдэгдлийг системтэй тулгах хэсэг.</p>
        </div>
        <div className="flex items-center space-x-3">
          {isVerified && (
            <button 
              onClick={resetStocktaking}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
            >
              Шинээр тоолох
            </button>
          )}
          <button 
            onClick={handleVerify}
            className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            {isVerified ? 'Дахин шалгах' : 'Батлах'}
          </button>
        </div>
      </header>

      {isVerified && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Тоолсон</span>
            <span className="text-xl font-black text-slate-900">{summary.totalCounted} / {state.inventory.length}</span>
          </div>
          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm flex items-center justify-between">
            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Таарсан</span>
            <span className="text-xl font-black text-emerald-700">{summary.matches}</span>
          </div>
          <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-sm flex items-center justify-between">
            <span className="text-xs font-black text-rose-600 uppercase tracking-widest">Зөрүүтэй</span>
            <span className="text-xl font-black text-rose-700">{summary.mismatches}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input 
              type="text" 
              placeholder="Бараа хайх..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
            <svg className="w-5 h-5 absolute right-4 top-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Нийт: {filteredInventory.length} бараа
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Бараа</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Систем (Үлдэгдэл)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Тоолсон тоо</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Төлөв</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInventory.map((item) => {
                const status = results[item.id];
                return (
                  <tr key={item.id} className={`group transition-all ${status === 'mismatch' ? 'bg-rose-50/30' : status === 'match' ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-8 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-xs">N</div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SKU: {item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className="text-sm font-black text-slate-500 bg-white border border-slate-100 px-3 py-1 rounded-xl shadow-sm">
                        {item.stock} ш
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <input 
                        type="number"
                        min="0"
                        placeholder="0"
                        value={countedValues[item.id] || ''}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                        className={`w-24 text-right bg-white border rounded-xl px-4 py-2 text-sm font-black outline-none transition-all focus:ring-4 ${
                          status === 'match' ? 'border-emerald-500 ring-emerald-500/10' :
                          status === 'mismatch' ? 'border-rose-500 ring-rose-500/10' :
                          'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                        }`}
                      />
                    </td>
                    <td className="px-8 py-4 text-right">
                      {status === 'match' && (
                        <div className="flex items-center justify-end text-emerald-600 animate-in zoom-in duration-300">
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Таарсан</span>
                        </div>
                      )}
                      {status === 'mismatch' && (
                        <div className="flex items-center justify-end text-rose-600 animate-in zoom-in duration-300">
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Зөрүүтэй</span>
                        </div>
                      )}
                      {!status && isVerified && countedValues[item.id] === undefined && (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Тоолоогүй</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Илэрц олдсонгүй</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Stocktaking;
