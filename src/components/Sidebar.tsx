import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Truck, 
  UserCheck,
  BarChart3,
  Settings,
  ChevronDown,
  Building2,
  FileText,
  Target,
  Phone,
  Mail,
  Package,
  User
} from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    role: ["admin", "manager"]
  },
  {
    title: "Sales Management",
    icon: Target,
    role: ["admin", "manager", "executive"],
    subItems: [
      { title: "Lead Management", href: "/leads", icon: Users },
      { title: "Quotations", href: "/quotations", icon: FileText },
      { title: "Communications", href: "/communications", icon: Mail },
      { title: "Analytics", href: "/sales-analytics", icon: BarChart3 }
    ]
  },
  {
    title: "Accounts",
    icon: DollarSign,
    role: ["admin", "accountant", "manager"],
    subItems: [
      { title: "Invoicing", href: "/invoicing", icon: FileText },
      { title: "Payments", href: "/payments", icon: DollarSign },
      { title: "Reports", href: "/accounts-reports", icon: BarChart3 }
    ]
  },
  {
    title: "Procurement",
    icon: ShoppingCart,
    role: ["admin", "procurement", "manager"],
    subItems: [
      { title: "Vendors", href: "/vendors", icon: Building2 },
      { title: "Purchase Orders", href: "/purchase-orders", icon: Package },
      { title: "Inventory", href: "/inventory", icon: ShoppingCart }
    ]
  },
  {
    title: "Dispatch",
    href: "/dispatch",
    icon: Truck,
    role: ["admin", "dispatch", "manager"]
  },
  {
    title: "HR Management",
    icon: UserCheck,
    role: ["admin", "hr", "manager"],
    subItems: [
      { title: "Employees", href: "/employees", icon: Users },
      { title: "Attendance", href: "/attendance", icon: UserCheck },
      { title: "Payroll", href: "/payroll", icon: DollarSign },
      { title: "Leave Management", href: "/leaves", icon: FileText }
    ]
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
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    role: ["admin"]
  }
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const [openSections, setOpenSections] = useState<string[]>(["Sales Management"]);
  const currentUserRole = "admin"; // This would come from auth context

  const toggleSection = (title: string) => {
    setOpenSections(prev => 
      prev.includes(title) 
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  const hasAccess = (roles: string[]) => {
    return roles.includes(currentUserRole);
  };

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const isSectionActive = (subItems?: Array<{href: string}>) => {
    if (!subItems) return false;
    return subItems.some(item => location.pathname === item.href);
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

            if (item.subItems) {
              const isOpen = openSections.includes(item.title);
              const hasActiveChild = isSectionActive(item.subItems);

              return (
                <Collapsible
                  key={item.title}
                  open={isOpen}
                  onOpenChange={() => toggleSection(item.title)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between px-3 py-2 text-left font-medium",
                        (isOpen || hasActiveChild) && "bg-muted text-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1 pl-6">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.href}
                        to={subItem.href}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-brand"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )
                        }
                      >
                        <subItem.icon className="h-4 w-4" />
                        <span>{subItem.title}</span>
                      </NavLink>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <NavLink
                key={item.href}
                to={item.href!}
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
            <span className="text-sm font-semibold text-white">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Admin User</p>
            <p className="text-xs text-muted-foreground truncate">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}