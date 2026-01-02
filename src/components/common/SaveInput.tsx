import { Input as HeroInput, InputProps } from "@heroui/react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface SaveInputProps extends InputProps {
    glass?: boolean;
}

export const SaveInput = forwardRef<HTMLInputElement, SaveInputProps>(
    ({ className, classNames, glass = false, variant = "flat", radius = "lg", ...props }, ref) => {
        return (
            <HeroInput
                ref={ref}
                variant={variant}
                radius={radius}
                classNames={{
                    ...classNames,
                    inputWrapper: cn(
                        "flex items-center",
                        glass && "bg-bg-elevated/30 backdrop-blur-md border border-white/5 hover:border-white/10 group-data-[focus=true]:border-primary-500/50",
                        !glass && "bg-bg-elevated border-white/5",
                        "transition-all duration-200",
                        classNames?.inputWrapper
                    ),
                    input: cn("text-white placeholder:text-gray-500 h-full", classNames?.input),
                    label: cn("text-gray-400 group-data-[filled-within=true]:text-gray-300", classNames?.label),
                }}
                className={className}
                {...props}
            />
        );
    }
);

SaveInput.displayName = "SaveInput";
