import { containerWidthClass } from "@/lib/site"
import { cn } from "@/lib/utils"

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className={cn(containerWidthClass, "py-6 text-center text-sm text-muted-foreground")}>
        <p>© {new Date().getFullYear()} 견적서 시스템. All rights reserved.</p>
      </div>
    </footer>
  )
}
