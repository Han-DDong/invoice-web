import { CircleAlert, Download, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/page-container"

interface Step {
  title: string
  description: string
}

// 견적서 조회 방법 3단계 안내 (F012)
const steps: Step[] = [
  {
    title: "1. 견적서 링크 받기",
    description: "발행자로부터 이메일이나 메신저를 통해 견적서 고유 링크를 받습니다.",
  },
  {
    title: "2. 견적서 확인",
    description: "링크를 클릭하면 견적서 내용을 웹에서 바로 확인할 수 있습니다.",
  },
  {
    title: "3. PDF 다운로드",
    description:
      "견적서 페이지에서 'PDF 다운로드' 버튼을 클릭하여 파일로 저장하거나 인쇄할 수 있습니다.",
  },
]

// 홈: 서비스 소개 전용 (견적서 목록은 노출하지 않음)
export default function Home() {
  return (
    <PageContainer className="max-w-3xl space-y-8">
      {/* 제목 영역 */}
      <section className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">견적서 조회 시스템</h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          노션 기반 견적서 관리 시스템에 오신 것을 환영합니다
        </p>
      </section>

      {/* 카드 1: 조회 방법 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" aria-hidden />
            견적서 조회 방법
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map(({ title, description }) => (
            <div key={title} className="space-y-1">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 카드 2: URL 예시 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-5 w-5" aria-hidden />
            견적서 URL 예시
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* break-all: 좁은 모바일 화면에서 긴 URL이 넘치지 않도록 줄바꿈 */}
          <code className="block break-all rounded-md bg-muted px-3 py-3 font-mono text-sm">
            https://yourdomain.com/invoice/[견적서ID]
          </code>
          <p className="text-sm text-muted-foreground">
            발행자가 보낸 링크의 [견적서ID] 부분은 각 견적서마다 고유한 값입니다.
          </p>
        </CardContent>
      </Card>

      {/* 카드 3: 문제 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleAlert className="h-5 w-5" aria-hidden />
            문제가 있나요?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            견적서를 찾을 수 없거나 문제가 발생한 경우, 견적서를 발행한 담당자에게 올바른 링크를
            다시 요청해 주세요.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
