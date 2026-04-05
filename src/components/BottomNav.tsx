"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/home",
    label: "ホーム",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
          fill={active ? "#3a8f69" : "none"}
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/camera",
    label: "記録",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect
          x="2" y="6" width="20" height="15" rx="3"
          fill={active ? "#3a8f69" : "none"}
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
        />
        <circle
          cx="12" cy="13.5" r="3.5"
          fill={active ? "white" : "none"}
          stroke={active ? "white" : "#9e835c"}
          strokeWidth="1.8"
        />
        <path
          d="M9 6L10.5 3H13.5L15 6"
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/records",
    label: "記録一覧",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect
          x="3" y="3" width="7" height="7" rx="1.5"
          fill={active ? "#3a8f69" : "none"}
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
        />
        <rect
          x="14" y="3" width="7" height="7" rx="1.5"
          fill={active ? "#3a8f69" : "none"}
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
        />
        <rect
          x="3" y="14" width="7" height="7" rx="1.5"
          fill={active ? "#3a8f69" : "none"}
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
        />
        <rect
          x="14" y="14" width="7" height="7" rx="1.5"
          fill={active ? "#3a8f69" : "none"}
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    href: "/video",
    label: "動画",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect
          x="2" y="5" width="15" height="14" rx="2"
          fill={active ? "#3a8f69" : "none"}
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
        />
        <path
          d="M17 9L22 6V18L17 15"
          fill={active ? "#3a8f69" : "none"}
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "設定",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12" cy="12" r="3"
          fill={active ? "#3a8f69" : "none"}
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
        />
        <path
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
          stroke={active ? "#3a8f69" : "#9e835c"}
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-beige-100 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl"
            >
              {item.icon(active)}
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-accent-500" : "text-beige-500"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
