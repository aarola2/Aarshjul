import type { Plugin } from 'vite'

// Everything the app loads comes from its own address. Nothing inline and nothing evaluated, so a script that
// gets onto the page some other way cannot run. Inline styles set through the DOM, as React does, are allowed.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'none'",
  "img-src 'self'",
  "font-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  // Does not fall back to default-src but to script-src, which would allow workers from all of aarola2.github.io
  "worker-src 'none'",
].join('; ')

// GitHub Pages cannot send headers, so the policy is a meta tag, first in <head> so it covers every script
// after it. Only in the build: the dev server needs inline scripts for React Refresh.
export function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  }
}
