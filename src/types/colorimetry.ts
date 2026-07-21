export type ColorimetrySwatch = {
  name: string;
  hex: string;
};

export type ColorimetryAccessory = {
  icon: string;
  title: string;
  advice: string;
};

export type ColorimetryOutfitGroup = {
  id: string;
  label: string;
  items: string[];
};

export type Colorimetry = {
  /** Nombre de la temporada, ej. "Otoño Oscuro". */
  season: string;
  /** Los tres rasgos que definen la temporada, en píldoras sobre el hero. */
  traits: { label: string; dot: string }[];
  /** Las tres métricas de la tarjeta que pisa el hero. */
  subtone: string;
  contrast: string;
  depth: string;
  /** Colores destacados, en scroll horizontal, con el HEX visible. */
  bestColors: ColorimetrySwatch[];
  /** La paleta entera, en grilla. */
  palette: ColorimetrySwatch[];
  outfitGroups: ColorimetryOutfitGroup[];
  accessories: ColorimetryAccessory[];
  looks: string[];
  /** Paths en storage de las imágenes de cada look (paralelo a `looks`). Se
   *  generan on-demand (el usuario elige 2); "" en los que no se generaron. */
  lookImages?: string[];
  /** Path de la imagen (flat-lay) de cada grupo de outfit, por id de grupo. Se
   *  generan lazy: "Básicos" al abrir, el resto al tocar el tab. */
  outfitImages?: Record<string, string>;
  avoid: string[];
  combine: string[];
};
