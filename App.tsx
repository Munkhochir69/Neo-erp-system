
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
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
import { AppState, OrderStatus, Order, User, UserRole, InventoryItem, RestockLog } from './types';
import { supabase } from './supabase';

const SUPABASE_URL = 'https://wzlzhauwegyrcyhdhfyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bHpoYXV3ZWd5cmN5aGRoZnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTI5NDcsImV4cCI6MjA4NDk4ODk0N30.wit-T2APmNpHoWgutQOwEcJhUKMoVnlrpkh4iGX1JL8';

type ViewType = 'dashboard' | 'pos' | 'orders' | 'history' | 'inventory' | 'stocktaking' | 'restock' | 'reps' | 'users' | 'profile';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('dashboard');
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'Бүгд'>('Бүгд');
  const [loadingStartTime] = useState(Date.now());
  const [showForceLogout, setShowForceLogout] = useState(false);

  const [state, setState] = useState<AppState>({
    inventory: [],
    orders: [],
    restockLogs: [],
    reps: [],
    monthlyStats: [],
    drivers: ['PAPA', 'BATA', 'SARA'],
    paymentMethods: ['Бэлэн', 'Хаан Банк', 'Голомт Банк', 'mBank', 'SocialPay'],
    users: [],
    currentUser: null as any, 
  });

  const isFetchingRef = useRef(false);

  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    if (newView === 'history') {
      setOrderFilter(OrderStatus.PAID);
    } else if (newView === 'orders') {
      setOrderFilter(OrderStatus.PENDING);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if ((isSyncing || (isLoggedIn && !state.currentUser)) && Date.now() - loadingStartTime > 8000) {
        setShowForceLogout(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isSyncing, isLoggedIn, state.currentUser, loadingStartTime]);

  const fetchData = useCallback(async (userId?: string, force: boolean = false) => {
    if (isFetchingRef.current && !force) return;
    isFetchingRef.current = true;
    setSyncError(null);

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
        { data: inventory, error: invErr },
        { data: orders, error: ordErr },
        { data: users, error: userErr },
        { data: restockLogs, error: restockErr }
      ] = await Promise.all([
        supabase.from('inventory').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('users').select('*').order('username'),
        supabase.from('restock_history').select('*').order('created_at', { ascending: false }).limit(100)
      ]);

      if (invErr) throw new Error(`Барааны мэдээлэл татаж чадсангүй: ${invErr.message}`);
      if (ordErr) throw new Error(`Захиалгын мэдээлэл татаж чадсангүй: ${ordErr.message}`);
      if (userErr) throw new Error(`Хэрэглэгчдийн мэдээлэл татаж чадсангүй: ${userErr.message}`);

      let profile = (users || []).find(u => u.id === activeId);

      if (!profile) {
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 1500));
          const { data: retryUsers, error: retryErr } = await supabase.from('users').select('*').eq('id', activeId);
          if (retryUsers && retryUsers.length > 0) {
            profile = retryUsers[0];
            break;
          }
        }
      }

      if (!profile) throw new Error("Таны профайл мэдээлэл олдсонгүй.");

      setState(prev => ({
        ...prev,
        currentUser: profile,
        inventory: inventory || [],
        orders: orders || [],
        users: users || [],
        restockLogs: restockLogs || []
      }));
      
      setIsLoggedIn(true);
    } catch (error: any) {
      console.error("Fetch error:", error);
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') fetchData(undefined, true);
      if (event === 'SIGNED_OUT') setIsLoggedIn(false);
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  const handleLogout = async () => { 
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleUpdateInventoryItem = async (item: InventoryItem) => {
    const { error } = await supabase.from('inventory').update(item).eq('id', item.id);
    if (error) alert(error.message);
    else await fetchData(undefined, true);
  };

  const handleRestock = async (itemId: string, quantity: number, mntCost: number, yuanCost: number, exchangeRate: number, date: string) => {
    const item = state.inventory.find(i => i.id === itemId);
    if (!item) return;
    
    const { error: invErr } = await supabase.from('inventory').update({ stock: item.stock + quantity, originalCost: mntCost }).eq('id', itemId);
    if (invErr) throw invErr;

    const { error: logErr } = await supabase.from('restock_history').insert([{
      item_id: itemId, item_name: item.name, quantity, cost_yuan: yuanCost, mnt_cost: mntCost, exchange_rate: exchangeRate, restock_date: date
    }]);
    if (logErr) throw logErr;
    await fetchData(undefined, true);
  };

  const handleCreateOrder = async (orderData: any): Promise<boolean> => {
    try {
      const totalAmount = orderData.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
      const totalProfit = orderData.items.reduce((acc: number, item: any) => {
        const invItem = state.inventory.find(i => i.id === item.productId);
        const cost = invItem ? Number(invItem.originalCost) : item.price * 0.7;
        return acc + (item.price - cost) * item.quantity;
      }, 0);
      
      const newId = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;
      const now = new Date();

      const { error: insertError } = await supabase.from('orders').insert([{
        id: newId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        district: orderData.district,
        customerLink: orderData.customerLink,
        date: now.toISOString().split('T')[0],
        timestamp: now.toLocaleTimeString('it-IT'),
        amount: Math.round(totalAmount),
        profit: Math.round(totalProfit),
        status: OrderStatus.PENDING,
        items: orderData.items,
        repId: orderData.repId || state.currentUser.id,
        processedBy: state.currentUser.username
      }]);

      if (insertError) throw insertError;

      for (const item of orderData.items) {
        const invItem = state.inventory.find(i => i.id === item.productId);
        if (invItem) {
          await supabase.from('inventory').update({ stock: Math.max(0, invItem.stock - item.quantity) }).eq('id', invItem.id);
        }
      }
      await fetchData(undefined, true);
      return true;
    } catch (err: any) {
      alert("Алдаа: " + err.message);
      return false;
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, updates: Partial<Order>) => {
    try {
      const orderToUpdate = state.orders.find(o => o.id === orderId);
      if (!orderToUpdate) throw new Error("Захиалга олдсонгүй.");
      
      const updatedFields = {
        ...updates,
        processedBy: state.currentUser?.username || 'System'
      };

      const { error } = await supabase.from('orders').update(updatedFields).eq('id', orderId);
      if (error) throw error;

      if (updates.status === OrderStatus.CANCELLED && orderToUpdate.status !== OrderStatus.CANCELLED) {
        for (const item of orderToUpdate.items) {
          const invItem = state.inventory.find(i => i.id === item.productId);
          if (invItem) {
            await supabase.from('inventory').update({ stock: invItem.stock + item.quantity }).eq('id', invItem.id);
          }
        }
      }
      await fetchData(undefined, true);
    } catch (err: any) {
      console.error("Update error:", err);
      throw err;
    }
  };

  if (syncError) return <div className="flex items-center justify-center min-h-screen">Алдаа: {syncError}</div>;
  if (isSyncing || (isLoggedIn && !state.currentUser)) return <div className="flex items-center justify-center min-h-screen">Ачаалж байна...</div>;
  if (!isLoggedIn) return <Login />;

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <Sidebar currentView={view} onViewChange={handleViewChange} currentUser={state.currentUser} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-10">
        <div className="max-w-screen-2xl mx-auto h-full">
          {view === 'dashboard' && <Dashboard state={state} onNavigateToOrders={(f) => { setOrderFilter(f); setView(f === OrderStatus.PENDING ? 'orders' : 'history'); }} />}
          {view === 'pos' && <POS state={state} onOrder={handleCreateOrder} onFinish={() => handleViewChange('orders')} />}
          {(view === 'orders' || view === 'history') && <OrderManagement state={state} isHistoryMode={view === 'history'} initialFilter={orderFilter} onUpdateStatus={handleUpdateOrderStatus} onAddDriver={() => {}} onAddPaymentMethod={() => {}} onRemovePaymentMethod={() => {}} onRemoveDriver={() => {}} />}
          {view === 'inventory' && <InventoryManagement state={state} onUpdateItem={handleUpdateInventoryItem} />}
          {view === 'stocktaking' && <Stocktaking state={state} />}
          {view === 'restock' && <RestockManagement state={state} onRestock={handleRestock} onAddItem={async () => {}} />}
          {view === 'users' && <UserManagement state={state} onAddUser={async () => {}} onUpdateUser={async () => {}} onToggleStatus={async () => {}} />}
          {view === 'profile' && <ProfileSettings currentUser={state.currentUser} onUpdateProfile={async () => {}} />}
        </div>
      </main>
    </div>
  );
};

export default App;
