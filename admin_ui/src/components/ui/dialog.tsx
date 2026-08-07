import * as React from "react";

import { cn } from "@/lib/utils";

function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", className)}
            {...props}
        />
    );
}

function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "max-h-[90vh] w-full overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-2xl",
                className,
            )}
            {...props}
        />
    );
}

export { DialogOverlay, DialogContent };
