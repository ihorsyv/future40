// Text-rules guard: no em dash (U+2014), no emoji in source text. Run manually or before build.
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const DIRS = ["site","scripts"].map((d) => path.join(root, d)).filter(fs.existsSync)
const EXT = /\.(tsx?|jsx?|css|html)$/
const EMOJI = /\p{Extended_Pictographic}/u

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === "node_modules" ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]
  )

const files = DIRS.flatMap((d) => (fs.statSync(d).isDirectory() ? walk(d) : [d])).filter((f) => EXT.test(f))
const problems = []
for (const f of files) {
  fs.readFileSync(f, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes("—")) problems.push(`${path.relative(root, f)}:${i + 1}  em dash (U+2014): use a hyphen\n    ${line.trim().slice(0, 140)}`)
      if (EMOJI.test(line)) problems.push(`${path.relative(root, f)}:${i + 1}  emoji in text\n    ${line.trim().slice(0, 140)}`)
    })
}

if (problems.length) {
  console.error(`\n✗ text check: ${problems.length} problem(s)\n`)
  console.error(problems.join("\n"))
  process.exit(1)
}
console.log("✓ text check passed")
