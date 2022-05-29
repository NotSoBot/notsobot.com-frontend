export const Device = Object.freeze({
  get isDesktop(): boolean {
    return 992 < window.innerWidth;
  },
  get isMobile(): boolean {
    return window.innerWidth <= 992;
  },
});
