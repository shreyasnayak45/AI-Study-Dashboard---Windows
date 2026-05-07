import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  href: "/",           icon: LayoutDashboard },
  { label: "Tracker",    href: "/tracker",     icon: BookOpen        },
  { label: "Tasks",      href: "/tasks",       icon: CheckSquare     },
  { label: "Analytics",  href: "/analytics",   icon: BarChart3       },
  { label: "Settings",   href: "/settings",    icon: Settings        },
];
