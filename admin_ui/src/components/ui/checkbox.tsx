import * as React from "react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input
            ref={ref}
            type="checkbox"
            className={cn(
                "h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
