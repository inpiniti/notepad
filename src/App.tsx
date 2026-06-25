import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { FilterPanel } from '@/components/filter-panel';
import { NoteList } from '@/components/note-list';
import { NoteEditor } from '@/components/note-editor';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  SlidersHorizontal, 
  FileText, 
  Folder, 
  Tag, 
  BookOpen, 
  ServerCrash
} from 'lucide-react';

export default function App() {
  const { 
    initialize, 
    filter, 
    activeNoteId, 
    setActiveNoteId, 
    isOffline 
  } = useStore();

  // 모바일 오버레이 상태
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);

  // 컴포넌트 마운트 시 데이터 초기화
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleOpenEditorMobile = () => {
    setIsMobileEditorOpen(true);
  };

  const handleCloseEditorMobile = () => {
    setIsMobileEditorOpen(false);
  };

  return (
    <div className="h-screen bg-slate-50/50 flex flex-col antialiased overflow-hidden">
      {/* 1. 상단 글로벌 헤더 */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Smart Notepad</h1>
            <p className="text-[10px] text-slate-400 font-medium">상세코드 매핑 & 실시간 동기화 노트</p>
          </div>
        </div>

        {/* 연결 상태 뱃지 */}
        <div className="flex items-center gap-2">
          {isOffline ? (
            <Badge variant="destructive" className="flex items-center gap-1 text-[10px] font-semibold py-0.5 px-2">
              <ServerCrash className="w-3 h-3" />
              <span>로컬 스토리지 모드</span>
            </Badge>
          ) : (
            <Badge className="bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1 text-[10px] font-semibold py-0.5 px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Supabase 연동 완료</span>
            </Badge>
          )}
        </div>
      </header>

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-4 flex flex-col gap-4 sm:gap-6 overflow-hidden">
        {/* 모바일 퀵 필터 바 */}
        <div className="md:hidden flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 max-w-[70%] scrollbar-none py-0.5">
            <Badge variant="project" className="text-[10px]">
              <Folder className="w-2.5 h-2.5 mr-1" />
              {filter.selectedProject}
            </Badge>
            {filter.selectedTags.length > 0 ? (
              filter.selectedTags.map(tag => (
                <Badge key={tag} variant="tag" className="text-[10px]">
                  <Tag className="w-2.5 h-2.5 mr-1" />
                  {tag}
                </Badge>
              ))
            ) : (
              <Badge variant="secondary" className="text-[10px] text-slate-400 border-dashed">
                태그 없음
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center gap-1.5 h-8 text-xs font-semibold rounded-xl text-slate-600"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span>상세 필터</span>
          </Button>
        </div>

        {/* 메인 레이아웃 본체 */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_380px_1fr] gap-6 overflow-hidden h-full">
          {/* 1) 좌측 필터 패널 (데스크탑 뷰 전용) */}
          <section className="hidden md:flex flex-col bg-white border border-slate-100 rounded-3xl p-5 shadow-xs overflow-y-auto">
            <FilterPanel />
          </section>

          {/* 2) 중앙 노트 목록 패널 */}
          <section className="flex flex-col bg-white border border-slate-100 rounded-3xl p-5 shadow-xs overflow-hidden">
            <NoteList onOpenEditorMobile={handleOpenEditorMobile} />
          </section>

          {/* 3) 우측 노트 상세/에디터 패널 (데스크탑 뷰 전용) */}
          <section className="hidden lg:flex flex-col bg-white border border-slate-100 rounded-3xl p-6 shadow-xs overflow-hidden">
            {activeNoteId || activeNoteId === null ? (
              <NoteEditor />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center bg-slate-50/20 border border-dashed border-slate-100 rounded-2xl">
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
      >
        <div className="py-2">
          <FilterPanel 
            isMobileDrawer={true} 
            onCloseMobileDrawer={() => setIsMobileFilterOpen(false)} 
          />
        </div>
      </Dialog>

      {/* 나. 모바일 에디터 전체화면 오버레이 (바텀시트 대신 100% 풀스크린 적용) */}
      {isMobileEditorOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col w-full h-screen overflow-hidden p-5 animate-slideUp">
          <div className="flex-1 min-h-0 flex flex-col">
            <NoteEditor onCloseMobile={handleCloseEditorMobile} />
          </div>
        </div>
      )}
    </div>
  );
}
