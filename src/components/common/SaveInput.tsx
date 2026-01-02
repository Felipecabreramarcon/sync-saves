import { Input as HeroInput, InputProps } from "@heroui/react";
import { forwardRef } from "react";

/**
 * SaveInput - wrapper around HeroUI Input with consistent defaults
 * Uses HeroUI's default styling, only adds minimal customizations
 */
export const SaveInput = forwardRef<HTMLInputElement, InputProps>(
    ({ ...props }, ref) => {
        return (
            <HeroInput
                ref={ref}
                {...props}
            />
        );
    }
);

SaveInput.displayName = "SaveInput";
