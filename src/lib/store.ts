import { create } from 'zustand';
import { supabase, getSupabaseConfig, updateSupabaseConfig } from './supabase';
import { User, Session } from '@supabase/supabase-js';

export interface Code {
  id: string;
  group: string; // 동적 코드 그룹을 위해 string 타입 적용
  name: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  codeIds: string[]; // 메모에 매핑된 코드 ID 목록
  attachments: string[]; // 파일 url 목록
  created: string;
  updated: string;
}

interface FilterState {
  selectedProject: string; // '전체' 또는 특정 프로젝트 name (기존 호환성 유지)
  selectedTags: string[]; // 선택된 태그 name 목록 (프로젝트 포함 통합 태그)
}

export interface CodeGroup {
  name: string;
  isMultiSelect: boolean;
}

interface StoreState {
  notes: Note[];
  codes: Code[];
  codeGroups: CodeGroup[]; // 각 카테고리(그룹)별 다중선택 설정 상태
  filter: FilterState;
  activeNoteId: string | null;
  isOffline: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isLoading: boolean;
  
  // Auth States
  user: User | null;
  session: Session | null;
  authInitialized: boolean;

  // Toast States
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';

  // Actions
  setSupabaseConfig: (url: string, key: string) => void;
  initialize: () => Promise<void>;
  initializeOffline: () => void;
  fetchCodeGroups: () => Promise<void>; // 카테고리 설정 페치
  fetchCodes: () => Promise<void>;
  fetchNotes: () => Promise<void>;
  addNote: (title: string, content: string, codeIds: string[], files?: File[]) => Promise<void>;
  updateNote: (id: string, title: string, content: string, codeIds: string[], files?: File[], remainingAttachments?: string[]) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  addCode: (group: string, name: string) => Promise<Code>;
  deleteCode: (id: string) => Promise<void>;
  updateCodeGroup: (groupName: string, isMultiSelect: boolean) => Promise<void>;
  logout: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  
  // Filter & Active actions
  setSelectedProject: (project: string) => void;
  toggleSelectedTag: (tag: string) => void;
  setActiveNoteId: (id: string | null) => void;
  
  // Navigation
  requestNavigation: (id: string | null) => Promise<boolean>;
  setNavigationInterceptor: (interceptor: ((id: string | null) => Promise<boolean>) | null) => void;

  clearFilters: () => void;
}

// 로컬 스토리지 헬퍼 (수퍼베이스 연결 실패 시 폴백용)
const getLocalData = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocalData = <T>(key: string, data: T) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// URL에서 수퍼베이스 스토리지 내부 파일 경로를 파싱하는 헬퍼
const getStoragePathFromUrl = (url: string): string | null => {
  if (!url) return null;
  const marker = 'notes-attachments/';
  const index = url.indexOf(marker);
  if (index !== -1) {
    const rawPath = url.substring(index + marker.length);
    // ?name=... 과 같은 쿼리 파라미터를 걷어내어 순수 스토리지 파일 경로 추출
    return rawPath.split('?')[0];
  }
  return null;
};

const DEFAULT_CODES: Code[] = [
  { id: 'c1', group: '프로젝트', name: 'fms' },
  { id: 'c2', group: '프로젝트', name: '가스링크' },
  { id: 'c3', group: '프로젝트', name: 'spc' },
  { id: 'c4', group: 'tag', name: '메모' },
  { id: 'c5', group: 'tag', name: '프젝' },
  { id: 'c6', group: 'tag', name: '기타' },
  { id: 'c7', group: 'tag', name: '일정' },
  { id: 'c8', group: 'tag', name: '등등등' }
];

