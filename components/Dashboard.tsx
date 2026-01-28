
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppState, OrderStatus, UserRole } from '../types';
import { CURRENCY } from '../constants';

interface DashboardProps {
  state: AppState;
  onNavigateToOrders?: (filter: OrderStatus | 'Бүгд') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onNavigateToOrders }) => {
  const isAdminOrManager = state.currentUser?.role === UserRole.ADMIN || state.currentUser?.role === UserRole.SALES_MANAGER;
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const months = [
    { value: 1, label: '1-р сар' }, { value: 2, label: '2-р сар' }, { value: 3, label: '3-р сар' },
    { value: 4, label: '4-р сар' }, { value: 5, label: '5-р сар' }, { value: 6, label: '6-р сар' },
    { value: 7, label: '7-р сар' }, { value: 8, label: '8-р сар' }, { value: 9, label: '9-р сар' },
    { value: 10, label: '10-р сар' }, { value: 11, label: '11-р сар' }, { value: 12, label: '12-р сар' }
  ];

  const paidOrders = useMemo(() => state.orders.filter(o => o.status === OrderStatus.PAID), [state.orders]);
  const totalSalesPaid = useMemo(() => paidOrders.reduce((acc, curr) => acc + Number(curr.amount), 0), [paidOrders]);
  const grossProfitPaid = useMemo(() => paidOrders.reduce((acc, curr) => acc + Number(curr.profit), 0), [paidOrders]);
  const activeOrdersCount = useMemo(() => state.orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.DELIVERED).length, [state.orders]);
  const outOfStockCount = useMemo(() => state.inventory.filter(item => item.stock === 0).length, [state.inventory]);

  const recentOrders = useMemo(() => state.orders.slice(0, 10), [state.orders]);

  // ТОП 5 бараа тооцоолох
  const topItems = useMemo(() => {
    const itemStats = new Map<string, { name: string, sales: number, profit: number, qty: number, image?: string }>();

    paidOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = itemStats.get(item.productId) || { name: item.name, sales: 0, profit: 0, qty: 0 };
        const invItem = state.inventory.find(i => i.id === item.productId);
        
        // Өртөг тооцох (байхгүй бол 70% гэж үзнэ)
        const cost = invItem ? Number(invItem.originalCost) : item.price * 0.7;
        const itemProfit = (item.price - cost) * item.quantity;

        itemStats.set(item.productId, {
          name: item.name,
          image: invItem?.imageUrl,
          sales: existing.sales + (item.price * item.quantity),
          profit: existing.profit + itemProfit,
          qty: existing.qty + item.quantity
        });
      });
    });

    return Array.from(itemStats.entries())
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [paidOrders, state.inventory]);

  const chartData = useMemo(() => {
    const data: { date: string, sales: number, profit: number }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (isAdminOrManager) {
      const daysInMonth = new Date(currentYear, selectedMonth, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${selectedMonth.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        const dayOrders = paidOrders.filter(o => o.date === dateStr);
        data.push({
          date: `${i}`,
          sales: dayOrders.reduce((sum, o) => sum + Number(o.amount), 0),
          profit: dayOrders.reduce((sum, o) => sum + Number(o.profit), 0)
        });
      }
    } else {
      for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayOrders = paidOrders.filter(o => o.date === dateStr);
        data.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          sales: dayOrders.reduce((sum, o) => sum + Number(o.amount), 0),
          profit: 0
        });
      }
    }
    return data;
  }, [isAdminOrManager, selectedMonth, paidOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('mn-MN').format(value) + CURRENCY;
  };

  const cards = [
    { label: 'Нийт борлуулалт', value: formatCurrency(totalSalesPaid), icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', color: 'bg-indigo-600 text-white shadow-xl shadow-indigo-200/50' },
    ...(isAdminOrManager ? [{ label: 'Бохир ашиг', value: formatCurrency(grossProfitPaid), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2', color: 'bg-emerald-500 text-white shadow-xl shadow-emerald-200/50' }] : []),
    { label: 'Идэвхтэй захиалга', value: `${activeOrdersCount} ш`, icon: 'M12 8v4l3 3', color: 'bg-amber-500 text-white shadow-xl shadow-amber-200/50', onClick: () => onNavigateToOrders?.(OrderStatus.PENDING) },
    { label: 'Дууссан бараа', value: `${outOfStockCount} ш`, icon: 'M20 7l-8-4-8 4', color: 'bg-rose-500 text-white shadow-xl shadow-rose-200/50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Хяналтын самбар</h1>
          <p className="text-slate-500 font-medium tracking-tight">Системийн өнөөдрийн төлөв байдал.</p>
        </div>
      </header>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cards.length} gap-6`}>
        {cards.map((card, i) => (
          <div key={i} onClick={card.onClick} className={`p-6 rounded-[2.5rem] transition-all hover:-translate-y-1 cursor-pointer ${card.color}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={card.icon} />
                </svg>
              </div>
            </div>
            <h3 className="text-xs font-bold opacity-80 mb-1 uppercase tracking-widest">{card.label}</h3>
            <p className="text-2xl font-black">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* График */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-slate-800">Борлуулалтын график</h2>
              {isAdminOrManager && (
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))} 
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-black focus:ring-4 focus:ring-blue-500/10 outline-none"
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              )}
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '15px' }} 
                    itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '5px', color: '#1e293b' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Area type="monotone" name="Борлуулалт" dataKey="sales" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorSales)" />
                  {isAdminOrManager && <Area type="monotone" name="Ашиг" dataKey="profit" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#colorProfit)" />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ТОП 5 Бараа */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Хамгийн их зарагдсан 5 бараа</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Бараа</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Тоо</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Борлуулалт</th>
                    <th className="pb-4 text-[10px] font-black text-emerald-400 uppercase tracking-widest text-right">Бохир ашиг</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topItems.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img src={item.image} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-xs uppercase">No</div>
                            )}
                          </div>
                          <span className="text-sm font-black text-slate-700 group-hover:text-indigo-600 transition-colors">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">{item.qty} ш</span>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-sm font-black text-slate-900">{formatCurrency(item.sales)}</span>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-sm font-black text-emerald-600">{formatCurrency(item.profit)}</span>
                      </td>
                    </tr>
                  ))}
                  {topItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Мэдээлэл байхгүй</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8 h-full">
          {/* Сүүлийн захиалгууд - Өнгө өөрчилсөн */}
          <div className="bg-slate-50 p-8 rounded-[3rem] text-slate-900 border border-slate-200/60 shadow-xl shadow-slate-200/20 h-full flex flex-col">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2.5 bg-white border border-slate-200 shadow-sm rounded-2xl">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Сүүлийн 10 захиалга</h2>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-white rounded-[1.5rem] border border-slate-200/50 group hover:border-indigo-200 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-indigo-600">#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                        order.status === OrderStatus.PENDING ? 'bg-orange-50 text-orange-600' :
                        order.status === OrderStatus.DELIVERED ? 'bg-blue-50 text-blue-600' :
                        order.status === OrderStatus.PAID ? 'bg-emerald-50 text-emerald-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-900">{order.customerName}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-400 font-bold">{order.date}</span>
                      <span className="text-xs font-black text-slate-700">{formatCurrency(order.amount)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Захиалга байхгүй</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => onNavigateToOrders?.('Бүгд')}
              className="mt-6 w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 hover:text-slate-900 transition-all shadow-sm active:scale-95"
            >
              Бүх захиалгыг харах
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
