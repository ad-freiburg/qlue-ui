/**
 * Global toast notification system.
 *
 * Dispatch a `toast` CustomEvent on `document` to show a notification:
 * ```ts
 * document.dispatchEvent(new CustomEvent('toast', {
 *   detail: { type: 'success', message: 'Copied!', duration: 2000 },
 * }));
 * ```
 * Toasts with a `duration` auto-dismiss; without one they show a close button.
 */
type ToastType = 'info' | 'warning' | 'error' | 'success';

interface ToastDetail {
  type: ToastType;
  message: string;
  duration?: number;
}

const icons: Record<ToastType, string> = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 p-0.5 text-green-600 bg-green-600/10 dark:text-green-400 dark:bg-green-600/10 rounded"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg"  width="18" height="18" viewBox="0 0 24 24" class="size-6 p-0.5 text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/10 rounded"><path fill="currentColor" d="M12 10.585l4.95-4.95 1.415 1.414L13.415 12l4.95 4.95-1.415 1.414L12 13.415l-4.95 4.95-1.415-1.414L10.585 12l-4.95-4.95L7.05 5.636z"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 p-0.5 text-yellow-600 bg-yellow-500/10 dark:text-yellow-300 dark:bg-yellow-500/10 rounded"> <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
</svg>
`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 p-0.5 text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/10 rounded"> <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
`,
};

// NOTE: `showModal()` promotes a dialog to the browser's top layer, which no
// z-index can beat. Making the container a popover puts it in the top layer as
// well, and re-showing it on every toast lifts it above any open dialog.
const toastContainer = document.createElement('div');
toastContainer.popover = 'manual';
toastContainer.className =
  // NOTE: `overflow-visible` undoes the UA popover `overflow: auto`, which
  // otherwise clips the toasts' -translate-y-2 entry animation.
  'fixed top-20 right-5 bottom-auto left-auto w-auto h-auto max-w-none max-h-none m-0 p-0 border-0 overflow-visible bg-transparent flex flex-col pointer-events-none';
document.body.appendChild(toastContainer);

/** Re-promotes the container so it paints above dialogs opened after it. */
function raiseToastContainer() {
  if (toastContainer.matches(':popover-open')) toastContainer.hidePopover();
  toastContainer.showPopover();
}

document.addEventListener('toast', (e: Event) => {
  const { type, message, duration = undefined } = (e as CustomEvent<ToastDetail>).detail;
  createToast(type, message, duration);
});

function createToast(type: ToastType, message: string, duration: number | undefined) {
  const toast = document.createElement('div');

  const colors: Record<ToastType, { border: string; text: string }> = {
    success: {
      border: 'border-green-500 dark:border-green-400',
      text: 'text-black dark:text-white',
    },
    error: {
      border: 'border-red-500 dark:border-red-700',
      text: 'text-black dark:text-white',
    },
    warning: {
      border: 'border-yellow-400 dark:border-yellow-300',
      text: 'text-black dark:text-white',
    },
    info: {
      border: 'border-blue-500 dark:border-blue-400',
      text: 'text-black dark:text-white',
    },
  };

  toast.className = `
    flex items-top gap-3 min-w-[220px] px-4 py-3 mb-3 rounded-lg
    bg-white dark:bg-gray-800 ${colors[type].border} border-l-3
    shadow-lg ${colors[type].text} transition-all duration-200 transform -translate-y-2 opacity-0
    pointer-events-auto overflow-hidden
  `;

  const iconWrapper = document.createElement('div');
  iconWrapper.innerHTML = icons[type];

  const text = document.createElement('span');
  text.innerHTML = message;

  toast.appendChild(iconWrapper);
  toast.appendChild(text);

  if (!duration) {
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className =
      'ml-auto h-4 text-gray-500 dark:text-white hover:text-gray-200 cursor-pointer hover:text-red-400';
    closeBtn.onclick = () => dismissToast(toast);
    toast.appendChild(closeBtn);
  }

  toastContainer.appendChild(toast);
  raiseToastContainer();

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  if (duration) {
    setTimeout(() => dismissToast(toast), duration);
  }
}

/**
 * Fades the toast out, then collapses its box to zero so the toasts below
 * slide up. Removing the element outright would reflow instantly instead.
 */
function dismissToast(toast: HTMLElement) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-0.5rem)';
  setTimeout(() => {
    // NOTE: an explicit start height is needed — `auto` does not transition.
    toast.style.height = `${toast.offsetHeight}px`;
    requestAnimationFrame(() => {
      toast.style.height = '0px';
      toast.style.marginBottom = '0px';
      toast.style.paddingTop = '0px';
      toast.style.paddingBottom = '0px';
    });
    setTimeout(() => toast.remove(), 200);
  }, 200);
}
