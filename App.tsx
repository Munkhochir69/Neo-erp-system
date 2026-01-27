
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import OrderManagement from './components/OrderManagement';
import InventoryManagement from './components/InventoryManagement';
import SalesRepPerformance from './components/SalesRepPerformance';
import UserManagement from './components/UserManagement';
import ProfileSettings from './components/ProfileSettings';
import Login from './components/Login';
import { AppState, OrderStatus, Order, User, UserRole, InventoryItem } from './types';
import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzlzhauwegyrcyhdhfyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bHpoYXV3ZWd5cmN5aGRoZnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTI5NDcsImV4cCI6MjA4NDk4ODk0N30.wit-T2APmNpHoWgutQOwEcJhUKMoVnlrpkh4iGX1JL8';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'pos' | 'orders' | 'inventory' | 'reps' | 'users' | 'profile'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'Бүгд'>('Бүгд');
  const [loadingStartTime] = useState(Date.now());
  const [showForceLogout, setShowForceLogout] = useState(false);

  const [state, setState] = useState<AppState>({
    inventory: [],
    orders: [],
    reps: [],
    monthlyStats: [],
    drivers: ['PAPA', 'BATA', 'SARA'],
    paymentMethods: ['Бэлэн', 'Хаан Банк', 'Голомт Банк', 'mBank', 'SocialPay'],
    users: [],
    currentUser: null as any, 
  });

  const isCreatingUserRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if ((isSyncing || (isLoggedIn && !state.currentUser)) && Date.now() - loadingStartTime > 8000) {
        setShowForceLogout(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isSyncing, isLoggedIn, state.currentUser, loadingStartTime]);

  const fetchData = useCallback(async (userId?: string) => {
    if (isFetchingRef.current) return;
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
        { data: users, error: userErr }
      ] = await Promise.all([
        supabase.from('inventory').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('users').select('*').order('username')
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
          if (retryErr) console.error("Retry error:", retryErr);
        }
      }

      if (!profile) {
        throw new Error("Таны профайл мэдээлэл олдсонгүй. Түр хүлээгээд дахин оролдоно уу.");
      }

      if (!profile.isActive) {
        await supabase.auth.signOut();
        setIsLoggedIn(false);
        throw new Error("Таны эрх хаагдсан байна.");
      }

      setState(prev => ({
        ...prev,
        currentUser: profile,
        inventory: inventory || [],
        orders: orders || [],
        users: users || []
      }));
      
      setIsLoggedIn(true);
      setSyncError(null);
    } catch (error: any) {
      console.error("Fetch error details:", error);
      setSyncError(error.message || "Мэдээллийн сантай холбогдоход алдаа гарлаа.");
    } finally {
      setIsSyncing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setIsLoggedIn(true);
          await fetchData(session.user.id);
        } else if (mounted) {
          setIsLoggedIn(false);
          setIsSyncing(false);
        }
      } catch (err) {
        if (mounted) {
          setSyncError("Холболт амжилтгүй");
          setIsSyncing(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isCreatingUserRef.current) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          setIsLoggedIn(true);
          await fetchData(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setIsSyncing(false);
        setState(prev => ({ ...prev, currentUser: null as any, inventory: [], orders: [] }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchData]);

  const handleLogout = async () => { 
    try {
      setIsSyncing(true);
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      setIsLoggedIn(false);
      setIsSyncing(false);
      setState(prev => ({ ...prev, currentUser: null as any }));
      window.location.reload();
    } catch (err) {
      window.location.reload();
    }
  };

  const handleUpdateInventoryItem = async (item: InventoryItem) => {
    try {
      const { error } = await supabase.from('inventory').update(item).eq('id', item.id);
      if (error) throw error;
      await fetchData(); 
    } catch (err: any) {
      alert("Шинэчлэхэд алдаа гарлаа: " + err.message);
    }
  };

  const handleAddInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    try {
      const { error } = await supabase.from('inventory').insert([{ ...item, id: `ITM-${Date.now()}` }]);
      if (error) throw error;
      await fetchData(); 
    } catch (err: any) {
      alert("Нэмэхэд алдаа гарлаа: " + err.message);
    }
  };

  const handleAddUser = async (userData: Omit<User, 'id' | 'isActive'>) => {
    isCreatingUserRef.current = true;
    try {
      const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { 
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: userData.loginName,
        password: userData.password!,
        options: { data: { username: userData.username, role: userData.role } }
      });
      if (authError) throw authError;
      if (authData.user) {
        await supabase.from('users').update({ username: userData.username, role: userData.role }).eq('id', authData.user.id);
        await tempSupabase.auth.signOut();
      }
      await fetchData();
    } catch (err: any) {
      throw new Error(err.message || "Гишүүн бүртгэхэд алдаа гарлаа.");
    } finally {
      setTimeout(() => { isCreatingUserRef.current = false; }, 500);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase.from('users').update({
        username: updates.username,
        role: updates.role
      }).eq('id', userId);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const targetUser = state.users.find(u => u.id === userId);
      if (!targetUser) return;
      const { error } = await supabase.from('users').update({ isActive: !targetUser.isActive }).eq('id', userId);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const handleCreateOrder = async (orderData: any): Promise<boolean> => {
    try {
      const totalAmount = orderData.items.reduce((acc: number, item: any) => acc + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
      const totalProfit = orderData.items.reduce((acc: number, item: any) => {
        const invItem = state.inventory.find(i => i.id === item.productId);
        const cost = invItem ? Number(invItem.originalCost || 0) : Number(item.price || 0) * 0.7;
        return acc + (Number(item.price || 0) - cost) * Number(item.quantity || 0);
      }, 0);
      
      const newId = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;
      const now = new Date();
      const targetRepId = orderData.repId || (state.currentUser?.role === UserRole.SALES_REP ? state.currentUser.id : null);

      const { error: insertError } = await supabase.from('orders').insert([{
        id: newId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        date: now.toISOString().split('T')[0],
        timestamp: now.toLocaleTimeString('it-IT'),
        amount: Math.round(totalAmount),
        profit: Math.round(totalProfit),
        status: OrderStatus.PENDING,
        items: orderData.items,
        repId: targetRepId,
        processedBy: state.currentUser?.username || 'System'
      }]);

      if (insertError) throw insertError;

      const inventoryUpdates = orderData.items.map(async (item: any) => {
        const invItem = state.inventory.find(i => i.id === item.productId);
        if (invItem) {
          const newStock = Math.max(0, Number(invItem.stock || 0) - Number(item.quantity || 0));
          return supabase.from('inventory').update({ stock: newStock }).eq('id', invItem.id);
        }
        return Promise.resolve();
      });

      await Promise.all(inventoryUpdates);
      fetchData().catch(e => console.error("Sync failed:", e));
      return true;
    } catch (err: any) {
      console.error("Order error:", err);
      alert("Захиалга бүртгэхэд алдаа гарлаа: " + (err.message || "Мэдээллийн сантай холбогдож чадсангүй."));
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
        const stockReturns = orderToUpdate.items.map(item => {
          const invItem = state.inventory.find(i => i.id === item.productId);
          if (invItem) {
            return supabase.from('inventory').update({ stock: invItem.stock + item.quantity }).eq('id', invItem.id);
          }
          return Promise.resolve();
        });
        await Promise.all(stockReturns);
      }
      
      await fetchData();
    } catch (err: any) {
      console.error("Update error:", err);
      throw err;
    }
  };

  const handleUpdateProfile = async (updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: updates.username,
          avatar: updates.avatar
        })
        .eq('id', state.currentUser.id);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Алдаа: " + err.message);
    }
  };

  if (syncError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Холболтын алдаа</h2>
        <p className="text-slate-500 mb-8 max-w-xs">{syncError}</p>
        <div className="flex space-x-4">
          <button onClick={() => { setSyncError(null); setIsSyncing(true); fetchData(); }} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Дахин оролдох</button>
          <button onClick={handleLogout} className="px-8 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl">Гарах</button>
        </div>
      </div>
    );
  }

  if (isSyncing || (isLoggedIn && !state.currentUser)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
          {isLoggedIn ? "Мэдээлэл татаж байна..." : "Систем ачаалж байна..."}
        </p>
        
        {showForceLogout && (
          <div className="mt-12 animate-in fade-in duration-500 flex flex-col items-center">
             <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Холболт удаж байна уу?</p>
             <div className="flex space-x-4">
                <button onClick={() => window.location.reload()} className="px-5 py-2 bg-slate-800 text-slate-300 text-[10px] font-black uppercase rounded-lg hover:bg-slate-700 transition-colors">Дахин ачаалах</button>
                <button onClick={handleLogout} className="px-5 py-2 bg-rose-900/40 text-rose-400 text-[10px] font-black uppercase rounded-lg hover:bg-rose-900/60 transition-colors">Хүчээр гарах</button>
             </div>
          </div>
        )}
      </div>
    );
  }

  if (!isLoggedIn) return <Login />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <div className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
      
      <div className={`fixed inset-y-0 left-0 z-50 transform lg:static lg:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          currentView={view} 
          onViewChange={(v) => { setView(v); setIsSidebarOpen(false); if (v === 'orders') setOrderFilter('Бүгд'); }} 
          currentUser={state.currentUser} 
          onLogout={handleLogout} 
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-16 bg-[#0f172a] text-white flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white">N</div>
            <span className="text-lg font-black tracking-tighter uppercase">NEO ERP</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-10">
          <div className="max-w-screen-2xl mx-auto h-full">
            {view === 'dashboard' && (
              <Dashboard 
                state={state} 
                onNavigateToOrders={(f) => { setOrderFilter(f); setView('orders'); }} 
              />
            )}
            {view === 'pos' && <POS state={state} onOrder={handleCreateOrder} onFinish={() => setView('orders')} />}
            {view === 'orders' && <OrderManagement state={state} initialFilter={orderFilter} onUpdateStatus={handleUpdateOrderStatus} onAddDriver={(name) => setState(p => ({ ...p, drivers: [...p.drivers, name] }))} onAddPaymentMethod={(name) => setState(p => ({ ...p, paymentMethods: [...p.paymentMethods, name] }))} onRemovePaymentMethod={(name) => setState(p => ({ ...p, paymentMethods: p.paymentMethods.filter(pm => pm !== name) }))} onRemoveDriver={(name) => setState(p => ({ ...p, drivers: p.drivers.filter(d => d !== name) }))} />}
            {view === 'inventory' && <InventoryManagement state={state} onUpdateItem={handleUpdateInventoryItem} onAddItem={handleAddInventoryItem} />}
            {view === 'reps' && <SalesRepPerformance state={state} />}
            {view === 'users' && state.currentUser?.role === UserRole.ADMIN && (
              <UserManagement 
                state={state} 
                onAddUser={handleAddUser} 
                onUpdateUser={handleUpdateUser} 
                onToggleStatus={handleToggleUserStatus} 
              />
            )}
            {view === 'profile' && <ProfileSettings currentUser={state.currentUser} onUpdateProfile={handleUpdateProfile} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
