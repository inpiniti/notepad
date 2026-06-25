import React, { useState } from 'react';
import { useStore, Note, Code } from '@/lib/store';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Search, FileText, Calendar, Paperclip, Plus } from 'lucide-react';

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
    <div className="flex flex-col h-full gap-4 text-slate-800">
      {/* 검색 바 & 추가 버튼 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="노트 제목, 본문 검색..."
            className="pl-9 bg-slate-50 border-slate-100 hover:bg-slate-100/50 transition-colors"
          />
        </div>
        <button
          onClick={handleAddNewNote}
          className="sm:hidden p-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full transition-all shadow-md"
          title="새 노트 작성"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 헤더 요약 */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
        <span>총 {filteredNotes.length}개의 노트</span>
      </div>

      {/* 노트 카드 목록 스크롤 뷰 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
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
              className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer group flex flex-col gap-3 relative ${
                isSelected
                  ? 'bg-indigo-50/50 border-indigo-200/80 shadow-md shadow-indigo-100/20 translate-x-1'
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100/40 hover:-translate-y-0.5'
              }`}
            >
              {/* 카드 헤더 (제목, 날짜) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between">
                  <h4 className={`font-semibold text-base transition-colors line-clamp-1 ${
                    isSelected ? 'text-indigo-900 font-bold' : 'text-slate-800'
                  }`}>
                    {note.title.trim() === '' ? '제목 없음' : note.title}
                  </h4>
                  {note.attachments.length > 0 && (
                    <div className="flex items-center gap-0.5 text-slate-400" title="첨부파일 있음">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="text-xxs font-semibold">{note.attachments.length}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xxs font-medium">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(note.updated)}</span>
                </div>
              </div>

              {/* 본문 미리보기 */}
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed whitespace-pre-line">
                {note.content.trim() === '' ? '본문 내용이 없습니다.' : note.content}
              </p>

              {/* 매핑된 프로젝트 & 태그 뱃지 리스트 */}
              {(projectCodes.length > 0 || tagCodes.length > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {/* 프로젝트 배지 */}
                  {projectCodes.map(pc => (
                    <Badge key={pc.id} variant="project">
                      {pc.name}
                    </Badge>
                  ))}
                  {/* 태그 배지 */}
                  {tagCodes.map(tc => (
                    <Badge key={tc.id} variant="tag">
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
