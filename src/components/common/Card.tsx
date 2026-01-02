import { HTMLAttributes, forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
    glass?: boolean;
    hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, children, glass = false, hover = true, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={hover ? { opacity: 0, y: 20 } : undefined}
                animate={hover ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.3 }}
                whileHover={hover ? { y: -5, transition: { duration: 0.2 } } : undefined}
                className={cn(
                    "relative overflow-hidden rounded-2xl border",
                    glass
                        ? "bg-bg-elevated/40 backdrop-blur-xl border-white/5"
                        : "bg-bg-elevated border-white/5",
                    hover && "hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/10",
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

Card.displayName = "Card";

export const CardHeader = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("p-6 pb-3", className)} {...props}>
        {children}
    </div>
);

export const CardContent = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("p-6 pt-0", className)} {...props}>
        {children}
    </div>
);

export const CardFooter = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex items-center p-6 pt-0 opacity-80", className)} {...props}>
        {children}
    </div>
);
