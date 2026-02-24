import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/utils";

const getThemeVariant = () => {
  const isBaznasTheme = process.env.NEXT_PUBLIC_BAZNAS_THEME === 'true';
  return isBaznasTheme
    ? "bg-green-600 text-white shadow-sm hover:bg-green-600/90"
    : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90";
};

const buttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: getThemeVariant(),
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        navbarIcon:
          "m-0 p-1 transition-all duration-300 ease-in-out hover:bg-accent hover:text-accent-foreground",
        user: "flex items-center justify-center",
        mariner: "bg-[#1871d2] text-white hover:bg-[#1871d2]/90",
        // Add a specific themed variant if you need more control
        themed: process.env.NEXT_PUBLIC_BAZNAS_THEME === 'true'
          ? "bg-green-600 text-white shadow-sm hover:bg-green-600/90"
          : "bg-blue-600 text-white shadow-sm hover:bg-blue-600/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "size-9 rounded-full text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };