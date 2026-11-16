import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PdfDownloadButtonProps {
  /** 견적서 공유 토큰 (노션 페이지 ID) */
  token: string
  className?: string
}

// PDF 다운로드 버튼: PDF 라우트로 이동하는 링크 (응답의 Content-Disposition: attachment로 다운로드)
// download 속성은 쓰지 않습니다. 실패(404/410/500) 시 오류 문구를 화면에 보여주기 위해서입니다.
export function PdfDownloadButton({
  token,
  className,
}: PdfDownloadButtonProps) {
  return (
    <Button asChild className={cn('w-full sm:w-auto', className)}>
      <a href={`/invoice/${encodeURIComponent(token)}/pdf`}>
        <Download aria-hidden />
        PDF 다운로드
      </a>
    </Button>
  )
}
