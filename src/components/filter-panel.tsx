import React, { useState } from 'react';
import { useStore, Code } from '@/lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Plus, Trash2, Folder, Tag, Filter, FolderPlus } from 'lucide-react';

interface FilterPanelProps {
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export function FilterPanel({ isMobileDrawer = false, onCloseMobileDrawer }: FilterPanelProps) {
  const {
    codes,
    filter,
    setSelectedProject,
    toggleSelectedTag,
    addCode,
    deleteCode,
    clearFilters
  } = useStore();

  // 분류 생성 및 개별 추가용 상태
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCodeName, setNewCodeName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [activeAddGroup, setActiveAddGroup] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);

  // 분류 분리
  const projects = codes.filter(c => c.group === '프로젝트');
  const otherGroups = Array.from(new Set(codes.map(c => c.group)))
    .filter(g => g !== '프로젝트')
    .sort();

  // 새 카테고리(분류) 생성 핸들러
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !newCodeName.trim()) return;
    try {
      await addCode(newCategoryName.trim(), newCodeName.trim());
      setNewCodeName('');
      setShowAddCategory(false);
    } catch (err) {
      console.error(err);
    }
  };

  // 기존 특정 분류 그룹에 새 항목 추가 핸들러
  const handleAddItemToGroup = async (e: React.FormEvent, groupName: string) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      await addCode(groupName, newItemName.trim());
      setNewItemName('');
      setActiveAddGroup(null);
    } catch (err) {
      console.error(err);
    }
  };

  // 신규 프로젝트 추가 핸들러
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      await addCode('프로젝트', newProjectName.trim());
      setNewProjectName('');
      setShowAddProject(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-5 text-slate-800">
      {/* 필터 타이틀 & 초기화 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Filter className="w-4 h-4 text-indigo-500" />
          <span className="text-sm">필터 및 분류</span>
        </div>
        {(filter.selectedProject !== '전체' || filter.selectedTags.length > 0) && (
          <button 
            onClick={clearFilters}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
          >
            초기화
          </button>
        )}
      </div>

      {/* 새 분류 카테고리 생성 버튼 및 폼 */}
      <div className="shrink-0">
        {!showAddCategory ? (
          <Button
            onClick={() => setShowAddCategory(true)}
            variant="outline"
            size="sm"
            className="w-full text-xs font-semibold text-slate-600 border-dashed border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-xl h-9 flex items-center justify-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>새로운 분류 카테고리 추가</span>
          </Button>
        ) : (
          <form onSubmit={handleAddCategory} className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl flex flex-col gap-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500">새 분류 정의</span>
              <button 
                type="button" 
                onClick={() => setShowAddCategory(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
              >
                닫기
              </button>
            </div>
            <div className="space-y-1.5">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="분류명 (예: 담당자, 중요도)"
                className="h-8 text-xs py-1 px-2 rounded-lg bg-white"
                required
              />
              <Input
                value={newCodeName}
                onChange={(e) => setNewCodeName(e.target.value)}
                placeholder="첫 번째 항목명 (예: 홍길동, 상)"
                className="h-8 text-xs py-1 px-2 rounded-lg bg-white"
                required
              />
            </div>
            <Button type="submit" size="sm" className="h-8 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              분류 생성
            </Button>
          </form>
        )}
      </div>

      {/* 스크롤 가능한 본문 */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-4">
        {/* 1. 프로젝트 섹션 (대분류) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              프로젝트 (대분류)
            </label>
            <button
              onClick={() => setShowAddProject(!showAddProject)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showAddProject && (
            <form onSubmit={handleAddProject} className="flex gap-2 mb-2 animate-fadeIn">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="새 프로젝트 명"
                className="h-8 text-xs py-1 rounded-lg"
                autoFocus
              />
              <Button type="submit" size="sm" className="h-8 px-2.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700">
                추가
              </Button>
            </form>
          )}

          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setSelectedProject('전체');
                if (isMobileDrawer && onCloseMobileDrawer) onCloseMobileDrawer();
              }}
              className={`flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all text-left ${
                filter.selectedProject === '전체'
                  ? 'bg-slate-900 text-white font-medium shadow-xs'
                  : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>전체 프로젝트</span>
            </button>

            {projects.map((project) => (
              <div key={project.id} className="group flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedProject(project.name);
                    if (isMobileDrawer && onCloseMobileDrawer) onCloseMobileDrawer();
                  }}
                  className={`flex-1 flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all text-left ${
                    filter.selectedProject === project.name
                      ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium'
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{project.name}</span>
                </button>
                <button
                  onClick={() => deleteCode(project.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ml-1"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 기타 동적 분류 섹션들 (태그 및 사용자 추가 카테고리) */}
        {otherGroups.map((groupName) => {
          const groupCodes = codes.filter(c => c.group === groupName);
          return (
            <div key={groupName} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  {groupName}
                </label>
                <button
                  onClick={() => {
                    setActiveAddGroup(activeAddGroup === groupName ? null : groupName);
                    setNewItemName('');
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeAddGroup === groupName && (
                <form onSubmit={(e) => handleAddItemToGroup(e, groupName)} className="flex gap-2 mb-2 animate-fadeIn">
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={`새 ${groupName} 명`}
                    className="h-8 text-xs py-1 rounded-lg"
                    autoFocus
                  />
                  <Button type="submit" size="sm" className="h-8 px-2.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700">
                    추가
                  </Button>
                </form>
              )}

              <div className="flex flex-col gap-1">
                {groupCodes.map((code) => {
                  const isSelected = filter.selectedTags.includes(code.name);
                  return (
                    <div key={code.id} className="group flex items-center justify-between">
                      <button
                        onClick={() => toggleSelectedTag(code.name)}
                        className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all text-left ${
                          isSelected
                            ? 'bg-slate-900 border border-transparent text-white font-medium shadow-xs'
                            : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-500' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span>{code.name}</span>
                      </button>
                      <button
                        onClick={() => deleteCode(code.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ml-1"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {groupCodes.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">등록된 항목이 없습니다.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
