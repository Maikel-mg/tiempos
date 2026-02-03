import { cn } from "@/lib/utils";

export function Alert({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-background text-foreground",
    destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
    success: "border-green-500/50 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300 [&>svg]:text-green-600",
    warning: "border-yellow-500/50 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300 [&>svg]:text-yellow-600"
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }) {
  return (
    <h5
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }) {
  return (
    <div
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}
