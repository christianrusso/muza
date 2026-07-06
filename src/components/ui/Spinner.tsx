// Spinner chico para estados de carga inline (ej. botón OAuth). Reusa el
// keyframe `muzaspin` de globals.css y toma el color del texto del botón
// (currentColor), así queda bien tanto en el botón claro como en el outline.
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: "inline-block",
        borderRadius: "50%",
        border: `${Math.max(2, Math.round(size / 9))}px solid currentColor`,
        borderTopColor: "transparent",
        animation: "muzaspin 1s linear infinite",
      }}
    />
  );
}
