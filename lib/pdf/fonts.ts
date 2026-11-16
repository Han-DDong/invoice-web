import 'server-only'

import path from 'node:path'

import { Font } from '@react-pdf/renderer'

// PDF 한글 폰트 등록 (서버 전용, F003)
// 기본 폰트는 한글이 깨지므로 저장소에 포함된 Noto Sans KR(OFL)을 등록합니다.

/** PDF 문서에서 사용하는 폰트 패밀리 이름 */
export const PDF_FONT_FAMILY = 'NotoSansKR'

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts')

let registered = false

/** 한글 폰트를 한 번만 등록합니다. (중복 호출 안전) */
export function registerPdfFonts(): void {
  if (registered) {
    return
  }

  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: path.join(FONT_DIR, 'NotoSansKR-Regular.otf'), fontWeight: 400 },
      { src: path.join(FONT_DIR, 'NotoSansKR-Bold.otf'), fontWeight: 700 },
    ],
  })

  // 한글 단어 중간에서 줄바꿈되도록 하이픈 처리를 끕니다.
  Font.registerHyphenationCallback(word => [word])

  registered = true
}
