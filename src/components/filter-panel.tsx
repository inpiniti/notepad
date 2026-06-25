import React, { useState } from 'react';
import { useStore, Code } from '@/lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Plus, Trash2, Folder, Tag, Filter, FolderPlus, ChevronDown } from 'lucide-react';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeAddGroup, setActiveAddGroup] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);

  // 그룹별 접힘/펼침 상태 관리 (프로젝트만 기본 펼침)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    '프로젝트': true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const nextState = {
        ...prev,
        [groupName]: !prev[groupName]
      };
      
      // 그룹이 접힐 때, 열려 있던 추가 폼이 있다면 닫아준다 (개선 사항 반영)
      if (!nextState[groupName]) {
        if (groupName === '프로젝트') {
          setShowAddProject(false);
        } else if (activeAddGroup === groupName) {
          setActiveAddGroup(null);
        }
      }
      return nextState;
    });
  };

  // 분류 분리
  const projects = codes.filter(c => c.group === '프로젝트');
  const otherGroups = Array.from(new Set(codes.map(c => c.group)))
    .filter(g => g !== '프로젝트')
    .sort();

  // 새 카테고리(분류) 생성 핸들러
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !newCodeName.trim()) return;
    setErrorMsg(null);
    try {
      await addCode(newCategoryName.trim(), newCodeName.trim());
      setNewCodeName('');
      setErrorMsg(null);
      setShowAddCategory(false);
    } catch (err: any) {
      console.error(err);
      const message = err?.message || '';
      if (message.includes('codes_group_name_check')) {
        setErrorMsg('Supabase DB 제약조건 위반: group_name 필드에 커스텀 명칭 추가가 막혀 있습니다. DB의 codes_group_name_check 제약 조건을 해제하셔야 합니다.');
      } else {
        setErrorMsg(message || '분류 생성에 실패했습니다.');
      }
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
    <div className="flex flex-col h-full min-h-0 flex-1 text-slate-800">
      {/* 필터 타이틀 & 초기화 */}
      {!isMobileDrawer && (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0 bg-slate-50/30">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span className="text-xs">필터 및 분류</span>
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
      )}

      {/* 새 분류 카테고리 생성 버튼 및 폼 */}
      <div className="shrink-0 px-4 py-2 flex flex-col gap-2">
        <div className="flex gap-2">
          {!showAddCategory ? (
            <Button
              onClick={() => {
                setErrorMsg(null);
                setShowAddCategory(true);
              }}
              variant="outline"
              size="sm"
              className="flex-1 text-[10px] font-bold text-slate-600 border-dashed border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-lg h-7.5 flex items-center justify-center gap-1 shrink-0"
            >
              <FolderPlus className="w-3 h-3" />
              <span>새로운 분류 추가</span>
            </Button>
          ) : (
            <div className="flex-1 text-[9px] font-bold text-slate-450 uppercase tracking-wider flex items-center px-0.5">
              새 분류 정의
            </div>
          )}

          {isMobileDrawer && (filter.selectedProject !== '전체' || filter.selectedTags.length > 0) && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="h-7.5 px-3 text-[10px] font-bold text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent rounded-lg shrink-0"
            >
              필터 초기화
            </Button>
          )}
        </div>

        {showAddCategory && (
          <form 
            onSubmit={handleAddCategory} 
            className="flex flex-col gap-1 mb-2 animate-fadeIn shrink-0"
          >
            <div className="flex flex-col gap-1">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="분류명 (예: 중요도)"
                className="h-7.5 text-[10px] py-0.5 px-2 rounded-lg bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50"
                required
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setErrorMsg(null);
                    setShowAddCategory(false);
                  }
                }}
              />
              <Input
                value={newCodeName}
                onChange={(e) => setNewCodeName(e.target.value)}
                placeholder="첫 항목명 (예: 상)"
                className="h-7.5 text-[10px] py-0.5 px-2 rounded-lg bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50"
                required
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setErrorMsg(null);
                    setShowAddCategory(false);
                  }
                }}
              />
            </div>
            {errorMsg && (
              <p className="text-[9px] text-red-500 font-medium leading-normal bg-red-50 border border-red-100 p-1.5 rounded-md break-all">
                {errorMsg}
              </p>
            )}
            <div className="flex justify-end gap-1 shrink-0 px-0.5 mt-0.5">
              <Button 
                type="button"
                variant="ghost"
                onClick={() => {
                  setErrorMsg(null);
                  setShowAddCategory(false);
                }}
                className="h-6 px-2 text-[9.5px] rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                취소
              </Button>
              <Button 
                type="submit"
                className="h-6 px-2 text-[9.5px] rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                분류 생성
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* 스크롤 가능한 본문 */}
      <div className="flex-1 overflow-y-auto pl-4 pr-3 pb-6">
        {/* 프로젝트 섹션 위의 구분선 (새로운 분류 추가 아래) */}
        <div className="border-t border-slate-200/70 -ml-4 -mr-3 mt-1 mb-2.5 shrink-0" />

        {/* 1. 프로젝트 섹션 (대분류) */}
        <div className="flex flex-col gap-1.5">
          <div 
            onClick={() => toggleGroup('프로젝트')}
            className="flex items-center justify-between cursor-pointer hover:bg-slate-200/40 px-1 py-0.5 rounded-md transition-colors select-none"
          >
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer select-none">
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${
                expandedGroups['프로젝트'] ? 'transform rotate-0' : 'transform -rotate-90'
              }`} />
              <Folder className="w-3 h-3 text-slate-400" />
              <span>프로젝트 (대분류)</span>
            </label>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!expandedGroups['프로젝트']) {
                  setExpandedGroups(prev => ({ ...prev, '프로젝트': true }));
                }
                setShowAddProject(!showAddProject);
              }}
              className="p-0.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {expandedGroups['프로젝트'] && (
            <div className="flex flex-col gap-1.5 animate-fadeIn">
              {showAddProject && (
                <form 
                  onSubmit={handleAddProject} 
                  className="flex flex-col gap-1 mb-2 animate-fadeIn shrink-0"
                >
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="새 프로젝트 명"
                    className="h-7.5 text-[10px] py-0.5 px-2 rounded-lg bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowAddProject(false);
                        setNewProjectName('');
                      }
                    }}
                  />
                  <div className="flex justify-end gap-1 shrink-0 px-0.5">
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowAddProject(false);
                        setNewProjectName('');
                      }}
                      className="h-6 px-2 text-[9.5px] rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      취소
                    </Button>
                    <Button 
                      type="submit"
                      className="h-6 px-2 text-[9.5px] rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                    >
                      추가
                    </Button>
                  </div>
                </form>
              )}

              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    setSelectedProject('전체');
                    if (isMobileDrawer && onCloseMobileDrawer) onCloseMobileDrawer();
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all text-left ${
                    filter.selectedProject === '전체'
                      ? 'bg-slate-900 text-white font-medium shadow-xs'
                      : 'hover:bg-slate-100/50 text-slate-600 hover:text-slate-900'
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
                      className={`flex-1 flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all text-left ${
                        filter.selectedProject === project.name
                          ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium'
                          : 'hover:bg-slate-100/50 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{project.name}</span>
                    </button>
                    <button
                      onClick={() => deleteCode(project.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ml-0.5 shrink-0"
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. 기타 동적 분류 섹션들 (태그 및 사용자 추가 카테고리) */}
        {otherGroups.map((groupName) => {
          const groupCodes = codes.filter(c => c.group === groupName);
          const isExpanded = !!expandedGroups[groupName];
          return (
            <div key={groupName} className="flex flex-col gap-1.5">
              {/* 구분선 분리: 부모의 pl-4 pr-3 패딩을 상쇄하여 끝까지 뻗도록 음수 마진 적용 */}
              <div className="border-t border-slate-200/70 -ml-4 -mr-3 mt-2.5 mb-2 shrink-0" />

              <div 
                onClick={() => toggleGroup(groupName)}
                className="flex items-center justify-between cursor-pointer hover:bg-slate-200/40 px-1 py-0.5 rounded-md transition-colors select-none"
              >
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer select-none">
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isExpanded ? 'transform rotate-0' : 'transform -rotate-90'
                  }`} />
                  <Tag className="w-3 h-3 text-indigo-400/80" />
                  <span>{groupName}</span>
                </label>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isExpanded) {
                      setExpandedGroups(prev => ({ ...prev, [groupName]: true }));
                    }
                    setActiveAddGroup(activeAddGroup === groupName ? null : groupName);
                    setNewItemName('');
                  }}
                  className="p-0.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {isExpanded && (
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  {activeAddGroup === groupName && (
                    <form 
                      onSubmit={(e) => handleAddItemToGroup(e, groupName)} 
                      className="flex flex-col gap-1 mb-2 animate-fadeIn shrink-0"
                    >
                      <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={`새 ${groupName} 명`}
                        className="h-7.5 text-[10px] py-0.5 px-2 rounded-lg bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setActiveAddGroup(null);
                            setNewItemName('');
                          }
                        }}
                      />
                      <div className="flex justify-end gap-1 shrink-0 px-0.5">
                        <Button 
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setActiveAddGroup(null);
                            setNewItemName('');
                          }}
                          className="h-6 px-2 text-[9.5px] rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        >
                          취소
                        </Button>
                        <Button 
                          type="submit"
                          className="h-6 px-2 text-[9.5px] rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                        >
                          추가
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="flex flex-col gap-0.5">
                    {groupCodes.map((code) => {
                      const isSelected = filter.selectedTags.includes(code.name);
                      return (
                        <div key={code.id} className="group flex items-center justify-between">
                          <button
                            onClick={() => toggleSelectedTag(code.name)}
                            className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-all text-left ${
                              isSelected
                                ? 'bg-slate-900 border border-transparent text-white font-medium shadow-xs'
                                : 'hover:bg-slate-100/50 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-500' 
                                : 'border-slate-350 bg-white'
                            }`}>
                              {isSelected && <span className="w-1 h-1 rounded-full bg-white" />}
                            </div>
                            <span className="truncate">{code.name}</span>
                          </button>
                          <button
                            onClick={() => deleteCode(code.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ml-0.5 shrink-0"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    {groupCodes.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-1">등록된 항목이 없습니다.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {/* 진행(마지막 그룹) 하단에도 경계선 추가 */}
        <div className="border-t border-slate-200/70 -ml-4 -mr-3 mt-3 shrink-0" />
      </div>
    </div>
  );
}
