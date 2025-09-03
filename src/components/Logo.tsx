import { cn } from "@/lib/utils";
import logoImage from "@/assets/graven-logo.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10", 
  lg: "h-12 w-12"
};

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl"
};

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative rounded-full overflow-hidden", sizeClasses[size])}>
        <img 
          src={logoImage} 
          alt="Graven Automation" 
          className="w-full h-full object-cover"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-foreground leading-tight", textSizeClasses[size])}>
            GRAVEN
          </span>
          <span className={cn("font-semibold text-primary leading-tight", size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base")}>
            AUTOMATION
          </span>
        </div>
      )}
    </div>
  );
}