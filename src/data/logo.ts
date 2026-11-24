const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

/** Transparent gothic mark (SowinSky.studio), split so each piece can layout independently. */
export const logoParts = [
  {
    id: "sowinsky",
    src: asset("logo-sowinsky.png"),
    src2x: asset("logo-sowinsky@2x.png"),
    width: 646,
    height: 242,
    label: "SowinSky",
  },
  {
    id: "dot",
    src: asset("logo-dot.png"),
    src2x: asset("logo-dot@2x.png"),
    width: 10,
    height: 242,
    label: ".",
  },
  {
    id: "studio",
    src: asset("logo-studio.png"),
    src2x: asset("logo-studio@2x.png"),
    width: 317,
    height: 242,
    label: "studio",
  },
] as const;

export const logoNative = {
  width: logoParts.reduce((sum, part) => sum + part.width, 0),
  height: logoParts[0].height,
} as const;

export const logoMark = logoParts[0];
