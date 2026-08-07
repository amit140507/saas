import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
    {
        variants: {
            variant: {
                default: "bg-primary-soft text-primary",
                neutral: "bg-muted text-muted-foreground",
                success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
                warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
                destructive: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
