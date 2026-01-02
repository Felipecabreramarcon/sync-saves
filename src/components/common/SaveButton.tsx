import { Button as HeroButton, ButtonProps } from "@heroui/react";

/**
 * SaveButton - wrapper around HeroUI Button with consistent defaults
 * Uses HeroUI's default styling
 */
export const SaveButton = ({
    children,
    variant = "tertiary",
    size = "md",
    ...props
}: ButtonProps) => {
    return (
        <HeroButton
            variant={variant}
            size={size}
            {...props}
        >
            {children}
        </HeroButton>
    );
};
