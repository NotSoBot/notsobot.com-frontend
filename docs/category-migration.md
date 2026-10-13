# Command category migration (notsobot.ts)

Every change made to `../notsobot.ts` for the new command categories. Nothing was committed; the repo already had other uncommitted work, so use this list to review these edits separately.

## Shared files

- `src/constants.ts`: new `CommandCategories` enum, `CommandCategoryNames` (display names), `PIPEABLE_COMMAND_CATEGORIES`, `SLASH_COMMAND_CATEGORY_FALLBACKS`.
- `src/commands/prefixed/basecommand.ts`: optional `pipeable` on `CommandMetadata`.
- `src/commands/interactions/basecommand.ts`: optional `category` on `InteractionCommandMetadata` (and the `CommandCategories` import).
- `src/utils/parameters/index.ts`: `.pipe` uses `isPipeableCommand()` (explicit `pipeable`, else category in `PIPEABLE_COMMAND_CATEGORIES`). Verified to accept the same 242 commands as before.
- `src/utils/formatter/commands/owner.upload.commands.ts`: slash/context commands upload a category (explicit, else the prefixed command with the same id, else `SLASH_COMMAND_CATEGORY_FALLBACKS`) instead of `''`.
- `src/commands/prefixed/utils/help.ts`: shows `CommandCategoryNames[category]`.

## Command files

Only the `category: CommandCategories.X` line changed, plus `pipeable: true` (13 old TOOLS commands now in UTILITY) or `pipeable: false` (`fun/ai`, `fun/tts`) where needed to keep `.pipe` unchanged.

### EFFECTS (164)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/fun/ascii.image.ts` | IMAGE |  |
| `src/commands/prefixed/media.aiv/adhd.ts` | IMAGE |  |
| `src/commands/prefixed/media.aiv/android.ts` | IMAGE |  |
| `src/commands/prefixed/media.aiv/seesaw.ts` | IMAGE |  |
| `src/commands/prefixed/media.aiv/shuffle.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/alien.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/anime.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/bill.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/burn.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/clown.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/fat.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/latte.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/retro.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/rip.ts` | IMAGE |  |
| `src/commands/prefixed/media.i/wordcloud.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/acid.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/ascii.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/blur.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/blurple.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/caption.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/cartoon.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/charcoal.gif.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/charcoal.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/circle.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/crop.circle.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/crop.nft.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/crop.triangle.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/datamosh.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/deepfry.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/derain.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/detunnel.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/dice.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/distort.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/drawfaces.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/edgedetect.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/edges2emoji.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/edges2flesh.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/emboss.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/exo.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/explode.gif.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/explode.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.big.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.black.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.bloodshot.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.blue.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.center.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.googly.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.green.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.horror.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.illuminati.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.money.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.pink.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.red.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.small.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.spinner.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.spongebob.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.white.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/eyes.yellow.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/fisheye.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/flash.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/glitch.gif.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/glitch.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/globe.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/glow.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/gold.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/grain.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/grayscale.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/huecurvergba.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/huehsv.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/huehsvffmpeg.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/huergb.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/identity.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/ifunny.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/implode.gif.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/implode.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/inout.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/invert.rgba.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/invert.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/kek.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/kek2.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/layer.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/legofy.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/magik.gif.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/magik.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/mandalascope.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/meme.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/merge.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/mirror.bottom.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/mirror.left.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/mirror.right.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/mirror.top.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/motionblur.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/multiply.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/needsmorejpeg.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/offset.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/orb.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/outin.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.bernie.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.bob.ross.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.brazzers.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.face.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.flies.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.gaben.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.gay.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.israel.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.linus.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.northkorea.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.pistol.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.russia.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.shotgun.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.smg.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.starman.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.trans.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.uk.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.usa.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.ussr.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.wasted.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/overlay.whodidthis.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/paint.gif.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/paint.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/paper.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/phosimp.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/pixelate.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/pixelsort.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/quadart.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/rain.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/rainbow.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/raingold.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/recaption.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/recolor.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/rgbsplit.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/ripple.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/rotate3d.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/scramble.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/sepia.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/shake.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/sharpen.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/sidetoside.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/slide.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/smile.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/solarize.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/spin.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/spin3d.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/stretch.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/swapcolors.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/swappixels.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/swaprgba.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/swirl.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/trace.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/triggered.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/triggered2.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/triggered3.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/tunnel.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/uptodown.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/vaporwave.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/wall.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/watercolor.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/watermark.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/wave.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/waves.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/wiggle.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/zoom.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/zoomblur.ts` | IMAGE |  |

