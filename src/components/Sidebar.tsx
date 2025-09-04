import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  DollarSign, 
  ShoppingCart, 
  Truck, 
  UserCheck,
  BarChart3,
  Target,
  User
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    role: ["admin", "manager"]
  },
  {
    title: "Sales",
    href: "/sales",
    icon: Target,
    role: ["admin", "manager", "executive"]
  },
  {
    title: "Accounts",
    href: "/accounts", 
    icon: DollarSign,
    role: ["admin", "accountant", "manager"]
  },
  {
    title: "Procurement",
    href: "/procurement",
    icon: ShoppingCart,
    role: ["admin", "procurement", "manager"]
  },
  {
    title: "Dispatch",
    href: "/dispatch",
    icon: Truck,
    role: ["admin", "dispatch", "manager"]
  },
  {
    title: "HR",
    href: "/hr",
    icon: UserCheck,
    role: ["admin", "hr", "manager"]
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    role: ["admin", "manager"]
  },
  {
    title: "Employee Portal",
    href: "/employee",
    icon: User,
    role: ["admin", "manager", "executive", "accountant", "hr", "procurement", "dispatch"]
  }
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { profile, user } = useAuth();
  const currentUserRole = (profile?.role as string) || (user?.user_metadata?.role as string) || "executive";

  const hasAccess = (roles: string[]) => {
    return roles.includes(currentUserRole);
  };

  return (
    <div className={cn("flex h-full w-64 flex-col bg-card border-r border-border", className)}>
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            if (!hasAccess(item.role)) return null;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-brand"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
            <span className="text-sm font-semibold text-white">
              {profile?.full_name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate capitalize">
              {profile?.role || "User"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}