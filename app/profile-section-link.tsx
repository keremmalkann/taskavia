"use client";

import type { ReactNode } from "react";

type ProfileSectionLinkProps = {
  sectionId: string;
  children: ReactNode;
};

export function ProfileSectionLink({ sectionId, children }: ProfileSectionLinkProps) {
  return (
    <button
      type="button"
      onClick={() => {
        const target = document.getElementById(sectionId);
        if (!target) return;
        if (target instanceof HTMLDetailsElement) target.open = true;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {children}
    </button>
  );
}
