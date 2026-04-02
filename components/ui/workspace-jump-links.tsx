"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getWorkspaceJumpTargets } from "@/lib/workspace-jumps";
import type { ObjectType } from "@/types/app-data";

interface WorkspaceJumpLinksProps {
  objectId?: string;
  objectType?: ObjectType;
  isProfiled?: boolean;
}

export function WorkspaceJumpLinks({
  objectId,
  objectType,
  isProfiled = false,
}: WorkspaceJumpLinksProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!objectId || !objectType) {
    return null;
  }

  const targets = getWorkspaceJumpTargets({
    pathname,
    objectId,
    objectType,
    isProfiled,
    searchParams,
  });

  if (targets.length === 0) {
    return null;
  }

  return (
    <div className="workspace-jumps">
      <div className="section-label">Related Views</div>
      <div className="workspace-jumps__links">
        {targets.map((target) => (
          <Link key={target.route} href={target.href} className="link-chip">
            {target.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
