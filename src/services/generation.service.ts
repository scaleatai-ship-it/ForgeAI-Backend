import { AppType, Prisma, ProjectStatus } from "@prisma/client";
import { getSocketServer } from "../config/socket.js";
import { prisma } from "../config/prisma.js";
import { AnthropicService } from "./anthropic.service.js";
import { S3Service } from "./s3.service.js";
import type { GeneratedFile, GeneratedProjectPayload } from "../types/api.js";
import { mergeFilePayload, normalizeFiles } from "../utils/file-tree.js";

const WEB_SYSTEM_PROMPT = `You are an expert full-stack developer. Generate a complete, production-ready web application. Output ONLY valid JSON with this structure: { files: [{ path: string, content: string }], techStack: string[], setupInstructions: string, previewable: boolean }. Generate React + Node.js + Express apps by default unless specified. Include package.json, all source files, README.md, .env.example`;

const MOBILE_SYSTEM_PROMPT = `You are an expert React Native / Expo developer. Generate a complete mobile app. Output JSON: { files: [{ path, content }], platform: 'expo'|'android'|'ios', appJson: object, packageJson: object, screens: string[], setupSteps: string[] }. Always use Expo SDK 50+, React Navigation 6, and NativeWind for styling. Generate proper app.json, babel.config.js, metro.config.js, and all screen files. For Android: include android/ folder with proper Gradle configs. For iOS: include ios/ folder with proper Xcode project structure.`;

function webFallback(prompt: string): GeneratedProjectPayload {
  return {
    files: [
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: "generated-web-app",
            version: "1.0.0",
            private: true,
            scripts: {
              dev: "vite",
              build: "vite build",
              preview: "vite preview"
            },
            dependencies: {
              react: "^18.3.1",
              "react-dom": "^18.3.1"
            },
            devDependencies: {
              typescript: "^5.8.2",
              vite: "^5.4.15",
              "@vitejs/plugin-react": "^4.3.4"
            }
          },
          null,
          2
        )
      },
      {
        path: "src/main.tsx",
        content:
          'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport "./styles.css";\nimport { App } from "./App";\n\nReactDOM.createRoot(document.getElementById("root")!).render(<App />);\n'
      },
      {
        path: "src/App.tsx",
        content: `export function App() {\n  return (\n    <main style={{ fontFamily: "Inter, sans-serif", padding: 24 }}>\n      <h1>Generated from prompt</h1>\n      <p>${prompt.replace(/`/g, "")}</p>\n    </main>\n  );\n}\n`
      },
      {
        path: "src/styles.css",
        content: "body { margin: 0; background: #0b0d14; color: #f3f4f6; }\n"
      },
      {
        path: "README.md",
        content: "# Generated Web App\n\nRun with `npm install && npm run dev`.\n"
      },
      {
        path: ".env.example",
        content: "VITE_API_URL=http://localhost:8080\n"
      }
    ],
    techStack: ["React", "TypeScript", "Vite"],
    setupInstructions: "npm install && npm run dev",
    previewable: true
  };
}

function mobileFallback(prompt: string, platform: "expo" | "android" | "ios") {
  const files: GeneratedFile[] = [
    {
      path: "app.json",
      content: JSON.stringify(
        {
          expo: {
            name: "Forge Generated App",
            slug: "forge-generated-app",
            version: "1.0.0",
            orientation: "portrait",
            icon: "./assets/icon.png",
            splash: {
              image: "./assets/splash.png",
              resizeMode: "contain",
              backgroundColor: "#0A0A0F"
            },
            ios: {
              supportsTablet: true,
              bundleIdentifier: "com.forge.generated"
            },
            android: {
              package: "com.forge.generated"
            }
          }
        },
        null,
        2
      )
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "forge-mobile-app",
          version: "1.0.0",
          private: true,
          main: "node_modules/expo/AppEntry.js",
          scripts: {
            start: "expo start",
            android: "expo run:android",
            ios: "expo run:ios"
          },
          dependencies: {
            expo: "^50.0.0",
            react: "18.2.0",
            "react-native": "0.73.6",
            "react-native-safe-area-context": "4.8.2",
            "@react-navigation/native": "^6.1.18",
            "@react-navigation/native-stack": "^6.11.0",
            axios: "^1.9.0",
            zustand: "^5.0.3",
            "@react-native-async-storage/async-storage": "1.23.1",
            nativewind: "^4.0.36"
          }
        },
        null,
        2
      )
    },
    {
      path: "babel.config.js",
      content:
        "module.exports = function(api) {\n  api.cache(true);\n  return { presets: ['babel-preset-expo'], plugins: ['nativewind/babel'] };\n};\n"
    },
    {
      path: "metro.config.js",
      content:
        "const { getDefaultConfig } = require('expo/metro-config');\nconst config = getDefaultConfig(__dirname);\nmodule.exports = config;\n"
    },
    {
      path: "tsconfig.json",
      content: JSON.stringify({ extends: "expo/tsconfig.base", compilerOptions: { strict: true } }, null, 2)
    },
    {
      path: "App.tsx",
      content:
        'import { NavigationContainer } from "@react-navigation/native";\nimport { createNativeStackNavigator } from "@react-navigation/native-stack";\nimport { SafeAreaProvider } from "react-native-safe-area-context";\nimport { HomeScreen } from "./src/screens/HomeScreen";\n\nconst Stack = createNativeStackNavigator();\n\nexport default function App() {\n  return (\n    <SafeAreaProvider>\n      <NavigationContainer>\n        <Stack.Navigator>\n          <Stack.Screen name="Home" component={HomeScreen} />\n        </Stack.Navigator>\n      </NavigationContainer>\n    </SafeAreaProvider>\n  );\n}\n'
    },
    {
      path: "src/screens/HomeScreen.tsx",
      content:
        `import { Text, View } from "react-native";\n\nexport function HomeScreen() {\n  return (\n    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0A0A0F" }}>\n      <Text style={{ color: "#F8FAFC", fontSize: 24, marginBottom: 12 }}>Forge Mobile App</Text>\n      <Text style={{ color: "#94A3B8", textAlign: "center", paddingHorizontal: 24 }}>${prompt.replace(/`/g, "")}</Text>\n    </View>\n  );\n}\n`
    },
    {
      path: "src/components/.gitkeep",
      content: ""
    },
    {
      path: "src/navigation/.gitkeep",
      content: ""
    },
    {
      path: "src/hooks/.gitkeep",
      content: ""
    },
    {
      path: "src/services/.gitkeep",
      content: ""
    },
    {
      path: "src/store/.gitkeep",
      content: ""
    },
    {
      path: "src/types/.gitkeep",
      content: ""
    },
    {
      path: "android/app/build.gradle",
      content:
        "android {\n    defaultConfig {\n        applicationId \"com.forge.generated\"\n        minSdkVersion rootProject.ext.minSdkVersion\n        targetSdkVersion rootProject.ext.targetSdkVersion\n    }\n}\n"
    },
    {
      path: "ios/Info.plist",
      content:
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\">\n<dict><key>CFBundleName</key><string>ForgeGenerated</string></dict>\n</plist>\n"
    },
    {
      path: "README.md",
      content:
        "# Generated Mobile App\n\n1. npm install\n2. npx expo start\n3. Use Expo Go QR scanner\n4. Production builds: eas build --platform all\n"
    }
  ];

  return {
    files,
    platform,
    appJson: JSON.parse(files.find((file) => file.path === "app.json")?.content ?? "{}"),
    packageJson: JSON.parse(files.find((file) => file.path === "package.json")?.content ?? "{}"),
    screens: ["HomeScreen"],
    setupSteps: ["npm install", "npx expo start", "eas build --platform all"]
  } satisfies GeneratedProjectPayload;
}

