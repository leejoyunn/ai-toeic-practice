import vinext from "vinext";
import { defineConfig } from "vite";
import path from "node:path";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const rscDependencyExcludes = [
  "lucide-react",
  // Vinext rewrites the Lucide barrel to deep ESM imports. Icon.mjs is the
  // actual `use client` boundary reported by @vitejs/plugin-rsc.
  "lucide-react/dist/esm/Icon.mjs",
  path.resolve("node_modules/lucide-react/dist/esm/Icon.mjs").replaceAll("\\", "/"),
];

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    // RSC and SSR have independent module graphs in Vinext. Client component
    // dependencies must not be inconsistently pre-bundled in either graph.
    environments: {
      rsc: {
        optimizeDeps: {
          exclude: rscDependencyExcludes,
        },
      },
      ssr: {
        optimizeDeps: {
          exclude: rscDependencyExcludes,
        },
      },
      client: {
        // @vitejs/plugin-rsc builds its client-reference metadata from the
        // client optimizer. Excluding the actual Lucide boundary here is what
        // prevents the RSC/client optimization mismatch warning.
        optimizeDeps: {
          exclude: rscDependencyExcludes,
        },
      },
    },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
