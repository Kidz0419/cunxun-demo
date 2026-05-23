import type { NpcVisualAsset, Village } from "../types.js";

export type VisualAssetPreset = "books" | "dye" | "table" | "wood" | "studio" | "archive" | "trail";

type VisualAssetInput = {
  preset?: VisualAssetPreset;
  spaceName: string;
  spaceType: string;
  village: Village;
};

const visualAssetCaption = "AI 生成示意图，非真实照片" as const;

const presetPalettes: Record<
  VisualAssetPreset,
  {
    base: string;
    dark: string;
    mid: string;
    light: string;
    accent: string;
  }
> = {
  books: {
    base: "#6e5f49",
    dark: "#2f3b32",
    mid: "#a98b62",
    light: "#efe5c8",
    accent: "#7f3d35"
  },
  dye: {
    base: "#315b4a",
    dark: "#17352f",
    mid: "#5d7d6c",
    light: "#d8e2c7",
    accent: "#1e7080"
  },
  table: {
    base: "#8c5f3d",
    dark: "#3f3328",
    mid: "#c4975c",
    light: "#f0dbad",
    accent: "#7d3f2d"
  },
  wood: {
    base: "#6a5642",
    dark: "#2f3328",
    mid: "#b18457",
    light: "#e5d0a7",
    accent: "#31596b"
  },
  studio: {
    base: "#56664c",
    dark: "#29352c",
    mid: "#9b9f75",
    light: "#e4dfc4",
    accent: "#a94f3e"
  },
  archive: {
    base: "#527282",
    dark: "#22323c",
    mid: "#8aa3ad",
    light: "#e0e3d6",
    accent: "#b58a47"
  },
  trail: {
    base: "#6f6b78",
    dark: "#2d2b35",
    mid: "#a39c8c",
    light: "#e7d9b6",
    accent: "#c98856"
  }
};

export const getVisualAssetPresetForSpace = (spaceType: string): VisualAssetPreset => {
  const value = spaceType.toLowerCase();

  if (/书|阅读|放映|咖啡/.test(value)) return "books";
  if (/染|手作|色|布/.test(value)) return "dye";
  if (/民宿|饭|食|住|餐/.test(value)) return "table";
  if (/木|旧物|修复|工坊/.test(value)) return "wood";
  if (/驻留|展|档|手稿|策展/.test(value)) return "archive";
  if (/采风|山路|拍摄|柿|徒步|影像/.test(value)) return "trail";
  return "studio";
};

