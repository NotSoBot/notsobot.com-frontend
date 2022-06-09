declare global {
  interface Window {
    plausible: {
      (event: string, props?: PlausibleProps): void,
      q: Array<any>,
    },
  }
}

export interface PlausibleProps {
  callback?: () => any,
  props?: Record<string, any>,
}


window.plausible = window.plausible || function() {
  (window.plausible.q = window.plausible.q || []).push(arguments);
}
