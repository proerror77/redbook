# Prompt Construction

## Prompt File Format

Each prompt file uses YAML frontmatter + content:

```yaml
---
illustration_id: 01
type: infographic
style: blueprint
references:                    # ⚠️ ONLY if files EXIST in references/ directory
  - ref_id: 01
    filename: 01-ref-diagram.png
    usage: direct              # direct | style | palette
---

[Type-specific template content below...]
```

**⚠️ CRITICAL - When to include `references` field**:

| Situation | Action |
|-----------|--------|
| Reference file saved to `references/` | Include in frontmatter ✓ |
| Style extracted verbally (no file) | DO NOT include in frontmatter, append to prompt body instead |
| File path in frontmatter but file doesn't exist | ERROR - remove references field |

**Reference Usage Types** (only when file exists):

| Usage | Description | Generation Action |
|-------|-------------|-------------------|
| `direct` | Primary visual reference | Pass to `--ref` parameter |
| `style` | Style characteristics only | Describe style in prompt text |
| `palette` | Color palette extraction | Include colors in prompt |

**If no reference file but style/palette extracted verbally**, append directly to prompt body:
```
COLORS (from reference):
- Primary: #E8756D coral
- Secondary: #7ECFC0 mint
...

STYLE (from reference):
- Clean lines, minimal shadows
- Gradient backgrounds
...
```

---

## Default Composition Requirements

**Apply to ALL prompts by default**:

| Requirement | Description |
|-------------|-------------|
| **Clean composition** | Simple layouts, no visual clutter |
| **White space** | Generous margins, breathing room around elements |
| **No complex backgrounds** | Solid colors or subtle gradients only, avoid busy textures |
| **Centered or content-appropriate** | Main visual elements centered or positioned by content needs |
| **Matching graphics** | Use graphic elements that align with content theme |
| **Highlight core info** | White space draws attention to key information |

**Add to ALL prompts**:
> Clean composition with generous white space. Simple or no background. Main elements centered or positioned by content needs.

## Visual Recipe Layer

Before type/style details, define the reusable image recipe:

| Field | Description |
|-------|-------------|
| **Base broth** | Stable account-level rules: restrained editorial taste, mobile readability, clean hierarchy, enough whitespace, no decorative noise |
| **Style seasoning** | One concrete style module selected for this content, translated into grid, typography feel, accent color, annotation style, illustration relationship, and avoid list |
| **Content variables** | The changing title, anchor phrase, object, reader task, platform ratio, and subject matter |

**Add to prompts when a visual series or cover is generated**:
> Use the same base broth across the series: restrained editorial design, mobile readability, clear hierarchy, generous whitespace, and one visible recommendation reason. Apply one main style seasoning only, and translate it into concrete layout, type, color, annotation, and object-relationship constraints.

---

## Visual Metaphor Requirements

**Apply to ALL body illustration prompts by default**:

| Requirement | Description |
|-------------|-------------|
| **Anchor phrase** | Use one short phrase or keyword from the article as the image's conceptual anchor |
| **Semantic read** | State the phrase's literal meaning, emotional tone, hidden tension, and intended reader feeling |
| **Visual metaphor** | Translate the idea into a concrete scene, object relationship, interface relationship, or scale contrast |
| **Carrier surface** | Give the visual a clear ground, stage, panel, screen, desk, wall, horizon, or other structure that makes the composition stand |
| **Text-image integration** | If text appears, make it part of the spatial structure, not a pasted title |
| **Avoid list** | Name the specific cliches and misleading elements to exclude |
| **Layout QA** | Text budget, hierarchy, safe margins, non-overlap, and thumbnail readability |

**Add to ALL body prompts**:
> This image visualizes the anchor phrase, not the whole paragraph. First express the phrase's meaning and tension, then build one clear visual metaphor. If text appears, integrate it into the composition as a structure or object; do not paste it as a separate title.

**Add to ALL card/diagram prompts with text**:
> Layout requirements: one reader task per image, clear first/second/third glance hierarchy, at least 8% safe margin, headline no longer than 12 Chinese characters, subtitle no longer than 18 Chinese characters, no more than 4 labels, no text overlapping the main subject, readable at thumbnail size.

---

## Character Rendering

When depicting people:

| Guideline | Description |
|-----------|-------------|
| **Style** | Simplified cartoon silhouettes or symbolic expressions |
| **Avoid** | Realistic human portrayals, detailed faces |
| **Diversity** | Varied body types when showing multiple people |
| **Emotion** | Express through posture and simple gestures |

