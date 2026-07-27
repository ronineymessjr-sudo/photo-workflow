# PhotoAtelier Landing R5 GPT Image Asset Manifest

## 1. Rights And Source Rule

All photography must be generated specifically for this landing page with GPT Image.

Prohibited:

- Stock libraries.
- Pexels, Unsplash, Pixabay, Pixiv, Pinterest, Xiaohongshu, Douyin, Xinpianchang, Behance, or copied website imagery.
- Screenshots of another photographer's work.
- Recognizable public figures, celebrities, brands, artwork, architecture trademarks, or watermarks.

Metadata rule:

- Mark generated assets as `synthetic=true`.
- Source label: `GPT Image original concept`.
- Do not call a generated concept a real photo reference.

## 2. Visual Continuity Bible

All assets belong to one fictional shoot.

Subject:

- Fictional adult East Asian woman, approximately late twenties.
- Shoulder-length dark hair.
- Black sleeveless minimal dress.
- No visible brand marks, jewelry logos, or tattoos.

Photographer:

- Fictional adult man.
- Dark neutral workwear.
- Unbranded camera.

Location:

- Fictional modern civic architecture.
- Curved concrete walls, open exterior corridor, distant generic skyline.
- No recognizable landmark.

Light:

- Dawn, warm low side light.
- Neutral concrete and restrained green-gray shadows.

Style:

- Editorial realism.
- Natural skin texture.
- Moderate contrast.
- No beauty-ad skin, fantasy styling, cinematic teal-orange grade, or AI-surreal details.

Continuity workflow:

1. Generate the hero first.
2. Use the approved hero as the reference image for all later asset edits/generations.
3. Preserve face, hair, wardrobe, location, weather, and light direction.
4. Generate shot variations as edits/continuations, not unrelated prompts.

## 3. Required Assets

### A01 Hero

Filename:

`hero-urban-dawn.webp`

Output:

- Master: `2400 x 1500`.
- Desktop crop: `16:10`.
- Mobile crop: `4:5`.

Prompt:

```text
Create an original editorial behind-the-scenes fashion photograph at dawn in a fictional modern civic architecture location. A fictional adult East Asian woman with shoulder-length dark hair wears a minimal unbranded black sleeveless dress. A fictional adult male photographer in dark neutral workwear photographs her with an unbranded camera. Curved concrete walls frame the scene, with a generic distant skyline and warm low side light. Leave a naturally dark, uncluttered area on the left for white website typography; keep the model and photographer on the right. Realistic skin, realistic hands, credible camera posture, understated professional production, no recognizable landmark, no logos, no text, no watermark, no copyrighted artwork, no celebrity likeness. Editorial realism, restrained neutral color, forest-green-gray shadows, moderate contrast.
```

Alt:

`摄影师在黎明建筑外廊为模特拍摄`

### A02 Reference Portrait

Filename:

`reference-portrait.webp`

Output:

- Master: `1600 x 2000`.
- Display: `4:5`.

Prompt:

```text
Using the approved PhotoAtelier hero as identity, wardrobe, location and lighting reference, create an original 4:5 editorial portrait of the same fictional adult model at the same dawn architecture shoot. Medium-close portrait, model turns slightly toward the side light, quiet expression, curved concrete wall and soft generic skyline behind her. Preserve face, hair, black dress, dawn light direction and realistic skin. No photographer in frame, no logo, no text, no watermark, no celebrity likeness.
```

Alt:

`黎明建筑场景中的原创人物概念图`

### A03–A07 Five Shots

Shared output:

- Master: `1600 x 2000`.
- Display thumbnails: `4:5`.

#### A03

Filename: `shot-01-environment.webp`

```text
Continue the approved fictional dawn architecture shoot. Full environmental frame, 35mm perspective, slightly low camera position, model entering the curved concrete corridor, strong architectural leading lines, substantial negative space, same face, hair, black dress and dawn light. Original synthetic editorial photography, realistic anatomy, no logos, no text, no watermark.
```

