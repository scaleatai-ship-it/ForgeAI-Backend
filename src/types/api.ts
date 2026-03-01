export type GeneratedFile = {
  path: string;
  content: string;
};

export type GeneratedProjectPayload = {
  files: GeneratedFile[];
  techStack?: string[];
  setupInstructions?: string;
  previewable?: boolean;
  platform?: "expo" | "android" | "ios";
  appJson?: Record<string, unknown>;
  packageJson?: Record<string, unknown>;
  screens?: string[];
  setupSteps?: string[];
};

export type GenerationJob = {
  projectId: string;
  userId: string;
  prompt: string;
  type: "web" | "android" | "ios" | "mobile";
};
