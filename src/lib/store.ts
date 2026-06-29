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
  
  // 다국어 지원 (i18n)
  currentLang: 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de';
  setLang: (lang: 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de') => void;
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

// 다국어별 코드 생성 헬퍼
const getLocalizedCodes = (lang: string): Code[] => {
  if (lang === 'ko') {
    return [
      { id: 'c1', group: '프로젝트', name: '마케팅 캠페인' },
      { id: 'c2', group: '프로젝트', name: '신제품 기획' },
      { id: 'c3', group: '프로젝트', name: '고객 지원 채널' },
      { id: 'c4', group: '프로젝트', name: '웹 서비스 리뉴얼' },
      { id: 'c5', group: '프로젝트', name: '개인 서재 정리' },
      { id: 'c6', group: 'TAG', name: '메모' },
      { id: 'c7', group: 'TAG', name: '아이디어' },
      { id: 'c8', group: 'TAG', name: '피드백' },
      { id: 'c9', group: 'TAG', name: '참고자료' },
      { id: 'c10', group: 'TAG', name: '회의록' },
      { id: 'c11', group: 'TAG', name: '할일' },
      { id: 'c12', group: '기능', name: '기획' },
      { id: 'c13', group: '기능', name: '디자인' },
      { id: 'c14', group: '기능', name: '개발' },
      { id: 'c15', group: '기능', name: '퍼블리싱' },
      { id: 'c16', group: '진행', name: '대기' },
      { id: 'c17', group: '진행', name: '완료' }
    ];
  } else if (lang === 'ja') {
    return [
      { id: 'c1', group: 'プロジェクト', name: 'マーケティングキャンペーン' },
      { id: 'c2', group: 'プロジェクト', name: '新製品の企画' },
      { id: 'c3', group: 'プロジェクト', name: 'カスタマーサポートチャネル' },
      { id: 'c4', group: 'プロジェクト', name: 'ウェブサービスのリニューアル' },
      { id: 'c5', group: 'プロジェクト', name: '個人書斎の整理' },
      { id: 'c6', group: 'TAG', name: 'メモ' },
      { id: 'c7', group: 'TAG', name: 'アイデア' },
      { id: 'c8', group: 'TAG', name: 'フィードバック' },
      { id: 'c9', group: 'TAG', name: '参考資料' },
      { id: 'c10', group: 'TAG', name: '会議録' },
      { id: 'c11', group: 'TAG', name: 'タスク' },
      { id: 'c12', group: '機能', name: '企画' },
      { id: 'c13', group: '機能', name: 'デザイン' },
      { id: 'c14', group: '機能', name: '開発' },
      { id: 'c15', group: '機能', name: 'パブリッシング' },
      { id: 'c16', group: '進行', name: '待機' },
      { id: 'c17', group: '進行', name: '完了' }
    ];
  } else if (lang === 'zh') {
    return [
      { id: 'c1', group: '项目', name: '营销活动' },
      { id: 'c2', group: '项目', name: '新产品企划' },
      { id: 'c3', group: '项目', name: '客户支持渠道' },
      { id: 'c4', group: '项目', name: '网站服务重构' },
      { id: 'c5', group: '项目', name: '个人书斋整理' },
      { id: 'c6', group: 'TAG', name: '备忘录' },
      { id: 'c7', group: 'TAG', name: '点子' },
      { id: 'c8', group: 'TAG', name: '反馈' },
      { id: 'c9', group: 'TAG', name: '参考资料' },
      { id: 'c10', group: 'TAG', name: '会议纪要' },
      { id: 'c11', group: 'TAG', name: '待办事项' },
      { id: 'c12', group: '功能', name: '策划' },
      { id: 'c13', group: '功能', name: '设计' },
      { id: 'c14', group: '功能', name: '开发' },
      { id: 'c15', group: '功能', name: '发布' },
      { id: 'c16', group: '进度', name: '等待' },
      { id: 'c17', group: '进度', name: '完成' }
    ];
  } else if (lang === 'es') {
    return [
      { id: 'c1', group: 'Proyecto', name: 'Campaña de Marketing' },
      { id: 'c2', group: 'Proyecto', name: 'Planificación de Producto' },
      { id: 'c3', group: 'Proyecto', name: 'Soporte al Cliente' },
      { id: 'c4', group: 'Proyecto', name: 'Rediseño del Sitio Web' },
      { id: 'c5', group: 'Proyecto', name: 'Organización del Estudio' },
      { id: 'c6', group: 'TAG', name: 'Nota' },
      { id: 'c7', group: 'TAG', name: 'Idea' },
      { id: 'c8', group: 'TAG', name: 'Feedback' },
      { id: 'c9', group: 'TAG', name: 'Referencia' },
      { id: 'c10', group: 'TAG', name: 'Reunión' },
      { id: 'c11', group: 'TAG', name: 'Tareas' },
      { id: 'c12', group: 'Función', name: 'Planificación' },
      { id: 'c13', group: 'Función', name: 'Diseño' },
      { id: 'c14', group: 'Función', name: 'Desarrollo' },
      { id: 'c15', group: 'Función', name: 'Publicación' },
      { id: 'c16', group: 'Estado', name: 'Espera' },
      { id: 'c17', group: 'Estado', name: 'Completado' }
    ];
  } else if (lang === 'fr') {
    return [
      { id: 'c1', group: 'Projet', name: 'Campagne de Marketing' },
      { id: 'c2', group: 'Projet', name: 'Planification de Produit' },
      { id: 'c3', group: 'Projet', name: 'Support Client' },
      { id: 'c4', group: 'Projet', name: 'Refonte du Site Web' },
      { id: 'c5', group: 'Projet', name: 'Organisation du Bureau' },
      { id: 'c6', group: 'TAG', name: 'Note' },
      { id: 'c7', group: 'TAG', name: 'Idée' },
      { id: 'c8', group: 'TAG', name: 'Retour' },
      { id: 'c9', group: 'TAG', name: 'Référence' },
      { id: 'c10', group: 'TAG', name: 'Réunion' },
      { id: 'c11', group: 'TAG', name: 'Tâches' },
      { id: 'c12', group: 'Fonction', name: 'Planification' },
      { id: 'c13', group: 'Fonction', name: 'Design' },
      { id: 'c14', group: 'Fonction', name: 'Développement' },
      { id: 'c15', group: 'Fonction', name: 'Publication' },
      { id: 'c16', group: 'Statut', name: 'Attente' },
      { id: 'c17', group: 'Statut', name: 'Terminé' }
    ];
  } else if (lang === 'de') {
    return [
      { id: 'c1', group: 'Projekt', name: 'Marketingkampagne' },
      { id: 'c2', group: 'Projekt', name: 'Produktplanung' },
      { id: 'c3', group: 'Projekt', name: 'Kundensupportkanal' },
      { id: 'c4', group: 'Projekt', name: 'Webseite-Relaunch' },
      { id: 'c5', group: 'Projekt', name: 'Büroorganisation' },
      { id: 'c6', group: 'TAG', name: 'Notiz' },
      { id: 'c7', group: 'TAG', name: 'Idee' },
      { id: 'c8', group: 'TAG', name: 'Feedback' },
      { id: 'c9', group: 'TAG', name: 'Referenz' },
      { id: 'c10', group: 'TAG', name: 'Protokoll' },
      { id: 'c11', group: 'TAG', name: 'Aufgaben' },
      { id: 'c12', group: 'Funktion', name: 'Planung' },
      { id: 'c13', group: 'Funktion', name: 'Design' },
      { id: 'c14', group: 'Funktion', name: 'Entwicklung' },
      { id: 'c15', group: 'Funktion', name: 'Veröffentlichung' },
      { id: 'c16', group: 'Status', name: 'Warten' },
      { id: 'c17', group: 'Status', name: 'Erledigt' }
    ];
  }
  // 기본 영어(en) 설정
  return [
    { id: 'c1', group: 'Project', name: 'Marketing Campaign' },
    { id: 'c2', group: 'Project', name: 'New Product Concept' },
    { id: 'c3', group: 'Project', name: 'Customer Support Setup' },
    { id: 'c4', group: 'Project', name: 'Web Service Redesign' },
    { id: 'c5', group: 'Project', name: 'Personal Library Setup' },
    { id: 'c6', group: 'TAG', name: 'Memo' },
    { id: 'c7', group: 'TAG', name: 'Idea' },
    { id: 'c8', group: 'TAG', name: 'Feedback' },
    { id: 'c9', group: 'TAG', name: 'Resource' },
    { id: 'c10', group: 'TAG', name: 'Meeting Minutes' },
    { id: 'c11', group: 'TAG', name: 'TODO' },
    { id: 'c12', group: 'Function', name: 'Planning' },
    { id: 'c13', group: 'Function', name: 'Design' },
    { id: 'c14', group: 'Function', name: 'Development' },
    { id: 'c15', group: 'Function', name: 'Publishing' },
    { id: 'c16', group: 'Status', name: 'Pending' },
    { id: 'c17', group: 'Status', name: 'Completed' }
  ];
};

// 다국어별 샘플 노트 생성 헬퍼
const getLocalizedNotes = (lang: string, codes: Code[]): Note[] => {
  if (lang === 'ko') {
    return [
      {
        id: 'n1',
        title: '시간관리 및 주간 주요 계획',
        content: '1. 웹 서비스 리뉴얼 모니터링 시스템 실시간 대시보드 검토\n2. 신제품 기획 배포 및 런칭 일정 확인\n3. 마케팅 캠페인 시각 자료 보완 회의 참석 예정',
        codeIds: ['c1', 'c10', 'c16'],
        attachments: [],
        created: '2026-06-29T07:11:00.000Z',
        updated: '2026-06-29T07:11:00.000Z'
      },
      {
        id: 'n2',
        title: '메모 필터 기능 수정 내역',
        content: '필터패드(FilterPad)의 다중 카테고리 조합 필터링 로직 수정 완료. 동일 분류 그룹 내에서는 OR 연산이 수행되고 다른 분류 간에는 AND 조건이 매핑되도록 필터링 알고리즘을 갱신하였습니다.',
        codeIds: ['c4', 'c6', 'c17'],
        attachments: [],
        created: '2026-06-29T06:27:00.000Z',
        updated: '2026-06-29T06:27:00.000Z'
      },
      {
        id: 'n3',
        title: '서버 로그 분석 및 인프라 개선',
        content: 'API 게이트웨이 요청 분산 처리 및 스토리지 연결 상태의 에러 빈도 로깅 테스트를 완료했습니다. 현재 모니터링 결과 지연 시간 정상 범위 이내입니다.',
        codeIds: ['c4', 'c9', 'c17'],
        attachments: [],
        created: '2026-06-29T06:20:00.000Z',
        updated: '2026-06-29T06:20:00.000Z'
      }
    ];
  } else if (lang === 'ja') {
    return [
      {
        id: 'n1',
        title: '時間管理および週間の主要計画',
        content: '1. ウェブサービスリニューアル監視システムのリアルタイムダッシュボードの検証\n2. 新製品企画の配信および立ち上げスケジュールの確認\n3. マーケティングキャンペーン視覚資料補完会議への参加予定',
        codeIds: ['c1', 'c10', 'c16'],
        attachments: [],
        created: '2026-06-29T07:11:00.000Z',
        updated: '2026-06-29T07:11:00.000Z'
      },
      {
        id: 'n2',
        title: 'メモフィルター機能の修正内容',
        content: 'OnlineNoteの複数カテゴリの組み合わせフィルタリングロジックの修正完了。同一の分類グループ内ではOR演算が実行され、異なる分類間ではAND条件がマッピングされるようにフィルタリングアルゴリズムを更新しました。',
        codeIds: ['c4', 'c6', 'c17'],
        attachments: [],
        created: '2026-06-29T06:27:00.000Z',
        updated: '2026-06-29T06:27:00.000Z'
      },
      {
        id: 'n3',
        title: 'サーバーログ分析およびインフラ改善',
        content: 'APIゲートウェイ要求の分散処理およびストレージ接続状態のエラー頻度ロギングテストを完了しました。現在の監視結果では、遅延時間は正常範囲内です。',
        codeIds: ['c4', 'c9', 'c17'],
        attachments: [],
        created: '2026-06-29T06:20:00.000Z',
        updated: '2026-06-29T06:20:00.000Z'
      }
    ];
  } else if (lang === 'zh') {
    return [
      {
        id: 'n1',
        title: '时间管理及每周主要计划',
        content: '1. 审查网站服务重构监控系统的实时仪表板\n2. 确认新产品企划的分发和发布时间表\n3. 计划参加营销活动视觉材料补充会议',
        codeIds: ['c1', 'c10', 'c16'],
        attachments: [],
        created: '2026-06-29T07:11:00.000Z',
        updated: '2026-06-29T07:11:00.000Z'
      },
      {
        id: 'n2',
        title: '备忘录筛选功能修正明细',
        content: '已完成 OnlineNote 多分类组合筛选逻辑的修正。更新了筛选算法，使得在同一分类组内执行 OR 运算，而在不同分类之间映射 AND 条件。',
        codeIds: ['c4', 'c6', 'c17'],
        attachments: [],
        created: '2026-06-29T06:27:00.000Z',
        updated: '2026-06-29T06:27:00.000Z'
      },
      {
        id: 'n3',
        title: '服务器日志分析及基础设施改善',
        content: '完成了 API 网关请求的分散处理及存储连接状态的错误频率记录测试。目前的监控结果显示，延迟时间在正常范围内。',
        codeIds: ['c4', 'c9', 'c17'],
        attachments: [],
        created: '2026-06-29T06:20:00.000Z',
        updated: '2026-06-29T06:20:00.000Z'
      }
    ];
  } else if (lang === 'es') {
    return [
      {
        id: 'n1',
        title: 'Gestión del tiempo y plan semanal',
        content: '1. Revisar el panel en tiempo real para el rediseño del sitio web\n2. Confirmar calendario de lanzamiento de planificación de producto\n3. Asistir a la reunión de revisión de materiales visuales de campaña de marketing',
        codeIds: ['c1', 'c10', 'c16'],
        attachments: [],
        created: '2026-06-29T07:11:00.000Z',
        updated: '2026-06-29T07:11:00.000Z'
      },
      {
        id: 'n2',
        title: 'Corrección del filtro de notas',
        content: 'Se completó la corrección de la lógica de filtrado de categorías múltiples de OnlineNote. Se actualizó el algoritmo de filtrado para que se realice la operación OR dentro del mismo grupo de clasificación y se asocie la condición AND entre diferentes clasificaciones.',
        codeIds: ['c4', 'c6', 'c17'],
        attachments: [],
        created: '2026-06-29T06:27:00.000Z',
        updated: '2026-06-29T06:27:00.000Z'
      },
      {
        id: 'n3',
        title: 'Análisis de registros de servidor e infraestructura',
        content: 'Prueba de registro de errores de conexión de almacenamiento y distribución de solicitudes de API Gateway completada. Retraso dentro de límites normales.',
        codeIds: ['c4', 'c9', 'c17'],
        attachments: [],
        created: '2026-06-29T06:20:00.000Z',
        updated: '2026-06-29T06:20:00.000Z'
      }
    ];
  } else if (lang === 'fr') {
    return [
      {
        id: 'n1',
        title: 'Gestion du temps et plan hebdomadaire',
        content: '1. Examiner le tableau de bord temps réel pour la refonte du site web\n2. Confirmer le calendrier de lancement de planification de produit\n3. Assister à la réunion de revue des visuels de la campagne de marketing',
        codeIds: ['c1', 'c10', 'c16'],
        attachments: [],
        created: '2026-06-29T07:11:00.000Z',
        updated: '2026-06-29T07:11:00.000Z'
      },
      {
        id: 'n2',
        title: 'Correction du filtre de notes',
        content: 'Correction de la logique de filtrage multi-catégories d\'OnlineNote terminée. L\'algorithme a été mis à jour pour effectuer une opération OR au sein du même groupe et une condition AND entre différentes classifications.',
        codeIds: ['c4', 'c6', 'c17'],
        attachments: [],
        created: '2026-06-29T06:27:00.000Z',
        updated: '2026-06-29T06:27:00.000Z'
      },
      {
        id: 'n3',
        title: 'Analyse des logs serveur et infrastructure',
        content: 'Test de répartition des requêtes API Gateway et d\'enregistrement des erreurs de stockage réussi. Latence dans les normes.',
        codeIds: ['c4', 'c9', 'c17'],
        attachments: [],
        created: '2026-06-29T06:20:00.000Z',
        updated: '2026-06-29T06:20:00.000Z'
      }
    ];
  } else if (lang === 'de') {
    return [
      {
        id: 'n1',
        title: 'Zeitmanagement und Wochenplan',
        content: '1. Dashboard für Webseite-Relaunch in Echtzeit prüfen\n2. Freigabezeitplan für Produktplanung bestätigen\n3. Teilnahme an Besprechung für visuelle Materialien der Marketingkampagne',
        codeIds: ['c1', 'c10', 'c16'],
        attachments: [],
        created: '2026-06-29T07:11:00.000Z',
        updated: '2026-06-29T07:11:00.000Z'
      },
      {
        id: 'n2',
        title: 'Korrektur des Notizfilters',
        content: 'Korrektur der Filterlogik für OnlineNote-Mehrfachkategorien abgeschlossen. Der Filteralgorithmus wurde aktualisiert, sodass innerhalb derselben Gruppe eine OR-Operation durchgeführt wird, während zwischen verschiedenen Klassifizierungen die AND-Bedingung gilt.',
        codeIds: ['c4', 'c6', 'c17'],
        attachments: [],
        created: '2026-06-29T06:27:00.000Z',
        updated: '2026-06-29T06:27:00.000Z'
      },
      {
        id: 'n3',
        title: 'Serverprotokollanalyse & Infrastrukturverbesserung',
        content: 'Lastverteilungstest für API-Gateway-Anfragen und Aufzeichnungsfehler der Speicherverbindung abgeschlossen. Latenz im Normalbereich.',
        codeIds: ['c4', 'c9', 'c17'],
        attachments: [],
        created: '2026-06-29T06:20:00.000Z',
        updated: '2026-06-29T06:20:00.000Z'
      }
    ];
  }
  // 기본 영어(en) 설정
  return [
    {
      id: 'n1',
      title: 'Time Management & Weekly Plan',
      content: '1. Review Web Service Redesign monitoring system real-time dashboard\n2. Check product planning launch schedule\n3. Attend Marketing Campaign visual assets review meeting',
      codeIds: ['c1', 'c10', 'c16'],
      attachments: [],
      created: '2026-06-29T07:11:00.000Z',
      updated: '2026-06-29T07:11:00.000Z'
    },
    {
      id: 'n2',
      title: 'Memo Filter Logic Improvement',
      content: 'Successfully improved OnlineNote multi-category filtering logic. Updated the algorithm to evaluate OR operations within the same group, and AND operations across distinct classification groups.',
      codeIds: ['c4', 'c6', 'c17'],
      attachments: [],
      created: '2026-06-29T06:27:00.000Z',
      updated: '2026-06-29T06:27:00.000Z'
    },
    {
      id: 'n3',
      title: 'Server Logs & Infrastructure Optimization',
      content: 'Completed load testing on API Gateway request routing and database connection error logging. Current latency metrics remain within acceptable bounds.',
      codeIds: ['c4', 'c9', 'c17'],
      attachments: [],
      created: '2026-06-29T06:20:00.000Z',
      updated: '2026-06-29T06:20:00.000Z'
    }
  ];
};

const DEFAULT_CODES: Code[] = getLocalizedCodes('en');
const DEFAULT_NOTES: Note[] = getLocalizedNotes('en', DEFAULT_CODES);

// 네비게이션 가로채기를 위한 모듈 레벨 변수 (상태 변경으로 인한 무한 렌더링 방지)
let globalNavigationInterceptor: ((id: string | null) => Promise<boolean>) | null = null;

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  session: null,
  authInitialized: false,
  toastMessage: null,
  toastType: 'info',
  notes: [],
  codes: [],
  codeGroups: [
    { name: '프로젝트', isMultiSelect: false },
    { name: 'TAG', isMultiSelect: true },
    { name: '기능', isMultiSelect: true },
    { name: '진행', isMultiSelect: false }
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
  
  // i18n 다국어 상태 정의 (디폴트는 영어 en)
  currentLang: 'en',
  
  setLang: (lang) => {
    // 1. 단순 언어 설정 변경
    set({ currentLang: lang });

    // 2. 비로그인 상태(샘플 모드)인 경우, 선택한 언어로 샘플 프로젝트 및 코드, 노트를 현지화하여 리셋
    const user = get().user;
    const isOffline = get().isOffline;
    if (!user || isOffline) {
      const localizedCodes = getLocalizedCodes(lang);
      const localizedNotes = getLocalizedNotes(lang, localizedCodes);

      // codeGroups 매핑 언어 번역
      let projGroupName = 'Project';
      let tagGroupName = 'TAG';
      let funcGroupName = 'Function';
      let statusGroupName = 'Status';

      if (lang === 'ko') {
        projGroupName = '프로젝트'; tagGroupName = 'TAG'; funcGroupName = '기능'; statusGroupName = '진행';
      } else if (lang === 'ja') {
        projGroupName = 'プロジェクト'; tagGroupName = 'TAG'; funcGroupName = '機能'; statusGroupName = '進行';
      } else if (lang === 'zh') {
        projGroupName = '项目'; tagGroupName = 'TAG'; funcGroupName = '功能'; statusGroupName = '进度';
      } else if (lang === 'es') {
        projGroupName = 'Proyecto'; tagGroupName = 'TAG'; funcGroupName = 'Función'; statusGroupName = 'Estado';
      } else if (lang === 'fr') {
        projGroupName = 'Projet'; tagGroupName = 'TAG'; funcGroupName = 'Fonction'; statusGroupName = 'Statut';
      } else if (lang === 'de') {
        projGroupName = 'Projekt'; tagGroupName = 'TAG'; funcGroupName = 'Funktion'; statusGroupName = 'Status';
      }

      set({
        codes: localizedCodes,
        notes: localizedNotes,
        codeGroups: [
          { name: projGroupName, isMultiSelect: false },
          { name: tagGroupName, isMultiSelect: true },
          { name: funcGroupName, isMultiSelect: true },
          { name: statusGroupName, isMultiSelect: false }
        ],
        filter: {
          selectedProject: lang === 'ko' ? '전체' : (lang === 'ja' ? 'すべて' : (lang === 'zh' ? '全部' : 'All')),
          selectedTags: []
        }
      });
    }
  },

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
          // 로그아웃 시 다시 샘플 데이터 로드하여 뷰 보호 및 체험 모드 제공
          const lang = get().currentLang;
          const localizedCodes = getLocalizedCodes(lang);
          set({ codes: localizedCodes, notes: getLocalizedNotes(lang, localizedCodes), isOffline: true });
        }
      });

      // 최초 로그인 상태라면 즉시 페치
      if (session?.user) {
        set({ isOffline: false });
        await get().fetchCodeGroups();
        await get().fetchCodes();
        await get().fetchNotes();
      } else {
        // 비로그인 상태일 때는 셈플(샘플) 데이터를 보여주어 둘러볼 수 있게 함 (초기 설정 en에 맞춰 매핑)
        set({ 
          codes: DEFAULT_CODES, 
          notes: DEFAULT_NOTES, 
          codeGroups: [
            { name: 'Project', isMultiSelect: false },
            { name: 'TAG', isMultiSelect: true },
            { name: 'Function', isMultiSelect: true },
            { name: 'Status', isMultiSelect: false }
          ],
          filter: {
            selectedProject: 'All',
            selectedTags: []
          },
          isLoading: false 
        });
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
      const lang = get().currentLang;
      const localizedCodes = getLocalizedCodes(lang);
      set({ 
        user: null, 
        session: null, 
        codes: localizedCodes, 
        notes: getLocalizedNotes(lang, localizedCodes),
        isOffline: true,
        activeNoteId: null 
      });
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
    set(state => ({
      filter: {
        ...state.filter,
        selectedProject: project
      }
    }));
  },

  toggleSelectedTag: (tag) => {
    set(state => {
      // 1. 선택하려는 태그의 group을 codes에서 탐색
      const targetCode = state.codes.find(c => c.name === tag);
      if (!targetCode) return {};

      // 프로젝트 그룹인 경우 toggleSelectedTag 대신 setSelectedProject의 역할을 하도록 분기
      if (targetCode.group === '프로젝트') {
        return {
          filter: {
            ...state.filter,
            selectedProject: state.filter.selectedProject === tag ? '전체' : tag
          }
        };
      }

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

      return {
        filter: {
          ...state.filter,
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
