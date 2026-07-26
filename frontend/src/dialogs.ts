/**
 * Thin wrapper around the native `<dialog>` element.
 *
 * Using `showModal()` gives us Escape-to-close, focus trapping, focus restore
 * and `inert` on the rest of the page for free. Backdrop clicks are not covered
 * by the platform, so `setupDialog` wires them up: a click that does not land
 * inside the `[data-dialog-content]` panel closes the dialog.
 */

function get(id: string): HTMLDialogElement {
  return document.getElementById(id)! as HTMLDialogElement;
}

export function openDialog(id: string) {
  const dialog = get(id);
  if (!dialog.open) dialog.showModal();
}

export function closeDialog(id: string) {
  const dialog = get(id);
  if (dialog.open) dialog.close();
}

/**
 * Enables backdrop-click dismissal and, optionally, runs `onClose` whenever the
 * dialog closes — including via Escape, which bypasses our `close*` functions.
 */
export function setupDialog(id: string, onClose?: () => void) {
  const dialog = get(id);
  dialog.addEventListener('click', (event) => {
    if (!(event.target as Element).closest('[data-dialog-content]')) dialog.close();
  });
  if (onClose) dialog.addEventListener('close', onClose);
}
