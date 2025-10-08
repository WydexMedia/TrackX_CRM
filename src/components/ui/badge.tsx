"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "muted"
}

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-input",
  success: "bg-green-100 text-green-800",
  muted: "bg-muted text-muted-foreground",
}

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => (
  <span
    className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", variants[variant], className)}
    {...props}
  />
)

export default Badge





