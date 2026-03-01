import type { GeneratedFile, GeneratedProjectPayload } from "../types/api.js";

export function normalizeFiles(files: GeneratedFile[]) {
  return files.map((file) => ({
    path: file.path.replace(/^\/+/, "").trim(),
    content: file.content
  }));
}

export function toFileMap(files: GeneratedFile[]) {
  return normalizeFiles(files).reduce<Record<string, string>>((accumulator, file) => {
    accumulator[file.path] = file.content;
    return accumulator;
  }, {});
}

export function mergeFilePayload(
  currentPayload: GeneratedProjectPayload,
  changedFiles: GeneratedFile[]
): GeneratedProjectPayload {
  const mergedMap = {
    ...toFileMap(currentPayload.files),
    ...toFileMap(changedFiles)
  };

  return {
    ...currentPayload,
    files: Object.entries(mergedMap).map(([path, content]) => ({ path, content }))
  };
}
