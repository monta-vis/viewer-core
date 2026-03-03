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
    common: { loading: "Loading...", loadingInstruction: "Loading instruction..." },
    dashboard: {
      noInstructions: "No instructions available",
      noLocalProjects: "No projects found in Documents/Montavis",
      errorLoading: "Failed to load projects",
    },
    instruction: {
      name: "Name", description: "Description", estimatedDurationValue: "{{duration}} min",
      languageNotAvailable: "Translation not available", uploadImage: "Upload image",
      orDragAndDrop: "or drag & drop", dropImageHere: "Drop image here",
      changeImage: "Change image", deleteImage: "Delete image",
      showOriginal: "Show original media", useBlurred: "Use blurred media",
    },
  },
  de: {
    common: { loading: "Laden...", loadingInstruction: "Anleitung wird geladen..." },
    dashboard: {
      noInstructions: "Keine Anleitungen verfügbar",
      noLocalProjects: "Keine Projekte in Dokumente/Montavis gefunden",
      errorLoading: "Projekte konnten nicht geladen werden",
    },
  },
  fr: {
    common: { loading: "Chargement...", loadingInstruction: "Chargement de l'instruction..." },
    dashboard: {
      noInstructions: "Aucune instruction disponible",
      noLocalProjects: "Aucun projet trouvé dans Documents/Montavis",
      errorLoading: "Échec du chargement des projets",
    },
  },
  es: {
    common: { loading: "Cargando...", loadingInstruction: "Cargando instrucción..." },
    dashboard: {
      noInstructions: "No hay instrucciones disponibles",
      noLocalProjects: "No se encontraron proyectos en Documentos/Montavis",
      errorLoading: "Error al cargar los proyectos",
    },
  },
  it: {
    common: { loading: "Caricamento...", loadingInstruction: "Caricamento istruzione..." },
    dashboard: {
      noInstructions: "Nessuna istruzione disponibile",
      noLocalProjects: "Nessun progetto trovato in Documenti/Montavis",
      errorLoading: "Impossibile caricare i progetti",
    },
  },
  pt: {
    common: { loading: "Carregando...", loadingInstruction: "Carregando instrução..." },
    dashboard: {
      noInstructions: "Nenhuma instrução disponível",
      noLocalProjects: "Nenhum projeto encontrado em Documentos/Montavis",
      errorLoading: "Falha ao carregar os projetos",
    },
  },
  nl: {
    common: { loading: "Laden...", loadingInstruction: "Instructie laden..." },
    dashboard: {
      noInstructions: "Geen instructies beschikbaar",
      noLocalProjects: "Geen projecten gevonden in Documenten/Montavis",
      errorLoading: "Projecten konden niet worden geladen",
    },
  },
  pl: {
    common: { loading: "Ładowanie...", loadingInstruction: "Ładowanie instrukcji..." },
    dashboard: {
      noInstructions: "Brak dostępnych instrukcji",
      noLocalProjects: "Nie znaleziono projektów w Dokumenty/Montavis",
      errorLoading: "Nie udało się załadować projektów",
    },
  },
  ja: {
    common: { loading: "読み込み中...", loadingInstruction: "手順書を読み込み中..." },
    dashboard: {
      noInstructions: "手順書がありません",
      noLocalProjects: "ドキュメント/Montavisにプロジェクトが見つかりません",
      errorLoading: "プロジェクトの読み込みに失敗しました",
    },
  },
  ko: {
    common: { loading: "로딩 중...", loadingInstruction: "지침서 불러오는 중..." },
    dashboard: {
      noInstructions: "사용 가능한 지침서가 없습니다",
      noLocalProjects: "문서/Montavis에서 프로젝트를 찾을 수 없습니다",
      errorLoading: "프로젝트를 불러오지 못했습니다",
    },
  },
  zh: {
    common: { loading: "加载中...", loadingInstruction: "正在加载说明书..." },
    dashboard: {
      noInstructions: "暂无说明书",
      noLocalProjects: "在 文档/Montavis 中未找到项目",
      errorLoading: "加载项目失败",
    },
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
