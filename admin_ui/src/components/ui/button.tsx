import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                outline: "border border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
                ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                destructive: "bg-destructive text-white shadow-sm hover:bg-destructive/90",
            },
            size: {
                sm: "h-8 px-3",
                md: "h-10 px-4",
                lg: "h-11 px-5",
                icon: "h-9 w-9 p-0",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => (
        <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
