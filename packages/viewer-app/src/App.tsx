import { useState, useEffect, useMemo } from "react";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Loader2, Settings } from "lucide-react";
import {
  InstructionCard,
  DashboardToolbar,
  EmptySearchState,
  buildMediaUrl,
  MediaPaths,
  Navbar,
  IconButton,
  PreferencesDialog,
} from "@monta-vis/viewer-core";
import type { SortOption, SortDirection } from "@monta-vis/viewer-core";
import { ViewPage } from "./pages/ViewPage";

// ---------------------------------------------------------------------------
// Types (mirrors ProjectListItem from main process)
// ---------------------------------------------------------------------------

interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  article_number: string | null;
  estimated_duration: number | null;
  revision: number;
  cover_image_area_id: string | null;
  source_language: string;
  coverImagePath: string | null;
  folderName: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Electron API type
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    electronAPI?: {
      projects: {
        list: () => Promise<ProjectListItem[]>;
        getData: (folderName: string) => Promise<Record<string, unknown>>;
        getMediaUrl: (
          folderName: string,
          relativePath: string,
        ) => Promise<string>;
      };
    };
  }
}

// ---------------------------------------------------------------------------
// Cover image URL resolution
// ---------------------------------------------------------------------------

function resolveCoverImageUrl(project: ProjectListItem): string | null {
  if (!project.folderName) return null;

  // If we have an absolute path from the DB, use it
  if (project.coverImagePath) {
    return buildMediaUrl(project.folderName, project.coverImagePath);
  }

  // Fallback: processed frame file
  if (project.cover_image_area_id) {
    return buildMediaUrl(
      project.folderName,
      MediaPaths.frame(project.cover_image_area_id),
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

function sortItems<
  T extends { name: string; created_at?: string; updated_at?: string },
>(items: T[], sortBy: SortOption, sortDirection: SortDirection): T[] {
  return [...items].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "created_at":
        comparison =
          new Date(a.created_at ?? "").getTime() -
          new Date(b.created_at ?? "").getTime();
        break;
      case "updated_at":
        comparison =
          new Date(a.updated_at ?? "").getTime() -
          new Date(b.updated_at ?? "").getTime();
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });
}

// ---------------------------------------------------------------------------
// Hook: load local projects via IPC
// ---------------------------------------------------------------------------

function useLocalProjects() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) {
      setError("Electron API not available (running in browser?)");
      setIsLoading(false);
      return;
    }

    window.electronAPI.projects
      .list()
      .then((data) => {
        setProjects(data);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  return { projects, isLoading, error };
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects, isLoading, error } = useLocalProjects();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [prefsOpen, setPrefsOpen] = useState(false);

  const filteredAndSorted = useMemo(() => {
    let items = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.article_number?.toLowerCase().includes(q),
      );
    }
    return sortItems(items, sortBy, sortDirection);
  }, [projects, searchQuery, sortBy, sortDirection]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-base)]">
      <Navbar
        left={
          <div className="flex items-center gap-2">
            <img src="/logo_icon.svg" alt="Montavis" className="h-8" />
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">
              Montavis Viewer
            </span>
          </div>
        }
        right={
          <IconButton
            icon={<Settings />}
            aria-label={t("preferences.title")}
            variant="ghost"
            onClick={() => setPrefsOpen(true)}
          />
        }
      />
      <PreferencesDialog
        isOpen={prefsOpen}
        onClose={() => setPrefsOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {t('dashboard.myInstructions')}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              {t('dashboard.projectCount', { count: filteredAndSorted.length })}
            </p>
          </div>

              <DashboardToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={(by, dir) => {
                  setSortBy(by);
                  setSortDirection(dir);
                }}
              />

              <div className="mt-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-[var(--color-text-subtle)] animate-spin" />
                    <p className="mt-4 text-[var(--color-text-muted)]">
                      {t("common.loading")}
                    </p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-[var(--color-text-danger)]">
                      {t("dashboard.errorLoading")}
                    </p>
                    <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                      {error}
                    </p>
                  </div>
                ) : filteredAndSorted.length === 0 && searchQuery.trim() ? (
                  <EmptySearchState
                    query={searchQuery}
                    onClear={() => setSearchQuery("")}
                  />
                ) : filteredAndSorted.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-surface)] flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-[var(--color-text-subtle)]" />
                    </div>
                    <p className="text-[var(--color-text-muted)] mb-1">
                      {t("dashboard.noInstructions")}
                    </p>
                    <p className="text-sm text-[var(--color-text-subtle)]">
                      {t("dashboard.noLocalProjects")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAndSorted.map((project) => (
                      <InstructionCard
                        key={project.id}
                        id={project.id}
                        name={project.name}
                        description={project.description}
                        articleNumber={project.article_number}
                        estimatedDuration={project.estimated_duration}
                        previewImageId={null}
                        version={project.revision}
                        isLocal
                        folderName={project.folderName}
                        imageUrl={resolveCoverImageUrl(project)}
                        sourceLanguage={project.source_language}
                        createdAt={project.created_at}
                        updatedAt={project.updated_at}
                        onClick={() =>
                          navigate(`/view/${encodeURIComponent(project.folderName)}`)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App (Router)
// ---------------------------------------------------------------------------

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/view/:folderName" element={<ViewPage />} />
      </Routes>
    </HashRouter>
  );
}
