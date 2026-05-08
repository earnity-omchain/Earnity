import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";

const ASSETS = {
  background: import.meta.env.BASE_URL + "background-2.png",
  logo: import.meta.env.BASE_URL + "logo.jpg",
};

export default function Socials() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.background})` }} />
      <div className="absolute inset-0 bg-black/70" />

      <nav className="relative z-20 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/8 bg-black/20 backdrop-blur-md">
        <button onClick={() => setLocation("/")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/15">
            <img src={ASSETS.logo} className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-bold tracking-tight">EARNITY</span>
        </div>
        <div className="w-20" />
      </nav>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80dvh] px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 22 }}>
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
            <Clock className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">Social Quests</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Under Construction</h1>
          <p className="mt-4 text-white/45 text-sm leading-relaxed max-w-xs mx-auto">
            Social quests are being set up. Check back soon to earn points.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
