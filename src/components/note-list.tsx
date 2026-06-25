import React, { useState } from 'react';
import { useStore, Note, Code } from '@/lib/store';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Search, FileText, Paperclip, Plus, X } from 'lucide-react';

interface NoteListProps {
  onOpenEditorMobile?: () => void;
}

export function NoteList({ onOpenEditorMobile }: NoteListProps) {
  const {
    notes,
    codes,
    filter,
    activeNoteId,
    setActiveNoteId
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');

  // 필터 매칭 로직
  const filteredNotes = notes.filter(note => {
    // 1. 프로젝트 필터
    if (filter.selectedProject !== '전체') {
      const projectCode = codes.find(c => c.group === '프로젝트' && c.name === filter.selectedProject);
      if (!projectCode || !note.codeIds.includes(projectCode.id)) {
        return false;
      }
    }

    // 2. 태그 필터 (다중 선택된 태그를 모두 포함해야 함 - AND 조건)
    if (filter.selectedTags.length > 0) {
      for (const tagName of filter.selectedTags) {
        const tagCode = codes.find(c => c.group === 'tag' && c.name === tagName);
        if (!tagCode || !note.codeIds.includes(tagCode.id)) {
          return false;
        }
      }
    }

    // 3. 텍스트 검색 필터 (제목 + 본문)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchTitle = note.title.toLowerCase().includes(query);
      const matchContent = note.content.toLowerCase().includes(query);
      return matchTitle || matchContent;
    }

    return true;
  });

  // 날짜 포맷팅 헬퍼
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleNoteSelect = (noteId: string) => {
    setActiveNoteId(noteId);
    if (onOpenEditorMobile) {
      onOpenEditorMobile();
    }
  };

  const handleAddNewNote = () => {
    setActiveNoteId(null); // 에디터를 빈 폼으로 세팅
    if (onOpenEditorMobile) {
      onOpenEditorMobile();
    }
  };

  return (
    <div className="flex flex-col h-full text-slate-800">
      {/* 검색 바 & 추가 버튼 */}
      <div className="flex items-center gap-2 px-3.5 py-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="노트 제목, 본문 검색..."
            className="h-8 pl-8 pr-7 text-xs bg-slate-50 border-slate-100 hover:bg-slate-100/50 transition-colors rounded-lg focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 shadow-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              title="검색어 초기화"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={handleAddNewNote}
          className="h-8 w-8 bg-indigo-600 hover:bg-indigo-700 active:scale-95 hover:scale-102 text-white rounded-lg transition-all shadow-xs flex items-center justify-center shrink-0"
          title="새 노트 작성"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 헤더 요약 */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-4 py-2 shrink-0">
        <span>총 {filteredNotes.length}개의 노트</span>
      </div>

      {/* 노트 카드 목록 스크롤 뷰 */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredNotes.map((note) => {
          const isSelected = note.id === activeNoteId;
          
          // 이 노트가 가지고 있는 프로젝트와 태그 매핑 코드들을 추출
          const noteCodes = note.codeIds
            .map(cid => codes.find(c => c.id === cid))
            .filter((c): c is Code => !!c);
            
          const projectCodes = noteCodes.filter(c => c.group === '프로젝트');
          const tagCodes = noteCodes.filter(c => c.group === 'tag');

          return (
            <div
              key={note.id}
              onClick={() => handleNoteSelect(note.id)}
              className={`py-2.5 px-3 border-l-2 transition-all cursor-pointer group flex items-center justify-between gap-3 ${
                isSelected
                  ? 'border-l-indigo-600 bg-indigo-50/40 text-slate-900 font-semibold'
                  : 'border-l-transparent hover:bg-slate-50 text-slate-600'
              }`}
            >
              {/* 좌측: 제목 & 첨부파일 아이콘 */}
              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className={`text-xs truncate transition-colors ${
                  isSelected ? 'text-indigo-900 font-bold' : 'text-slate-700 font-medium'
                }`}>
                  {note.title.trim() === '' ? '제목 없음' : note.title}
                </h4>
                {note.attachments.length > 0 && (
                  <div className="flex items-center gap-0.5 text-slate-400 shrink-0" title="첨부파일 있음">
                    <Paperclip className="w-3 h-3" />
                    <span className="text-[8px] font-bold">{note.attachments.length}</span>
                  </div>
                )}
              </div>

              {/* 우측: 프로젝트 & 태그 배지 리스트 */}
              {(projectCodes.length > 0 || tagCodes.length > 0) && (
                <div className="flex items-center gap-1 shrink-0">
                  {/* 프로젝트 배지 */}
                  {projectCodes.map(pc => (
                    <Badge key={pc.id} variant="project" className="text-[9px] py-0 px-1.5 rounded-md leading-none h-4 flex items-center">
                      {pc.name}
                    </Badge>
                  ))}
                  {/* 태그 배지 */}
                  {tagCodes.map(tc => (
                    <Badge key={tc.id} variant="tag" className="text-[9px] py-0 px-1.5 rounded-md leading-none h-4 flex items-center">
                      {tc.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 p-8">
            <FileText className="w-8 h-8 text-slate-300 mb-2" />
            <h5 className="font-semibold text-slate-700 text-sm">일치하는 노트가 없습니다</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">필터를 변경하거나 검색어를 재설정해 보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