const motifMarkup: Record<VisualAssetPreset, string> = {
  books: `
    <rect x="28" y="112" width="168" height="18" rx="4" fill="var(--mid)" opacity=".78"/>
    <rect x="42" y="48" width="22" height="62" rx="3" fill="var(--accent)" opacity=".86"/>
    <rect x="70" y="42" width="18" height="68" rx="3" fill="var(--light)" opacity=".9"/>
    <rect x="94" y="56" width="28" height="54" rx="3" fill="var(--base)" opacity=".9"/>
    <rect x="130" y="44" width="20" height="66" rx="3" fill="var(--dark)" opacity=".82"/>
    <rect x="156" y="60" width="26" height="50" rx="3" fill="var(--accent)" opacity=".64"/>
  `,
  dye: `
    <path d="M38 104 C58 76, 84 82, 104 54 S154 32, 178 58" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" opacity=".68"/>
    <circle cx="62" cy="70" r="24" fill="var(--light)" opacity=".72"/>
    <circle cx="116" cy="76" r="32" fill="var(--mid)" opacity=".62"/>
    <rect x="44" y="112" width="132" height="16" rx="8" fill="var(--dark)" opacity=".72"/>
    <path d="M54 40 C76 54, 80 88, 64 116" fill="none" stroke="var(--base)" stroke-width="5" stroke-linecap="round" opacity=".55"/>
  `,
  table: `
    <ellipse cx="112" cy="90" rx="76" ry="32" fill="var(--light)" opacity=".84"/>
    <ellipse cx="112" cy="88" rx="48" ry="18" fill="var(--mid)" opacity=".74"/>
    <circle cx="90" cy="83" r="8" fill="var(--accent)" opacity=".78"/>
    <circle cx="126" cy="93" r="10" fill="var(--base)" opacity=".78"/>
    <path d="M46 122 C72 112, 142 112, 178 124" fill="none" stroke="var(--dark)" stroke-width="8" stroke-linecap="round" opacity=".54"/>
    <rect x="54" y="42" width="116" height="20" rx="10" fill="var(--dark)" opacity=".34"/>
  `,
  wood: `
    <rect x="44" y="54" width="132" height="58" rx="8" fill="var(--mid)" opacity=".76"/>
    <path d="M54 70 C84 60, 104 84, 132 70 S166 72, 174 86" fill="none" stroke="var(--dark)" stroke-width="5" stroke-linecap="round" opacity=".48"/>
    <rect x="64" y="102" width="96" height="18" rx="4" fill="var(--dark)" opacity=".72"/>
    <circle cx="82" cy="84" r="9" fill="var(--accent)" opacity=".72"/>
    <circle cx="146" cy="82" r="12" fill="var(--light)" opacity=".52"/>
  `,
  studio: `
    <rect x="38" y="46" width="148" height="78" rx="12" fill="var(--light)" opacity=".78"/>
    <rect x="52" y="60" width="54" height="48" rx="8" fill="var(--base)" opacity=".72"/>
    <rect x="118" y="58" width="48" height="18" rx="9" fill="var(--accent)" opacity=".72"/>
    <path d="M118 96 C136 78, 154 92, 174 80" fill="none" stroke="var(--dark)" stroke-width="7" stroke-linecap="round" opacity=".48"/>
    <circle cx="151" cy="105" r="14" fill="var(--mid)" opacity=".68"/>
  `,
  archive: `
    <rect x="34" y="56" width="68" height="68" rx="4" fill="var(--light)" opacity=".82"/>
    <rect x="40" y="62" width="56" height="3" fill="var(--dark)" opacity=".4"/>
    <rect x="40" y="72" width="40" height="3" fill="var(--dark)" opacity=".34"/>
    <rect x="40" y="82" width="48" height="3" fill="var(--dark)" opacity=".34"/>
    <rect x="40" y="92" width="32" height="3" fill="var(--dark)" opacity=".3"/>
    <rect x="110" y="40" width="80" height="86" rx="6" fill="var(--mid)" opacity=".68"/>
    <rect x="120" y="50" width="60" height="40" rx="2" fill="var(--light)" opacity=".82"/>
    <circle cx="150" cy="70" r="10" fill="var(--accent)" opacity=".74"/>
    <rect x="120" y="98" width="60" height="6" rx="2" fill="var(--dark)" opacity=".48"/>
    <rect x="120" y="108" width="44" height="6" rx="2" fill="var(--dark)" opacity=".4"/>
  `,
  trail: `
    <path d="M-4 132 C28 118, 58 96, 86 102 S130 122, 160 96 S210 78, 234 82" fill="none" stroke="var(--dark)" stroke-width="4" stroke-linecap="round" opacity=".48"/>
    <path d="M-4 116 C40 96, 78 78, 120 74 S178 64, 230 56" fill="none" stroke="var(--mid)" stroke-width="3" stroke-linecap="round" opacity=".36"/>
    <circle cx="62" cy="58" r="6" fill="var(--accent)" opacity=".72"/>
    <circle cx="76" cy="64" r="5" fill="var(--accent)" opacity=".62"/>
    <circle cx="92" cy="56" r="7" fill="var(--accent)" opacity=".74"/>
    <path d="M50 72 L52 96" stroke="var(--dark)" stroke-width="3" stroke-linecap="round" opacity=".62"/>
    <path d="M82 78 L84 100" stroke="var(--dark)" stroke-width="3" stroke-linecap="round" opacity=".62"/>
    <path d="M154 32 L172 64 L138 64 Z" fill="var(--dark)" opacity=".5"/>
    <path d="M178 44 L196 76 L162 76 Z" fill="var(--dark)" opacity=".42"/>
  `
};

const createSvgDataUri = (input: VisualAssetInput, preset: VisualAssetPreset) => {
  const palette = presetPalettes[preset];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 150" role="img">
      <defs>
        <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${palette.light}"/>
          <stop offset=".58" stop-color="${palette.base}"/>
          <stop offset="1" stop-color="${palette.dark}"/>
        </linearGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 .16"/>
          </feComponentTransfer>
        </filter>
        <style>
          :root {
            --base: ${palette.base};
            --dark: ${palette.dark};
            --mid: ${palette.mid};
            --light: ${palette.light};
            --accent: ${palette.accent};
          }
        </style>
      </defs>
      <rect width="224" height="150" fill="url(#sky)"/>
      <path d="M-20 112 C36 78, 72 128, 126 86 S202 78, 246 118 L246 170 L-20 170 Z" fill="${palette.light}" opacity=".33"/>
      <path d="M-16 126 C44 104, 86 138, 148 104 S206 100, 246 132" fill="none" stroke="${palette.dark}" stroke-width="2" opacity=".18"/>
      ${motifMarkup[preset]}
      <rect width="224" height="150" filter="url(#grain)" opacity=".7"/>
      <rect x="12" y="12" width="200" height="126" rx="18" fill="none" stroke="#fff9ea" stroke-opacity=".28"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const createGeneratedPlaceholderVisualAsset = (input: VisualAssetInput): NpcVisualAsset => {
  const preset = input.preset ?? getVisualAssetPresetForSpace(input.spaceType);

  return {
    kind: "generated_placeholder",
    src: createSvgDataUri(input, preset),
    alt: `${input.village}${input.spaceName}的AI生成示意空间图`,
    caption: visualAssetCaption
  };
};
