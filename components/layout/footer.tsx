export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto max-w-screen-2xl px-4 py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} 견적서 시스템. All rights reserved.</p>
      </div>
    </footer>
  )
}
