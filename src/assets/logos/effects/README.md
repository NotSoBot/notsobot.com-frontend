# Logo effects

The navbar logo swaps to one of these while the home link is hovered (`HomeLink` in `components/layout/Navbar.tsx`).
They're shown in a shuffled order so each one comes up once before any repeat, then the list reshuffles. Builds
rename them to `assets/effect.<hash>.webp` (see `vite.config.ts`) so the filenames don't give away the command names.

Each file is `NotSoLogo.svg` (rendered at 256px) run through a `media.iv.manipulation.*` route of notsobot.api, with
the bot's preset arguments for that command, then shrunk to 96px webp. Animated results are animated webp. Overlays
(`media.iv.manipulation.overlay.*`) were left out on purpose.

Only effects that keep the logo's transparent background are here, plus vaporwave, paper and quadart, which were
kept on purpose. Generated 2026-10-16.

## Not included

### Couldn't run

| Effect | Why |
|---|---|
| ascii | needs libaa (`python-aalib`), which has no macOS build |
| edges2emoji, edges2flesh | pix2pix, skipped on request |
| smile | runs a remote diffusion model (FLUX Klein) |
| phosimp | calls the separate phosimp service |
| to.gif | the local libvips had no gif writer (no cgif), and a gif of a still image looks the same anyway |

### Ran, but the result loses the transparency

| Effect | Why |
|---|---|
| charcoal, charcoal.animated, mandalascope, trace | background filled in (opaque or near-opaque) |
| caption, recaption, labels.analysis, labels.excuse, labels.ifunny, labels.kirby, labels.perfection, labels.triggered.2, labels.triggered.3, shake.triggered | add an opaque caption bar or panel |

### Ran, but nothing visibly changes on the logo

| Effect | Why |
|---|---|
| eyes, eyes.* (17 variants), draw.faces | no eyes or faces detected on the logo |
| hue.shift.hsv, hue.shift.hsv.ffmpeg, swap.colors, swap.rgba | the logo is grayscale, so there's no hue to shift or channels to tell apart |
| hue.curve.rgba | does nothing without curve arguments |
| background.remove | the background is already transparent |
| crop, crop.auto, crop.circle, crop.nft | nothing to crop at the defaults |
| datamosh, set.fps, set.frame.count, snip.frames, trim | only affect videos and animations |
| uncaption | there's no caption to remove |
| resize | just makes it 2x bigger |
| invert.rgba | came out identical to invert |

Effects that needed arguments to show anything were run with: distort `method=ARC`, hue.shift.rgb `red=120`,
offset `x=64 y=64`, stretch `width=1.6`, rotate.3d `tilt=40 pan=30`, pixel.sort `lower=0 upper=1 length=80`,
meme `top=NotSo bottom=Bot`.
