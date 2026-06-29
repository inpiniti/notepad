import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FileText, AlertCircle, Loader2 } from 'lucide-react';

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
          setSuccessMsg('회원가입 인증 메일이 발송되었습니다. 메일함을 확인해 주세요.');
        } else {
          setSuccessMsg('회원가입이 완료되었습니다. 로그인되었습니다!');
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
      setErrorMsg(err.message || '인증에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative overflow-hidden select-none bg-white p-2">
      <div className="flex flex-col items-center mb-6">
        <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-3 animate-fadeIn">
          <FileText className="w-5.5 h-5.5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          필터패드 로그인
        </h2>
        <p className="text-slate-500 text-xs mt-1 text-center">
          {isSignUp ? '계정을 생성하고 나만의 스마트 필터 노트를 관리해 보세요' : '나만의 필터패드 메모장에 로그인하세요'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide">이메일 주소</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            disabled={isLoading}
            className="h-9.5 text-xs rounded-lg bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide">비밀번호</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
            className="h-9.5 text-xs rounded-lg bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
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
          className="w-full h-9.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 mt-5 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>처리 중...</span>
            </>
          ) : (
            <span>{isSignUp ? '가입하기' : '로그인'}</span>
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
          className="text-xs text-indigo-650 hover:text-indigo-700 font-medium underline"
        >
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 회원가입 계정 만들기'}
        </button>
      </div>
    </div>
  );
}
