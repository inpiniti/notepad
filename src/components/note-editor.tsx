import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertCircle
} from 'lucide-react';

interface NoteEditorProps {
  onCloseMobile?: () => void;
}

// 기존 첨부파일 전용 컴포넌트 (이미지 썸네일 지원)
function ExistingAttachmentItem({ fileUrl, index, onRemove }: { fileUrl: string, index: number, onRemove: () => void }) {
  const decodedUrl = decodeURIComponent(fileUrl);
  let displayName = '';
  
  try {
    const urlObj = new URL(fileUrl);
    const nameParam = urlObj.searchParams.get('name');
    if (nameParam) {
      displayName = nameParam;
    }
  } catch (e) {}
  
  if (!displayName) {
    const filename = decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1).split('?')[0] || `이전 파일 ${index + 1}`;
    displayName = filename.replace(/^\d+_/, '');
  }

  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(decodedUrl);

  return (
    <div className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-150 rounded-lg text-[11px] animate-fadeIn">
      <div className="flex items-center gap-2 text-slate-700 font-medium truncate max-w-[85%]">
        {isImage ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="shrink-0 group relative block">
            <img 
              src={fileUrl} 
              alt={displayName} 
              className="w-8.5 h-8.5 object-cover rounded-md border border-slate-200 hover:opacity-85 transition-opacity" 
            />
          </a>
        ) : (
          <div className="w-8.5 h-8.5 bg-slate-100 border border-slate-200 flex items-center justify-center rounded-md shrink-0">
            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <a href={fileUrl} target="_blank" rel="noreferrer" className="hover:underline font-semibold text-slate-800 truncate">
            {displayName}
          </a>
          <span className="text-[9px] text-slate-400 font-normal leading-none mt-0.5">서버에 저장됨</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors mr-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// 신규 추가 중인 파일 전용 컴포넌트 (메모리 누수 방지 Blob URL 관리 및 썸네일 지원)
function NewFilePreviewItem({ file, onRemove }: { file: File, onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  const isImage = file.type.startsWith('image/');

  return (
    <div className="flex items-center justify-between p-1.5 bg-indigo-50/20 border border-indigo-100/50 rounded-lg text-[11px] animate-fadeIn">
      <div className="flex items-center gap-2 text-indigo-900 font-medium truncate max-w-[85%]">
        {isImage && previewUrl ? (
          <img 
            src={previewUrl} 
            alt={file.name} 
            className="w-8.5 h-8.5 object-cover rounded-md border border-indigo-100/80 shrink-0" 
          />
        ) : (
          <div className="w-8.5 h-8.5 bg-indigo-50 border border-indigo-100 flex items-center justify-center rounded-md shrink-0">
            <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="truncate text-slate-800 font-semibold">{file.name}</span>
          <span className="text-[9px] text-indigo-500 font-normal leading-none mt-0.5">업로드 대기 중</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded-full hover:bg-indigo-100 text-indigo-600 transition-colors mr-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function NoteEditor({ onCloseMobile }: NoteEditorProps) {
  const {
    notes,
    codes,
    codeGroups,
    activeNoteId,
    addNote,
    updateNote,
    deleteNote,
    setActiveNoteId,
    isOffline,
    showToast
  } = useStore();

  // 에디터 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
        .filter(c => c.group !== '프로젝트' && currentNote.codeIds.includes(c.id))
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

  // 본문 내용 높이 자동 조절 (Auto-resize)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, activeNoteId]);

  // 태그 선택 토글 (그룹별 단일/다중 선택 정책 적용)
  const handleTagToggle = (tagId: string) => {
    const tagCode = codes.find(c => c.id === tagId);
    if (!tagCode) return;

    const groupConfig = codeGroups.find(g => g.name === tagCode.group);
    const isMultiSelect = groupConfig ? groupConfig.isMultiSelect : true;

    setSelectedTagIds(prev => {
      const alreadySelected = prev.includes(tagId);

      if (alreadySelected) {
        // 이미 선택된 경우 해제
        return prev.filter(id => id !== tagId);
      }

      if (!isMultiSelect) {
        // 단일 선택 그룹: 같은 그룹의 다른 태그는 모두 해제하고 새로 선택
        const groupCodeIds = codes
          .filter(c => c.group === tagCode.group)
          .map(c => c.id);
        return [...prev.filter(id => !groupCodeIds.includes(id)), tagId];
      }

      // 다중 선택 그룹: 그냥 추가
      return [...prev, tagId];
    });
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
        showToast('노트가 저장되었습니다.', 'success');
      } else {
        await addNote(
          title,
          content,
          combinedCodeIds,
          newFiles
        );
        showToast('새 노트가 작성되었습니다.', 'success');
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
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  // 삭제 요청
  const handleDelete = async () => {
    if (!activeNoteId) return;
    if (!window.confirm('이 노트를 삭제하시겠습니까?\n삭제한 노트는 복구할 수 없습니다.')) return;
    try {
      await deleteNote(activeNoteId);
      showToast('노트가 삭제되었습니다.', 'success');
      if (onCloseMobile) onCloseMobile();
    } catch {
      showToast('삭제에 실패했습니다.', 'error');
    }
  };

  // 클립보드 뛰어넣기 (Ctrl+V / 모바일 붙여넣기)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      setNewFiles(prev => [...prev, ...imageFiles]);
      showToast(`이미지 ${imageFiles.length}개가 첸부파일로 추가되었습니다.`, 'info');
    }
  }, [showToast]);



  // 취소/뒤로가기
  const handleCancel = () => {
    setActiveNoteId(null);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // 날짜 포맷팅 헬퍼
  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800">
      {/* 에디터 탑 바 */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {onCloseMobile && (
            <button 
              onClick={handleCancel}
              className="p-1 rounded-full hover:bg-slate-50 text-slate-500 mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex flex-col">
            <h3 className="font-semibold text-slate-900 text-xs leading-tight">
              {activeNoteId ? '노트 수정' : '새 노트 작성'}
            </h3>
            {currentNote && (
              <span className="text-[9px] text-slate-400 font-normal leading-none mt-1">
                작성: {formatDate(currentNote.created)} {currentNote.updated !== currentNote.created && `(수정: ${formatDate(currentNote.updated)})`}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {activeNoteId && (
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 rounded-md" title="삭제">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          
          <Button 
            onClick={handleSave} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-xs text-[10px] font-semibold flex items-center gap-1 h-7 px-2.5"
          >
            <Save className="w-3 h-3" />
            <span>저장</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-100 text-[10px] rounded-lg p-2.5 flex items-start gap-1 shrink-0 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 편집 영역 본체 (스크롤 가능) */}
      <div className="flex-1 overflow-y-auto space-y-4 pl-4 pr-3 py-3">
        {/* 제목 입력 */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">제목</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="노트 제목을 입력하세요"
            className="text-xs font-semibold h-8 rounded-lg border-slate-200"
          />
        </div>

        {/* 프로젝트 배정 */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FolderPlus className="w-3 h-3 text-indigo-400" />
            <span>연관 프로젝트 지정</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedProjectId('')}
              className={`px-2.5 py-1 text-[10px] rounded-lg border transition-all ${
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
                className={`px-2.5 py-1 text-[10px] rounded-lg border transition-all ${
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
            <div key={groupName} className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-400" />
                <span>연관 {groupName} 지정</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {groupCodes.map(c => {
                  const isSelected = selectedTagIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleTagToggle(c.id)}
                      className={`px-2 py-1 text-[10px] rounded-lg border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full border transition-all shrink-0 ${
                        isSelected ? 'bg-indigo-500 border-transparent' : 'bg-transparent border-slate-355'
                      }`} />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
                {groupCodes.length === 0 && (
                  <p className="text-[9px] text-slate-400 py-0.5">등록된 분류 항목이 없습니다.</p>
                )}
              </div>
            </div>
          );
        })}

        {/* 내용 입력 */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">본문 내용</label>
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="여기에 생각이나 작업 내용을 기록해 보세요..."
            className="min-h-[160px] leading-relaxed border-slate-100 hover:border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 text-xs resize-none overflow-hidden"
          />
        </div>

        {/* 첨부파일 영역 */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3 h-3 text-indigo-400" />
            <span>첨부파일</span>
          </label>

          {/* 드래그 앤 드롭 존 + 클립보드 붙여넣기 */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPaste={handlePaste}
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/10 rounded-xl p-4 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-1 group"
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <FileUp className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <div className="text-[10px] font-semibold text-slate-600">
              파일을 마우스로 끌어다 놓거나 클릭하여 선택, 또는 이미지를 클립보드에서 붙여넣기하세요
            </div>
            <p className="text-[9px] text-slate-400">이미지, 문서 등 형식 제한 없음 · Ctrl+V 붙여넣기 지원</p>
          </div>

          {/* 첨부된 파일 리스트 */}
          {(existingAttachments.length > 0 || newFiles.length > 0) && (
            <div className="space-y-2">
              {/* 기존 첨부파일 목록 */}
              {existingAttachments.map((fileUrl, index) => (
                <ExistingAttachmentItem
                  key={fileUrl}
                  fileUrl={fileUrl}
                  index={index}
                  onRemove={() => handleRemoveExistingAttachment(fileUrl)}
                />
              ))}

              {/* 신규 추가 중인 파일 목록 */}
              {newFiles.map((file, index) => (
                <NewFilePreviewItem
                  key={`${file.name}-${index}`}
                  file={file}
                  onRemove={() => handleRemoveNewFile(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
