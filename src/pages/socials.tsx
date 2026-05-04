import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Twitter, Youtube, MessageCircle, Globe,
  Users, ExternalLink, ArrowLeft,
} from "lucide-react";

const BASE = "https://gmyplyxwxmkvptimzgid.supabase.co/storage/v1/object/public/Assets/Game%20assets";

// ── Fill these in when you have real data ────────────────────────────────────
const SOCIAL_LINKS = [
  {
    id:       "twitter",
    platform: "X / Twitter",
    handle:   "@EarnityGG",
    desc:     "Announcements, alpha leaks, and guild wars coverage.",
    url:      "https://x.com/EarnityGG",
    icon:     Twitter,
    color:    "text-sky-400",
    border:   "border-sky-500/30",
    bg:       "bg-sky-500/8",
    glow:     "rgba(56,189,248,0.15)",
    followers: "—",
  },
  {
    id:       "discord",
    platform: "Discord",
    handle:   "Earnity Community",
    desc:     "Strategy channels, guild recruitment, and live drops.",
    url:      "https://discord.gg/earnity",
    icon:     MessageCircle,
    color:    "text-indigo-400",
    border:   "border-indigo-500/30",
    bg:       "bg-indigo-500/8",
    glow:     "rgba(99,102,241,0.15)",
    followers: "—",
  },
  {
    id:       "youtube",
    platform: "YouTube",
    handle:   "Earnity",
    desc:     "Gameplay guides, event recaps, and protocol deep dives.",
    url:      "https://youtube.com/@earnity",
    icon:     Youtube,
    color:    "text-red-400",
    border:   "border-red-500/30",
    bg:       "bg-red-500/8",
    glow:     "rgba(248,113,113,0.15)",
    followers: "—",
  },
  {
    id:       "website",
    platform: "Website",
    handle:   "earnity.gg",
    desc:     "Official site — whitepaper, roadmap, and team.",
    url:      "https://earnity.gg",
    icon:     Globe,
    color:    "text-emerald-400",
    border:   "border-emerald-500/30",
    bg:       "bg-emerald-500/8",
    glow:     "rgba(52,211,153,0.15)",
    followers: "—",
  },
];

// ── Team / Partners section placeholder ─────────────────────────────────────
const TEAM: { name: string; role: string; twitter?: string }[] = [
  // { name: "Satoshi", role: "Founder", twitter: "@handle" },
  // Add real team members here
];

// ── Announcements feed placeholder ──────────────────────────────────────────
const ANNOUNCEMENTS: { date: string; title: string; body: string }[] = [
  // { date: "2026-05-01", title: "Guild submissions now open", body: "..." },
  // Fill with real announcements
];

export default function Socials() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.08)_0%,_transparent_60%)] pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8 bg-black/70 backdrop-blur-xl">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <img src={BASE + "/Seal2.png"} className="w-6 h-6 object-contain" alt="" />
          <span className="font-bold tracking-tight">EARNITY</span>
        </button>
        <span className="text-sm text-white/30 font-medium uppercase tracking-widest">Socials</span>
        <div className="w-24" /> {/* spacer */}
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-5 py-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-5">
            <img src={BASE + "/Seal2.png"} alt="Earnity" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Community & Socials</h1>
          <p className="mt-3 text-white/45 text-sm max-w-xs mx-auto leading-relaxed">
            Follow the protocol across every front. Stay ahead of guild wars, drops, and announcements.
          </p>
        </motion.div>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-3 mb-12"
        >
          {SOCIAL_LINKS.map((s, i) => (
            <motion.a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07, type: "spring", damping: 22 }}
              whileHover={{ x: 4 }}
              className={`flex items-center gap-4 p-4 rounded-2xl border ${s.border} ${s.bg} group transition-all`}
              style={{ boxShadow: `0 0 0 0 ${s.glow}` }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 24px ${s.glow}`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div className={`w-11 h-11 rounded-xl border ${s.border} bg-black/40 flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">{s.platform}</span>
                  <span className={`text-xs ${s.color}`}>{s.handle}</span>
                </div>
                <p className="text-xs text-white/40 mt-0.5 truncate">{s.desc}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.followers !== "—" && (
                  <div className="flex items-center gap-1 text-[11px] text-white/30">
                    <Users className="w-3 h-3" />
                    {s.followers}
                  </div>
                )}
                <ExternalLink className={`w-4 h-4 text-white/20 group-hover:${s.color} transition-colors`} />
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Announcements section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Latest Updates</h2>
          </div>

          {ANNOUNCEMENTS.length > 0 ? (
            <div className="space-y-3">
              {ANNOUNCEMENTS.map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 + i * 0.06 }}
                  className="p-4 rounded-xl border border-white/8 bg-white/3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white/70">{a.title}</span>
                    <span className="text-[10px] text-white/25">{a.date}</span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{a.body}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-white/8 bg-white/3 text-center">
              <p className="text-sm text-white/30">Announcements will appear here.</p>
              <p className="text-xs text-white/20 mt-1">Follow our socials to stay updated.</p>
            </div>
          )}
        </motion.div>

        {/* Team section — shows only if TEAM array is populated */}
        {TEAM.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50 mb-4">The Team</h2>
            <div className="grid grid-cols-2 gap-3">
              {TEAM.map((t, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/8 bg-white/3">
                  <div className="font-semibold text-white text-sm">{t.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{t.role}</div>
                  {t.twitter && <div className="text-xs text-sky-400 mt-1">{t.twitter}</div>}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="h-10" />
      </main>
    </div>
  );
}
