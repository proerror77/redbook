import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { CliArgs, Provider } from "./types";

function printUsage(): void {
  console.log(`Usage:
  npx -y bun scripts/main.ts --prompt "A cat" --image cat.png
  npx -y bun scripts/main.ts --prompt "A landscape" --image landscape.png --ar 16:9
  npx -y bun scripts/main.ts --promptfiles system.md content.md --image out.png

Options:
  -p, --prompt <text>       Prompt text
  --promptfiles <files...>  Read prompt from files (concatenated)
  --image <path>            Output image path (required)
  --provider google|openai|dashscope|tuzi  Force provider (auto-detect by default)
  -m, --model <id>          Model ID
  --preset <name>           Prompt preset: raw|x-card|blog-hero|x-blog-editorial (default: raw)
  --ar <ratio>              Aspect ratio (e.g., 16:9, 1:1, 4:3)
  --size <WxH>              Size (e.g., 1024x1024)
  --quality normal|2k       Quality preset (default: 2k)
  --imageSize 1K|2K|4K      Image size for Google (default: from quality)
  --ref <files...>          Reference images (Google multimodal only)
  --n <count>               Number of images (default: 1)
  --json                    JSON output
  -h, --help                Show help

Environment variables:
  TUZI_API_KEY              Tuzi API key (prioritized for OpenAI-compatible)
  TUZI_BASE_URL             Tuzi API endpoint
  TUZI_IMAGE_MODEL          Tuzi image model (default: gpt-image-2.0)
  OPENAI_API_KEY            OpenAI API key
  GOOGLE_API_KEY            Google API key
  GEMINI_API_KEY            Gemini API key (alias for GOOGLE_API_KEY)
  DASHSCOPE_API_KEY         DashScope API key (阿里云通义万象)
  OPENAI_IMAGE_MODEL        Default OpenAI model (gpt-image-1.5)
  GOOGLE_IMAGE_MODEL        Default Google model (gemini-3-pro-image-preview)
  DASHSCOPE_IMAGE_MODEL     Default DashScope model (z-image-turbo)
  OPENAI_BASE_URL           Custom OpenAI endpoint
  GOOGLE_BASE_URL           Custom Google endpoint
  DASHSCOPE_BASE_URL        Custom DashScope endpoint

Env file load order: CLI args > process.env > <cwd>/.baoyu-skills/.env > ~/.baoyu-skills/.env`);
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    prompt: null,
    promptFiles: [],
    imagePath: null,
    provider: null,
    model: null,
    preset: "raw",
    aspectRatio: null,
    size: null,
    quality: "2k",
    imageSize: null,
    referenceImages: [],
    n: 1,
    json: false,
    help: false,
  };

  const positional: string[] = [];

  const takeMany = (i: number): { items: string[]; next: number } => {
    const items: string[] = [];
    let j = i + 1;
    while (j < argv.length) {
      const v = argv[j]!;
      if (v.startsWith("-")) break;
      items.push(v);
      j++;
    }
    return { items, next: j - 1 };
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;

    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }

    if (a === "--json") {
      out.json = true;
      continue;
    }

    if (a === "--prompt" || a === "-p") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.prompt = v;
      continue;
    }

    if (a === "--promptfiles") {
      const { items, next } = takeMany(i);
      if (items.length === 0) throw new Error("Missing files for --promptfiles");
      out.promptFiles.push(...items);
      i = next;
      continue;
    }

    if (a === "--image") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --image");
      out.imagePath = v;
      continue;
    }

    if (a === "--provider") {
      const v = argv[++i];
      if (v !== "google" && v !== "openai" && v !== "dashscope" && v !== "tuzi") throw new Error(`Invalid provider: ${v}`);
      out.provider = v;
      continue;
    }

    if (a === "--model" || a === "-m") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.model = v;
      continue;
    }

    if (a === "--preset") {
      const v = argv[++i];
      if (v !== "raw" && v !== "x-card" && v !== "blog-hero" && v !== "x-blog-editorial") {
        throw new Error(`Invalid preset: ${v}`);
      }
      out.preset = v;
      continue;
    }

    if (a === "--ar") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --ar");
      out.aspectRatio = v;
      continue;
    }

    if (a === "--size") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --size");
      out.size = v;
      continue;
    }

    if (a === "--quality") {
      const v = argv[++i];
      if (v !== "normal" && v !== "2k") throw new Error(`Invalid quality: ${v}`);
      out.quality = v;
      continue;
    }

    if (a === "--imageSize") {
      const v = argv[++i]?.toUpperCase();
      if (v !== "1K" && v !== "2K" && v !== "4K") throw new Error(`Invalid imageSize: ${v}`);
      out.imageSize = v;
      continue;
    }

    if (a === "--ref" || a === "--reference") {
      const { items, next } = takeMany(i);
      if (items.length === 0) throw new Error(`Missing files for ${a}`);
      out.referenceImages.push(...items);
      i = next;
      continue;
    }

    if (a === "--n") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --n");
      out.n = parseInt(v, 10);
      if (isNaN(out.n) || out.n < 1) throw new Error(`Invalid count: ${v}`);
      continue;
    }

    if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    }

    positional.push(a);
  }

  if (!out.prompt && out.promptFiles.length === 0 && positional.length > 0) {
    out.prompt = positional.join(" ");
  }

  return out;
}

