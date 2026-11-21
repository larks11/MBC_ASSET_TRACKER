import { useState } from "react";
import { Building2, Settings, ShieldCheck, TrendingUp } from "lucide-react";

const BG_IMAGE = "/login-bg.png";
const LOGO_SRC = "/images2.jpg";

const FEATURES = [
  { icon: ShieldCheck, label: "Secure Access" },
  { icon: TrendingUp, label: "Track Assets Efficiently" },
  { icon: Settings, label: "Optimize Operations" },
];

// Logo sa sulod sa login card (JPG nga puti ang background, naa sa puti nga card)
function CardLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="block text-4xl font-extrabold leading-none text-[#00A651]">
        MAC
        <span className="mt-1 block text-xs font-semibold tracking-widest text-[#003B25]">BUILDERS CORP.</span>
      </span>
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="MAC Builders Corp."
      draggable={false}
      onError={() => setFailed(true)}
      className="mx-auto h-auto w-40 select-none object-contain sm:w-48"
    />
  );
}

// Parehas nga layout sa Login ug Register (split-screen)
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* ============ LEFT: building background (55%) ============ */}
        <section
          className="relative flex shrink-0 flex-col justify-center overflow-hidden px-6 py-8 text-white sm:px-10 lg:w-[55%] lg:px-12 lg:py-12 xl:px-16"
          style={{
            backgroundImage: `url('${BG_IMAGE}')`,
            backgroundSize: "cover",
            backgroundPosition: "62% center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "#003B25",
          }}
        >
          {/* Overlays: dark forest-green tint + gradient para klaro ang text */}
          <div className="absolute inset-0 bg-[#003B25]/45" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#003B25]/90 via-[#003B25]/50 to-transparent"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#003B25]/80 via-transparent to-[#003B25]/30"
            aria-hidden="true"
          />

          <div className="relative z-10 text-center lg:text-left">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-5xl xl:text-6xl">
              MAC Builders Corp.
            </h2>
            <p className="mt-1 text-sm text-white/85 sm:text-base lg:mt-3 lg:text-2xl">
              ICT Asset Monitoring System
            </p>
            <div className="mx-auto mt-3 hidden h-1 w-24 rounded-full bg-[#00A651] lg:mx-0 lg:block" />
            <p className="mt-4 hidden text-lg italic text-white/90 lg:block">
              “Monitor • Manage • Maintain”
            </p>
          </div>

          {/* Feature highlights (desktop) */}
          <ul className="relative z-10 mt-12 hidden max-w-xl items-start lg:flex">
            {FEATURES.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                className={`flex flex-1 flex-col items-center gap-3 px-3 text-center ${
                  i > 0 ? "border-l border-white/25" : ""
                }`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#00A651] bg-[#003B25]/50 text-[#00A651] backdrop-blur-sm">
                  <Icon size={26} strokeWidth={1.8} />
                </span>
                <span className="text-sm font-semibold leading-tight">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ============ RIGHT: login card (45%) ============ */}
        <section className="relative flex flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top_right,#DDF8E9,transparent_60%)] px-4 py-8 sm:px-8 lg:w-[45%] lg:flex-none lg:py-12">
          <div className="w-full max-w-md animate-fade-in rounded-3xl bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,59,37,0.25)] ring-1 ring-[#00A651]/15 sm:p-8">
            <div className="text-center">
              <CardLogo />
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#003B25] sm:text-3xl">{title}</h1>
              <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
              <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-[#00A651]" />
            </div>

            <div className="mt-6">{children}</div>

            {footer && (
              <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">{footer}</div>
            )}
          </div>
        </section>
      </div>

      {/* ============ FOOTER ============ */}
      <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-[#00A651]/30 bg-[#003B25] px-4 py-3 text-xs text-white sm:text-sm">
        <Building2 size={18} className="text-[#00A651]" />
        <span className="font-semibold">MAC Builders Corp.</span>
        <span className="h-4 w-px bg-white/30" aria-hidden="true" />
        <span className="text-white/80">ICT Asset Monitoring System</span>
      </footer>
    </div>
  );
}