### SERVER (45)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/moderation/allowlist.add.channels.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/allowlist.add.roles.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/allowlist.add.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/allowlist.add.users.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/allowlist.clear.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/allowlist.remove.channels.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/allowlist.remove.roles.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/allowlist.remove.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/allowlist.remove.users.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/allowlist.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.add.channels.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.add.roles.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.add.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.add.users.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.clear.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.remove.channels.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.remove.roles.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.remove.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.remove.users.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/blocklist.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/commands.allowlist.add.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/commands.allowlist.clear.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/commands.allowlist.remove.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/commands.allowlist.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/commands.blocklist.add.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/commands.blocklist.clear.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/commands.blocklist.remove.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/commands.blocklist.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/commands.usage.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/loggers.add.bans.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/loggers.add.channels.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/loggers.add.members.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/loggers.add.messages.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/loggers.add.roles.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/loggers.add.users.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/loggers.add.voice.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/loggers.ts` | MODERATION |  |
| `src/commands/prefixed/settings/prefixes.add.ts` | SETTINGS |  |
| `src/commands/prefixed/settings/prefixes.clear.ts` | SETTINGS |  |
| `src/commands/prefixed/settings/prefixes.remove.ts` | SETTINGS |  |
| `src/commands/prefixed/settings/prefixes.replace.ts` | SETTINGS |  |
| `src/commands/prefixed/settings/prefixes.ts` | SETTINGS |  |
| `src/commands/prefixed/settings/set.ai.personality.ts` | SETTINGS |  |
| `src/commands/prefixed/settings/set.locale.ts` | SETTINGS |  |
| `src/commands/prefixed/settings/set.timezone.ts` | SETTINGS |  |

### AUDIO (26)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/fun/tts.ts` | FUN | `pipeable: false` |
| `src/commands/prefixed/media.aiv/audio.put.concat.ts` | TOOLS |  |
| `src/commands/prefixed/media.aiv/audio.put.mix.ts` | TOOLS |  |
| `src/commands/prefixed/media.aiv/audio.put.replace.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.channels.combine.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.channels.invert.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.compress.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.delay.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.destroy.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.equalizer.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.flanger.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.identify.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.pitch.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.reverb.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.reverse.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.tremolo.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/audio.vibrato.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/boost.bass.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/stammer.ts` | TOOLS |  |
| `src/commands/prefixed/media.av/volume.ts` | TOOLS |  |
| `src/commands/prefixed/voice/voice.clone.add.ts` | TOOLS |  |
| `src/commands/prefixed/voice/voice.clone.ts` | TOOLS |  |
| `src/commands/prefixed/voice/voice.delete.ts` | TOOLS |  |
| `src/commands/prefixed/voice/voice.list.ts` | TOOLS |  |
| `src/commands/prefixed/voice/voice.record.ts` | TOOLS |  |
| `src/commands/prefixed/voice/voice.rename.ts` | TOOLS |  |

### CONVERSION (26)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/media.aiv/concat.ts` | TOOLS |  |
| `src/commands/prefixed/media.aiv/convert.ts` | TOOLS |  |
| `src/commands/prefixed/media.aiv/extract.media.ts` | TOOLS |  |
| `src/commands/prefixed/media.aiv/fadein.ts` | IMAGE |  |
| `src/commands/prefixed/media.aiv/fadeout.ts` | IMAGE |  |
| `src/commands/prefixed/media.aiv/join.ts` | TOOLS |  |
| `src/commands/prefixed/media.aiv/overlay.ts` | TOOLS |  |
| `src/commands/prefixed/media.aiv/reverse.ts` | IMAGE |  |
| `src/commands/prefixed/media.aiv/snip.ts` | TOOLS |  |
| `src/commands/prefixed/media.aiv/speed.ts` | IMAGE |  |
| `src/commands/prefixed/media.av/bitrate.ts` | IMAGE |  |
| `src/commands/prefixed/media.av/extract.audio.ts` | TOOLS |  |
| `src/commands/prefixed/media.iv/crop.auto.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/crop.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/flip.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/flop.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/pipe.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/resize.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/rotate.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/setfps.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/setframecount.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/snipframes.ts` | TOOLS |  |
| `src/commands/prefixed/media.iv/togif.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/trim.ts` | IMAGE |  |
| `src/commands/prefixed/media.iv/uncaption.ts` | IMAGE |  |
| `src/commands/prefixed/tools/download.ts` | TOOLS |  |

