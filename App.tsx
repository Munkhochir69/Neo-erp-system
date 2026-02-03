
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppNavigation from './components/AppNavigation';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import OrderManagement from './components/OrderManagement';
import InventoryManagement from './components/InventoryManagement';
import RestockManagement from './components/RestockManagement';
import SalesRepPerformance from './components/SalesRepPerformance';
import UserManagement from './components/UserManagement';
import ProfileSettings from './components/ProfileSettings';
import Stocktaking from './components/Stocktaking';
import Login from './components/Login';
import { AppState, OrderStatus, Order, User, UserRole, Notification } from './types';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';
import { createClient } from '@supabase/supabase-js';

type ViewType = 'dashboard' | 'pos' | 'orders' | 'history' | 'inventory' | 'stocktaking' | 'restock' | 'reps' | 'users' | 'profile';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('dashboard');
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'Бүгд'>('Бүгд');
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  
  // Mobile Sidebar State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [state, setState] = useState<AppState>({
    inventory: [],
    orders: [],
    restockLogs: [],
    restockTemplates: [],
    reps: [],
    monthlyStats: [],
    drivers: ['PAPA', 'BATA', 'SARA'],
    paymentMethods: ['Бэлэн', 'Хаан Банк', 'Голомт Банк', 'mBank', 'SocialPay'],
    users: [],
    currentUser: null as any, 
    notifications: [],
  });

  const isFetchingRef = useRef(false);

  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    setTargetOrderId(null);
    if (newView === 'history') {
      setOrderFilter(OrderStatus.PAID);
    } else if (newView === 'orders') {
      setOrderFilter('Бүгд');
    }
    // Close mobile menu on view change
    setIsMobileMenuOpen(false);
  };

  const fetchData = useCallback(async (userId?: string, force: boolean = false) => {
    if (isFetchingRef.current && !force) return;
    isFetchingRef.current = true;
    
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const activeId = userId || session?.user?.id;
      
      if (!activeId) {
        setIsLoggedIn(false);
        setIsSyncing(false);
        isFetchingRef.current = false;
        return;
      }

      const [
        { data: inventory },
        { data: orders },
        { data: users },
        { data: restockLogs },
        { data: notifications },
        { data: comments },
        { data: templates }
      ] = await Promise.all([
        supabase.from('inventory').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('users').select('*').order('username'),
        supabase.from('restock_history').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('notifications').select('*').eq('userId', activeId).order('createdAt', { ascending: false }).limit(20),
        supabase.from('order_comments').select('*').order('createdAt', { ascending: true }),
        supabase.from('restock_templates').select('*').order('created_at', { ascending: false })
      ]);

      const profile = (users || []).find(u => u.id === activeId);
      
      if (profile && profile.isActive) {
        const ordersWithComments = (orders || []).map(order => ({
          ...order,
          comments: (comments || []).filter(c => c.orderId === order.id)
        }));

        setState(prev => ({
          ...prev,
          currentUser: profile,
          inventory: inventory || [],
          orders: ordersWithComments,
          users: users || [],
          restockLogs: restockLogs || [],
          restockTemplates: templates || [],
          notifications: notifications || []
        }));
        setIsLoggedIn(true);
      } else {
        await supabase.auth.signOut();
        setIsLoggedIn(false);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      setSyncError(error.message);
      setIsLoggedIn(false); 
    } finally {
      setIsSyncing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsSyncing(true);
        fetchData(session.user.id, true);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setState(prev => ({ ...prev, currentUser: null as any }));
        setView('dashboard');
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  const handleLogout = useCallback(async () => {
    try {
      setIsSyncing(true);
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setState(prev => ({ ...prev, currentUser: null as any }));
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggedIn(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const logoutTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    const INACTIVITY_TIME = 5 * 60 * 1000; // 5 minutes
    const resetTimer = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => {
        handleLogout();
      }, INACTIVITY_TIME);
    };
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const handleUserActivity = () => resetTimer();
    resetTimer();
    events.forEach(event => window.addEventListener(event, handleUserActivity));
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, [isLoggedIn, handleLogout]);

  const handleNotificationClick = async (notification: Notification) => {
    await supabase.from('notifications').update({ isRead: true }).eq('id', notification.id);
    if (notification.orderId) {
      const order = state.orders.find(o => o.id === notification.orderId);
      if (order) {
        const isHistory = order.status === OrderStatus.PAID || order.status === OrderStatus.CANCELLED;
        setView(isHistory ? 'history' : 'orders');
        setOrderFilter('Бүгд');
        setTargetOrderId(notification.orderId);
      }
    }
    await fetchData(undefined, true);
    setIsMobileMenuOpen(false);
  };

  const handleUpdateOrderStatus = async (orderId: string, updates: Partial<Order>) => {
    try {
      if (updates.status === OrderStatus.CANCELLED) {
        const { data: orderData, error: fetchError } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (fetchError) throw fetchError;
        if (orderData.status !== OrderStatus.CANCELLED) {
          const items = orderData.items || [];
          for (const item of items) {
            const { data: invItem } = await supabase.from('inventory').select('stock').eq('id', item.productId).single();
            if (invItem) {
              const newStock = Number(invItem.stock) + Number(item.quantity);
              await supabase.from('inventory').update({ stock: newStock }).eq('id', item.productId);
            }
            if (item.cost !== undefined) {
               const { data: matchingBatch } = await supabase.from('inventory_batches').select('id, quantity').eq('item_id', item.productId).eq('cost', item.cost).limit(1).single();
               if (matchingBatch) {
                  await supabase.from('inventory_batches').update({ quantity: Number(matchingBatch.quantity) + Number(item.quantity) }).eq('id', matchingBatch.id);
               } else {
                  await supabase.from('inventory_batches').insert([{ item_id: item.productId, quantity: Number(item.quantity), cost: item.cost, created_at: new Date().toISOString() }]);
               }
            } else {
               const { data: currentInvItem } = await supabase.from('inventory').select('originalCost').eq('id', item.productId).single();
               const fallbackCost = currentInvItem?.originalCost || 0;
               await supabase.from('inventory_batches').insert([{ item_id: item.productId, quantity: Number(item.quantity), cost: fallbackCost, created_at: new Date().toISOString() }]);
            }
          }
        }
      }
      const { error } = await supabase.from('orders').update({ ...updates, processedBy: state.currentUser?.username, lastStatusUpdate: new Date().toISOString() }).eq('id', orderId);
      if (error) throw error;
      await fetchData(undefined, true);
    } catch (err: any) {
      alert("Алдаа: " + err.message);
    }
  };

  const handleAddComment = async (orderId: string, text: string) => {
    try {
      const { error } = await supabase.from('order_comments').insert([{ orderId, userId: state.currentUser.id, username: state.currentUser.username, userAvatar: state.currentUser.avatar, text }]);
      if (error) throw error;
      const order = state.orders.find(o => o.id === orderId);
      if (!order) return;
      const notificationInserts = [];
      if (order.repId && order.repId !== state.currentUser.id) {
        notificationInserts.push({ userId: order.repId, title: 'Шинэ коммент', message: `${state.currentUser.username} таны захиалга дээр (#${orderId}) коммент бичлээ.`, type: 'order', orderId: orderId });
      }
      const mentions = text.match(/@(\w+)/g);
      if (mentions) {
        for (const mention of mentions) {
          const mentionedName = mention.substring(1).toLowerCase();
          const mentionedUser = state.users.find(u => u.username.toLowerCase().includes(mentionedName) || (u.loginName && u.loginName.toLowerCase().includes(mentionedName)));
          if (mentionedUser && mentionedUser.id !== state.currentUser.id && mentionedUser.id !== order.repId) {
            notificationInserts.push({ userId: mentionedUser.id, title: 'Танд хандлаа', message: `${state.currentUser.username} таныг захиалга #${orderId} дээр дурдлаа.`, type: 'mention', orderId: orderId });
          }
        }
      }
      if (notificationInserts.length > 0) {
        const { error: notifError } = await supabase.from('notifications').insert(notificationInserts);
        if (notifError) console.error("Notification insert error", notifError);
      }
      await fetchData(undefined, true);
    } catch (err: any) {
      alert("Алдаа: " + err.message);
    }
  };

  if (isSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-bold tracking-widest uppercase text-xs">Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return <Login />;
  if (!state.currentUser) { setIsLoggedIn(false); return <Login />; }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      <AppNavigation currentView={view} onViewChange={handleViewChange} currentUser={state.currentUser} onLogout={handleLogout} notifications={state.notifications} onMarkRead={() => {}} onNotificationAction={handleNotificationClick} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-30">
          <div className="flex items-center space-x-3">
             <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-500 hover:text-indigo-600">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
             </button>
             <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase">NEO ERP</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">{state.currentUser.username?.charAt(0)}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div className="max-w-screen-2xl mx-auto h-full">
            {view === 'dashboard' && <Dashboard state={state} onNavigateToOrders={(f) => { setOrderFilter(f); const isHistory = f === OrderStatus.PAID || f === OrderStatus.CANCELLED; setView(isHistory ? 'history' : 'orders'); }} />}
            {(view === 'orders' || view === 'history') && <OrderManagement state={state} isHistoryMode={view === 'history'} initialFilter={orderFilter} onUpdateStatus={handleUpdateOrderStatus} onAddComment={handleAddComment} initialTargetOrderId={targetOrderId} onAddDriver={(name) => setState(prev => ({...prev, drivers: [...prev.drivers, name]}))} onAddPaymentMethod={(name) => setState(prev => ({...prev, paymentMethods: [...prev.paymentMethods, name]}))} onRemovePaymentMethod={(name) => setState(prev => ({...prev, paymentMethods: prev.paymentMethods.filter(p => p !== name)}))} onRemoveDriver={(name) => setState(prev => ({...prev, drivers: prev.drivers.filter(d => d !== name)}))} />}
            {view === 'inventory' && <InventoryManagement state={state} onUpdateItem={async (item) => { try { const { id, ...updates } = item; const { error } = await supabase.from('inventory').update(updates).eq('id', id); if (error) throw error; await fetchData(undefined, true); } catch (err: any) { alert("Алдаа: " + err.message); } }} />}
            {view === 'pos' && <POS state={state} onOrder={async (data) => {
                  try {
                    const { data: latestOrders, error: fetchErr } = await supabase.from('orders').select('id').order('created_at', { ascending: false }).limit(1);
                    if (fetchErr) throw fetchErr;
                    let nextNum = 1;
                    if (latestOrders && latestOrders.length > 0) { const lastId = latestOrders[0].id; const match = lastId.match(/ORD-(\d+)/); if (match) nextNum = parseInt(match[1]) + 1; }
                    const orderId = `ORD-${nextNum}`;
                    let totalAmount = 0; let totalProfit = 0; const finalOrderItems = [];
                    for (const item of data.items) {
                      let remainingQtyToProcess = Number(item.quantity);
                      let itemTotalCost = 0;
                      const { data: batches } = await supabase.from('inventory_batches').select('*').eq('item_id', item.productId).gt('quantity', 0).order('created_at', { ascending: true }).order('id', { ascending: true });
                      if (batches) {
                        for (const batch of batches) {
                          if (remainingQtyToProcess <= 0) break;
                          const take = Math.min(remainingQtyToProcess, batch.quantity);
                          itemTotalCost += take * batch.cost;
                          remainingQtyToProcess -= take;
                          const newBatchQty = batch.quantity - take;
                          await supabase.from('inventory_batches').update({ quantity: newBatchQty }).eq('id', batch.id);
                        }
                      }
                      if (remainingQtyToProcess > 0) {
                        const invItem = state.inventory.find(i => i.id === item.productId);
                        const fallbackCost = invItem ? Number(invItem.originalCost) : 0;
                        itemTotalCost += remainingQtyToProcess * fallbackCost;
                      }
                      const amount = Number(item.price) * Number(item.quantity);
                      const profit = amount - itemTotalCost;
                      totalAmount += amount;
                      totalProfit += profit;
                      const unitCost = Number(item.quantity) > 0 ? itemTotalCost / Number(item.quantity) : 0;
                      finalOrderItems.push({ productId: item.productId, name: item.name, quantity: Number(item.quantity), price: Number(item.price), cost: unitCost });
                      const invItem = state.inventory.find(i => i.id === item.productId);
                      if (invItem) {
                        const newStock = Math.max(0, invItem.stock - item.quantity);
                        await supabase.from('inventory').update({ stock: newStock }).eq('id', item.productId);
                      }
                    }
                    const { error: insertError } = await supabase.from('orders').insert([{ id: orderId, customerName: data.customerName, customerPhone: data.customerPhone, customerAddress: data.customerAddress, district: data.district, customerLink: data.customerLink, items: finalOrderItems, status: OrderStatus.PENDING, date: new Date().toISOString().split('T')[0], timestamp: new Date().toLocaleTimeString('mn-MN', { hour12: false }), repId: data.repId || state.currentUser.id, amount: totalAmount, profit: totalProfit, processedBy: state.currentUser.username, lastStatusUpdate: new Date().toISOString() }]);
                    if (insertError) throw insertError;
                    await fetchData(undefined, true);
                    return true;
                  } catch (err: any) { console.error("Order Registration Error:", err); alert("Алдаа: " + (err.message || "Захиалга бүртгэж чадсангүй.")); return false; }
                }} onFinish={() => setView('orders')} />}
            {view === 'stocktaking' && <Stocktaking state={state} />}
            {view === 'restock' && <RestockManagement state={state} onRestock={async (itemId, quantity, mntCost, yuanCost, exchangeRate, date, extraCosts) => { try { const item = state.inventory.find(i => i.id === itemId); if (!item) return; await supabase.from('restock_history').insert([{ item_id: itemId, item_name: item.name, quantity, cost_yuan: yuanCost, mnt_cost: mntCost, exchange_rate: exchangeRate, restock_date: date, extra_costs: extraCosts }]); await supabase.from('inventory_batches').insert([{ item_id: itemId, quantity: quantity, cost: mntCost, created_at: new Date().toISOString() }]); const newStock = Number(item.stock) + Number(quantity); await supabase.from('inventory').update({ stock: newStock, originalCost: mntCost }).eq('id', itemId); await fetchData(undefined, true); } catch (err: any) { alert("Restock error: " + err.message); } }} onAddItem={async (item) => { try { const { data: newItem, error } = await supabase.from('inventory').insert([item]).select().single(); if (error) throw error; if (item.stock > 0 && newItem) { await supabase.from('inventory_batches').insert([{ item_id: newItem.id, quantity: item.stock, cost: item.originalCost, created_at: new Date().toISOString() }]); } await fetchData(undefined, true); } catch (err: any) { alert("Add item error: " + err.message); } }} onSaveTemplate={async (template) => { try { const { error } = await supabase.from('restock_templates').insert([template]); if(error) throw error; await fetchData(undefined, true); } catch(err: any) { alert("Template Save Error: " + err.message); } }} onDeleteTemplate={async (id) => { try { const { error } = await supabase.from('restock_templates').delete().eq('id', id); if(error) throw error; await fetchData(undefined, true); } catch(err: any) { alert("Template Delete Error: " + err.message); } }} />}
            {view === 'users' && <UserManagement state={state} onAddUser={async (userData) => { try { const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }); const { data, error } = await tempClient.auth.signUp({ email: userData.loginName, password: userData.password!, }); if (error) throw error; if (data.user) { const { error: updateError } = await supabase.from('users').update({ username: userData.username, role: userData.role, loginName: userData.loginName }).eq('id', data.user.id); if (updateError) throw updateError; await fetchData(undefined, true); alert('Амжилттай бүртгэгдлээ!'); } } catch (err: any) { console.error("Add user error", err); throw new Error(err.message); } }} onUpdateUser={async (userId, updates) => { try { const { error } = await supabase.from('users').update(updates).eq('id', userId); if (error) throw error; await fetchData(undefined, true); } catch (err: any) { throw new Error(err.message); } }} onToggleStatus={async (userId) => { try { const user = state.users.find(u => u.id === userId); if (user) { const { error } = await supabase.from('users').update({ isActive: !user.isActive }).eq('id', userId); if (error) throw error; await fetchData(undefined, true); } } catch (err: any) { throw new Error(err.message); } }} />}
            {view === 'profile' && <ProfileSettings currentUser={state.currentUser} onUpdateProfile={async (updates) => { await supabase.from('users').update(updates).eq('id', state.currentUser.id); await fetchData(undefined, true); }} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
