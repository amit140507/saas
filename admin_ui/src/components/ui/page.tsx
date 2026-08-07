import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function PageShell({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("mx-auto flex w-full max-w-7xl flex-col gap-6", className)} {...props} />;
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
}

function PageHeader({ title, description, icon: Icon, actions, className, ...props }: PageHeaderProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between",
                className,
            )}
            {...props}
        >
            <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {Icon && <Icon className="h-7 w-7 text-primary" aria-hidden="true" />}
                    {title}
                </h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
        </div>
    );
}

function EmptyState({
    icon: Icon,
    title,
    description,
    className,
}: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
            {Icon && <Icon className="mb-4 h-12 w-12 text-muted-foreground/60" aria-hidden="true" />}
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
    );
}

function LoadingState({ label = "Loading..." }: { label?: string }) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">{label}</div>;
}

export { EmptyState, LoadingState, PageHeader, PageShell };
