export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getPathParameters(): [string | undefined, string | undefined] {
  const segments = window.location.pathname.split('/').filter(Boolean);
  switch (segments.length) {
    case 0:
      return [undefined, undefined];
    case 1:
      return [segments[0], undefined];
    default:
      return [segments[0], segments[1]];
  }
}

export async function removeLoadingScreen() {
  // NOTE: Wait 10 frames for the color theme to take effect
  for (let index = 0; index < 10; index++) {
    await new Promise(requestAnimationFrame);
  }
  document.getElementById('loadingScreen')!.remove();
}
