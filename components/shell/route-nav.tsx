"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/lib/app-config";
import { buildHrefWithQuery } from "@/lib/workspace-route-state";

export function RouteNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="top-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={buildHrefWithQuery(item.href, searchParams, {})}
            className={clsx("top-nav__link", isActive && "top-nav__link--active")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
