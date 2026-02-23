import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  sqliteToSnapshot,
  transformSnapshotToStore,
  InstructionViewProvider,
  InstructionViewContainer,
  InstructionView,
  ViewerDataProvider,
  VideoProvider,
  IconButton,
  Navbar,
} from "@monta-vis/viewer-core";
import type { InstructionData } from "@monta-vis/viewer-core";

export function ViewPage() {
  const { folderName } = useParams<{ folderName: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [data, setData] = useState<InstructionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!folderName || !window.electronAPI) {
      setError("Unable to load project");
      setIsLoading(false);
      return;
    }

    window.electronAPI.projects
      .getData(decodeURIComponent(folderName))
      .then((projectData) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- IPC returns untyped data, sqliteToSnapshot validates internally
        const snapshot = sqliteToSnapshot(projectData as any);
        const storeData = transformSnapshotToStore(snapshot);
        setData(storeData);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [folderName]);

  // Derive the first step ID from the loaded data
  const firstStepId = useMemo(() => {
    if (!data) return null;
    const steps = Object.values(data.steps);
    if (steps.length === 0) return null;
    // Sort by step_number to get the first step
    steps.sort((a, b) => a.stepNumber - b.stepNumber);
    return steps[0].id;
  }, [data]);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Set initial selected step when data loads
  useEffect(() => {
    if (firstStepId && !selectedStepId) {
      setSelectedStepId(firstStepId);
    }
  }, [firstStepId, selectedStepId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-base)]">
        <Loader2 className="w-8 h-8 text-[var(--color-text-subtle)] animate-spin" />
        <p className="mt-4 text-[var(--color-text-muted)]">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--color-bg-base)]">
        <Navbar
          left={
            <IconButton
              icon={<ArrowLeft />}
              aria-label={t("common.back")}
              variant="ghost"
              onClick={() => navigate("/")}
            />
          }
        />
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[var(--color-text-danger)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-base)]">
      <Navbar
        left={
          <div className="flex items-center gap-3">
            <IconButton
              icon={<ArrowLeft />}
              aria-label={t("common.back")}
              variant="ghost"
              onClick={() => navigate("/")}
            />
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">
              {data?.instructionName ?? "Instruction"}
            </span>
          </div>
        }
      />
      <div className="flex-1 overflow-hidden">
        <VideoProvider>
          <InstructionViewProvider>
            <ViewerDataProvider data={data}>
              <InstructionViewContainer>
                <InstructionView
                  selectedStepId={selectedStepId}
                  onStepChange={setSelectedStepId}
                  onBreak={() => navigate("/")}
                />
              </InstructionViewContainer>
            </ViewerDataProvider>
          </InstructionViewProvider>
        </VideoProvider>
      </div>
    </div>
  );
}
