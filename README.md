# Real photo editor — what's in this drop

Three files, drop into the matching paths in the repo (they replace what's there now, `package.json` just needs the `sharp` dependency merged in if you don't overwrite it wholesale):

- `app/editor/page.tsx`
- `app/api/photo/process/route.ts` (new)
- `package.json` (adds `"sharp"` as a dependency — run `npm install` after)

## What's real now (photo only — video tab is untouched, still the mockup)

- **Upload** — real `<input type="file">`, no more placeholder gradient.
- **Live preview** — the uploaded image is drawn into a `<canvas>`; brightness/contrast/saturation/hue/LUT adjustments apply as a CSS `filter` directly on the canvas element, so sliders stay smooth (GPU-composited, no per-frame redraw).
- **Crop** — the aspect-preset buttons (Free/1:1/4:5/16:9/9:16) compute a real crop box sized to that ratio; drag it to pan. The preview container now sizes itself to the photo's real aspect ratio so the crop overlay's percentage-based position lines up exactly with the canvas pixels underneath it.
- **Text** — there's now an actual input to type a caption (the mockup only ever showed the hardcoded string "Your caption"); size/align controls now affect something real.
- **Export** — sends the original file + a JSON description of every adjustment to `/api/photo/process`, which runs a real `sharp` pipeline (crop → brightness/saturation/hue via `modulate()` → contrast via a `linear()` transform → optional `sharpen()` → optional SVG text composite → format/quality encode) and returns the processed image. The UI then shows a real download link and the *actual* output file size (replacing the old formula-based size estimate once you've exported).

## Two correctness bugs I caught and fixed during review (not just written-and-shipped)

1. **Preview/crop-overlay misalignment**: I'd initially sized the preview container to the *target crop ratio* while showing the *full* image inside it — two different aspect ratios in the same box, which would've made the drag-to-crop box line up with the wrong region. Fixed by sizing the preview to the photo's real aspect ratio instead.
2. **Caption text size mismatch on export**: the font-size slider is a CSS px value sized for the on-screen preview (which might render at ~350px wide), but exported images can be thousands of pixels wide — sending that raw number to `sharp` would've produced an illegibly tiny caption. Fixed by scaling the font size by (export width ÷ actual displayed preview width) at export time, so the caption comes out the same proportional size you saw in the preview.

## Tested, not just written

I don't have a browser in this environment, so I couldn't click through the UI — but I ran the actual `sharp` pipeline (crop, modulate, contrast, sharpen, SVG text composite, and all four output formats) against real generated test images before wiring it to the route, including edge cases like an out-of-bounds crop rect (confirmed it clamps instead of throwing). `npx tsc --noEmit` is clean on both files (the two remaining `style jsx` warnings are pre-existing in the original repo, unrelated to this change — confirmed via `git stash` earlier in this conversation).

## Known trade-off, stated up front

Live adjustment preview uses the canvas element's CSS `filter`, not a custom WebGL shader. This is a deliberate choice (discussed and agreed before building): it's real-time and GPU-accelerated, and `sharp` is still the source of truth for the final pixels on export — WebGL would only be needed for effects CSS `filter` can't express (custom LUTs, split-toning), which nothing in the current tool set requires yet.
