import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { marked } from 'marked'

const markdown = readFileSync('README.md', 'utf8')
const repoContext = 'Wheemer/simple-thermostat'

function renderMarkdown() {
  try {
    return execFileSync('gh', ['api', '/markdown', '--input', '-'], {
      input: JSON.stringify({
        text: markdown,
        mode: 'gfm',
        context: repoContext,
      }),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
  } catch (_err) {
    return marked.parse(markdown)
  }
}

const rendered = renderMarkdown()

const style = `body { margin: 0; background: #0d1117; color-scheme: dark; }
      .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 1012px; margin: 0 auto; padding: 32px; }
      .markdown-body img { max-width: 100%; }
      @media (max-width: 767px) { .markdown-body { padding: 24px; } }`

const page = (body) => `<!doctype html>
<html lang="en" data-color-mode="auto" data-light-theme="light" data-dark-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Simple Thermostat README Preview</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown.min.css" />
    <style>
      ${style}
    </style>
  </head>
  <body>
    <main class="markdown-body">
${body}
    </main>
  </body>
</html>
`

writeFileSync('README.preview.rendered.html', page(rendered))
writeFileSync('README.rendered.html', page(rendered))