const DEFAULT_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'gg',
    content: 'kkkkk',
    codeIds: ['c1', 'c4', 'c7'], // fms, 메모, 일정
    attachments: [],
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  },
  {
    id: 'n2',
    title: 'hh',
    content: 'qqqqq',
    codeIds: ['c2', 'c6'], // 가스링크, 기타
    attachments: [],
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  },
  {
    id: 'n3',
    title: 'ㅎㅎ',
    content: 'ㅠㅠㅠㅠㅠㅠ',
    codeIds: ['c4'], // 메모
    attachments: [],
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  }
];

// 네비게이션 가로채기를 위한 모듈 레벨 변수 (상태 변경으로 인한 무한 렌더링 방지)
let globalNavigationInterceptor: ((id: string | null) => Promise<boolean>) | null = null;

export const useStore = create<StoreState>((set, get) => ({
  notes: [],
  codes: [],
  codeGroups: [
    { name: '프로젝트', isMultiSelect: false },
    { name: 'tag', isMultiSelect: true }
  ],
  filter: {
    selectedProject: '전체',
    selectedTags: []
  },
  activeNoteId: null,
  isOffline: false,
  supabaseUrl: typeof window !== 'undefined' ? getSupabaseConfig().url : '',
  supabaseAnonKey: typeof window !== 'undefined' ? getSupabaseConfig().key : '',
  isLoading: false,
  
  // Toast 초기값
  toastMessage: null,
  toastType: 'info',
  
  // Auth 상태 초기값
  user: null,
  session: null,
  authInitialized: false,

  setSupabaseConfig: (url, key) => {
    updateSupabaseConfig(url, key);
    set({ supabaseUrl: url, supabaseAnonKey: key });
    get().initialize();
  },

  initialize: async () => {
    set({ isLoading: true });
    
    // 환경변수 값이 기본 템플릿(placeholder) 상태인지 체크합니다.
    const isPlaceholder = 
      get().supabaseUrl.includes('your-project-id') || 
      get().supabaseAnonKey.includes('your-anon-key') ||
      !get().supabaseUrl.startsWith('http');

    if (isPlaceholder) {
      console.warn('Supabase URL/Key가 설정되지 않았습니다. 오프라인(로컬 스토리지) 모드로 전환합니다.');
      set({ isOffline: true, authInitialized: true });
      get().initializeOffline();
      return;
    }

    try {
      // 1. Auth 세션 초기화 및 상태 변화 리스너 바인딩
      const { data: { session } } = await supabase.auth.getSession();
      set({ 
        session, 
        user: session?.user ?? null,
        authInitialized: true
      });

      // 인증 상태 변경 리스너 등록
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        set({ 
          session: newSession, 
          user: newSession?.user ?? null 
        });

        // 이메일 인증 후 URL에 남는 #access_token= 해시를 깔끔하게 제거
        if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        
        if (newSession?.user) {
          set({ isOffline: false });
          await get().fetchCodeGroups();
          await get().fetchCodes();
          await get().fetchNotes();
        } else {
          set({ notes: [], codes: [] });
        }
      });

      // 최초 로그인 상태라면 즉시 페치
      if (session?.user) {
        set({ isOffline: false });
        await get().fetchCodeGroups();
        await get().fetchCodes();
        await get().fetchNotes();
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.warn('Supabase 서버 통신 실패. 로컬 스토리지 모드로 구동합니다.', e);
      set({ isOffline: true, authInitialized: true });
      get().initializeOffline();
    } finally {
      set({ isLoading: false });
    }
  },

  // 오프라인 데이터 적재 헬퍼
  initializeOffline: () => {
    let localCodes = getLocalData<Code[]>('local_codes', []);
    let localNotes = getLocalData<Note[]>('local_notes', []);
    
    if (localCodes.length === 0) {
      localCodes = DEFAULT_CODES;
      setLocalData('local_codes', localCodes);
    }
    if (localNotes.length === 0) {
      localNotes = DEFAULT_NOTES;
      setLocalData('local_notes', localNotes);
    }
    
    set({ codes: localCodes, notes: localNotes });
  },

  fetchCodeGroups: async () => {
    if (get().isOffline) return;
    const user = get().user;
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('code_groups')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`);

      if (error) throw error;

      const mappedGroups = data.map((cg: any) => ({
        name: cg.name,
        isMultiSelect: cg.is_multi_select
      }));
      set({ codeGroups: mappedGroups });
    } catch (e) {
      console.warn('Failed to fetch code groups from Supabase, fallback to local default', e);
      // fallback
      set({ codeGroups: [
        { name: '프로젝트', isMultiSelect: false },
        { name: 'tag', isMultiSelect: true }
      ] });
    }
  },

  // 분류 그룹의 단일/다중 선택 여부를 업데이트
  updateCodeGroup: async (groupName: string, isMultiSelect: boolean) => {
    // 로컬 상태 즉시 반영 (낙관적 업데이트)
    set(state => ({
      codeGroups: state.codeGroups.map(g =>
        g.name === groupName ? { ...g, isMultiSelect } : g
      )
    }));

    if (get().isOffline) return;
    const user = get().user;
    if (!user) return;

    try {
      const { error } = await supabase
        .from('code_groups')
        .upsert(
          { name: groupName, is_multi_select: isMultiSelect, user_id: user.id },
          { onConflict: 'name' }
        );
      if (error) throw error;
    } catch (e) {
      console.warn('code_groups 업데이트 실패, 로컬 상태만 반영됨', e);
    }
  },

  fetchCodes: async () => {
    if (get().isOffline) return;
    const user = get().user;
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('codes')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`) // 공유 데이터 또는 자기 데이터 조회
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedCodes = data.map((r: any) => ({
        id: r.id,
        group: r.group_name,
        name: r.name
      }));
      set({ codes: mappedCodes });
    } catch (e) {
      console.error('Failed to fetch codes from Supabase', e);
    }
  },

  fetchNotes: async () => {
    if (get().isOffline) return;
    const user = get().user;
    if (!user) return;

    try {
      // notes와 note_codes(다대다 매핑)를 한 번에 Join 쿼리로 조회
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id,
          title,
          content,
          attachments,
          created_at,
          updated_at,
          user_id,
          note_codes (code_id)
        `)
        .eq('user_id', user.id) // 로그인 사용자의 노트만 격리 조회
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedNotes = data.map((note: any) => {
        const codeIds = note.note_codes?.map((nc: any) => nc.code_id) || [];
        return {
          id: note.id,
          title: note.title,
          content: note.content || '',
          codeIds,
          attachments: note.attachments || [],
          created: note.created_at,
          updated: note.updated_at
        };
      });
      
      set({ notes: mappedNotes });
    } catch (e) {
      console.error('Failed to fetch notes from Supabase', e);
    }
  },

  addNote: async (title, content, codeIds, files = []) => {
    const user = get().user;
    if (get().isOffline) {
      const newNote: Note = {
        id: 'n_' + Math.random().toString(36).substr(2, 9),
        title,
        content,
        codeIds,
        attachments: files.map(f => URL.createObjectURL(f)),
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };
      const updatedNotes = [newNote, ...get().notes];
      set({ notes: updatedNotes });
      setLocalData('local_notes', updatedNotes);
      return;
    }

    try {
      // 1. 파일 첨부 업로드 처리 (수퍼베이스 스토리지 활용)
      const uploadedUrls: string[] = [];
      for (const file of files) {
        // 한글/공백/특수문자로 인한 업로드 에러를 차단하기 위해 스토리지 저장 파일명은 안전한 영숫자로 가공
        const fileExt = file.name.split('.').pop() || '';
        const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `notes/${safeFileName}`;
        
        // 'notes-attachments' 버킷 업로드 시도 (버킷이 있을 때만 동작)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('notes-attachments')
          .upload(filePath, file);

        if (!uploadError && uploadData) {
          // public url 획득
          const { data: urlData } = supabase.storage
            .from('notes-attachments')
            .getPublicUrl(filePath);
          if (urlData) {
            // 원본 파일명을 쿼리 스트링에 인코딩하여 DB에 함께 기록 (파일 조회 시 디코딩)
            const urlWithOriginalName = `${urlData.publicUrl}?name=${encodeURIComponent(file.name)}`;
            uploadedUrls.push(urlWithOriginalName);
          }
        } else {
          console.warn('Storage upload error (버킷 생성 여부 확인 요망):', uploadError);
          // 스토리지 에러 시 임시 Blob URL과 쿼리 스트링 결합하여 폴백 제공
          uploadedUrls.push(`${URL.createObjectURL(file)}?name=${encodeURIComponent(file.name)}`);
        }
      }

      // 2. notes 테이블 인서트
      const notePayload: any = {
        title,
        content,
        attachments: uploadedUrls
      };
      if (user) {
        notePayload.user_id = user.id;
      }

      const { data: noteRecord, error: noteError } = await supabase
        .from('notes')
        .insert([notePayload])
        .select()
        .single();

      if (noteError) throw noteError;

      // 3. note_codes 다대다 매핑 인서트
      if (codeIds.length > 0) {
        const mappings = codeIds.map(cid => ({
          note_id: noteRecord.id,
          code_id: cid
        }));
        const { error: mappingError } = await supabase
          .from('note_codes')
          .insert(mappings);
          
        if (mappingError) throw mappingError;
      }

      await get().fetchNotes();
    } catch (e) {
      console.error('Failed to add note to Supabase', e);
      throw e;
    }
  },

  updateNote: async (id, title, content, codeIds, files = [], remainingAttachments = []) => {
    if (get().isOffline) {
      const updatedNotes = get().notes.map(note => {
        if (note.id === id) {
          const newFilesUrls = files.map(f => URL.createObjectURL(f));
          return {
            ...note,
            title,
            content,
            codeIds,
            attachments: [...remainingAttachments, ...newFilesUrls],
            updated: new Date().toISOString()
          };
        }
        return note;
      });
      set({ notes: updatedNotes });
      setLocalData('local_notes', updatedNotes);
      return;
    }

    try {
      // 0. 삭제된 첨부파일을 수퍼베이스 스토리지에서 실제로 영구 제거
      const noteToUpdate = get().notes.find(n => n.id === id);
      if (noteToUpdate) {
        const removedUrls = noteToUpdate.attachments.filter(
          url => !remainingAttachments.includes(url)
        );
        if (removedUrls.length > 0) {
          const pathsToRemove = removedUrls
            .map(url => getStoragePathFromUrl(url))
            .filter((p): p is string => !!p);
          if (pathsToRemove.length > 0) {
            const { error: err } = await supabase.storage
              .from('notes-attachments')
              .remove(pathsToRemove);
            if (err) console.warn('Failed to remove physically deleted files from storage:', err);
          }
        }
      }

      // 1. 신규 파일들 업로드
      const uploadedUrls: string[] = [...remainingAttachments];
      for (const file of files) {
        // 한글/공백/특수문자로 인한 업로드 에러를 차단하기 위해 스토리지 저장 파일명은 안전한 영숫자로 가공
        const fileExt = file.name.split('.').pop() || '';
        const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `notes/${safeFileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('notes-attachments')
          .upload(filePath, file);

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('notes-attachments')
            .getPublicUrl(filePath);
          if (urlData) {
            // 원본 파일명을 쿼리 스트링에 인코딩하여 DB에 함께 기록 (파일 조회 시 디코딩)
            const urlWithOriginalName = `${urlData.publicUrl}?name=${encodeURIComponent(file.name)}`;
            uploadedUrls.push(urlWithOriginalName);
          }
        } else {
          console.warn('Storage upload error:', uploadError);
          uploadedUrls.push(`${URL.createObjectURL(file)}?name=${encodeURIComponent(file.name)}`);
        }
      }

      // 2. notes 업데이트
      const { error: noteError } = await supabase
        .from('notes')
        .update({
          title,
          content,
          attachments: uploadedUrls,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (noteError) throw noteError;

      // 3. 다대다 매핑 업데이트 (전체 삭제 후 재생성)
      const { error: deleteRelError } = await supabase
        .from('note_codes')
        .delete()
        .eq('note_id', id);
        
      if (deleteRelError) throw deleteRelError;

      if (codeIds.length > 0) {
        const mappings = codeIds.map(cid => ({
          note_id: id,
          code_id: cid
        }));
        const { error: mappingError } = await supabase
          .from('note_codes')
          .insert(mappings);
          
        if (mappingError) throw mappingError;
      }

      await get().fetchNotes();
    } catch (e) {
      console.error('Failed to update note in Supabase', e);
      throw e;
    }
  },

  deleteNote: async (id) => {
    if (get().isOffline) {
      const updatedNotes = get().notes.filter(note => note.id !== id);
      set({ notes: updatedNotes, activeNoteId: get().activeNoteId === id ? null : get().activeNoteId });
      setLocalData('local_notes', updatedNotes);
      return;
    }

    try {
      // 0. 삭제 대상 노트의 모든 물리 첨부파일을 수퍼베이스 스토리지에서 영구 제거
      const noteToDelete = get().notes.find(n => n.id === id);
      if (noteToDelete && noteToDelete.attachments.length > 0) {
        const pathsToRemove = noteToDelete.attachments
          .map(url => getStoragePathFromUrl(url))
          .filter((p): p is string => !!p);
        if (pathsToRemove.length > 0) {
          const { error: err } = await supabase.storage
            .from('notes-attachments')
            .remove(pathsToRemove);
          if (err) console.warn('Failed to remove physically deleted files from storage:', err);
        }
      }

      // notes 테이블 삭제 시 FK ON DELETE CASCADE 조건으로 note_codes의 관련 행은 SQL 상에서 연쇄 자동 삭제됩니다.
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set({ activeNoteId: get().activeNoteId === id ? null : get().activeNoteId });
      await get().fetchNotes();
    } catch (e) {
      console.error('Failed to delete note from Supabase', e);
    }
  },

  addCode: async (group, name) => {
    const trimmedName = name.trim();
    const user = get().user;
    if (get().isOffline) {
      const newCode: Code = {
        id: 'c_' + Math.random().toString(36).substr(2, 9),
        group,
        name: trimmedName
      };
      const updatedCodes = [...get().codes, newCode];
      set({ codes: updatedCodes });
      setLocalData('local_codes', updatedCodes);
      return newCode;
    }

    try {
      const codePayload: any = {
        group_name: group,
        name: trimmedName
      };
      if (user) {
        codePayload.user_id = user.id;
      }

      const { data, error } = await supabase
        .from('codes')
        .insert([codePayload])
        .select()
        .single();

      if (error) throw error;

      const newCode: Code = {
        id: data.id,
        group: data.group_name,
        name: data.name
      };
      await get().fetchCodes();
      return newCode;
    } catch (e) {
      console.error('Failed to add code to Supabase', e);
      throw e;
    }
  },

  deleteCode: async (id) => {
    if (get().isOffline) {
      const updatedCodes = get().codes.filter(c => c.id !== id);
      const updatedNotes = get().notes.map(note => ({
        ...note,
        codeIds: note.codeIds.filter(cid => cid !== id)
      }));

      set({ codes: updatedCodes, notes: updatedNotes });
      setLocalData('local_codes', updatedCodes);
      setLocalData('local_notes', updatedNotes);
      return;
    }

    try {
      // FK cascade delete 에 따라 codes 행 삭제 시 note_codes 내 매핑 행도 연쇄 자동 삭제됩니다.
      const { error } = await supabase
        .from('codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await get().fetchCodes();
      await get().fetchNotes();
    } catch (e) {
      console.error('Failed to delete code from Supabase', e);
    }
  },

  logout: async () => {
    try {
      if (!get().isOffline) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Supabase signOut error', e);
    } finally {
      set({ user: null, session: null, notes: [], codes: [] });
    }
  },

  showToast: (message, type = 'success') => {
    set({ toastMessage: message, toastType: type });
    const activeTimer = (window as any).toastTimer;
    if (activeTimer) clearTimeout(activeTimer);

    (window as any).toastTimer = setTimeout(() => {
      get().hideToast();
    }, 3000);
  },

  hideToast: () => {
    set({ toastMessage: null });
  },

  setSelectedProject: (project) => {
    // 프로젝트 필터링 방식을 selectedTags 연동 방식으로 전환하여 단일/다중 동기화
    if (project === '전체') {
      set(state => {
        const projectCodeNames = state.codes
          .filter(c => c.group === '프로젝트')
          .map(c => c.name);
        return {
          filter: {
            ...state.filter,
            selectedProject: '전체',
            selectedTags: state.filter.selectedTags.filter(t => !projectCodeNames.includes(t))
          }
        };
      });
    } else {
      set(state => ({
        filter: {
          ...state.filter,
          selectedProject: project
        }
      }));
      // toggleSelectedTag 호출로 단일선택 규칙을 강제 적용
      get().toggleSelectedTag(project);
    }
  },

  toggleSelectedTag: (tag) => {
    set(state => {
      // 1. 선택하려는 태그의 group을 codes에서 탐색
      const targetCode = state.codes.find(c => c.name === tag);
      if (!targetCode) return {};

      // 2. 해당 group의 isMultiSelect 설정을 탐색 (기본값 true)
      const groupConfig = state.codeGroups.find(cg => cg.name === targetCode.group);
      const isMulti = groupConfig ? groupConfig.isMultiSelect : true;

      let nextTags = [...state.filter.selectedTags];

      if (isMulti) {
        // 다중 선택: 토글
        nextTags = nextTags.includes(tag)
          ? nextTags.filter(t => t !== tag)
          : [...nextTags, tag];
      } else {
        // 단일 선택: 같은 그룹에 속하는 기존 선택 코드를 제거하고 추가
        const sameGroupCodeNames = state.codes
          .filter(c => c.group === targetCode.group)
          .map(c => c.name);

        nextTags = nextTags.filter(t => !sameGroupCodeNames.includes(t));
        // 선택을 해제하는 클릭이었을 경우 추가하지 않음
        const isCurrentlySelected = state.filter.selectedTags.includes(tag);
        if (!isCurrentlySelected) {
          nextTags.push(tag);
        }
      }

      // 호환성 유지: '프로젝트' 그룹 단일 선택 변화 시 selectedProject 문자열 상태도 동기화
      let nextProject = state.filter.selectedProject;
      if (targetCode.group === '프로젝트') {
        const selectedProj = state.codes
          .filter(c => c.group === '프로젝트' && nextTags.includes(c.name))
          .map(c => c.name)[0];
        nextProject = selectedProj || '전체';
      }

      return {
        filter: {
          ...state.filter,
          selectedProject: nextProject,
          selectedTags: nextTags
        }
      };
    });
  },

  setActiveNoteId: (id) => {
    set({ activeNoteId: id });
  },

  setNavigationInterceptor: (interceptor) => {
    globalNavigationInterceptor = interceptor;
  },
  
  requestNavigation: async (id) => {
    if (globalNavigationInterceptor) {
      const proceed = await globalNavigationInterceptor(id);
      if (!proceed) return false;
    }
    const { setActiveNoteId } = get();
    setActiveNoteId(id);
    return true;
  },

  clearFilters: () => {
    set({
      filter: {
        selectedProject: '전체',
        selectedTags: []
      }
    });
  }
}));