### SEARCH (24)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/search/4chan.ts` | SEARCH |  |
| `src/commands/prefixed/search/duckduckgo.image.ts` | SEARCH |  |
| `src/commands/prefixed/search/duckduckgo.ts` | SEARCH |  |
| `src/commands/prefixed/search/e621.ts` | SEARCH |  |
| `src/commands/prefixed/search/e926.ts` | SEARCH |  |
| `src/commands/prefixed/search/giphy.ts` | SEARCH |  |
| `src/commands/prefixed/search/google.image.ts` | SEARCH |  |
| `src/commands/prefixed/search/google.image2.ts` | SEARCH |  |
| `src/commands/prefixed/search/google.reverse.ts` | SEARCH |  |
| `src/commands/prefixed/search/google.ts` | SEARCH |  |
| `src/commands/prefixed/search/image.ts` | SEARCH |  |
| `src/commands/prefixed/search/image2.ts` | SEARCH |  |
| `src/commands/prefixed/search/imgur.ts` | SEARCH |  |
| `src/commands/prefixed/search/reddit.ts` | SEARCH |  |
| `src/commands/prefixed/search/rule34.ts` | SEARCH |  |
| `src/commands/prefixed/search/rule34paheal.ts` | SEARCH |  |
| `src/commands/prefixed/search/steam.emoji.ts` | SEARCH |  |
| `src/commands/prefixed/search/steam.profile.ts` | SEARCH |  |
| `src/commands/prefixed/search/steam.ts` | SEARCH |  |
| `src/commands/prefixed/search/urban.ts` | SEARCH |  |
| `src/commands/prefixed/search/webmd.ts` | SEARCH |  |
| `src/commands/prefixed/search/wikihow.ts` | SEARCH |  |
| `src/commands/prefixed/search/wolframalpha.ts` | SEARCH |  |
| `src/commands/prefixed/search/youtube.ts` | SEARCH |  |

### UTILITY (21)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/tools/code.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/exif.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/hash.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/math.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/qr.create.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/qr.scan.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/remind.delete.server.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/remind.delete.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/remind.list.server.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/remind.list.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/remind.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/screenshot.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/tools/weather.ts` | TOOLS | `pipeable: true` |
| `src/commands/prefixed/utils/help.ts` | UTILS |  |
| `src/commands/prefixed/utils/invite.ts` | UTILS |  |
| `src/commands/prefixed/utils/memoryusage.ts` | UTILS |  |
| `src/commands/prefixed/utils/ping.ts` | UTILS |  |
| `src/commands/prefixed/utils/privacy.ts` | UTILS |  |
| `src/commands/prefixed/utils/shards.ts` | UTILS |  |
| `src/commands/prefixed/utils/undo.ts` | UTILS |  |
| `src/commands/prefixed/utils/usage.ts` | UTILS |  |

### TAGS (17)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/fun/tag.alias.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.commands.add.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.commands.me.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.commands.remove.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.commands.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.create.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.edit.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.export.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.info.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.list.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.random.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.remove.all.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.remove.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.rename.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.search.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.show.custom.command.ts` | FUN |  |
| `src/commands/prefixed/fun/tag.ts` | FUN |  |