export class GenerationService {
  private anthropic = new AnthropicService();
  private s3 = new S3Service();

  private emitProgress(projectId: string, step: string, message: string, percent: number) {
    const io = getSocketServer();
    io.to(projectId).emit("generation:progress", { projectId, step, message, percent });
  }

  private emitFile(projectId: string, fileName: string, content: string) {
    const io = getSocketServer();
    io.to(projectId).emit("generation:file", { projectId, fileName, content });
  }

  private emitStart(projectId: string, type: string) {
    const io = getSocketServer();
    io.to(projectId).emit("generation:start", { projectId, type });
  }

  private emitComplete(projectId: string, fileTree: GeneratedProjectPayload) {
    const io = getSocketServer();
    io.to(projectId).emit("generation:complete", { projectId, fileTree });
  }

  private emitError(projectId: string, error: string) {
    const io = getSocketServer();
    io.to(projectId).emit("generation:error", { projectId, error });
  }

  private async createGenerationRecord(projectId: string, userId: string, prompt: string) {
    return prisma.generation.create({
      data: {
        projectId,
        userId,
        prompt,
        status: "processing"
      }
    });
  }

  private async finalizeGeneration(
    generationId: string,
    projectId: string,
    userId: string,
    payload: GeneratedProjectPayload,
    startedAt: number
  ) {
    const normalized = {
      ...payload,
      files: normalizeFiles(payload.files)
    };

    await prisma.$transaction([
      prisma.generation.update({
        where: { id: generationId },
        data: {
          status: "success",
          durationMs: Date.now() - startedAt,
          tokensUsed: Math.ceil(JSON.stringify(normalized).length / 4)
        }
      }),
      prisma.project.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.READY,
          generatedCode: normalized as Prisma.InputJsonValue,
          previewUrl: `https://preview.forge-ai.local/${projectId}`
        }
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: 1
          }
        }
      }),
      prisma.usageLog.create({
        data: {
          userId,
          projectId,
          type: "generation",
          units: 1,
          metadata: {
            fileCount: normalized.files.length
          }
        }
      })
    ]);

    await this.s3.uploadJson(`projects/${projectId}/snapshot.json`, normalized);

    normalized.files.forEach((file) => {
      this.emitFile(projectId, file.path, file.content);
    });

    this.emitComplete(projectId, normalized);

    return normalized;
  }

  private async failGeneration(generationId: string, projectId: string, error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown generation error";

    await prisma.$transaction([
      prisma.generation.update({
        where: { id: generationId },
        data: {
          status: "failed",
          error: message
        }
      }),
      prisma.project.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.FAILED
        }
      })
    ]);

    this.emitError(projectId, message);
    throw error;
  }

  async generateWebApp(prompt: string, projectId: string, userId: string) {
    const startedAt = Date.now();
    const generation = await this.createGenerationRecord(projectId, userId, prompt);

    this.emitStart(projectId, "web");

    try {
      this.emitProgress(projectId, "analyzing", "Analyzing prompt", 10);
      let payload: GeneratedProjectPayload;

      if (this.anthropic.isConfigured) {
        this.emitProgress(projectId, "designing", "Generating architecture", 35);
        payload = (await this.anthropic.generateJson(WEB_SYSTEM_PROMPT, prompt)) as GeneratedProjectPayload;
      } else {
        payload = webFallback(prompt);
      }

      this.emitProgress(projectId, "generating", "Writing project files", 75);
      return await this.finalizeGeneration(generation.id, projectId, userId, payload, startedAt);
    } catch (error) {
      return this.failGeneration(generation.id, projectId, error);
    }
  }

  async generateMobileApp(
    prompt: string,
    projectId: string,
    userId: string,
    platform: "android" | "ios" | "mobile"
  ) {
    const startedAt = Date.now();
    const generation = await this.createGenerationRecord(projectId, userId, prompt);

    this.emitStart(projectId, platform);

    try {
      this.emitProgress(projectId, "analyzing", "Understanding mobile requirements", 10);
      let payload: GeneratedProjectPayload;

      if (this.anthropic.isConfigured) {
        this.emitProgress(projectId, "designing", "Designing app navigation", 30);
        payload = (await this.anthropic.generateJson(
          MOBILE_SYSTEM_PROMPT,
          `${prompt}\n\nTarget platform: ${platform}`
        )) as GeneratedProjectPayload;
      } else {
        const fallbackPlatform = platform === "mobile" ? "expo" : platform;
        payload = mobileFallback(prompt, fallbackPlatform as "expo" | "android" | "ios");
      }

      payload.platform = platform === "mobile" ? "expo" : platform;

      this.emitProgress(projectId, "generating", "Generating mobile project files", 70);
      return await this.finalizeGeneration(generation.id, projectId, userId, payload, startedAt);
    } catch (error) {
      return this.failGeneration(generation.id, projectId, error);
    }
  }

  async iterateProject(projectId: string, userId: string, newPrompt: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }

    const currentPayload = project.generatedCode as GeneratedProjectPayload | null;

    if (!currentPayload?.files?.length) {
      throw new Error("No generated files found for iteration");
    }

    const generation = await this.createGenerationRecord(projectId, userId, newPrompt);
    const startedAt = Date.now();

    this.emitStart(projectId, "iterate");

    try {
      this.emitProgress(projectId, "analyzing", "Reviewing existing project", 15);

      let changedPayload: GeneratedProjectPayload;
      if (this.anthropic.isConfigured) {
        changedPayload = (await this.anthropic.generateJson(
          `You are updating an existing codebase. Return ONLY changed files as JSON { files: [{ path, content }] }`,
          `Existing files:\n${JSON.stringify(currentPayload.files)}\n\nNew instruction:\n${newPrompt}`
        )) as GeneratedProjectPayload;
      } else {
        changedPayload = {
          files: [
            {
              path: "README.md",
              content: `${currentPayload.files.find((file) => file.path === "README.md")?.content ?? "# Project"}\n\n## Iteration\n${newPrompt}\n`
            }
          ]
        };
      }

      const merged = mergeFilePayload(currentPayload, changedPayload.files ?? []);
      this.emitProgress(projectId, "finalizing", "Merging changes into file tree", 85);
      return await this.finalizeGeneration(generation.id, projectId, userId, merged, startedAt);
    } catch (error) {
      return this.failGeneration(generation.id, projectId, error);
    }
  }

  resolveType(type: AppType): "web" | "android" | "ios" | "mobile" {
    if (type === AppType.WEB) {
      return "web";
    }

    if (type === AppType.ANDROID) {
      return "android";
    }

    if (type === AppType.IOS) {
      return "ios";
    }

    return "mobile";
  }

  async generateByType(
    type: "web" | "android" | "ios" | "mobile",
    prompt: string,
    projectId: string,
    userId: string
  ) {
    if (type === "web") {
      return this.generateWebApp(prompt, projectId, userId);
    }

    return this.generateMobileApp(prompt, projectId, userId, type);
  }
}
