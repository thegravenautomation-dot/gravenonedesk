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
  icon?: React.ComponentType<any>;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "blue" | "green" | "purple" | "orange" | "red";
}

const variantStyles = {
  default: "border-border",
  success: "border-success/20 bg-success/5",
  warning: "border-warning/20 bg-warning/5", 
  danger: "border-destructive/20 bg-destructive/5",
  info: "border-info/20 bg-info/5",
  blue: "border-primary/20 bg-primary/5",
  green: "border-green-200 bg-green-50",
  purple: "border-purple-200 bg-purple-50",
  orange: "border-orange-200 bg-orange-50",
  red: "border-red-200 bg-red-50",
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
          <div className={cn("h-4 w-4", iconStyles[variant || 'default'])}>
            {React.createElement(icon, { className: 'h-4 w-4' })}
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