import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(fileURLToPath(import.meta.url))
const displayData = await readFile(join(root, "assets/BarlowCondensed-ExtraBold.ttf"))
const bodyData = await readFile(join(root, "assets/Cabin.ttf"))

const BG = "#0c0a09"
const ACCENT = "#1863dc"
const TITLE = "FUTURE 40"
const SUB = "STATION F cohorts"
const DESC = "A source-led research catalogue of STATION F Future 40 companies, 2019-2026"

const svg = await satori(
  {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 110px",
        background: BG,
        fontFamily: "Cabin",
      },
      children: [
        {
          type: "div",
          props: {
            style: { fontSize: 28, fontWeight: 600, color: "#9a9a9a", letterSpacing: 1, textTransform: "uppercase" },
            children: "future40.netlify.app",
          },
        },
        {
          type: "div",
          props: {
            style: {
              marginTop: 20,
              display: "flex",
              alignItems: "baseline",
              gap: 24,
              fontFamily: "Barlow Condensed",
              textTransform: "uppercase",
            },
            children: [
              { type: "div", props: { style: { fontSize: 150, fontWeight: 800, color: "#ffffff", lineHeight: 0.85 }, children: TITLE } },
              { type: "div", props: { style: { fontSize: 44, fontWeight: 600, color: ACCENT }, children: SUB } },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { marginTop: 36, fontSize: 32, fontWeight: 400, color: "#d0d0d0", lineHeight: 1.4, maxWidth: 950 },
            children: DESC,
          },
        },
      ],
    },
  },
  {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Cabin", data: bodyData, weight: 400, style: "normal" },
      { name: "Barlow Condensed", data: displayData, weight: 800, style: "normal" },
    ],
  }
)

const png = new Resvg(svg).render().asPng()
await writeFile(join(root, "../site/og-image.png"), png)
console.log(`wrote site/og-image.png (${png.length} bytes)`)
