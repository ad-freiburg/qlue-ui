type ToastType = "info" | "warning" | "error" | "success";

interface ToastDetail {
  type: ToastType;
  message: string;
  duration?: number;
}

const icons: Record<ToastType, string> = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 text-green-600"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
  error: `<svg width="18" height="18" viewBox="0 0 24 24" class="size-6 text-red-400"><path fill="currentColor" d="M12 10.585l4.95-4.95 1.415 1.414L13.415 12l4.95 4.95-1.415 1.414L12 13.415l-4.95 4.95-1.415-1.414L10.585 12l-4.95-4.95L7.05 5.636z"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 text-yellow-600"> <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
</svg>
`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 text-blue-600"> <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
`
};

const toastContainer = document.createElement("div");
toastContainer.className = "fixed top-20 right-5 flex flex-col gap-3 z-[9999]";
document.body.appendChild(toastContainer);

window.addEventListener("toast", (e: Event) => {
  const { type, message, duration = 3000 } = (e as CustomEvent<ToastDetail>).detail;
  createToast(type, message, duration);
});

function createToast(type: ToastType, message: string, duration: number = 1000) {
  const toast = document.createElement("div");

  const colors: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: {
      bg: "bg-green-500/30 dark:bg-green-700/30",
      border: "border-green-500/50 dark:border-green-700/50",
      text: "text-white"
    },
    error: {
      bg: "bg-red-500/30 dark:bg-red-700/30",
      border: "border-red-500/50 dark:border-red-700/50",
      text: "text-white"
    },
    warning: {
      bg: "bg-yellow-400/30 dark:bg-yellow-600/30",
      border: "border-yellow-400/50 dark:border-yellow-600/50",
      text: "text-white"
    },
    info: {
      bg: "bg-blue-500/30 dark:bg-blue-700/30",
      border: "border-blue-500/50 dark:border-blue-700/50",
      text: "text-white"
    }
  };

  toast.className = `
    flex items-center gap-3 min-w-[220px] px-4 py-3 rounded-xl
    backdrop-blur-md ${colors[type].bg} ${colors[type].border} border
    shadow-lg ${colors[type].text} transition-all transform -translate-y-2 opacity-0
  `;

  const iconWrapper = document.createElement("div");
  iconWrapper.innerHTML = icons[type];
  Object.assign(iconWrapper.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  const text = document.createElement("span");
  text.textContent = message;

  toast.appendChild(iconWrapper);
  toast.appendChild(text);

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
