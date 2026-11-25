import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    CRM_EXECUTIVE_EXPORT: "1",
    NEXT_PUBLIC_API_URL: "/crm-api",
    NEXT_PUBLIC_IRES_CRM_ORIGIN: "https://crm.iresglobal.com",
  },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
