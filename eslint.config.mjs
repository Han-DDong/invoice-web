import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16은 flat config를 직접 제공하므로 FlatCompat이 필요 없음
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 프로젝트 규칙: any 타입 사용 금지
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // 린트 제외 대상
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
