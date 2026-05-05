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
  --preset <name>           Prompt preset: raw|x-card|blog-hero|x-blog-editorial|article-elegant|social-cover|info-card (default: raw)
  --ar <ratio>              Aspect ratio (e.g., 16:9, 1:1, 4:3)
  --size <WxH>              Size (e.g., 1024x1024)
  --quality normal|2k       Quality preset (default: 2k)
  --imageSize 1K|2K|4K      Image size for Google (default: from quality)
  --ref <files...>          Reference images (Google multimodal only)
  --n <count>               Number of images (default: 1)
  --broth <text>            Stable account-level visual recipe rules
  --seasoning <text>        One reusable style module, e.g. blueprint/manual/cinematic
  --title <text>            Exact visible headline, if text is needed
  --subtitle <text>         Exact visible subtitle, if text is needed
  --text-mode <mode>        none|headline|headline-subtitle|labels
  --print-prompt            Print the final assembled prompt and exit without generating
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
    broth: null,
    seasoning: null,
    visibleTitle: null,
    visibleSubtitle: null,
    textMode: null,
    printPrompt: false,
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

    if (a === "--print-prompt") {
      out.printPrompt = true;
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
      if (v !== "raw" && v !== "x-card" && v !== "blog-hero" && v !== "x-blog-editorial" && v !== "article-elegant" && v !== "social-cover" && v !== "info-card") {
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

    if (a === "--broth") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --broth");
      out.broth = v;
      continue;
    }

    if (a === "--seasoning") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --seasoning");
      out.seasoning = v;
      continue;
    }

    if (a === "--title") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --title");
      out.visibleTitle = v;
      continue;
    }

    if (a === "--subtitle") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --subtitle");
      out.visibleSubtitle = v;
      continue;
    }

    if (a === "--text-mode") {
      const v = argv[++i];
      if (v !== "none" && v !== "headline" && v !== "headline-subtitle" && v !== "labels") throw new Error(`Invalid text mode: ${v}`);
      out.textMode = v;
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

  const isArticle = args.preset === "blog-hero" || args.preset === "article-elegant";
  const target = args.preset === "blog-hero"
    ? "blog hero image"
    : args.preset === "article-elegant"
      ? "minimal elegant article illustration"
      : args.preset === "x-card"
        ? "X.com feed card"
        : args.preset === "social-cover"
          ? "social media cover / recommendation card"
          : args.preset === "info-card"
            ? "structured social media information card"
            : "X.com/blog editorial image";

  const platform = isArticle ? "blog / newsletter / article header" : "X.com timeline image or cross-platform social image";
  const defaultRatio = args.aspectRatio || "16:9";
  const defaultTextMode = args.textMode || (isArticle ? "none" : args.preset === "info-card" ? "labels" : args.visibleSubtitle ? "headline-subtitle" : "headline");
  const titleLine = args.visibleTitle ? `- Exact headline text: "${args.visibleTitle}"` : "- Exact headline text: not provided; do not invent a large headline unless the content brief explicitly asks for one.";
  const subtitleLine = args.visibleSubtitle ? `- Exact subtitle text: "${args.visibleSubtitle}"` : "- Exact subtitle text: not provided; avoid subtitles unless explicitly needed.";
  const baseBroth = args.broth || "restrained editorial taste, mobile readability, clear hierarchy, generous whitespace, low text density, and one visible recommendation reason";
  const seasoning = args.seasoning || "choose exactly one main style seasoning from blueprint order, product manual, cinematic title, eastern literati, exhibition wall, garden journal, or variety preview, based on the content brief";
  const exactTextPolicy = buildTextPolicy(defaultTextMode);

  return `Create a polished ${target} for a tech founder audience.

Output artifact:
- Platform: ${platform}
- Aspect ratio: ${defaultRatio}
- Deliverable: one finished publishable image, not a moodboard, template sheet, multi-option grid, screenshot collage, or prompt poster
- Visual direction: simple, elegant editorial technology design; calm, useful, and mature
- Aesthetic anchors: Swiss grid, generous negative space, restrained typography, off-white / graphite / ink palette, one precise accent color
- Avoid: generic blue-purple AI glow, random robot mascots, glossy Dribbble 3D blobs, bokeh orbs, cyberpunk neon, busy collage, cluttered infographic text, unreadable tiny type, fake brand logos, watermark, low-effort clipart

Visual recipe:
- Base broth: ${baseBroth}
- Style seasoning: ${seasoning}
- Convert the seasoning into concrete layout grid, typography feel, accent color, annotation style, illustration/object relationship, and an avoid list.
- Use one main seasoning only. Add a secondary seasoning only if it clarifies the content brief.

Content variables:
${titleLine}
${subtitleLine}
- Reader task: infer from the content brief and make it visually obvious within 3 seconds on mobile.
- Main subject: use one strong metaphor or object relationship; avoid unrelated icon soup.

Typography and text:
- Text mode: ${defaultTextMode}
- ${exactTextPolicy}
- Put any exact visible text in double quotes and name its role, for example headline or small footer.
- Chinese and English text must be sharp, correctly spelled, and not warped.
- No paragraphs inside the image. Use at most 1 headline, 1 subtitle, and 3 short labels unless the user explicitly asked for a dense infographic.

Composition requirements:
- One clear visual metaphor, not a collage of many unrelated symbols.
- Use large shapes, quiet contrast, and deliberate whitespace.
- Foreground, midground, and background should be intentionally separated, but never visually noisy.
- Leave safe margins for cropping in X/blog previews.
- The image should communicate the idea before the viewer reads the post.
- If this is a cover, the title area, subject area, and breathing space must be separate and stable.
- If this is an information card, use 3-5 clearly separated blocks with short labels; no tiny footnotes.

Content brief:
${prompt}`;
}

function buildTextPolicy(textMode: NonNullable<CliArgs["textMode"]>): string {
  switch (textMode) {
    case "none":
      return "Prefer no visible text inside the image. If text is unavoidable, use only one short quoted headline.";
    case "headline":
      return "Use one short visible headline only. It must be readable on mobile and must not overlap the subject.";
    case "headline-subtitle":
      return "Use one short headline and one short subtitle only. Keep both in a dedicated text zone with generous margins.";
    case "labels":
      return "Use short labels only where they clarify the structure. Labels must be large enough to read on mobile and never become decorative microtext.";
  }
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

  prompt = applyPromptPreset(prompt, args);

  if (args.printPrompt) {
    if (args.json) {
      console.log(JSON.stringify({ prompt }, null, 2));
    } else {
      console.log(prompt);
    }
    return;
  }

  if (!args.imagePath) {
    console.error("Error: --image is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

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
