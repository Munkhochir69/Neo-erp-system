
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../supabase';

interface ProfileSettingsProps {
  currentUser: User;
  onUpdateProfile: (updates: Partial<User>) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, onUpdateProfile }) => {
  const [formData, setFormData] = useState({
    username: currentUser.username || '',
    password: '',
    avatar: currentUser.avatar || ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      username: currentUser.username || '',
      avatar: currentUser.avatar || ''
    }));
  }, [currentUser]);

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
      setFormData(prev => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      onUpdateProfile({
        username: formData.username,
        avatar: formData.avatar
      });

      if (formData.password.trim().length > 0) {
        if (formData.password.length < 6) {
          throw new Error("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.");
        }
        const { error: authError } = await supabase.auth.updateUser({
          password: formData.password
        });
        if (authError) throw authError;
        setFormData(prev => ({ ...prev, password: '' }));
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900">Профайл тохиргоо</h1>
        <p className="text-slate-500">Та өөрийн нэр, нууц үг болон зургаа эндээс солих боломжтой.</p>
      </header>

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
          <span className="font-bold">Таны мэдээлэл амжилттай шинэчлэгдлээ.</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl flex items-center space-x-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-bold">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-slate-50 shadow-inner overflow-hidden bg-slate-100 flex items-center justify-center">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-slate-300">{formData.username?.charAt(0)}</span>
                )}
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".jpg,.jpeg" 
              onChange={handleImageUpload} 
              className="hidden" 
            />
            <div className="text-center">
              <h3 className="font-bold text-slate-900">{currentUser.username}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{currentUser.role}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Хэрэглэгчийн нэр</label>
                <input 
                  required
                  type="text" 
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Нэвтрэх нэр</label>
                <input 
                  disabled
                  type="text" 
                  value={currentUser.loginName} 
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-3 text-sm text-slate-400 cursor-not-allowed outline-none font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Шинэ нууц үг (солих бол бичнэ үү)</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="********"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium ml-1">Солих шаардлагагүй бол хоосон орхино уу.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white py-4 rounded-xl font-bold shadow-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              <span>{isSaving ? 'Хадгалж байна...' : 'Тохиргоог хадгалах'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
