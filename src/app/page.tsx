import Link from "next/link";
import HomeForms from "@/components/HomeForms";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-12">
      {/* Decorative central glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* Logo mark */}
        <div className="animate-fade-in mb-2 text-dixit-gold opacity-50" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L16.5 11.5H26L18.5 17.5L21 27L14 21L7 27L9.5 17.5L2 11.5H11.5L14 2Z"
              fill="currentColor" fillOpacity="0.6" />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="animate-fade-up mb-1 font-display text-6xl font-semibold tracking-[0.2em] text-dixit-gold"
          style={{ textShadow: "0 0 40px rgba(201,168,76,0.3)" }}
        >
          TIXID
        </h1>

        {/* Ornamental subtitle */}
        <div className="animate-fade-up-d1 ornament mb-8 w-full text-xs">
          jogo de histórias e imaginação
        </div>

        {/* Form */}
        <div className="animate-fade-up-d2 w-full">
          <HomeForms />
        </div>

        {/* Footer */}
        <div className="animate-fade-up-d3 mt-12 text-center">
          <p className="font-label text-xs tracking-widest text-parchment/20 uppercase">
            2 – 6 jogadores
          </p>
          <Link
            href="/admin"
            className="mt-6 block font-label text-xs tracking-widest text-parchment/15 transition hover:text-parchment/40 uppercase"
          >
            admin
          </Link>
        </div>
      </div>
    </main>
  );
}
