import Link from "next/link";
import HomeForms from "@/components/HomeForms";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-12 overflow-hidden">

      {/* ── Geometric landscape background ── */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sky base */}
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#04040d" />
            <stop offset="60%" stopColor="#0b0820" />
            <stop offset="100%" stopColor="#130f2e" />
          </linearGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="horizonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7a2c44" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#7a2c44" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1440" height="900" fill="url(#sky)" />

        {/* Horizon glow */}
        <ellipse cx="720" cy="560" rx="600" ry="200" fill="url(#horizonGlow)" />

        {/* Stars */}
        {[
          [80,60,0.9],[160,40,0.5],[240,90,0.7],[340,30,0.8],[420,70,0.4],
          [510,50,0.9],[620,25,0.6],[700,80,0.5],[800,45,0.85],[900,65,0.4],
          [980,30,0.7],[1060,55,0.9],[1160,40,0.5],[1250,75,0.8],[1360,35,0.6],
          [140,130,0.4],[280,150,0.7],[450,110,0.5],[600,140,0.8],[760,120,0.4],
          [920,145,0.6],[1080,130,0.9],[1230,160,0.5],[1390,115,0.7],
          [50,200,0.3],[190,220,0.5],[1300,200,0.4],[1420,240,0.6],
        ].map(([cx, cy, op], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 1.5 : 1} fill="#f2ecd8" fillOpacity={op} />
        ))}

        {/* Shooting star */}
        <line x1="300" y1="100" x2="380" y2="130" stroke="#f2ecd8" strokeOpacity="0.25" strokeWidth="0.8" />

        {/* Moon */}
        <circle cx="1100" cy="145" r="52" fill="url(#moonGlow)" />
        <circle cx="1100" cy="145" r="38" fill="#1a1530" />
        <circle cx="1100" cy="145" r="36" fill="none" stroke="#c9a84c" strokeOpacity="0.35" strokeWidth="1.5" />
        {/* Moon crescent inner shadow */}
        <circle cx="1088" cy="140" r="28" fill="#13102a" />

        {/* Far mountains — layer 1 (palest) */}
        <polygon
          points="0,580 100,380 180,460 260,320 360,430 460,280 540,380 640,260 720,360 820,240 920,340 1020,210 1120,320 1220,260 1320,360 1440,290 1440,900 0,900"
          fill="#1e1640"
          opacity="0.9"
        />

        {/* Mid mountains — layer 2 */}
        <polygon
          points="0,640 80,480 160,550 260,400 380,510 480,370 580,470 700,340 800,460 900,360 1000,470 1120,340 1220,450 1340,380 1440,480 1440,900 0,900"
          fill="#160f35"
          opacity="0.95"
        />

        {/* Geometric facets on mid mountains — adds low-poly feel */}
        <polygon points="260,400 380,510 340,510" fill="#1d1445" opacity="0.6" />
        <polygon points="480,370 580,470 530,470" fill="#1d1445" opacity="0.6" />
        <polygon points="700,340 800,460 750,460" fill="#1d1445" opacity="0.6" />
        <polygon points="900,360 1000,470 950,470" fill="#1d1445" opacity="0.6" />
        <polygon points="1120,340 1220,450 1170,450" fill="#1d1445" opacity="0.6" />

        {/* Near mountains — layer 3 (darkest) */}
        <polygon
          points="0,720 120,580 220,650 340,530 460,640 580,510 700,620 820,500 940,600 1060,490 1180,590 1300,510 1440,600 1440,900 0,900"
          fill="#0e0b22"
        />

        {/* Near mountain facets */}
        <polygon points="120,580 220,650 170,650" fill="#130f2c" opacity="0.7" />
        <polygon points="340,530 460,640 400,640" fill="#130f2c" opacity="0.7" />
        <polygon points="580,510 700,620 640,620" fill="#130f2c" opacity="0.7" />
        <polygon points="820,500 940,600 880,600" fill="#130f2c" opacity="0.7" />
        <polygon points="1060,490 1180,590 1120,590" fill="#130f2c" opacity="0.7" />

        {/* Foreground — flat geometric ground */}
        <polygon
          points="0,820 200,780 400,800 600,770 800,790 1000,765 1200,785 1440,760 1440,900 0,900"
          fill="#080810"
        />

        {/* Tiny geometric trees silhouette */}
        {[60,130,220,310,400,1040,1120,1210,1300,1380].map((x, i) => (
          <g key={i} transform={`translate(${x}, ${770 + (i % 3) * 8})`}>
            <polygon points="0,-28 7,0 -7,0" fill="#0b0920" />
            <polygon points="0,-18 5,0 -5,0" fill="#0d0b24" />
          </g>
        ))}

        {/* Soft vignette overlay at top */}
        <rect width="1440" height="250" fill="url(#sky)" opacity="0.5" />

        {/* Bottom dark fade so form area is readable */}
        <defs>
          <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#080810" stopOpacity="0" />
            <stop offset="100%" stopColor="#080810" stopOpacity="0.92" />
          </linearGradient>
        </defs>
        <rect y="400" width="1440" height="500" fill="url(#bottomFade)" />
      </svg>

      {/* ── Content ── */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">

        {/* Logo */}
        <h1
          className="animate-fade-up mb-0 select-none"
          style={{
            fontFamily: "var(--font-vonix), var(--font-cinzel), serif",
            fontSize: "clamp(4rem, 15vw, 6.5rem)",
            color: "#c9a84c",
            textShadow: "0 0 60px rgba(201,168,76,0.45), 0 2px 0 rgba(0,0,0,0.5)",
            letterSpacing: "0.12em",
            lineHeight: 1,
          }}
        >
          Vonix
        </h1>

        {/* Subtitle */}
        <div className="animate-fade-up-d1 ornament mb-8 mt-3 w-full text-xs">
          jogo de histórias e imaginação
        </div>

        {/* Form */}
        <div className="animate-fade-up-d2 w-full">
          <HomeForms />
        </div>

        {/* Footer */}
        <div className="animate-fade-up-d3 mt-12 text-center">
          <p className="font-label text-xs tracking-widest text-parchment/20 uppercase">
            3 – 12 jogadores
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
