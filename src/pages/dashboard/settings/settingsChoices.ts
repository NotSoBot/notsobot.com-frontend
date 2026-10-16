// Fixed choices for user/server settings, mirroring the enums in notsobot.ts `src/constants.ts`
// (and notsobot.api's validators, which accept the same values).

import type { Choice } from './botChoices';


export { LLM_MODEL_CHOICES, LOCALE_CHOICES, TIMEZONE_CHOICES, TTS_VOICE_CHOICES, type Choice } from './botChoices';


// `MLDiffusionModelsToText`
export const DIFFUSION_MODEL_CHOICES: ReadonlyArray<Choice> = [
  {value: 'FLUX_KLEIN', label: 'Flux Klein (Realistic)'},
];

// `DownloadQualities` (the API takes the values)
export const DOWNLOAD_QUALITY_CHOICES: ReadonlyArray<Choice> = ['1440p', '1080p', '720p', '480p', '360p', '240p', '144p'].map((value) => ({value, label: value}));

// `MeasurementUnits`
export const UNITS_CHOICES: ReadonlyArray<Choice> = [
  {value: 'METRIC', label: 'Metric (°C, km, kg)'},
  {value: 'IMPERIAL', label: 'Imperial (°F, mi, lb)'},
];

// `UserSettingsResponseDisplayTypes` / `GuildSettingsResponseDisplayTypes`
export const RESPONSE_DISPLAY_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, label: 'Default (embeds)'},
  {value: 1, label: 'No embeds'},
  {value: 2, label: 'Legacy'},
];

// `UserSettingsApplicationCommandResponseTypes`
export const APPLICATION_COMMAND_RESPONSE_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, label: 'Automatic'},
  {value: 1, label: 'Always ephemeral (only you see it)'},
];

// `UserSettingsFallbacksMediaImageTypes`
export const FALLBACK_IMAGE_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, label: 'Search Google Images'},
  {value: 1, label: 'Generate an image (imagine)'},
  {value: 2, label: 'Search DuckDuckGo Images'},
];

// `UserSettingsUploadThresholdTypes`
export const UPLOAD_THRESHOLD_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, label: 'When over Discord’s size limit'},
  {value: 1, label: 'Always'},
  {value: 2, label: 'Never'},
];

// `UserSettingsUploadTypes`
export const UPLOAD_TYPE_CHOICES: ReadonlyArray<Choice<number>> = [
  {value: 0, label: 'Automatic'},
  {value: 1, label: 'Temporary'},
];

export const PERSONALITY_MAX = 1024;
