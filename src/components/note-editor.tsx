import React, { useState, useEffect, useRef } from 'react';
import { useStore, Code, Note } from '@/lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  Save, 
  Trash2, 
  Paperclip, 
  X, 
  FolderPlus, 
  Tag, 
  ArrowLeft,
  FileUp,
  Settings,
  AlertCircle
} from 'lucide-react';

interface NoteEditorProps {
  onCloseMobile?: () => void;
}

export function NoteEditor({ onCloseMobile }: NoteEditorProps) {
  const {
    notes,
    codes,
    activeNoteId,
    addNote,
    updateNote,
    deleteNote,
    setActiveNoteId,
    supabaseUrl,
    supabaseAnonKey,
    setSupabaseConfig,
    isOffline
  } = useStore();

  // 에디터 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(supabaseUrl);
  const [tempKey, setTempKey] = useState(supabaseAnonKey);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentNote = notes.find(n => n.id === activeNoteId);
  const projects = codes.filter(c => c.group === '프로젝트');
  const otherGroups = Array.from(new Set(codes.map(c => c.group)))
    .filter(g => g !== '프로젝트')
    .sort();

  // 노트 로드 시 상태 초기화
  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content);
      setNewFiles([]);
      setExistingAttachments(currentNote.attachments || []);
      setErrorMsg('');

      const projectCode = codes.find(c => c.group === '프로젝트' && currentNote.codeIds.includes(c.id));
      setSelectedProjectId(projectCode ? projectCode.id : '');

      const noteTags = codes
        .filter(c => c.group === 'tag' && currentNote.codeIds.includes(c.id))
        .map(c => c.id);
      setSelectedTagIds(noteTags);
    } else {
      setTitle('');
      setContent('');
      setSelectedProjectId('');
      setSelectedTagIds([]);
      setNewFiles([]);
      setExistingAttachments([]);
      setErrorMsg('');
    }
  }, [activeNoteId, currentNote, codes]);

  // 수퍼베이스 설정 값 동기화
  useEffect(() => {
    setTempUrl(supabaseUrl);
    setTempKey(supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  // 태그 선택 토글
  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // 파일 선택 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewFiles(prev => [...prev, ...filesArray]);
    }
  };

  // 첨부파일 제거 (신규 파일)
  const handleRemoveNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 첨부파일 제거 (기존 파일)
  const handleRemoveExistingAttachment = (url: string) => {
    setExistingAttachments(prev => prev.filter(item => item !== url));
  };

  // 드래그 앤 드롭 업로드 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      setNewFiles(prev => [...prev, ...filesArray]);
    }
  };

  // 저장 요청
  const handleSave = async () => {
    const combinedCodeIds = [
      ...(selectedProjectId ? [selectedProjectId] : []),
      ...selectedTagIds
    ];

    try {
      if (activeNoteId) {
        await updateNote(
          activeNoteId,
          title,
          content,
          combinedCodeIds,
          newFiles,
          existingAttachments
        );
      } else {
        await addNote(
          title,
          content,
          combinedCodeIds,
          newFiles
        );
        setTitle('');
        setContent('');
        setSelectedProjectId('');
        setSelectedTagIds([]);
        setNewFiles([]);
        setExistingAttachments([]);
      }
      
      if (onCloseMobile) {
        onCloseMobile();
      }
    } catch (err: any) {
      setErrorMsg(err.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 삭제 요청
  const handleDelete = async () => {
    if (!activeNoteId) return;
    if (confirm('이 노트를 삭제하시겠습니까?')) {
      await deleteNote(activeNoteId);
      if (onCloseMobile) {
        onCloseMobile();
      }
    }
  };

  // 설정 저장
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSupabaseConfig(tempUrl, tempKey);
    setShowSettings(false);
  };

  // 취소/뒤로가기
  const handleCancel = () => {
    setActiveNoteId(null);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800">
      {/* 에디터 탑 바 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          {onCloseMobile && (
            <button 
              onClick={handleCancel}
              className="p-1 rounded-full hover:bg-slate-50 text-slate-500 mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h3 className="font-semibold text-slate-900">
            {activeNoteId ? '노트 수정' : '새 노트 작성'}
          </h3>
        </div>
        
        <div className="flex items-center gap-1.5">
          {activeNoteId && (
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="삭제">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          
          <Button 
            onClick={handleSave} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm text-xs font-semibold flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>저장</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl p-3 mb-4 flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 편집 영역 본체 (스크롤 가능) */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4">
        {/* 제목 입력 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">제목</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="노트 제목을 입력하세요"
            className="text-lg font-semibold h-11 border-slate-100 hover:border-slate-200"
          />
        </div>

        {/* 프로젝트 배정 */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
            연관 프로젝트 지정
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedProjectId('')}
              className={`px-3.5 py-1.5 text-xs rounded-xl border transition-all ${
                selectedProjectId === ''
                  ? 'bg-slate-900 border-transparent text-white font-medium shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              미지정
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-3.5 py-1.5 text-xs rounded-xl border transition-all ${
                  selectedProjectId === p.id
                    ? 'bg-indigo-600 border-transparent text-white font-medium shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* 동적 분류 배정 (프로젝트 이외의 모든 그룹) */}
        {otherGroups.map(groupName => {
          const groupCodes = codes.filter(c => c.group === groupName);
          return (
            <div key={groupName} className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                연관 {groupName} 지정 (다중 선택)
              </label>
              <div className="flex flex-wrap gap-2">
                {groupCodes.map(c => {
                  const isSelected = selectedTagIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleTagToggle(c.id)}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full border transition-all ${
                        isSelected ? 'bg-indigo-500 border-transparent' : 'bg-transparent border-slate-300'
                      }`} />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
                {groupCodes.length === 0 && (
                  <p className="text-xs text-slate-400 py-1">좌측 필터 패널에서 {groupName} 항목을 먼저 등록해 주세요.</p>
                )}
              </div>
            </div>
          );
        })}

        {/* 내용 입력 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">본문 내용</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="여기에 생각이나 작업 내용을 기록해 보세요..."
            className="min-h-[220px] leading-relaxed border-slate-100 hover:border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-300"
          />
        </div>

        {/* 첨부파일 영역 */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
            첨부파일
          </label>

          {/* 드래그 앤 드롭 존 */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/10 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 group"
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <FileUp className="w-7 h-7 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <div className="text-xs font-medium text-slate-600">
              파일을 마우스로 끌어다 놓거나 클릭하여 선택하세요
            </div>
            <p className="text-[10px] text-slate-400">이미지, 문서 등 형식 제한 없음</p>
          </div>

          {/* 첨부된 파일 리스트 */}
          {(existingAttachments.length > 0 || newFiles.length > 0) && (
            <div className="space-y-1.5">
              {/* 기존 첨부파일 목록 */}
              {existingAttachments.map((fileUrl, index) => {
                const decodedUrl = decodeURIComponent(fileUrl);
                let displayName = '';
                
                try {
                  // URL 객체 파싱을 통해 ?name= 쿼리 파라미터 획득 시도
                  const urlObj = new URL(fileUrl);
                  const nameParam = urlObj.searchParams.get('name');
                  if (nameParam) {
                    displayName = nameParam;
                  }
                } catch (e) {
                  // Blob URL 등 일반 URL 파싱 예외 처리
                }
                
                if (!displayName) {
                  const filename = decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1).split('?')[0] || `이전 파일 ${index + 1}`;
                  displayName = filename.replace(/^\d+_/, '');
                }

                return (
                  <div key={fileUrl} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-700 font-medium truncate max-w-[80%]">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(decodedUrl) ? (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1 text-indigo-600 truncate">
                          <span>{displayName}</span>
                        </a>
                      ) : (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">{displayName}</a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingAttachment(fileUrl)}
                      className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {/* 신규 추가 중인 파일 목록 */}
              {newFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2.5 bg-indigo-50/20 border border-indigo-100/50 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-indigo-700 font-medium truncate max-w-[80%]">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{file.name} (새 파일)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(index)}
                    className="p-1 rounded-full hover:bg-indigo-100 text-indigo-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
