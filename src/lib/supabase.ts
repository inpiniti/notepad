import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://your-project-id.supabase.co';
const DEFAULT_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'your-anon-key';

// 클라이언트 사이드 동적 설정을 위한 로컬스토리지를 검사합니다.
export const getSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('supabase_url');
    const savedKey = localStorage.getItem('supabase_anon_key');
    return {
      url: savedUrl || DEFAULT_URL,
      key: savedKey || DEFAULT_KEY
    };
  }
  return {
    url: DEFAULT_URL,
    key: DEFAULT_KEY
  };
};

const config = getSupabaseConfig();

// supabase 클라이언트 생성
// placeholder 값일 때 에러가 터지지 않고 오프라인(로컬) 모드로 우회할 수 있도록 임시 처리
export let supabase = createClient(config.url, config.key);

export const updateSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);
    // 인스턴스를 재성성합니다.
    supabase = createClient(url, key);
  }
};
