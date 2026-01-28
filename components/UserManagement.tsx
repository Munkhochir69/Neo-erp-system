
import React, { useState } from 'react';
import { AppState, User, UserRole } from '../types';

interface UserManagementProps {
  state: AppState;
  onAddUser: (user: Omit<User, 'id' | 'isActive'>) => Promise<void>;
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  onToggleStatus: (userId: string) => Promise<void>;
}

const UserManagement: React.FC<UserManagementProps> = ({ state, onAddUser, onUpdateUser, onToggleStatus }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<User, 'id' | 'isActive' | 'avatar'>>({
    username: '',
    loginName: '',
    password: '',
    role: UserRole.SALES_REP
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (editingUserId) {
        await onUpdateUser(editingUserId, formData);
      } else {
        await onAddUser(formData);
      }
      closeModal();
    } catch (err: any) {
      setError(err.message || "Үйлдэл амжилтгүй боллоо.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUserId(null);
    setError(null);
    setFormData({ username: '', loginName: '', password: '', role: UserRole.SALES_REP });
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      loginName: user.loginName,
      password: user.password || '',
      role: user.role
    });
    setShowModal(true);
  };

  const handleToggleClick = (user: User) => {
    if (user.isActive) {
      setUserToToggle(user);
    } else {
      onToggleStatus(user.id).catch(err => alert(err.message));
    }
  };

  const handleConfirmToggle = async () => {
    if (userToToggle) {
      try {
        await onToggleStatus(userToToggle.id);
        setUserToToggle(null);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Хэрэглэгчийн удирдлага</h1>
          <p className="text-slate-500">Системийн хэрэглэгчид болон тэдний эрхийг тохируулах.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Гишүүн нэмэх</span>
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500">Нэр</th>
                <th className="px-6 py-4 font-bold text-slate-500">И-Мэйл / Login</th>
                <th className="px-6 py-4 font-bold text-slate-500">Үүрэг</th>
                <th className="px-6 py-4 font-bold text-slate-500">Төлөв</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.users.map((user) => (
                <tr key={user.id} className={`hover:bg-slate-50/50 group ${!user.isActive ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {user.avatar ? (
                        <img src={user.avatar} className="w-8 h-8 rounded-full object-cover border border-slate-200" alt={user.username} />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${user.isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          {user.username?.charAt(0)}
                        </div>
                      )}
                      <span className={`font-semibold ${user.isActive ? 'text-slate-900' : 'text-slate-400'}`}>{user.username}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${user.isActive ? 'text-slate-500' : 'text-slate-400 italic'}`}>{user.loginName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      !user.isActive ? 'bg-slate-100 text-slate-400' :
                      user.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' :
                      user.role === UserRole.SALES_MANAGER ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
                      <span className={`text-[11px] font-bold ${user.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button 
                        onClick={() => handleEditClick(user)}
                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        title="Засах"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleToggleClick(user)}
                        className={`p-2 rounded-lg transition-all ${
                          user.isActive 
                          ? 'text-slate-300 hover:text-amber-500 hover:bg-amber-50' 
                          : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={user.isActive ? "Deactivate" : "Activate"}
                      >
                        {user.isActive ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900">{editingUserId ? 'Мэдээлэл засах' : 'Шинэ гишүүн нэмэх'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ажилтны нэр</label>
                <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Жишээ: Д.Бат" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">И-Мэйл хаяг (Login)</label>
                <input required type="email" value={formData.loginName} disabled={!!editingUserId} onChange={e => setFormData({...formData, loginName: e.target.value})} placeholder="ажилтан@neoerp.mn" className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${editingUserId ? 'opacity-50 cursor-not-allowed' : ''}`} />
              </div>
              {!editingUserId && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Нууц үг</label>
                  <input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Минимум 6 тэмдэгт" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Системийн эрх</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                  <option value={UserRole.ADMIN}>Admin (Бүрэн эрх)</option>
                  <option value={UserRole.SALES_MANAGER}>Sales Manager</option>
                  <option value={UserRole.SALES_REP}>Sales Representative</option>
                </select>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Цуцлах</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{isSubmitting ? 'Бүртгэж байна...' : (editingUserId ? 'Хадгалах' : 'Бүртгэх')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToToggle && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-sm rounded-3xl shadow-2xl overflow-hidden p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Хэрэглэгчийг идэвхгүй болгох уу?</h2>
            <p className="text-slate-500 text-sm mb-8">
              Та "{userToToggle.username}" ажилтныг системд нэвтрэх эрхийг түр хаахдаа итгэлтэй байна уу?
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setUserToToggle(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Болих
              </button>
              <button 
                onClick={handleConfirmToggle}
                className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-2xl shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all"
              >
                Тийм
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
