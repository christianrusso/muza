import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
      <span className="font-serif leading-none text-coral" style={{ fontSize: 64 }}>
        404
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="font-serif text-[22px]">Página no encontrada</span>
        <span className="text-[13.5px] font-semibold text-muted">
          Esta página no existe o se movió.
        </span>
      </div>
      <Link href="/home" className="btn btn-primary" style={{ maxWidth: 300, width: "100%" }}>
        Volver al inicio
      </Link>
    </div>
  );
}