Alt: `镜头一，建筑环境中的人物全景`

#### A04

Filename: `shot-02-full-body.webp`

```text
Continue the same fictional shoot. Full-body portrait, 50mm perspective, model stands front-facing in the open corridor, relaxed posture, minimal movement, architectural negative space, same identity, wardrobe, location and light. Original synthetic editorial photography, realistic anatomy, no logos, no text, no watermark.
```

Alt: `镜头二，建筑外廊中的人物全身照`

#### A05

Filename: `shot-03-turn.webp`

```text
Continue the same fictional shoot. Medium portrait, 85mm perspective, model rotates her shoulder and looks beyond the camera, restrained expression, dawn edge light outlines hair, same identity, wardrobe and location. Original synthetic editorial photography, realistic anatomy, no logos, no text, no watermark.
```

Alt: `镜头三，侧身回望的中景人像`

#### A06

Filename: `shot-04-close.webp`

```text
Continue the same fictional shoot. Emotional close portrait, 100mm perspective, shallow depth of field, low-amplitude expression, soft side backlight, natural skin texture, same identity, hair and wardrobe. Original synthetic editorial photography, realistic facial structure, no logos, no text, no watermark.
```

Alt: `镜头四，侧逆光情绪特写`

#### A07

Filename: `shot-05-exit.webp`

```text
Continue the same fictional shoot. Long-lens closing frame, 135mm perspective, model walks away through the architectural corridor, back silhouette and dawn rim light, restrained generic skyline, same wardrobe and location. Original synthetic editorial photography, realistic anatomy, no logos, no text, no watermark.
```

Alt: `镜头五，黎明建筑中的离场背影`

### A08 Venue

Filename:

`venue-wide.webp`

Output:

- Master: `1920 x 1080`.
- Display: `16:9`.

Prompt:

```text
Create an original empty establishing photograph of the same fictional modern civic architecture location at dawn: curved concrete walls, open exterior corridor, generic distant skyline, warm low side light, no people, no recognizable landmark, no logos, no signage, no artwork, no watermark. Realistic architectural photography, neutral restrained grade.
```

Alt:

`黎明时的虚构城市文化中心外廊`

### A09 LUT Before

Filename:

`lut-before.webp`

Generate from A05 as a neutral, ungraded display-referred version. Preserve composition and identity exactly.

Alt:

`调色前的原创概念图`

### A10 LUT After

Filename:

`lut-after.webp`

Create as an edit of A09:

```text
Preserve the photograph exactly. Apply only a restrained soft-natural color treatment: slightly warmer skin, protected highlights, lifted deep shadows, moderate contrast and subtle muted greens. Do not alter person, face, body, wardrobe, background, crop or lighting geometry.
```

Alt:

`套用柔和自然调色后的原创概念图`

## 4. Export Rules

- Keep lossless masters outside the production web folder.
- Export web assets to WebP or AVIF.
- Preserve embedded color profile or convert consistently to sRGB.
- No baked text.
- Remove unnecessary metadata.
- Record generation date, prompt ID, asset ID, and `synthetic=true` in a sidecar JSON.

Recommended sidecar:

```json
{
  "id": "A01",
  "filename": "hero-urban-dawn.webp",
  "synthetic": true,
  "source": "GPT Image original concept",
  "generatedAt": "2026-07-27",
  "licenseClass": "project-generated",
  "approved": false
}
```

## 5. Image Acceptance

Reject an image when:

- Face or wardrobe continuity breaks.
- Hands, eyes, camera posture, architecture, shadows, or reflections are visibly incorrect.
- A logo, watermark, public figure, recognizable landmark, artwork, or external image appears.
- The hero lacks a readable dark text area.
- Shot framing does not match its specified focal-length intent.
- A generated image is labelled as a real photographic reference.

