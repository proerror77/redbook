export type Provider = "google" | "openai" | "dashscope" | "tuzi";
export type Quality = "normal" | "2k";
export type PromptPreset = "raw" | "x-card" | "blog-hero" | "x-blog-editorial";

export type CliArgs = {
  prompt: string | null;
  promptFiles: string[];
  imagePath: string | null;
  provider: Provider | null;
  model: string | null;
  preset: PromptPreset;
  aspectRatio: string | null;
  size: string | null;
  quality: Quality;
  imageSize: string | null;
  referenceImages: string[];
  n: number;
  json: boolean;
  help: boolean;
};
