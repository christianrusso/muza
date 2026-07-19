"use client";

import Script from "next/script";

// Tipado global de fbq (lo inyecta el snippet de abajo en window). Se declara
// acá porque es el único lugar que carga el script; cualquier otro componente
// que llame a window.fbq (ver register/page.tsx) se beneficia de este tipo.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Meta Pixel (Facebook/Instagram Ads). Si no hay NEXT_PUBLIC_META_PIXEL_ID
// configurado (dev local, o si algún día se desactiva), no carga nada — mismo
// criterio que ya usa la inicialización de PostHog en instrumentation-client.ts.
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function MetaPixel() {
  if (!PIXEL_ID) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${PIXEL_ID}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
