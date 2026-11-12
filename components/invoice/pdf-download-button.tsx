"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PdfDownloadButtonProps {
  className?: string
}

// PDF 다운로드 버튼 (UI만 구현)
export function PdfDownloadButton({ className }: PdfDownloadButtonProps) {
  return (
    <Button
      type="button"
      className={cn("w-full sm:w-auto", className)}
      onClick={() => {
        // TODO(F003): app/invoice/[token]/pdf 라우트로 PDF 다운로드 연결
      }}
    >
      <Download aria-hidden />
      PDF 다운로드
    </Button>
  )
}
