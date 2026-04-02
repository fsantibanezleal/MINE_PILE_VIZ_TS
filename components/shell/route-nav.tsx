"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/lib/app-config";

export function RouteNav() {
  const pathname = usePathname();

  return (
    <nav className="top-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("top-nav__link", isActive && "top-nav__link--active")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