async function loadEnvFile(p: string): Promise<Record<string, string>> {
  try {
    const content = await readFile(p, "utf8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

async function loadEnv(): Promise<void> {
  const home = homedir();
  const cwd = process.cwd();

  const homeEnv = await loadEnvFile(path.join(home, ".baoyu-skills", ".env"));
  const cwdEnv = await loadEnvFile(path.join(cwd, ".baoyu-skills", ".env"));

  for (const [k, v] of Object.entries(homeEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(cwdEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

async function readPromptFromFiles(files: string[]): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    parts.push(await readFile(f, "utf8"));
  }
  return parts.join("\n\n");
}

async function readPromptFromStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;
  try {
    const t = await Bun.stdin.text();
    const v = t.trim();
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function normalizeOutputImagePath(p: string): string {
  const full = path.resolve(p);
  const ext = path.extname(full);
  if (ext) return full;
  return `${full}.png`;
}

function applyPromptPreset(prompt: string, args: CliArgs): string {
  if (args.preset === "raw") return prompt;

  const target = args.preset === "blog-hero"
    ? "blog hero image"
    : args.preset === "x-card"
      ? "X.com feed card"
      : "X.com/blog editorial image";

  const defaultRatio = args.aspectRatio || (args.preset === "blog-hero" ? "16:9" : "3:4");
  const exactTextPolicy = args.preset === "blog-hero"
    ? "Avoid long body copy inside the image. If text is needed, use only one short quoted headline and one small label."
    : "Use at most one short quoted headline inside the image; avoid paragraphs, UI clutter, fake logos, and tiny illegible labels.";

  return `Create a polished ${target} for a tech founder audience.

Output artifact:
- Platform: ${args.preset === "blog-hero" ? "blog / newsletter / article header" : "X.com timeline image"}
- Aspect ratio: ${defaultRatio}
- Visual direction: premium editorial technology design, clear at thumbnail size, strong composition, mature taste
- Aesthetic anchors: modern magazine art direction, Swiss grid, restrained color palette, clean negative space, precise hierarchy
- Preferred styles: editorial vector illustration, modernist poster, tasteful product-diagram, or cinematic desk/terminal scene
- Avoid: generic blue-purple AI glow, random robot mascots, glossy Dribbble 3D blobs, bokeh orbs, cluttered infographic text, unreadable tiny type, fake brand logos, watermark, low-effort clipart

Typography and text:
- ${exactTextPolicy}
- Put any exact visible text in double quotes and name its role, for example headline or small footer.
- Chinese and English text must be sharp, correctly spelled, and not warped.

Composition requirements:
- One clear visual metaphor, not a collage of many unrelated symbols.
- Foreground, midground, and background should be intentionally separated.
- Leave safe margins for cropping in X/blog previews.
- The image should communicate the idea before the viewer reads the post.

Content brief:
${prompt}`;
}

function detectProvider(args: CliArgs): Provider {
  if (args.provider) return args.provider;

  const hasGoogle = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
  const hasOpenai = !!(process.env.TUZI_API_KEY || process.env.OPENAI_API_KEY);
  const hasDashscope = !!process.env.DASHSCOPE_API_KEY;
  const hasTuzi = !!process.env.TUZI_API_KEY;

  // Prioritize Tuzi if available
  if (hasTuzi) return "tuzi";

  const available = [hasGoogle && "google", hasOpenai && "openai", hasDashscope && "dashscope"].filter(Boolean) as Provider[];

  if (available.length === 1) return available[0]!;
  if (available.length > 1) return available[0]!;

  throw new Error(
    "No API key found. Set TUZI_API_KEY, GOOGLE_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or DASHSCOPE_API_KEY.\n" +
      "Create ~/.baoyu-skills/.env or <cwd>/.baoyu-skills/.env with your keys."
  );
}

type ProviderModule = {
  getDefaultModel: () => string;
  generateImage: (prompt: string, model: string, args: CliArgs) => Promise<Uint8Array>;
};

async function loadProviderModule(provider: Provider): Promise<ProviderModule> {
  if (provider === "google") {
    return (await import("./providers/google")) as ProviderModule;
  }
  if (provider === "dashscope") {
    return (await import("./providers/dashscope")) as ProviderModule;
  }
  if (provider === "tuzi") {
    return (await import("./providers/tuzi")) as ProviderModule;
  }
  return (await import("./providers/openai")) as ProviderModule;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  await loadEnv();

  let prompt: string | null = args.prompt;
  if (!prompt && args.promptFiles.length > 0) prompt = await readPromptFromFiles(args.promptFiles);
  if (!prompt) prompt = await readPromptFromStdin();

  if (!prompt) {
    console.error("Error: Prompt is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!args.imagePath) {
    console.error("Error: --image is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  prompt = applyPromptPreset(prompt, args);

  const provider = detectProvider(args);
  const providerModule = await loadProviderModule(provider);
  const model = args.model || providerModule.getDefaultModel();
  const outputPath = normalizeOutputImagePath(args.imagePath);

  let imageData: Uint8Array;
  let retried = false;

  while (true) {
    try {
      imageData = await providerModule.generateImage(prompt, model, args);
      break;
    } catch (e) {
      if (!retried) {
        retried = true;
        console.error("Generation failed, retrying...");
        continue;
      }
      throw e;
    }
  }

  const dir = path.dirname(outputPath);
  await mkdir(dir, { recursive: true });
  await writeFile(outputPath, imageData);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          savedImage: outputPath,
          provider,
          model,
          prompt: prompt.slice(0, 200),
        },
        null,
        2
      )
    );
  } else {
    console.log(outputPath);
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  process.exit(1);
});
