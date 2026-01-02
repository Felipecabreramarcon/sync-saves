import { Button as HeroButton, ButtonProps, cn } from "@heroui/react";

interface SaveButtonProps extends ButtonProps {
    variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";
    color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
}

export const SaveButton = ({
    children,
    className,
    variant = "solid",
    color = "primary",
    radius = "lg",
    ...props
}: SaveButtonProps) => {
    return (
        <HeroButton
            className={cn(
                "font-medium transition-transform active:scale-95",
                "flex items-center justify-center gap-2",
                className
            )}
            variant={variant}
            color={color}
            radius={radius}
            {...props}
        >
            {children}
        </HeroButton>
    );
};
