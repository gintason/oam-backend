import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// [oam-seo] Google / Bing verification tags, added to index.html only when the
// env var is set at build time (Render: Environment -> add the variable, redeploy).
function seoVerification(env: Record<string, string>): Plugin {
  const tags = [
    ['google-site-verification', env.VITE_GOOGLE_SITE_VERIFICATION],
    ['msvalidate.01', env.VITE_BING_SITE_VERIFICATION],
    ['yandex-verification', env.VITE_YANDEX_VERIFICATION],
  ].filter(([, v]) => v) as [string, string][]
  return {
    name: 'oam-seo-verification',
    transformIndexHtml(html) {
      const meta = tags
        .map(([name, v]) => `<meta name="${name}" content="${v.replace(/[^\w\-.=+/]/g, '')}" />`)
        .join('\n    ')
      return html.replace('<!-- seo:verification -->', meta)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), seoVerification(env)],
  }
})
