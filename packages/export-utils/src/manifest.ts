import * as yauzl from "yauzl";

// ---------------------------------------------------------------------------
// Manifest: lightweight duplicate detection from .mvis zips
// ---------------------------------------------------------------------------

export interface MvisManifest {
  id: string;
  revision: number;
  updated_at: string;
}

/**
 * Read only the manifest.json entry from a .mvis zip without extracting everything.
 * Returns null if the zip has no manifest (old .mvis files) or on any error.
 */
export function readManifestFromZip(
  zipPath: string,
): Promise<MvisManifest | null> {
  return new Promise((resolve) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        resolve(null);
        return;
      }

      zipfile.on("error", () => {
        zipfile.close();
        resolve(null);
      });

      zipfile.on("entry", (entry: yauzl.Entry) => {
        if (entry.fileName.endsWith("/manifest.json")) {
          zipfile.openReadStream(entry, (streamErr, stream) => {
            if (streamErr || !stream) {
              zipfile.close();
              resolve(null);
              return;
            }
            const chunks: Buffer[] = [];
            stream.on("data", (chunk: Buffer) => chunks.push(chunk));
            stream.on("end", () => {
              zipfile.close();
              try {
                const json = JSON.parse(
                  Buffer.concat(chunks).toString("utf-8"),
                ) as Record<string, unknown>;
                resolve({
                  id: json.id as string,
                  revision: json.revision as number,
                  updated_at: json.updated_at as string,
                });
              } catch {
                resolve(null);
              }
            });
          });
          return;
        }
        zipfile.readEntry();
      });

      zipfile.on("end", () => {
        resolve(null);
      });
      zipfile.readEntry();
    });
  });
}

/** Find a unique folder name by appending -1, -2, etc. */
export function deduplicateFolderName(
  basePath: string,
  name: string,
  existsSync: (p: string) => boolean,
  pathJoin: (...segments: string[]) => string,
): string {
  let candidate = name;
  let counter = 0;
  while (existsSync(pathJoin(basePath, candidate))) {
    counter++;
    candidate = `${name}-${counter}`;
  }
  return candidate;
}
