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
  avoid: string[];
  combine: string[];
};
