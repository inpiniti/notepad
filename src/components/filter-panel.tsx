import React, { useState, useEffect } from 'react';
import { useStore, Code } from '@/lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Plus, Trash2, Folder, Tag, Filter, FolderPlus, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react';

interface FilterPanelProps {
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export function FilterPanel({ isMobileDrawer = false, onCloseMobileDrawer }: FilterPanelProps) {
  const {
    codes,
    codeGroups,
    filter,
    setSelectedProject,
    toggleSelectedTag,
    addCode,
    deleteCode,
    updateCodeGroup,
    clearFilters,
    showToast
  } = useStore();

  // 분류 생성 및 개별 추가용 상태
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCodeName, setNewCodeName] = useState('');
  const [newCategoryMulti, setNewCategoryMulti] = useState(true); // 기본값: 다중 선택
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeAddGroup, setActiveAddGroup] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);

  // 그룹별 접힘/펼침 상태 관리 (모든 그룹 기본 펼침)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    '프로젝트': true,
  });

  // codes 로드 시 모든 그룹을 기본으로 펼침
  useEffect(() => {
    if (codes.length > 0) {
      const allGroups = Array.from(new Set(codes.map(c => c.group)));
      setExpandedGroups(prev => {
        const next: Record<string, boolean> = { ...prev };
        allGroups.forEach(g => { if (next[g] === undefined) next[g] = true; });
        return next;
      });
    }
  }, [codes]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const nextState = {
        ...prev,
        [groupName]: !prev[groupName]
      };
      if (!nextState[groupName]) {
        if (groupName === '프로젝트') setShowAddProject(false);
        else if (activeAddGroup === groupName) setActiveAddGroup(null);
      }
      return nextState;
    });
  };

  // 삭제 확인 후 deleteCode 호출 헬퍼
  const handleDeleteCode = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" 분류를 삭제하시겠습니까?\n이 분류가 적용된 노트에서도 제거됩니다.`)) return;
    try {
      await deleteCode(id);
      showToast(`"${name}" 분류가 삭제되었습니다.`, 'success');
    } catch {
      showToast('삭제에 실패했습니다.', 'error');
    }
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
      // 단일/다중 선택 설정도 같이 저장
      await updateCodeGroup(newCategoryName.trim(), newCategoryMulti);
      setNewCodeName('');
      setNewCategoryName('');
      setNewCategoryMulti(true);
      setErrorMsg(null);
      setShowAddCategory(false);
      showToast(`"${newCategoryName.trim()}" 분류가 생성되었습니다.`, 'success');
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
              {/* 단일 / 다중 선택 토글 */}
              <button
                type="button"
                onClick={() => setNewCategoryMulti(prev => !prev)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                  newCategoryMulti
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                {newCategoryMulti
                  ? <ToggleRight className="w-3.5 h-3.5" />
                  : <ToggleLeft  className="w-3.5 h-3.5" />}
                {newCategoryMulti ? '다중 선택 가능' : '단일 선택만 허용'}
              </button>
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
                나가기
              </Button>
              <Button 
                type="submit"
                className="h-6 px-2 text-[9.5px] rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                생성
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* 스크롤 가능한 본문 */}
      <div className="flex-1 overflow-y-auto px-0 pb-6">
        {/* 프로젝트 섹션 위의 구분선 (새로운 분류 추가 아래) */}
        <div className="border-t border-slate-200/60 mt-1 mb-2 shrink-0" />

        {/* 1. 프로젝트 섹션 (대분류) */}
        <div className="flex flex-col">
          <div 
            onClick={() => toggleGroup('프로젝트')}
            className="flex items-center justify-between cursor-pointer hover:bg-slate-100/70 px-4 py-1.5 transition-colors select-none group"
          >
            <div className="flex items-center gap-1.5 min-w-0 select-none">
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                expandedGroups['프로젝트'] ? 'transform rotate-0' : 'transform -rotate-90'
              }`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">프로젝트 (대분류)</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!expandedGroups['프로젝트']) {
                  setExpandedGroups(prev => ({ ...prev, '프로젝트': true }));
                }
                setShowAddProject(!showAddProject);
              }}
              className="p-0.5 rounded hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {expandedGroups['프로젝트'] && (
            <div className="flex flex-col animate-fadeIn">
              {showAddProject && (
                <form 
                  onSubmit={handleAddProject} 
                  className="flex flex-col gap-1.5 px-4 py-2 bg-slate-50/30 border-y border-slate-100/50 animate-fadeIn shrink-0"
                >
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="새 프로젝트 명"
                    className="h-7.5 text-[10px] py-0.5 px-2 rounded-lg bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50"
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
                      나가기
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

              <div className="flex flex-col">
                <button
                  onClick={() => {
                    setSelectedProject('전체');
                    if (isMobileDrawer && onCloseMobileDrawer) onCloseMobileDrawer();
                  }}
                  className={`w-full flex items-center gap-2 pl-8 pr-4 py-2 text-xs transition-all text-left border-l-2 select-none ${
                    filter.selectedProject === '전체'
                      ? 'bg-indigo-50/40 border-l-indigo-600 text-indigo-900 font-semibold'
                      : 'bg-transparent border-l-transparent text-slate-600 hover:bg-slate-100/40 hover:text-slate-900'
                  }`}
                >
                  <Folder className={`w-3.5 h-3.5 shrink-0 ${filter.selectedProject === '전체' ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <span>전체 프로젝트</span>
                </button>

                {projects.map((project) => {
                  const isSelected = filter.selectedProject === project.name;
                  return (
                    <div key={project.id} className="group flex items-center justify-between relative hover:bg-slate-100/40">
                      <button
                        onClick={() => {
                          setSelectedProject(project.name);
                          if (isMobileDrawer && onCloseMobileDrawer) onCloseMobileDrawer();
                        }}
                        className={`flex-1 flex items-center gap-2 pl-8 pr-10 py-2 text-xs transition-all text-left border-l-2 select-none ${
                          isSelected
                            ? 'bg-indigo-50/40 border-l-indigo-600 text-indigo-900 font-semibold'
                            : 'bg-transparent border-l-transparent text-slate-650 hover:text-slate-950'
                        }`}
                      >
                        <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <span className="truncate">{project.name}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCode(project.id, project.name)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                        title="삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. 기타 동적 분류 섹션들 (태그 및 사용자 추가 카테고리) */}
        {otherGroups.map((groupName) => {
          const groupCodes = codes.filter(c => c.group === groupName);
          const isExpanded = !!expandedGroups[groupName];
          return (
            <div key={groupName} className="flex flex-col">
              {/* 구분선 분리: 전체 너비로 연장 */}
              <div className="border-t border-slate-200/60 mt-2 mb-1.5 shrink-0" />

              <div 
                onClick={() => toggleGroup(groupName)}
                className="flex items-center justify-between cursor-pointer hover:bg-slate-100/70 px-4 py-1.5 transition-colors select-none group"
              >
                <div className="flex items-center gap-1.5 min-w-0 select-none">
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isExpanded ? 'transform rotate-0' : 'transform -rotate-90'
                  }`} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{groupName}</span>
                </div>
              <div className="flex items-center gap-1">
                  {/* 단일/다중 선택 전환 버튼 */}
                  {(() => {
                    const group = codeGroups.find(g => g.name === groupName);
                    const isMulti = group ? group.isMultiSelect : true;
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCodeGroup(groupName, !isMulti);
                          showToast(
                            `"${groupName}"을 ${!isMulti ? '다중 선택' : '단일 선택'}으로 변경했습니다.`,
                            'info'
                          );
                        }}
                        title={isMulti ? '현재: 다중 선택 (클릭 시 단일 선택으로 변경)' : '현재: 단일 선택 (클릭 시 다중 선택으로 변경)'}
                        className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold border transition-colors ${
                          isMulti
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                            : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                        }`}
                      >
                        {isMulti
                          ? <ToggleRight className="w-3 h-3" />
                          : <ToggleLeft  className="w-3 h-3" />}
                        <span>{isMulti ? '다중' : '단일'}</span>
                      </button>
                    );
                  })()}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isExpanded) {
                        setExpandedGroups(prev => ({ ...prev, [groupName]: true }));
                      }
                      setActiveAddGroup(activeAddGroup === groupName ? null : groupName);
                      setNewItemName('');
                    }}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="flex flex-col animate-fadeIn">
                  {activeAddGroup === groupName && (
                    <form 
                      onSubmit={(e) => handleAddItemToGroup(e, groupName)} 
                      className="flex flex-col gap-1.5 px-4 py-2 bg-slate-50/30 border-y border-slate-100/50 animate-fadeIn shrink-0"
                    >
                      <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={`새 ${groupName} 명`}
                        className="h-7.5 text-[10px] py-0.5 px-2 rounded-lg bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50"
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
                          className="h-6 px-2 text-[9.5px] rounded-md text-slate-400 hover:text-slate-650 hover:bg-slate-100"
                        >
                          나가기
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

                  <div className="flex flex-col">
                    {groupCodes.map((code) => {
                      const isSelected = filter.selectedTags.includes(code.name);
                      return (
                        <div key={code.id} className="group flex items-center justify-between relative hover:bg-slate-100/40">
                          <button
                            onClick={() => toggleSelectedTag(code.name)}
                            className={`flex-1 flex items-center gap-2 pl-8 pr-10 py-2 text-xs transition-all text-left border-l-2 select-none ${
                              isSelected
                                ? 'bg-indigo-50/40 border-l-indigo-600 text-indigo-900 font-semibold'
                                : 'bg-transparent border-l-transparent text-slate-650 hover:text-slate-950'
                            }`}
                          >
                            <Tag className={`w-3 h-3 shrink-0 ${isSelected ? 'text-indigo-500 font-semibold' : 'text-slate-400'}`} />
                            <span className="truncate">{code.name}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCode(code.id, code.name)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    {groupCodes.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-2">등록된 항목이 없습니다.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {/* 마지막 그룹 하단에도 경계선 추가 */}
        <div className="border-t border-slate-200/60 mt-2 shrink-0" />
      </div>
    </div>
  );
}
