"use client";

import { Toast } from "@/lib/ui";
import { dismiss, useToasts } from "@/lib/state/toast.ts";

export function ToastsViewport() {
  const toasts = useToasts();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto ui-toast-in">
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="block cursor-pointer text-left"
          >
            <Toast variant={toast.variant} title={toast.title} description={toast.description} />
          </button>
        </div>
      ))}
    </div>
  );
}
