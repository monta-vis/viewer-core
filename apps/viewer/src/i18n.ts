import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { viewerCoreTranslations, getStoredLanguage, saveLanguage } from "@monta-vis/viewer-core";

// Build resources from all viewer-core languages
const resources: Record<string, { translation: Record<string, unknown> }> = {};
for (const [lng, ns] of Object.entries(viewerCoreTranslations)) {
  resources[lng] = { translation: { ...ns } };
}

// App-specific overrides per language (keys not in viewer-core)
const appOverrides: Record<string, Record<string, Record<string, string>>> = {
  en: {
    common: { loading: "Loading...", collapse: "Collapse", expand: "Expand", loadingInstruction: "Loading instruction..." },
    dashboard: {
      myInstructions: "My Instructions",
      instructions: "Instructions",
      noInstructions: "No instructions available",
      noLocalProjects: "No projects found in Documents/Montavis",
      openInstruction: "Open Instruction",
      createNew: "Create New",
      projectCount: "{{count}} Projects",
      projectCount_one: "{{count}} Project",
      errorLoading: "Failed to load projects",
      importing: "Importing…",
    },
    catalogs: { title: "Catalogs", importCatalog: "Import Catalog", createTutorial: "Create Tutorial" },
    instruction: {
      name: "Name", description: "Description", estimatedDurationValue: "{{duration}} min",
      languageNotAvailable: "Translation not available", uploadImage: "Upload image",
      orDragAndDrop: "or drag & drop", dropImageHere: "Drop image here",
      changeImage: "Change image", deleteImage: "Delete image",
      showOriginal: "Show original media", useBlurred: "Use blurred media",
    },
  },
  de: {
    common: { loading: "Laden...", collapse: "Einklappen", expand: "Ausklappen", loadingInstruction: "Anleitung wird geladen..." },
    dashboard: {
      myInstructions: "Meine Anleitungen",
      instructions: "Anleitungen",
      noInstructions: "Keine Anleitungen verfügbar",
      noLocalProjects: "Keine Projekte in Dokumente/Montavis gefunden",
      openInstruction: "Anleitung öffnen",
      createNew: "Neu erstellen",
      projectCount: "{{count}} Projekte",
      projectCount_one: "{{count}} Projekt",
      errorLoading: "Projekte konnten nicht geladen werden",
      importing: "Wird importiert…",
    },
    catalogs: { title: "Kataloge", importCatalog: "Katalog importieren", createTutorial: "Tutorial erstellen" },
  },
  fr: {
    common: { loading: "Chargement...", collapse: "Réduire", expand: "Développer", loadingInstruction: "Chargement de l'instruction..." },
    dashboard: {
      myInstructions: "Mes instructions",
      instructions: "Instructions",
      noInstructions: "Aucune instruction disponible",
      noLocalProjects: "Aucun projet trouvé dans Documents/Montavis",
      openInstruction: "Ouvrir l'instruction",
      createNew: "Créer",
      projectCount: "{{count}} projets",
      projectCount_one: "{{count}} projet",
      errorLoading: "Échec du chargement des projets",
      importing: "Importation…",
    },
    catalogs: { title: "Catalogues", importCatalog: "Importer un catalogue", createTutorial: "Créer un tutoriel" },
  },
  es: {
    common: { loading: "Cargando...", collapse: "Contraer", expand: "Expandir", loadingInstruction: "Cargando instrucción..." },
    dashboard: {
      myInstructions: "Mis instrucciones",
      instructions: "Instrucciones",
      noInstructions: "No hay instrucciones disponibles",
      noLocalProjects: "No se encontraron proyectos en Documentos/Montavis",
      openInstruction: "Abrir instrucción",
      createNew: "Crear nuevo",
      projectCount: "{{count}} proyectos",
      projectCount_one: "{{count}} proyecto",
      errorLoading: "Error al cargar los proyectos",
      importing: "Importando…",
    },
    catalogs: { title: "Catálogos", importCatalog: "Importar catálogo", createTutorial: "Crear tutorial" },
  },
  it: {
    common: { loading: "Caricamento...", collapse: "Comprimi", expand: "Espandi", loadingInstruction: "Caricamento istruzione..." },
    dashboard: {
      myInstructions: "Le mie istruzioni",
      instructions: "Istruzioni",
      noInstructions: "Nessuna istruzione disponibile",
      noLocalProjects: "Nessun progetto trovato in Documenti/Montavis",
      openInstruction: "Apri istruzione",
      createNew: "Crea nuovo",
      projectCount: "{{count}} progetti",
      projectCount_one: "{{count}} progetto",
      errorLoading: "Impossibile caricare i progetti",
      importing: "Importazione…",
    },
    catalogs: { title: "Cataloghi", importCatalog: "Importa catalogo", createTutorial: "Crea tutorial" },
  },
  pt: {
    common: { loading: "Carregando...", collapse: "Recolher", expand: "Expandir", loadingInstruction: "Carregando instrução..." },
    dashboard: {
      myInstructions: "Minhas instruções",
      instructions: "Instruções",
      noInstructions: "Nenhuma instrução disponível",
      noLocalProjects: "Nenhum projeto encontrado em Documentos/Montavis",
      openInstruction: "Abrir instrução",
      createNew: "Criar novo",
      projectCount: "{{count}} projetos",
      projectCount_one: "{{count}} projeto",
      errorLoading: "Falha ao carregar os projetos",
      importing: "Importando…",
    },
    catalogs: { title: "Catálogos", importCatalog: "Importar catálogo", createTutorial: "Criar tutorial" },
  },
  nl: {
    common: { loading: "Laden...", collapse: "Inklappen", expand: "Uitklappen", loadingInstruction: "Instructie laden..." },
    dashboard: {
      myInstructions: "Mijn instructies",
      instructions: "Instructies",
      noInstructions: "Geen instructies beschikbaar",
      noLocalProjects: "Geen projecten gevonden in Documenten/Montavis",
      openInstruction: "Instructie openen",
      createNew: "Nieuw aanmaken",
      projectCount: "{{count}} projecten",
      projectCount_one: "{{count}} project",
      errorLoading: "Projecten konden niet worden geladen",
      importing: "Importeren…",
    },
    catalogs: { title: "Catalogi", importCatalog: "Catalogus importeren", createTutorial: "Tutorial aanmaken" },
  },
  pl: {
    common: { loading: "Ładowanie...", collapse: "Zwiń", expand: "Rozwiń", loadingInstruction: "Ładowanie instrukcji..." },
    dashboard: {
      myInstructions: "Moje instrukcje",
      instructions: "Instrukcje",
      noInstructions: "Brak dostępnych instrukcji",
      noLocalProjects: "Nie znaleziono projektów w Dokumenty/Montavis",
      openInstruction: "Otwórz instrukcję",
      createNew: "Utwórz nowy",
      projectCount: "{{count}} projektów",
      projectCount_one: "{{count}} projekt",
      errorLoading: "Nie udało się załadować projektów",
      importing: "Importowanie…",
    },
    catalogs: { title: "Katalogi", importCatalog: "Importuj katalog", createTutorial: "Utwórz tutorial" },
  },
  ja: {
    common: { loading: "読み込み中...", collapse: "折りたたむ", expand: "展開する", loadingInstruction: "手順書を読み込み中..." },
    dashboard: {
      myInstructions: "マイ手順書",
      instructions: "手順書",
      noInstructions: "手順書がありません",
      noLocalProjects: "ドキュメント/Montavisにプロジェクトが見つかりません",
      openInstruction: "手順書を開く",
      createNew: "新規作成",
      projectCount: "{{count}} プロジェクト",
      projectCount_one: "{{count}} プロジェクト",
      errorLoading: "プロジェクトの読み込みに失敗しました",
      importing: "インポート中…",
    },
    catalogs: { title: "カタログ", importCatalog: "カタログをインポート", createTutorial: "チュートリアルを作成" },
  },
  ko: {
    common: { loading: "로딩 중...", collapse: "접기", expand: "펼치기", loadingInstruction: "지침서 불러오는 중..." },
    dashboard: {
      myInstructions: "내 지침서",
      instructions: "지침서",
      noInstructions: "사용 가능한 지침서가 없습니다",
      noLocalProjects: "문서/Montavis에서 프로젝트를 찾을 수 없습니다",
      openInstruction: "지침서 열기",
      createNew: "새로 만들기",
      projectCount: "{{count}}개 프로젝트",
      projectCount_one: "{{count}}개 프로젝트",
      errorLoading: "프로젝트를 불러오지 못했습니다",
      importing: "가져오는 중…",
    },
    catalogs: { title: "카탈로그", importCatalog: "카탈로그 가져오기", createTutorial: "튜토리얼 만들기" },
  },
  zh: {
    common: { loading: "加载中...", collapse: "收起", expand: "展开", loadingInstruction: "正在加载说明书..." },
    dashboard: {
      myInstructions: "我的说明书",
      instructions: "说明书",
      noInstructions: "暂无说明书",
      noLocalProjects: "在 文档/Montavis 中未找到项目",
      openInstruction: "打开说明书",
      createNew: "新建",
      projectCount: "{{count}} 个项目",
      projectCount_one: "{{count}} 个项目",
      errorLoading: "加载项目失败",
      importing: "导入中…",
    },
    catalogs: { title: "目录", importCatalog: "导入目录", createTutorial: "创建教程" },
  },
};

// Merge app-specific overrides into each language
for (const [lng, overrides] of Object.entries(appOverrides)) {
  if (!resources[lng]) continue;
  for (const [ns, keys] of Object.entries(overrides)) {
    const coreNs = (viewerCoreTranslations as Record<string, Record<string, unknown>>)[lng]?.[ns];
    Object.assign(resources[lng].translation, {
      [ns]: { ...(coreNs as Record<string, unknown>), ...keys },
    });
  }
}

const storedLng = getStoredLanguage(Object.keys(resources));

void i18n.use(initReactI18next).init({
  lng: storedLng,
  fallbackLng: "de",
  interpolation: { escapeValue: false },
  resources,
});

i18n.on("languageChanged", saveLanguage);

export default i18n;
