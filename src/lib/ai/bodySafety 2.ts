// Red de seguridad de la promesa central de LookLab: evaluamos la ropa, nunca el
// cuerpo. El prompt lo prohíbe explícitamente, pero en producción se detectaron
// fugas reales ("resaltando una silueta limpia", "adecuadas para el tipo de
// cuerpo"), así que no alcanza con pedírselo al modelo: lo filtramos antes de
// mostrarlo. Si el prompt se toca o el modelo cambia, esto sigue protegiendo.
//
// El filtro apunta SOLO a referencias a la persona. Los adjetivos que describen
// prendas son legítimos y no deben caer: "botas robustas", "cinturón delgado" y
// "calzado robusto" son exactamente lo que la app tiene que decir.

const BODY_PATTERNS: RegExp[] = [
  // "silueta" es la fuga más común y no tiene uso legítimo hablando de prendas
  // (para eso están "largo", "volumen", "caída").
  /\bsiluet[ao]s?\b/i,
  // Referencias directas a la persona.
  /\btipo de cuerpo\b/i,
  /\b(tu|su|el|del|al) cuerpo\b/i,
  /\bcontextura\b/i,
  /\bcomplexi[óo]n\b/i,
  /\b(tu|su) figura\b/i,
  /\bfigura (corporal|de la persona)\b/i,
  // Verbos que solo tienen sentido aplicados a la persona. Ojo con la ortografía:
  // el verbo cambia la z por c antes de e (estiliza → estilice), así que hay que
  // cubrir las dos raíces. Se deja afuera "estilizado/a", que es un adjetivo
  // legítimo de una prenda ("un abrigo estilizado").
  /\bestili(z|c)(a|an|ar|e|en|ando)\b/i,
  /\b(favorece|favorecen|favorecer)\s+(tu|su|la)\s+(figura|cuerpo|silueta)/i,
  /\bresalta[n]?\s+(tu|su)\b/i,
  // Descriptores del físico.
  /\b(delgadez|sobrepeso|contextura f[íi]sica)\b/i,
  /\bf[íi]sic[oa]\s+de\s+(la|el)\s+(persona|usuari)/i,
];

/** ¿Este texto se refiere a la persona en vez de a la ropa? */
export function mentionsBody(text: string | null | undefined): boolean {
  if (!text) return false;
  return BODY_PATTERNS.some((re) => re.test(text));
}

/**
 * Saca del resultado del modelo cualquier texto que hable de la persona:
 * las justificaciones se anulan (la UI ya contempla justification null) y los
 * ítems de las listas se descartan. Los puntajes no se tocan — solo el texto.
 *
 * Devuelve también cuántos textos se filtraron, para poder alertarlo en el log
 * sin romper el análisis del usuario.
 */
export function stripBodyMentions<
  T extends {
    categories: { justification: string | null }[];
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  },
>(result: T): { result: T; removed: number } {
  let removed = 0;

  const categories = result.categories.map((c) => {
    if (mentionsBody(c.justification)) {
      removed++;
      return { ...c, justification: null };
    }
    return c;
  });

  const clean = (list: string[]) =>
    list.filter((t) => {
      if (mentionsBody(t)) {
        removed++;
        return false;
      }
      return true;
    });

  return {
    result: {
      ...result,
      categories,
      strengths: clean(result.strengths),
      improvements: clean(result.improvements),
      recommendations: clean(result.recommendations),
    },
    removed,
  };
}
