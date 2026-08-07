import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("border-b border-border px-4 py-4 sm:px-6", className)} {...props} />;
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("p-4 sm:p-6", className)} {...props} />;
}

export { Card, CardHeader, CardContent };
