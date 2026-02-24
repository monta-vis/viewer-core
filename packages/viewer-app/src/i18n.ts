import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { viewerCoreTranslations } from "@monta-vis/viewer-core";

// Build resources from all viewer-core languages
const resources: Record<string, { translation: Record<string, unknown> }> = {};
for (const [lng, ns] of Object.entries(viewerCoreTranslations)) {
  resources[lng] = { translation: { ...ns } };
}

// Merge app-specific English overrides
Object.assign(resources.en.translation, {
  common: {
    ...(viewerCoreTranslations.en.common as Record<string, unknown>),
    loading: "Loading...",
    collapse: "Collapse",
    expand: "Expand",
  },
  dashboard: {
    myInstructions: "My Instructions",
    instructions: "Instructions",
    search: "Search",
    searchPlaceholder: "Search by name...",
    clearSearch: "Clear search",
    sort: "Sort",
    sortByName: "Name",
    sortByCreated: "Creation date",
    sortByModified: "Last modified",
    sortByStatus: "Status",
    sortAscending: "Ascending",
    sortDescending: "Descending",
    noResultsForSearch: 'No results for "{{query}}"',
    noInstructions: "No instructions available",
    noLocalProjects: "No projects found in Documents/Montavis",
    openInstruction: "Open Instruction",
    createNew: "Create New",
    projectCount: "{{count}} Projects",
    projectCount_one: "{{count}} Project",
    errorLoading: "Failed to load projects",
    importing: "Importing…",
  },
  catalogs: {
    title: "Catalogs",
    importCatalog: "Import Catalog",
    createTutorial: "Create Tutorial",
  },
  instruction: {
    ...(viewerCoreTranslations.en.instruction as Record<string, unknown>),
    name: "Name",
    description: "Description",
    estimatedDurationValue: "{{duration}} min",
    languageNotAvailable: "Translation not available",
    uploadImage: "Upload image",
    orDragAndDrop: "or drag & drop",
    dropImageHere: "Drop image here",
    changeImage: "Change image",
    deleteImage: "Delete image",
    showOriginal: "Show original media",
    useBlurred: "Use blurred media",
  },
});

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  resources,
});

export default i18n;
