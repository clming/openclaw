export function commandPaletteShortcutLabel(
  nav: Pick<Navigator, "userAgent"> | undefined = globalThis.navigator,
): string {
  const fingerprint = `${nav?.userAgent ?? ""}`.toLowerCase();
  return fingerprint.includes("mac") || fingerprint.includes("iphone") || fingerprint.includes("ipad")
    ? "⌘K"
    : "Ctrl+K";
}
