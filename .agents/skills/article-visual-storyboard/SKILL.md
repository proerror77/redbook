---
name: article-visual-storyboard
description: Plan platform-specific article visuals before image generation. Use when turning an article, X post, newsletter, WeChat draft, or Xiaohongshu draft into image plans, card sequences, visual storyboards, `图文分镜.md`, image specs, layout QA, or when deciding how X.com images differ from Xiaohongshu images.
---

# Article Visual Storyboard

Use this skill before `/document-illustrator`, `/baoyu-xhs-images`, or direct image generation. Its job is planning, not rendering.

## Output

Create or update `图文分镜.md` beside the source article. If the user only needs a quick answer, provide the same structure in chat.

## Workflow

1. Read the article and identify the single core claim.
2. Separate article structure from visual structure:
   - Article structure: Hook, background, problem, judgment, framework, case, method, ending.
   - Visual structure: cover conflict, key judgment, visual metaphor, framework card, case scene, action card.
3. Choose platform outputs. Do not reuse the same canvas spec for X.com and Xiaohongshu.
4. Build one storyboard table per platform.
5. Run layout QA before handing off to an image skill.

## Platform Specs

Use these as Redbook production defaults. If a user gives explicit platform specs, follow the user.

| Platform | Default Canvas | Image Count | Role | Text Density | Handoff |
| --- | --- | --- | --- | --- | --- |
| X.com | `16:9`, `1920x1080` | 1 main image, optional 2-3 support images | One strong feed card that makes the post claim visible before reading | Very low: one short headline or no text | `/document-illustrator` or `/baoyu-image-gen` |
| Xiaohongshu | `3:4`, `1080x1440` | 5-7 cards | Swipeable card sequence with hook, explanation, framework, case, action | Medium: clear headline, short subtitle, few labels | `/baoyu-xhs-images` |
| WeChat / longform | `16:9` hero plus body images as needed | Hero + 3-5 body illustrations | Support reading flow inside article | Low to medium | `/document-illustrator` |

Hard rule: X.com and Xiaohongshu should not share the same image file as the default. They may share an idea, color system, or visual metaphor, but must have separate canvas, crop, text density, and composition.

## Storyboard Fields

For each platform, create rows with:

| Field | Meaning |
| --- | --- |
| `Image` | `X-01`, `XHS-01`, etc. |
| `Platform spec` | Canvas, ratio, count role, and crop notes |
| `Card role` | cover conflict, key judgment, framework, case, action, CTA |
| `Reader task` | stop, understand, compare, remember, save, comment, act |
| `Anchor phrase` | 2-8 Chinese characters or one short English phrase from the article |
| `Semantic read` | literal meaning, emotional tone, hidden tension, intended reader feeling |
| `Visual metaphor` | concrete scene, object relationship, UI/workflow relation, or scale contrast |
| `Layout spec` | title zone, subject zone, safe margins, grid, focal point |
| `Text budget` | headline, subtitle, labels, and max character counts |
| `Avoid` | specific cliches, misleading elements, or platform-inappropriate elements |
| `Handoff` | target generation skill and prompt notes |

## Layout QA

Every row must pass before generation:

- One image has one reader task.
- Main headline is at most 12 Chinese characters.
- Subtitle is at most 18 Chinese characters.
- Labels are at most 4, each at most 6 Chinese characters.
- Safe margins are at least 8% on all sides.
- Text does not overlap faces, product/UI subjects, key lines, or visual focal points.
- Thumbnail remains understandable.
- No random tiny text, fake logos, fake coordinates, dense paragraphs, or filler decorations.

## X.com Guidance

X images should be quiet and fast to parse:

- Use `16:9` by default for a feed card, blog/newsletter preview, or link-supporting post.
- Use `1:1` only when the image is a compact quote card or single framework tile.
- Avoid Xiaohongshu-style multi-card density.
- Prefer one metaphor, one focal point, and little or no text.
- The image should support the main post, not replace the post.

## Xiaohongshu Guidance

Xiaohongshu images should be swipeable and saveable:

- Use `3:4`, `1080x1440` by default.
- Plan 5-7 cards for normal posts.
- Card 1 creates the conflict; middle cards explain the framework or case; final card gives action or CTA.
- Each card needs a clear title zone and enough whitespace for mobile reading.
- Do not paste article paragraphs into cards.

## Handoff Format

End with:

```markdown
## Handoff

- X.com: generate `X-01` using `/document-illustrator` or `/baoyu-image-gen`; canvas `16:9`; do not reuse XHS crops.
- Xiaohongshu: generate `XHS-01` to `XHS-0N` using `/baoyu-xhs-images`; canvas `3:4`; preserve card sequence.
- Shared visual system: [palette, style, metaphor]
- Must not share: [canvas ratio, crop, text density, final files]
```
