// ---------------------------------------------------------------------------
// Unified export dispatcher
// ---------------------------------------------------------------------------

export type ExportType = "mvis" | "mweb" | "pdf";

export async function exportProject(
  folderName: string,
  type: ExportType,
): Promise<{ success: boolean; error?: string }> {
  switch (type) {
    case "mvis": {
      const { exportMvis } = await import("./export-mvis.js");
      return exportMvis(folderName);
    }
    case "mweb": {
      const { exportMweb } = await import("./export-mweb.js");
      return exportMweb(folderName);
    }
    case "pdf": {
      const { exportPdf } = await import("./export-pdf.js");
      return exportPdf(folderName);
    }
    default:
      return { success: false, error: `Unknown export type: ${type}` };
  }
}
