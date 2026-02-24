"use client";

import { fontHeading, fontInter, fontUrbanist } from "@/config/fonts";
import { memo } from "react";

const FontLoader = memo(() => {
  const fontStyles = `
    :root {
      --font-inter: ${fontInter.variable};
      --font-urbanist: ${fontUrbanist.variable};
      --font-heading: ${fontHeading.variable};
    }
  `;

  return (
    <style type="text/css" data-font-styles>
      {fontStyles}
    </style>
  );
});

FontLoader.displayName = "FontLoader";

export { FontLoader };
