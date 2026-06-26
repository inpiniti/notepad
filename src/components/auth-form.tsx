import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FileText, AlertCircle, Loader2 } from 'lucide-react';

export function AuthForm() {
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
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '인증에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-slate-900 px-4 py-8 relative overflow-hidden select-none">
      {/* 백그라운드 빛 효과 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 shadow-2xl animate-fadeIn relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/35 mb-3">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            퀀트 투자 메모장
          </h2>
          <p className="text-slate-400 text-sm mt-1.5">
            {isSignUp ? '계정을 생성하고 나만의 투자 노트를 관리해 보세요' : '나만의 투자 분석 메모장에 로그인하세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-350 tracking-wide">이메일 주소</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              disabled={isLoading}
              className="h-10 text-sm rounded-lg bg-slate-900/60 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-350 tracking-wide">비밀번호</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="h-10 text-sm rounded-lg bg-slate-900/60 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
            />
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-lg p-3 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs rounded-lg p-3 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>처리 중...</span>
              </>
            ) : (
              <span>{isSignUp ? '가입하기' : '로그인'}</span>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-750 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            disabled={isLoading}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 회원가입 계정 만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}
