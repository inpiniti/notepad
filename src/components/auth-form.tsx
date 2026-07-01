import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/translations';

interface AuthFormProps {
  onSuccess?: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentLang = useStore((state) => state.currentLang);
  const t = translations[currentLang] || translations.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user && data.session === null) {
          setSuccessMsg(t.signupCheckEmail);
        } else {
          setSuccessMsg(t.signupSuccess);
          if (onSuccess) onSuccess();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t.authFail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative overflow-hidden select-none bg-white p-2">
      <div className="flex flex-col items-center mb-6">
        <div className="w-11 h-11 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/20 mb-3 animate-fadeIn">
          <FileText className="w-5.5 h-5.5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {t.loginModalTitle}
        </h2>
        <p className="text-slate-500 text-xs mt-1 text-center">
          {isSignUp ? t.signupModalDesc : t.loginModalDesc}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide">{t.emailLabel}</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            disabled={isLoading}
            className="h-9.5 text-xs rounded-lg bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-rose-500 focus-visible:border-rose-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide">{t.passwordLabel}</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
            className="h-9.5 text-xs rounded-lg bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-rose-500 focus-visible:border-rose-500"
          />
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg p-2.5 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-lg p-2.5 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-9.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-semibold rounded-lg shadow-md shadow-rose-600/10 flex items-center justify-center gap-2 mt-5 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{t.processing}</span>
            </>
          ) : (
            <span>{isSignUp ? t.signupSubmit : t.loginSubmit}</span>
          )}
        </Button>
      </form>

      <div className="mt-5 pt-4 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          disabled={isLoading}
          className="text-xs text-rose-650 hover:text-rose-700 font-medium underline"
        >
          {isSignUp ? t.toLoginPrompt : t.toSignupPrompt}
        </button>
      </div>
    </div>
  );
}
