import satori, { type SatoriOptions } from "satori";
import { fontData } from "astro:assets";
import { Resvg } from "@resvg/resvg-js";
import ogTemplate from "./templates/og";

function svgBufferToPngBuffer(svg: string) {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();

  return pngData.asPng();
}

async function fetchFontBuffer(
  url: string,
  origin: string,
): Promise<ArrayBuffer> {
  return fetch(new URL(url, origin)).then((res) => res.arrayBuffer());
}

export async function ogImage({
  title,
  origin,
  siteName,
}: {
  title: string;
  origin: string;
  siteName: string;
}) {
  const ibmPlexVariants = fontData["--font-ibm-plex-sans"];

  const regular = ibmPlexVariants.find(
    (v) => v.weight === "400" && v.style === "normal",
  );
  const bold = ibmPlexVariants.find(
    (v) => v.weight === "600" && v.style === "normal",
  );

  const regularTtf = regular?.src.find((s) => s.format === "truetype");
  const boldTtf = bold?.src.find((s) => s.format === "truetype");

  const [fontRegular, fontBold] = await Promise.all([
    fetchFontBuffer(regularTtf!.url, origin),
    fetchFontBuffer(boldTtf!.url, origin),
  ]);

  const options: SatoriOptions = {
    width: 1200,
    height: 630,
    embedFont: true,
    fonts: [
      {
        name: "IBM Plex Sans",
        data: fontRegular,
        weight: 400,
        style: "normal",
      },
      {
        name: "IBM Plex Sans",
        data: fontBold,
        weight: 600,
        style: "normal",
      },
    ],
  };

  const svg = await satori(ogTemplate({ title, siteName }), options);

  return svgBufferToPngBuffer(svg);
}
