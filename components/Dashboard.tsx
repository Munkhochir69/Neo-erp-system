
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

  const deliveredOrders = useMemo(() => state.orders.filter(o => o.status === OrderStatus.DELIVERED), [state.orders]);
  const totalSalesDelivered = useMemo(() => deliveredOrders.reduce((acc, curr) => acc + Number(curr.amount), 0), [deliveredOrders]);
  const netProfitDelivered = useMemo(() => deliveredOrders.reduce((acc, curr) => acc + Number(curr.profit), 0), [deliveredOrders]);
  const pendingOrdersCount = useMemo(() => state.orders.filter(o => o.status === OrderStatus.PENDING).length, [state.orders]);
  const outOfStockCount = useMemo(() => state.inventory.filter(item => item.stock === 0).length, [state.inventory]);

  const recentOrders = useMemo(() => state.orders.slice(0, 10), [state.orders]);

  const chartData = useMemo(() => {
    const data: { date: string, sales: number, profit: number }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (isAdminOrManager) {
      const daysInMonth = new Date(currentYear, selectedMonth, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${selectedMonth.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        const dayOrders = deliveredOrders.filter(o => o.date === dateStr);
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
        const dayOrders = deliveredOrders.filter(o => o.date === dateStr);
        data.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          sales: dayOrders.reduce((sum, o) => sum + Number(o.amount), 0),
          profit: 0
        });
      }
    }
    return data;
  }, [isAdminOrManager, selectedMonth, deliveredOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('mn-MN').format(value) + CURRENCY;
  };

  const cards = [
    { label: 'Нийт борлуулалт', value: formatCurrency(totalSalesDelivered), icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', color: 'bg-indigo-600 text-white shadow-xl shadow-indigo-200/50' },
    ...(isAdminOrManager ? [{ label: 'Цэвэр ашиг', value: formatCurrency(netProfitDelivered), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2', color: 'bg-emerald-500 text-white shadow-xl shadow-emerald-200/50' }] : []),
    { label: 'Илгээх захиалга', value: `${pendingOrdersCount} ш`, icon: 'M12 8v4l3 3', color: 'bg-amber-500 text-white shadow-xl shadow-amber-200/50', onClick: () => onNavigateToOrders?.(OrderStatus.PENDING) },
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
        </div>

        <div className="space-y-8">
          <div className="bg-[#0f172a] p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-900/20 h-full flex flex-col">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2.5 bg-blue-600 rounded-2xl">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Сүүлийн 10 захиалга</h2>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-slate-800/40 rounded-[1.5rem] border border-white/5 group hover:bg-slate-800/60 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black text-blue-400">#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                        order.status === OrderStatus.PENDING ? 'bg-orange-500/10 text-orange-400' :
                        order.status === OrderStatus.DELIVERED ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-100 truncate">{order.customerName}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-500 font-bold">{order.date}</span>
                      <span className="text-xs font-black text-slate-200">{formatCurrency(order.amount)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                  <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Захиалга байхгүй</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => onNavigateToOrders?.('Бүгд')}
              className="mt-6 w-full py-3 bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
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
