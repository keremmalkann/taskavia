"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = Omit<ComponentProps<"button">, "children" | "disabled" | "type"> & {
  children: ReactNode;
  pendingLabel: string;
  iconOnly?: boolean;
};

export function PendingSubmitButton({
  children,
  pendingLabel,
  iconOnly = false,
  className = "",
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      className={`pending-submit-button ${className}`.trim()}
      type="submit"
      disabled={pending}
      aria-busy={pending}
      data-pending={pending ? "true" : "false"}
    >
      {pending ? (
        <>
          <span className="pending-submit-spinner" aria-hidden="true" />
          <span className={iconOnly ? "sr-only" : undefined}>{pendingLabel}</span>
        </>
      ) : children}
    </button>
  );
}
