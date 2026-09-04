import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LogIn, UserCircle2 } from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <div className="h-8 w-8 rounded-full bg-slate-800 animate-pulse" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs font-bold text-slate-200">{user.displayName || "Clasher"}</span>
          <span className="text-[10px] text-slate-400">Đã đăng nhập</span>
        </div>
        <button 
          onClick={signOut}
          className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-full bg-[#142636] border border-[#ffffff12] hover:bg-[#1f374e] text-slate-300 transition-colors"
          title="Đăng xuất"
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full" />
          ) : (
            <UserCircle2 className="w-6 h-6 text-slate-400" />
          )}
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shrink-0"
    >
      <LogIn className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Đăng nhập</span>
    </button>
  );
};
