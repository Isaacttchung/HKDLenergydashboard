/** Clear leftover native-dialog / inert locks that block clicks after uploads. */
export function releaseStaleModalLocks(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll("dialog[open]").forEach((node) => {
    if (!(node instanceof HTMLDialogElement)) return;
    try {
      node.close();
    } catch {
      // ignore
    }
  });
  document.body.removeAttribute("inert");
  document.body.style.removeProperty("pointer-events");
}