### AI (15)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/fun/ai.ts` | FUN | `pipeable: false` |
| `src/commands/prefixed/media.iv/background.remove.ts` | IMAGE |  |
| `src/commands/prefixed/tools/edit.ts` | TOOLS |  |
| `src/commands/prefixed/tools/imagine.ts` | TOOLS |  |
| `src/commands/prefixed/tools/interrogate.ts` | TOOLS |  |
| `src/commands/prefixed/tools/labels.ts` | TOOLS |  |
| `src/commands/prefixed/tools/mashup.ts` | TOOLS |  |
| `src/commands/prefixed/tools/ocr.ts` | TOOLS |  |
| `src/commands/prefixed/tools/ocrtranslate.ts` | TOOLS |  |
| `src/commands/prefixed/tools/reimagine.ts` | TOOLS |  |
| `src/commands/prefixed/tools/safetylabels.ts` | TOOLS |  |
| `src/commands/prefixed/tools/tone.ts` | TOOLS |  |
| `src/commands/prefixed/tools/transcribe.ts` | TOOLS |  |
| `src/commands/prefixed/tools/transcribetranslate.ts` | TOOLS |  |
| `src/commands/prefixed/tools/translate.ts` | TOOLS |  |

### OWNER (13)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/owner/emojis.ts` | OWNER |  |
| `src/commands/prefixed/owner/eval.ts` | OWNER |  |
| `src/commands/prefixed/owner/owner.block.guild.ts` | OWNER |  |
| `src/commands/prefixed/owner/owner.block.user.ts` | OWNER |  |
| `src/commands/prefixed/owner/owner.guild.features.add.ts` | OWNER |  |
| `src/commands/prefixed/owner/owner.guild.features.remove.ts` | OWNER |  |
| `src/commands/prefixed/owner/owner.unblock.guild.ts` | OWNER |  |
| `src/commands/prefixed/owner/owner.unblock.user.ts` | OWNER |  |
| `src/commands/prefixed/owner/refresh.ts` | OWNER |  |
| `src/commands/prefixed/owner/say.ts` | OWNER |  |
| `src/commands/prefixed/owner/seenon.ts` | OWNER |  |
| `src/commands/prefixed/owner/shardsleft.ts` | OWNER |  |
| `src/commands/prefixed/owner/upload-commands.ts` | OWNER |  |

### INFO (11)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/info/activity.ts` | INFO |  |
| `src/commands/prefixed/info/applications.ts` | INFO |  |
| `src/commands/prefixed/info/avatar.ts` | INFO |  |
| `src/commands/prefixed/info/channel.ts` | INFO |  |
| `src/commands/prefixed/info/guild.ts` | INFO |  |
| `src/commands/prefixed/info/guildicon.ts` | INFO |  |
| `src/commands/prefixed/info/inviteinfo.ts` | INFO |  |
| `src/commands/prefixed/info/playing.ts` | INFO |  |
| `src/commands/prefixed/info/role.ts` | INFO |  |
| `src/commands/prefixed/info/user.ts` | INFO |  |
| `src/commands/prefixed/info/users.ts` | INFO |  |

### FUN (9)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/fun/aesthetics.ts` | FUN |  |
| `src/commands/prefixed/fun/ascii.text.ts` | FUN |  |
| `src/commands/prefixed/fun/b1.ts` | FUN |  |
| `src/commands/prefixed/fun/badmeme.ts` | FUN |  |
| `src/commands/prefixed/fun/emoji.ts` | FUN |  |
| `src/commands/prefixed/fun/emojify.ts` | FUN |  |
| `src/commands/prefixed/fun/regional.ts` | FUN |  |
| `src/commands/prefixed/fun/reversetext.ts` | FUN |  |
| `src/commands/prefixed/fun/textwall.ts` | FUN |  |

### MODERATION (7)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/moderation/ban.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/kick.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/nick.mass.cancel.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/nick.mass.reset.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/nick.mass.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/prune.ts` | MODERATION |  |
| `src/commands/prefixed/moderation/unban.ts` | MODERATION |  |

### PERSONAL (2)

| File | Was | Pipe override |
|---|---|---|
| `src/commands/prefixed/settings/set.my.ai.personality.ts` | SETTINGS |  |
| `src/commands/prefixed/settings/set.my.locale.ts` | SETTINGS |  |
