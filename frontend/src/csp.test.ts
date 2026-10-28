import { build, type Rolldown } from 'vite'
import { describe, expect, it } from 'vitest'
import { CONTENT_SECURITY_POLICY, contentSecurityPolicy } from './csp.ts'

const directives = () =>
  new Map(
    CONTENT_SECURITY_POLICY.split(';').map((directive) => {
      const [name = '', ...values] = directive.trim().split(/\s+/)
      return [name, values.join(' ')]
    }),
  )

// The same build as `npm run build`, run from frontend/ like the tests, and kept in memory instead of written to dist/
async function builtIndexHtml(): Promise<string> {
  const result = await build({ logLevel: 'silent', build: { write: false } })
  const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[]
  const page = outputs.flatMap((output) => output.output).find((file) => file.fileName === 'index.html')
  if (page?.type !== 'asset') throw new Error('Fant ikke index.html i bygget')
  return String(page.source)
}

describe('Content-Security-Policy', () => {
  it('stenger alt som standard, også workere, og tillater bare skript, stil, bilder og fonter fra egen adresse', () => {
    expect(Object.fromEntries(directives())).toEqual({
      'default-src': "'none'",
      'script-src': "'self'",
      'style-src': "'self'",
      'img-src': "'self'",
      'font-src': "'self'",
      'base-uri': "'none'",
      'form-action': "'none'",
      'object-src': "'none'",
      'worker-src': "'none'",
    })
  })

  it('tillater verken inline-kode, eval, data:-adresser eller andre nettsteder', () => {
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/unsafe-inline|unsafe-eval|data:|https?:|\*/)
  })

  it('legges bare inn ved bygg, siden utviklingsserveren trenger inline-skript', () => {
    expect(contentSecurityPolicy().apply).toBe('build')
  })

  it('står i den bygde index.html, før skriptene', async () => {
    const html = await builtIndexHtml()
    const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)
    // Vite writes ' as &#39; in the attribute, which the browser reads back as '
    expect(meta?.[1]?.replaceAll('&#39;', "'")).toBe(CONTENT_SECURITY_POLICY)
    expect(meta?.index).toBeLessThan(html.indexOf('<script'))
  }, 30_000)
})
