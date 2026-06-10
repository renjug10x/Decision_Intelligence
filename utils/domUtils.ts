/**
 * Focus an element by id after paint (avoids SSR / hydration issues).
 */
export function safeFocusElement(elementId: string): void {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => {
    const el = document.getElementById(elementId);
    if (el && 'focus' in el) {
      (el as HTMLElement).focus();
    }
  });
}
