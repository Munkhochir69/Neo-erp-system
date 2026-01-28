
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.ts';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Хэрэв App.tsx амжилттай нэвтрээд энэ хуудсыг хааж амжихгүй бол setLoading-ийг цэвэрлэх
  useEffect(() => {
    let timer: number;
    if (loading) {
      timer = window.setTimeout(() => {
        setLoading(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setError('');
    setLoading(true);

    try {
      // КРИТИКАЛ: Шинээр нэвтрэхээс өмнө хуучин сессийг хүчээр цэвэрлэнэ.
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        setLoading(false);
        setError('И-мэйл эсвэл нууц үг буруу байна.');
        return;
      }
      
      // Амжилттай болсон тохиолдолд App.tsx-ийн onAuthStateChange ажиллаж хуудсыг солино.
    } catch (err: any) {
      setError('Холболтын алдаа гарлаа: ' + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-['Inter']">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] items-center justify-center p-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center font-black text-white text-5xl mb-10 mx-auto shadow-2xl shadow-blue-500/30">N</div>
          <h2 className="text-5xl font-black text-white mb-6 tracking-tighter uppercase">NEO ERP</h2>
          <p className="text-slate-400 max-w-sm mx-auto text-lg font-medium leading-relaxed">
            Онлайн дэлгүүрийн борлуулалт, нөөц болон хүргэлтийг нэг дороос удирдах премиум систем.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md bg-white p-12 rounded-[3rem] shadow-2xl shadow-slate-200">
          <header className="mb-12 text-center">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Тавтай морил</h1>
            <p className="text-slate-500 font-bold tracking-tight">Нэвтрэх мэдээллээ оруулна уу.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 rounded-[1.5rem] text-sm font-black flex items-center space-x-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                <span className="leading-tight">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">И-Мэйл Хаяг</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@neo.erp"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">Нууц үг</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L5.636 5.636m12.728 12.728L18.364 18.364M21 12c0 1.268-.263 2.473-.74 3.568m-1.137-5.568A9.976 9.976 0 0121 12c-1.275 4.057-5.065 7-9.542 7-1.168 0-2.285-.198-3.326-.564M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-blue-500/30 transition-all flex items-center justify-center space-x-3 active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Түр хүлээнэ үү...</span>
                </div>
              ) : (
                <span>Системд нэвтрэх</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