**Add to ALL prompts with human figures**:
> Human figures: simplified stylized silhouettes or symbolic representations, not photorealistic.

---

## Text in Illustrations

| Element | Guideline |
|---------|-----------|
| **Size** | Large, prominent, immediately readable |
| **Style** | Handwritten fonts preferred for warmth |
| **Content** | Concise keywords and core concepts only |
| **Language** | Match article language |

**Add to prompts with text**:
> Text should be large and prominent with handwritten-style fonts. Keep minimal, focus on keywords.

---

## Principles

Good prompts must include:

1. **Layout Structure First**: Describe composition, zones, flow direction
2. **Specific Data/Labels**: Use actual numbers, terms from article
3. **Visual Relationships**: How elements connect
4. **Semantic Colors**: Meaning-based color choices (red=warning, green=efficient)
5. **Style Characteristics**: Line treatment, texture, mood
6. **Aspect Ratio**: End with ratio and complexity level

## Type-Specific Templates

### Infographic

```
[Title] - Data Visualization

Layout: [grid/radial/hierarchical]

ZONES:
- Zone 1: [data point with specific values]
- Zone 2: [comparison with metrics]
- Zone 3: [summary/conclusion]

LABELS: [specific numbers, percentages, terms from article]
COLORS: [semantic color mapping]
STYLE: [style characteristics]
ASPECT: 16:9
```

**Infographic + vector-illustration**:
```
Flat vector illustration infographic. Clean black outlines on all elements.
COLORS: Cream background (#F5F0E6), Coral Red (#E07A5F), Mint Green (#81B29A), Mustard Yellow (#F2CC8F)
ELEMENTS: Geometric simplified icons, no gradients, playful decorative elements (dots, stars)
```

### Scene

```
[Title] - Atmospheric Scene

FOCAL POINT: [main subject]
ATMOSPHERE: [lighting, mood, environment]
MOOD: [emotion to convey]
COLOR TEMPERATURE: [warm/cool/neutral]
STYLE: [style characteristics]
ASPECT: 16:9
```

### Flowchart

```
[Title] - Process Flow

Layout: [left-right/top-down/circular]

STEPS:
1. [Step name] - [brief description]
2. [Step name] - [brief description]
...

CONNECTIONS: [arrow types, decision points]
STYLE: [style characteristics]
ASPECT: 16:9
```

**Flowchart + vector-illustration**:
```
Flat vector flowchart with bold arrows and geometric step containers.
COLORS: Cream background (#F5F0E6), steps in Coral/Mint/Mustard, black outlines
ELEMENTS: Rounded rectangles, thick arrows, simple icons per step
```

### Comparison

```
[Title] - Comparison View

LEFT SIDE - [Option A]:
- [Point 1]
- [Point 2]

RIGHT SIDE - [Option B]:
- [Point 1]
- [Point 2]

DIVIDER: [visual separator]
STYLE: [style characteristics]
ASPECT: 16:9
```

**Comparison + vector-illustration**:
```
Flat vector comparison with split layout. Clear visual separation.
COLORS: Left side Coral (#E07A5F), Right side Mint (#81B29A), cream background
ELEMENTS: Bold icons, black outlines, centered divider line
```

### Framework

```
[Title] - Conceptual Framework

STRUCTURE: [hierarchical/network/matrix]

NODES:
- [Concept 1] - [role]
- [Concept 2] - [role]

RELATIONSHIPS: [how nodes connect]
STYLE: [style characteristics]
ASPECT: 16:9
```

**Framework + vector-illustration**:
```
Flat vector framework diagram with geometric nodes and bold connectors.
COLORS: Cream background (#F5F0E6), nodes in Coral/Mint/Mustard/Blue, black outlines
ELEMENTS: Rounded rectangles or circles for nodes, thick connecting lines
```

### Timeline

```
[Title] - Chronological View

DIRECTION: [horizontal/vertical]

EVENTS:
- [Date/Period 1]: [milestone]
- [Date/Period 2]: [milestone]

MARKERS: [visual indicators]
STYLE: [style characteristics]
ASPECT: 16:9
```

## What to Avoid

- Vague descriptions ("a nice image")
- Literal metaphor illustrations
- Missing concrete labels/annotations
- Generic decorative elements

## Watermark Integration

If watermark enabled in preferences, append:

```
Include a subtle watermark "[content]" positioned at [position] with approximately [opacity*100]% visibility.
```
