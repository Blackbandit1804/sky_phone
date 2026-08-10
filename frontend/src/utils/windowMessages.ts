export function isTrustedRootMessageSource(
  source: MessageEventSource | null,
  rootWindow: Window,
): boolean {
  return source === null || source === rootWindow
}
