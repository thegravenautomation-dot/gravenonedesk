import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon?: ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const variantStyles = {
  default: "border-border",
  success: "border-success/20 bg-success/5",
  warning: "border-warning/20 bg-warning/5", 
  danger: "border-destructive/20 bg-destructive/5",
  info: "border-info/20 bg-info/5"
};

const iconStyles = {
  default: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive", 
  info: "text-info"
};

export function DashboardCard({ 
  title, 
  value, 
  change, 
  icon, 
  className,
  variant = "default" 
}: DashboardCardProps) {
  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn("h-4 w-4", iconStyles[variant])}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {change && (
          <p className={cn(
            "text-xs flex items-center gap-1 mt-1",
            change.trend === "up" && "text-success",
            change.trend === "down" && "text-destructive",
            change.trend === "neutral" && "text-muted-foreground"
          )}>
            <span className={cn(
              "inline-block w-0 h-0 border-l-2 border-r-2 border-transparent",
              change.trend === "up" && "border-b-4 border-b-success",
              change.trend === "down" && "border-t-4 border-t-destructive"
            )} />
            {change.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}