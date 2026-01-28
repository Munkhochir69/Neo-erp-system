
import React, { useState, useMemo } from 'react';
import { AppState, SalesRep, UserRole, User, OrderStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CURRENCY } from '../constants';

interface SalesRepPerformanceProps {
  state: AppState;
}

const SalesRepPerformance: React.FC<SalesRepPerformanceProps> = ({ state }) => {
  // Use users with SALES_REP role as the target for performance tracking
  const salesReps = useMemo(() => state.users.filter(u => u.role === UserRole.SALES_REP), [state.users]);
  const [selectedRep, setSelectedRep] = useState<User | null>(salesReps[0] || null);
  const [selectedMonth, setSelectedMonth] = useState<string>('Бүгд');
  
  const isAdminOrManager = state.currentUser.role === UserRole.ADMIN || state.currentUser.role === UserRole.SALES_MANAGER;

  const months = ['Бүгд', '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];

  // Only count orders that are DELIVERED for performance metrics
  const repOrders = useMemo(() => {
    if (!selectedRep) return [];
    return state.orders.filter(o => {
      const isRep = o.repId === selectedRep.id;
      const isDelivered = o.status === OrderStatus.DELIVERED;
      
      if (!isRep || !isDelivered) return false;
      
      if (selectedMonth === 'Бүгд') return true;
      
      const orderMonthIdx = new Date(o.date).getMonth() + 1;
      return `${orderMonthIdx}-р сар` === selectedMonth;
    });
  }, [selectedRep, selectedMonth, state.orders]);

  const totalRevenue = repOrders.reduce((a, b) => a + Number(b.amount), 0);
  const totalGrossProfit = repOrders.reduce((a, b) => a + Number(b.profit), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('mn-MN').format(value) + CURRENCY;
  };

  const chartData = salesReps.map(rep => ({
    name: rep.username.split(' ')[0],
    sales: state.orders
      .filter(o => o.repId === rep.id && o.status === OrderStatus.DELIVERED)
      .reduce((a, b) => a + Number(b.amount), 0)
  }));

  const stats = [
    { label: 'Нийт орлого', value: formatCurrency(totalRevenue), sub: `${repOrders.length} Хүргэсэн` },
    ...(isAdminOrManager ? [{ label: 'Бохир ашиг', value: formatCurrency(totalGrossProfit), sub: `${((totalGrossProfit/totalRevenue) * 100 || 0).toFixed(1)}% Марж` }] : []),
    { label: 'Дундаж захиалга', value: formatCurrency(totalRevenue / repOrders.length || 0), sub: 'Нэг үйлчлүүлэгчид' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Борлуулалтын гүйцэтгэл</h1>
        <p className="text-slate-500">Зөвхөн хүргэгдсэн захиалгаар тооцоолсон дүн.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 text-xs">Борлуулагчид</h3>
          <div className="space-y-2">
            {salesReps.map(rep => (
              <button
                key={rep.id}
                onClick={() => setSelectedRep(rep)}
                className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all border-2 text-left ${
                  selectedRep?.id === rep.id 
                    ? 'bg-white border-blue-500 shadow-lg' 
                    : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 overflow-hidden">
                  {rep.avatar ? <img src={rep.avatar} className="w-full h-full object-cover" /> : rep.username.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 truncate">{rep.username}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{rep.role}</p>
                </div>
              </button>
            ))}
            {salesReps.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase">Борлуулагч байхгүй</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          {selectedRep ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center font-black text-2xl text-slate-400">
                    {selectedRep.avatar ? <img src={selectedRep.avatar} className="w-full h-full object-cover rounded-full" /> : selectedRep.username.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedRep.username}</h2>
                    <p className="text-slate-500 font-medium">Гүйцэтгэлийн дүн шинжилгээ</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Сар шүүх:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-${stats.length} gap-6`}>
                {stats.map((stat, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-xl font-extrabold text-slate-900">{stat.value}</p>
                    <p className="text-[10px] text-blue-600 font-bold mt-2 uppercase">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12">
                <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-widest">Борлуулагчдын харьцуулалт (Зөвхөн хүргэсэн)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} tickFormatter={(val) => `${val/1000000}M`} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="sales" name="Борлуулалт" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === selectedRep.username.split(' ')[0] ? '#3b82f6' : '#e2e8f0'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-20 rounded-3xl border border-slate-100 text-center text-slate-400 font-bold uppercase">
              Борлуулагч сонгогдоогүй байна
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesRepPerformance;
