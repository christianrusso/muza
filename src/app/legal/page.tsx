import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export const metadata = {
  title: "Legales — Muza",
  description: "Política de privacidad y términos de uso de Muza.",
};

// Página pública (ver middleware): accesible con o sin sesión, para poder
// enlazarla desde el perfil y como URL pública (stores / footer).
export default function LegalPage() {
  return (
    <div className="mx-auto w-full max-w-[560px] px-[22px] pb-16">
      <div className="flex items-center gap-2 py-5">
        <Link
          href="/profile"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-line"
        >
          <MaterialIcon name="chevron_left" size={22} />
        </Link>
        <span className="font-serif italic" style={{ fontSize: 28 }}>
          Legales
        </span>
      </div>

      {/* ==================== PRIVACIDAD ==================== */}
      <h2 className="font-serif mt-2 text-[22px]">Política de Privacidad</h2>
      <p className="mt-1 text-[12px] font-semibold text-muted">
        Última actualización: 6 de julio de 2026
      </p>

      <Section title="Qué datos recolectamos">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li><b>Tu cuenta:</b> email, nombre y (si entrás con Google) foto de perfil.</li>
          <li><b>Tus fotos de outfits:</b> las imágenes que subís para analizar.</li>
          <li><b>Datos de uso:</b> tus análisis, puntajes, publicaciones, likes y comentarios.</li>
        </ul>
      </Section>

      <Section title="Cómo usamos tus fotos y la IA">
        <p>
          Para generar el puntaje, tu foto se envía a un proveedor de inteligencia artificial de
          terceros (<b>OpenAI</b>) que la analiza y devuelve la evaluación. La foto se procesa con
          ese único fin. Según la política de la API de OpenAI, las imágenes enviadas por la API
          <b> no se usan para entrenar sus modelos</b>. No usamos tus fotos para publicidad ni las
          vendemos a terceros.
        </p>
      </Section>

      <Section title="Conservación y borrado">
        <p>
          Guardamos tus datos mientras tengas la cuenta activa. Podés <b>borrar tu cuenta</b> en
          cualquier momento desde <b>Perfil → Configuración</b>, lo que elimina tus datos y fotos
          asociadas. También podés eliminar análisis o publicaciones individuales.
        </p>
      </Section>

      <Section title="Tus derechos">
        <p>
          Podés acceder, corregir o borrar tus datos personales. Para ejercer estos derechos o ante
          cualquier consulta, escribinos a{" "}
          <a href="mailto:crusso@clamaco.com.ar" className="font-bold text-coral underline">
            crusso@clamaco.com.ar
          </a>
          .
        </p>
      </Section>

      <Section title="Menores de edad">
        <p>
          Muza es para <b>mayores de 18 años</b>. No está dirigido a menores de edad; si sos menor,
          no uses la app.
        </p>
      </Section>

      {/* ==================== TÉRMINOS ==================== */}
      <h2 className="font-serif mt-10 text-[22px]">Términos de Uso</h2>

      <Section title="El puntaje es orientativo">
        <p>
          El score y las recomendaciones de Muza son una <b>opinión generada por IA</b> con fines
          orientativos y de entretenimiento. No constituyen asesoramiento profesional de imagen ni
          garantizan ningún resultado.
        </p>
      </Section>

      <Section title="Uso responsable">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Subí solo fotos <b>tuyas</b> o de personas que te dieron su permiso.</li>
          <li>No subas contenido ilegal, ofensivo, ni imágenes de terceros sin consentimiento.</li>
          <li>No abuses del servicio ni intentes vulnerar su funcionamiento.</li>
        </ul>
        <p className="mt-2">
          Podemos suspender cuentas que incumplan estas reglas.
        </p>
      </Section>

      <Section title="Contenido y comunidad">
        <p>
          Sos responsable de lo que publicás. Al publicar en la comunidad, otros usuarios pueden ver
          esa foto y su puntaje. Podés despublicar tu contenido cuando quieras.
        </p>
      </Section>

      <Section title="Disponibilidad y cambios">
        <p>
          El servicio se ofrece “tal cual”, sin garantías de disponibilidad continua. Podemos
          actualizar estos términos; te avisaremos de cambios relevantes.
        </p>
      </Section>

      <Section title="Contacto">
        <p>
          Muza es operado por <b>Christian Russo</b>. Consultas:{" "}
          <a href="mailto:crusso@clamaco.com.ar" className="font-bold text-coral underline">
            crusso@clamaco.com.ar
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-[15px] font-extrabold">{title}</h3>
      <div className="mt-1.5 text-[14px] leading-relaxed text-ink/80">{children}</div>
    </section>
  );
}
