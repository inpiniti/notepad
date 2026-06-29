import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { FilterPanel } from '@/components/filter-panel';
import { NoteList } from '@/components/note-list';
import { NoteEditor } from '@/components/note-editor';
import { AuthForm } from '@/components/auth-form';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SlidersHorizontal,
  FileText,
  Folder,
  Tag,
  BookOpen,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Globe
} from 'lucide-react';
import { translations, LangType } from '@/lib/translations';

export default function App() {
  const {
    initialize,
    filter,
    activeNoteId,
    setActiveNoteId,
    isOffline,
    setSelectedProject,
    toggleSelectedTag,
    user,
    authInitialized,
    logout,
    toastMessage,
    toastType,
    hideToast,
    currentLang,
    setLang
  } = useStore();

  const t = translations[currentLang] || translations.en;

  // 모바일 오버레이 상태
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);

  // 로그인 팝업 모달 상태
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // 컴포넌트 마운트 시 데이터 초기화
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleOpenEditorMobile = () => {
    if (window.innerWidth < 1024) {
      setIsMobileEditorOpen(true);
    }
  };

  const handleCloseEditorMobile = () => {
    setIsMobileEditorOpen(false);
  };

  if (!authInitialized) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full bg-white flex flex-col antialiased overflow-hidden text-slate-800">
      {/* 1. 상단 글로벌 헤더 */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-250 bg-white px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-950 tracking-tight">{t.appTitle}</h1>
            <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">{t.appSubtitle}</p>
          </div>
        </div>

        {/* 데스크탑용 선택된 필터 배지 리스트 */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0 max-w-[40%] select-none">
          {filter.selectedProject !== (currentLang === 'ko' ? '전체' : (currentLang === 'ja' ? 'すべて' : (currentLang === 'zh' ? '全部' : 'All'))) && (
            <Badge variant="project" className="text-[9px] py-0.5 pl-2 pr-1 rounded-md whitespace-nowrap shrink-0 flex items-center h-5.5 border border-slate-200 bg-indigo-50/30 text-indigo-700">
              <Folder className="w-2.5 h-2.5 mr-1 shrink-0 text-indigo-500/80" />
              <span className="max-w-[100px] truncate">{filter.selectedProject}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const allKeyword = currentLang === 'ko' ? '전체' : (currentLang === 'ja' ? 'すべて' : (currentLang === 'zh' ? '全部' : 'All'));
                  setSelectedProject(allKeyword);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                title="Clear Project Filter"
              >
                <X className="w-2 h-2" />
              </button>
            </Badge>
          )}

          {filter.selectedTags.map(tag => (
            <Badge key={tag} variant="tag" className="text-[9px] py-0.5 pl-2 pr-1 rounded-md whitespace-nowrap shrink-0 flex items-center h-5.5 border border-slate-200 bg-emerald-50/30 text-emerald-700">
              <Tag className="w-2.5 h-2.5 mr-1 shrink-0 text-emerald-500/80" />
              <span className="max-w-[100px] truncate">{tag}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectedTag(tag);
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                title="Clear Tag Filter"
              >
                <X className="w-2 h-2" />
              </button>
            </Badge>
          ))}
        </div>

        {/* 우측 유틸리티 영역 (언어 선택기 + 인증) */}
        <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-4 select-none">
          {/* 다국어 언어 셀렉트 박스 */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 h-6.5">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={currentLang}
              onChange={(e) => setLang(e.target.value as LangType)}
              className="text-[9.5px] font-bold text-slate-650 bg-transparent border-none outline-none cursor-pointer focus:ring-0"
            >
              <option value="en">English</option>
              <option value="ko">한국어</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          {!isOffline && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[9px] font-bold text-slate-450 leading-none">{t.loginState}</span>
                <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[120px] mt-0.5" title={user.email}>
                  {user.email}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="h-6.5 text-[9.5px] border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold rounded-lg cursor-pointer px-2"
              >
                {t.logout}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-md">{t.sampleMode}</span>
              <Button
                onClick={() => setIsLoginModalOpen(true)}
                className="h-6.5 text-[9.5px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer px-3 shadow-sm shadow-indigo-600/10"
              >
                {t.loginBtn}
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="flex-1 w-full flex flex-col overflow-hidden">
        {/* 모바일 퀵 필터 바 */}
        <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 p-3 shadow-xs shrink-0 gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 scrollbar-none py-0.5">
            <Badge variant="project" className="text-[10px] rounded-md whitespace-nowrap shrink-0 flex items-center pr-1.5">
              <Folder className="w-2.5 h-2.5 mr-1 shrink-0" />
              <span>{filter.selectedProject}</span>
              {filter.selectedProject !== '전체' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProject('전체');
                  }}
                  className="ml-1 p-0.5 rounded-full hover:bg-slate-200/80 text-slate-450 hover:text-slate-700 transition-colors shrink-0"
                  title="프로젝트 필터 해제"
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </Badge>
            {filter.selectedTags.length > 0 ? (
              filter.selectedTags.map(tag => (
                <Badge key={tag} variant="tag" className="text-[10px] rounded-md whitespace-nowrap shrink-0 flex items-center pr-1.5">
                  <Tag className="w-2.5 h-2.5 mr-1 shrink-0" />
                  <span>{tag}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectedTag(tag);
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-slate-200/80 text-slate-450 hover:text-slate-700 transition-colors shrink-0"
                    title="태그 필터 해제"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </Badge>
              ))
            ) : (
              <Badge variant="secondary" className="text-[10px] text-slate-400 border-dashed rounded-md whitespace-nowrap shrink-0">
                태그 없음
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center gap-1.5 h-8 text-xs font-semibold rounded-lg text-slate-600 whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>상세 필터</span>
          </Button>
        </div>

        {/* 메인 레이아웃 본체 */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[260px_360px_1fr] overflow-hidden h-full divide-x divide-slate-200">
          {/* 1) 좌측 필터 패널 (데스크탑 뷰 전용) */}
          <section className="hidden md:flex flex-col bg-slate-50/50 overflow-hidden">
            <FilterPanel />
          </section>

          {/* 2) 중앙 노트 목록 패널 */}
          <section className="flex flex-col bg-white overflow-hidden">
            <NoteList onOpenEditorMobile={handleOpenEditorMobile} />
          </section>

          {/* 3) 우측 노트 상세/에디터 패널 (데스크탑 뷰 전용) */}
          <section className="hidden lg:flex flex-col bg-white overflow-hidden">
            {activeNoteId || activeNoteId === null ? (
              <NoteEditor />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center bg-slate-50/20 border border-dashed border-slate-200 rounded-lg m-5">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="font-semibold text-slate-700 text-base">노트가 선택되지 않았습니다</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                  왼쪽 목록에서 노트를 선택하여 내용을 편집하거나, 신규 노트를 작성하여 프로젝트/태그와 연결해 보세요.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 3. 모바일용 모달/드로어 통합 */}

      {/* 가. 모바일 필터 다이얼로그 (바텀시트 스타일) */}
      <Dialog
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="상세 필터 설정"
        className="p-0 sm:p-0 overflow-hidden"
      >
        <FilterPanel
          isMobileDrawer={true}
          onCloseMobileDrawer={() => setIsMobileFilterOpen(false)}
        />
      </Dialog>

      {/* 나. 모바일 에디터 전체화면 오버레이 */}
      {isMobileEditorOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col w-full overflow-hidden animate-slideUp">
          <div className="flex-1 min-h-0 flex flex-col">
            <NoteEditor onCloseMobile={handleCloseEditorMobile} />
          </div>
        </div>
      )}

      {/* 라. 로그인 팝업 모달 */}
      <Dialog
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        className="p-4 sm:p-5 overflow-hidden"
      >
        <AuthForm onSuccess={() => setIsLoginModalOpen(false)} />
      </Dialog>

      {/* 다. 전역 Toast 알림 */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border animate-fadeIn select-none transition-all ${toastType === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toastType === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
        >
          {toastType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          {toastType === 'error' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
          {toastType === 'info' && <Info className="w-4 h-4 text-indigo-500 shrink-0" />}
          <span>{toastMessage}</span>
          <button
            onClick={hideToast}
            className="ml-1 p-0.5 rounded-full hover:bg-black/10 text-current transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
