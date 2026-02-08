import { type Page } from '@playwright/test';

/**
 * Get the editor content as a string.
 * Sorts Monaco's virtual DOM lines by position and normalizes non-breaking spaces.
 */
export async function getEditorContent(page: Page): Promise<string> {
  return page.locator('.monaco-editor').evaluate((el: Element) => {
    const lines = [...el.querySelector('.view-lines')!.querySelectorAll('.view-line')];
    lines.sort(
      (a, b) =>
        parseFloat((a as HTMLElement).style.top) - parseFloat((b as HTMLElement).style.top),
    );
    return lines
      .map((line) => (line.textContent ?? '').replace(/\u00a0/g, ' '))
      .join('\n');
  });
}
