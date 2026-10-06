// app/api/design/export/route.ts (sketch)
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";

const fontPath = path.join(process.cwd(), "public/fonts/SpaceGrotesk-Regular.ttf");
const fontBuffer = await readFile(fontPath);

const resvg = new Resvg(svgString, {
  font: {
    fontBuffers: [fontBuffer],
    loadSystemFonts: false,
    defaultFontFamily: "Space Grotesk",
  },
  fitTo: { mode: "width", value: 2480 }, // A4 @ 300 DPI
});
const png = resvg.render().asPng();

const pdf = await PDFDocument.create();
const img = await pdf.embedPng(png);
const page = pdf.addPage([img.width * 0.24, img.height * 0.24]); // pt = px * 0.75 / 3.125
page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
const bytes = await pdf.save();
