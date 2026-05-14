import { useState } from "react";

const buildings = [
  {
    id: 1,
    name: "The Wanderer's Inn",
    type: "Tavern",
    description: "A cozy two-story timber-framed inn with teal shingle roofing, glowing arched windows, and a hanging shield sign. Smoke curls from the chimney — ale and warmth within.",
    accent: "#2dd4bf",
    bg: "from-slate-900 to-teal-950",
    icon: "🍺",
    tags: ["Half-timber", "Stone base", "Tudor"],
    svg: (
      <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Base/ground */}
        <ellipse cx="100" cy="195" rx="80" ry="18" fill="#1e293b" opacity="0.5"/>
        {/* Stone foundation */}
        <path d="M45 160 L100 135 L155 160 L155 195 L45 195Z" fill="#4b5563"/>
        <path d="M45 160 L45 195" stroke="#374151" strokeWidth="1"/>
        {/* Stone texture */}
        {[0,1,2,3].map(r => [0,1,2,3,4].map(c => (
          <rect key={`s${r}${c}`} x={48 + c*20 + (r%2)*10} y={163 + r*8} width="18" height="6" rx="1" fill="#374151" opacity="0.5"/>
        )))}
        {/* First floor walls */}
        <path d="M45 130 L100 105 L155 130 L155 160 L100 135 L45 160Z" fill="#e2e8f0"/>
        {/* Timber framing left face */}
        <line x1="45" y1="130" x2="45" y2="160" stroke="#92400e" strokeWidth="3"/>
        <line x1="100" y1="105" x2="100" y2="135" stroke="#92400e" strokeWidth="3"/>
        <line x1="60" y1="123" x2="60" y2="155" stroke="#78350f" strokeWidth="2"/>
        <line x1="75" y1="116" x2="75" y2="148" stroke="#78350f" strokeWidth="2"/>
        {/* Windows first floor */}
        <rect x="50" y="130" width="18" height="14" rx="3" fill="#fbbf24" opacity="0.9"/>
        <rect x="74" y="123" width="18" height="14" rx="3" fill="#fbbf24" opacity="0.9"/>
        <rect x="110" y="128" width="18" height="14" rx="3" fill="#fbbf24" opacity="0.85"/>
        {/* Second floor */}
        <path d="M45 100 L100 75 L155 100 L155 130 L100 105 L45 130Z" fill="#f1f5f9"/>
        {/* Timber framing second floor */}
        <line x1="55" y1="96" x2="55" y2="126" stroke="#78350f" strokeWidth="2"/>
        <line x1="70" y1="89" x2="70" y2="119" stroke="#78350f" strokeWidth="2"/>
        <line x1="85" y1="82" x2="85" y2="112" stroke="#78350f" strokeWidth="2"/>
        <line x1="120" y1="96" x2="120" y2="126" stroke="#78350f" strokeWidth="2"/>
        {/* Roof - teal shingles */}
        <path d="M30 100 L100 65 L170 100 L100 80Z" fill="#0f766e"/>
        <path d="M30 100 L100 80 L100 65Z" fill="#115e59"/>
        {/* Shingle rows */}
        {[0,1,2,3,4].map(i => (
          <path key={`sh${i}`} d={`M${30+i*10} ${100-i*7} L${100} ${65+i*3} L${170-i*10} ${100-i*7}`}
            stroke="#134e4a" strokeWidth="1.5" fill="none" opacity="0.6"/>
        ))}
        {/* Tower/dormer */}
        <path d="M85 65 L100 52 L115 65 L115 80 L85 80Z" fill="#f1f5f9"/>
        <path d="M80 65 L100 45 L120 65Z" fill="#0d9488"/>
        <rect x="93" y="59" width="14" height="12" rx="2" fill="#fbbf24" opacity="0.9"/>
        {/* Chimney */}
        <rect x="138" y="72" width="12" height="22" fill="#6b7280"/>
        {/* Smoke */}
        <path d="M144 72 Q146 65 143 58 Q148 55 145 48" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
        {/* Sign */}
        <rect x="152" y="138" width="24" height="18" rx="2" fill="#1d4ed8" stroke="#92400e" strokeWidth="1.5"/>
        <text x="164" y="150" textAnchor="middle" fill="#fbbf24" fontSize="10">⚔</text>
        {/* Pine tree */}
        <path d="M30 175 L37 155 L44 175Z" fill="#166534"/>
        <path d="M28 168 L37 148 L46 168Z" fill="#15803d"/>
        <rect x="35" y="175" width="4" height="8" fill="#92400e"/>
        {/* Lantern */}
        <rect x="97" y="155" width="6" height="8" rx="1" fill="#fbbf24" opacity="0.8"/>
        <line x1="100" y1="148" x2="100" y2="155" stroke="#92400e" strokeWidth="1"/>
      </svg>
    )
  },
  {
    id: 2,
    name: "Iron Keep",
    type: "Guild Hall",
    description: "A fortified guild hall with dark slate roofing, blue heraldic banners, and flickering torches. A watchtower looms on the left, ivy-draped stone walls exuding power.",
    accent: "#3b82f6",
    bg: "from-slate-900 to-blue-950",
    icon: "🛡️",
    tags: ["Fortress", "Stone", "Heraldic"],
    svg: (
      <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="198" rx="85" ry="16" fill="#0f172a" opacity="0.5"/>
        {/* Base */}
        <path d="M35 165 L100 140 L165 165 L165 198 L35 198Z" fill="#374151"/>
        {/* Stone texture base */}
        {[0,1,2,3].map(r => [0,1,2,3,4,5].map(c => (
          <rect key={`b${r}${c}`} x={38 + c*20 + (r%2)*10} y={168 + r*7} width="17" height="5" rx="1" fill="#4b5563" opacity="0.6"/>
        )))}
        {/* Main building */}
        <path d="M35 120 L100 95 L165 120 L165 165 L100 140 L35 165Z" fill="#4b5563"/>
        {/* Stone texture */}
        {[0,1,2,3,4].map(r => [0,1,2,3,4].map(c => (
          <rect key={`w${r}${c}`} x={40 + c*24 + (r%2)*12} y={125 + r*8} width="20" height="6" rx="1" fill="#374151" opacity="0.5"/>
        )))}
        {/* Tower */}
        <path d="M30 85 L55 72 L55 165 L30 165Z" fill="#374151"/>
        <path d="M30 85 L55 72" stroke="#4b5563" strokeWidth="1"/>
        {/* Tower battlements */}
        {[0,1,2,3].map(i => <rect key={`bt${i}`} x={32+i*6} y={72} width="4" height="8" rx="1" fill="#6b7280"/>)}
        {/* Roof */}
        <path d="M25 120 L100 88 L175 120 L100 102Z" fill="#1e3a5f"/>
        <path d="M25 120 L100 102 L100 88Z" fill="#1e40af" opacity="0.5"/>
        {/* Roof detail */}
        {[0,1,2,3,4].map(i => (
          <path key={`r${i}`} d={`M${25+i*12} ${120-i*6} L${100} ${88+i*2.8} L${175-i*12} ${120-i*6}`}
            stroke="#1e3a8a" strokeWidth="1.2" fill="none" opacity="0.7"/>
        ))}
        {/* Flagpole */}
        <line x1="100" y1="55" x2="100" y2="88" stroke="#92400e" strokeWidth="2"/>
        <path d="M100 55 L125 62 L100 69Z" fill="#1d4ed8" stroke="#fbbf24" strokeWidth="0.5"/>
        {/* Side flag */}
        <line x1="30" y1="58" x2="30" y2="82" stroke="#92400e" strokeWidth="1.5"/>
        <path d="M30 58 L50 63 L30 68Z" fill="#1d4ed8"/>
        {/* Main banner */}
        <rect x="83" y="110" width="34" height="45" rx="2" fill="#1d4ed8"/>
        <path d="M83 155 L100 163 L117 155Z" fill="#1d4ed8"/>
        <text x="100" y="135" textAnchor="middle" fill="#fbbf24" fontSize="18">⚔</text>
        {/* Windows */}
        <rect x="45" y="125" width="14" height="18" rx="3" fill="#fbbf24" opacity="0.85"/>
        <rect x="130" y="125" width="14" height="18" rx="3" fill="#fbbf24" opacity="0.85"/>
        <rect x="110" y="115" width="14" height="14" rx="3" fill="#fbbf24" opacity="0.7"/>
        {/* Main arch door */}
        <path d="M88 155 Q100 148 112 155 L112 172 L88 172Z" fill="#1c1917"/>
        {/* Torches */}
        <line x1="82" y1="152" x2="82" y2="165" stroke="#92400e" strokeWidth="1.5"/>
        <circle cx="82" cy="150" r="3" fill="#f97316" opacity="0.9"/>
        <line x1="118" y1="152" x2="118" y2="165" stroke="#92400e" strokeWidth="1.5"/>
        <circle cx="118" cy="150" r="3" fill="#f97316" opacity="0.9"/>
        {/* Wanted board */}
        <rect x="25" y="148" width="25" height="20" rx="1" fill="#92400e"/>
        {[0,1,2].map(i => <rect key={`p${i}`} x={27} y={150+i*6} width="21" height="4" rx="1" fill="#fef3c7" opacity="0.7"/>)}
        {/* Side banner */}
        <rect x="148" y="128" width="22" height="28" rx="2" fill="#1d4ed8"/>
        <text x="159" y="146" textAnchor="middle" fill="#fbbf24" fontSize="12">⚔</text>
        {/* Trees */}
        <path d="M155 182 L163 162 L171 182Z" fill="#166534"/>
        <path d="M153 174 L163 154 L173 174Z" fill="#15803d"/>
        <rect x="161" y="182" width="4" height="10" fill="#92400e"/>
      </svg>
    )
  },
  {
    id: 3,
    name: "Millstone & Stream",
    type: "Water Mill",
    description: "A working watermill with a great wooden wheel fed by cascading water. Stone-built with ivy clinging to its walls, flower boxes at the windows, and a quiet millpond.",
    accent: "#06b6d4",
    bg: "from-slate-900 to-cyan-950",
    icon: "⚙️",
    tags: ["Watermill", "Stone", "Rural"],
    svg: (
      <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="198" rx="85" ry="15" fill="#0f172a" opacity="0.5"/>
        {/* Water */}
        <ellipse cx="140" cy="190" rx="40" ry="12" fill="#0e7490" opacity="0.6"/>
        <ellipse cx="140" cy="190" rx="30" ry="8" fill="#06b6d4" opacity="0.3"/>
        {/* Base */}
        <path d="M40 160 L95 138 L150 160 L150 195 L40 195Z" fill="#4b5563"/>
        {/* Stone texture */}
        {[0,1,2,3].map(r => [0,1,2,3,4].map(c => (
          <rect key={`s${r}${c}`} x={43 + c*20 + (r%2)*10} y={163 + r*7} width="17" height="5" rx="1" fill="#374151" opacity="0.6"/>
        )))}
        {/* Main building */}
        <path d="M40 115 L95 93 L150 115 L150 160 L95 138 L40 160Z" fill="#6b7280"/>
        {/* Stone texture */}
        {[0,1,2,3,4].map(r => [0,1,2,3].map(c => (
          <rect key={`w${r}${c}`} x={43 + c*25 + (r%2)*12} y={120 + r*8} width="21" height="6" rx="1" fill="#4b5563" opacity="0.5"/>
        )))}
        {/* Ivy */}
        <path d="M40 115 Q50 120 45 130 Q55 125 50 140 Q60 135 55 155" stroke="#16a34a" strokeWidth="3" fill="none" opacity="0.7" strokeLinecap="round"/>
        {/* Roof */}
        <path d="M28 115 L95 80 L160 115 L95 98Z" fill="#334155"/>
        <path d="M28 115 L95 98 L95 80Z" fill="#1e293b"/>
        {/* Shingles */}
        {[0,1,2,3,4].map(i => (
          <path key={`sh${i}`} d={`M${28+i*13} ${115-i*7} L${95} ${80+i*3.6} L${160-i*13} ${115-i*7}`}
            stroke="#0f172a" strokeWidth="1.2" fill="none" opacity="0.6"/>
        ))}
        {/* Roof trim */}
        <path d="M28 115 L95 98" stroke="#78350f" strokeWidth="2.5"/>
        {/* Chimney */}
        <rect x="128" y="78" width="14" height="25" fill="#6b7280"/>
        <path d="M125 80 L130 75 L145 75 L142 80Z" fill="#4b5563"/>
        {/* Smoke */}
        <path d="M135 75 Q138 67 134 60 Q139 57 136 49" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
        {/* Dormer windows */}
        <rect x="75" y="90" width="16" height="14" rx="3" fill="#fbbf24" opacity="0.9"/>
        <rect x="100" y="93" width="14" height="12" rx="3" fill="#fbbf24" opacity="0.85"/>
        {/* Flower box */}
        <rect x="98" y="103" width="20" height="5" rx="1" fill="#92400e"/>
        <circle cx="101" cy="102" r="3" fill="#a855f7"/>
        <circle cx="107" cy="101" r="3" fill="#ec4899"/>
        <circle cx="113" cy="102" r="3" fill="#3b82f6"/>
        {/* Door */}
        <rect x="83" y="145" width="18" height="22" rx="2" fill="#1c1917"/>
        {/* Water wheel */}
        <circle cx="155" cy="162" r="28" fill="none" stroke="#92400e" strokeWidth="4"/>
        <circle cx="155" cy="162" r="5" fill="#78350f"/>
        {[0,1,2,3,4,5,6,7].map(i => {
          const a = i * Math.PI / 4;
          return <line key={`sp${i}`} x1={155 + Math.cos(a)*5} y1={162 + Math.sin(a)*5}
            x2={155 + Math.cos(a)*24} y2={162 + Math.sin(a)*24} stroke="#92400e" strokeWidth="3"/>;
        })}
        {[0,1,2,3,4,5,6,7].map(i => {
          const a = i * Math.PI / 4;
          const x = 155 + Math.cos(a)*24;
          const y = 162 + Math.sin(a)*24;
          return <rect key={`b${i}`} x={x-6} y={y-3} width="12" height="6" rx="1"
            fill="#78350f" transform={`rotate(${i*45} ${x} ${y})`}/>;
        })}
        {/* Water cascade */}
        <path d="M143 130 Q148 140 150 150" stroke="#06b6d4" strokeWidth="3" fill="none" opacity="0.8" strokeLinecap="round"/>
        <path d="M150 130 Q153 140 155 150" stroke="#0ea5e9" strokeWidth="2" fill="none" opacity="0.6"/>
        {/* Sign */}
        <rect x="30" y="128" width="22" height="16" rx="2" fill="#3b3226" stroke="#92400e" strokeWidth="1"/>
        <circle cx="41" cy="136" r="5" fill="none" stroke="#d1d5db" strokeWidth="1.5"/>
        <line x1="37" y1="136" x2="45" y2="136" stroke="#d1d5db" strokeWidth="1" opacity="0.7"/>
        <line x1="41" y1="132" x2="41" y2="140" stroke="#d1d5db" strokeWidth="1" opacity="0.7"/>
        {/* Trees */}
        <path d="M160 188 L167 168 L174 188Z" fill="#166534"/>
        <path d="M158 180 L167 160 L176 180Z" fill="#15803d"/>
        <rect x="165" y="188" width="4" height="8" fill="#92400e"/>
        {/* Barrel */}
        <rect x="37" y="173" width="10" height="12" rx="2" fill="#92400e"/>
        <line x1="37" y1="177" x2="47" y2="177" stroke="#78350f" strokeWidth="1"/>
        <line x1="37" y1="181" x2="47" y2="181" stroke="#78350f" strokeWidth="1"/>
      </svg>
    )
  },
  {
    id: 4,
    name: "Emberforge",
    type: "Blacksmith",
    description: "A squat but fierce smithy of dark stone with a roaring forge visible through open shutters. Sparks fly from the open-air anvil awning, tools hanging on the outer wall.",
    accent: "#f97316",
    bg: "from-slate-900 to-orange-950",
    icon: "⚒️",
    tags: ["Forge", "Industrial", "Firelit"],
    svg: (
      <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="198" rx="82" ry="15" fill="#1c0a00" opacity="0.6"/>
        {/* Base */}
        <path d="M42 162 L100 140 L158 162 L158 196 L42 196Z" fill="#292524"/>
        {[0,1,2,3].map(r => [0,1,2,3,4].map(c => (
          <rect key={`b${r}${c}`} x={45 + c*22 + (r%2)*11} y={165 + r*7} width="19" height="5" rx="1" fill="#1c1917" opacity="0.7"/>
        )))}
        {/* Main walls */}
        <path d="M42 118 L100 96 L158 118 L158 162 L100 140 L42 162Z" fill="#3b3226"/>
        {/* Brick texture */}
        {[0,1,2,3,4].map(r => [0,1,2,3].map(c => (
          <rect key={`w${r}${c}`} x={45 + c*28 + (r%2)*14} y={122 + r*8} width="24" height="6" rx="1" fill="#1c1917" opacity="0.5"/>
        )))}
        {/* Forge glow through window */}
        <rect x="55" y="128" width="26" height="22" rx="2" fill="#f97316" opacity="0.9"/>
        <rect x="57" y="130" width="22" height="18" rx="1" fill="#fbbf24" opacity="0.8"/>
        <path d="M55 128 Q68 120 81 128" fill="#f97316" opacity="0.4"/>
        {/* Right window */}
        <rect x="118" y="128" width="20" height="16" rx="2" fill="#fbbf24" opacity="0.7"/>
        {/* Roof */}
        <path d="M30 118 L100 85 L170 118 L100 100Z" fill="#1c1917"/>
        <path d="M30 118 L100 100 L100 85Z" fill="#0c0a09"/>
        {/* Roof shingles */}
        {[0,1,2,3,4,5].map(i => (
          <path key={`r${i}`} d={`M${30+i*11} ${118-i*5.5} L${100} ${85+i*2.5} L${170-i*11} ${118-i*5.5}`}
            stroke="#0c0a09" strokeWidth="1.2" fill="none" opacity="0.8"/>
        ))}
        {/* Large chimney */}
        <rect x="105" y="70" width="22" height="35" fill="#292524"/>
        <rect x="102" y="67" width="28" height="8" rx="1" fill="#1c1917"/>
        {/* Fire/smoke from chimney */}
        <path d="M116 67 Q112 57 116 47 Q120 57 116 47" stroke="#f97316" strokeWidth="3" fill="none" opacity="0.9" strokeLinecap="round"/>
        <path d="M120 67 Q124 55 119 43" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round"/>
        <circle cx="116" cy="58" r="5" fill="#f97316" opacity="0.4"/>
        <circle cx="120" cy="50" r="4" fill="#fbbf24" opacity="0.3"/>
        {/* Sparks */}
        {[[65,118],[70,112],[80,115],[62,110],[75,108]].map(([x,y],i) => (
          <circle key={`sp${i}`} cx={x} cy={y} r="1.5" fill="#fbbf24" opacity={0.6+i*0.1}/>
        ))}
        {/* Awning/overhang */}
        <path d="M42 140 L42 118 L62 110 L62 132Z" fill="#3b2f0f" opacity="0.8"/>
        {/* Anvil area */}
        <rect x="32" y="170" width="22" height="10" rx="2" fill="#374151"/>
        <path d="M38 165 Q43 160 48 165 L48 170 L38 170Z" fill="#4b5563"/>
        {/* Hanging tools */}
        <line x1="152" y1="125" x2="152" y2="148" stroke="#374151" strokeWidth="1.5"/>
        <path d="M149 148 L155 148 L155 150 L149 150Z" fill="#6b7280"/>
        <line x1="160" y1="122" x2="160" y2="145" stroke="#374151" strokeWidth="1.5"/>
        <path d="M157 145 Q160 155 163 145" fill="#9ca3af" stroke="#6b7280" strokeWidth="1"/>
        {/* Door */}
        <rect x="86" y="148" width="24" height="22" rx="2" fill="#0c0a09"/>
        <rect x="91" y="152" width="6" height="8" rx="1" fill="#1c1917"/>
        <rect x="101" y="152" width="6" height="8" rx="1" fill="#1c1917"/>
        {/* Iron fence */}
        {[0,1,2,3,4,5,6].map(i => (
          <line key={`f${i}`} x1={48+i*14} y1={188} x2={48+i*14} y2={196} stroke="#374151" strokeWidth="2"/>
        ))}
        <line x1="48" y1="192" x2="132" y2="192" stroke="#374151" strokeWidth="1.5"/>
      </svg>
    )
  },
  {
    id: 5,
    name: "The Arcane Spire",
    type: "Wizard's Tower",
    description: "A tall spiraling mage tower of midnight stone, glowing crystal at its peak, magical runes etched into the walls. Floating orbs orbit the structure in eternal arcs.",
    accent: "#a855f7",
    bg: "from-slate-950 to-purple-950",
    icon: "🔮",
    tags: ["Tower", "Magic", "Arcane"],
    svg: (
      <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="215" rx="60" ry="14" fill="#1e1b4b" opacity="0.6"/>
        {/* Base platform */}
        <path d="M60 185 L100 170 L140 185 L140 215 L60 215Z" fill="#1e1b4b"/>
        {/* Rune steps */}
        {[0,1,2].map(i => (
          <path key={`st${i}`} d={`M${70+i*8} ${195+i*5} L${100} ${182+i*3} L${130-i*8} ${195+i*5}`} fill="#312e81" stroke="#6d28d9" strokeWidth="0.5"/>
        ))}
        {/* Tower body */}
        <path d="M72 100 L100 88 L128 100 L128 185 L100 170 L72 185Z" fill="#1e1b4b"/>
        {/* Rune markings */}
        {[[78,140],[92,125],[108,132],[118,148],[82,160]].map(([x,y],i) => (
          <text key={`r${i}`} x={x} y={y} fill="#7c3aed" fontSize="8" opacity="0.7" fontFamily="serif">✦</text>
        ))}
        {/* Stone texture */}
        {[0,1,2,3,4,5,6].map(r => [0,1].map(c => (
          <rect key={`w${r}${c}`} x={74 + c*26 + (r%2)*13} y={105 + r*12} width="22" height="9" rx="1" fill="#312e81" opacity="0.4"/>
        )))}
        {/* Glowing windows */}
        <rect x="86" y="152" width="14" height="20" rx="4" fill="#7c3aed" opacity="0.9"/>
        <rect x="86" y="152" width="14" height="20" rx="4" fill="#c4b5fd" opacity="0.4"/>
        <rect x="87" y="128" width="12" height="16" rx="3" fill="#8b5cf6" opacity="0.85"/>
        <rect x="88" y="108" width="10" height="14" rx="3" fill="#a78bfa" opacity="0.8"/>
        {/* Glow around windows */}
        <rect x="84" y="150" width="18" height="24" rx="5" fill="none" stroke="#7c3aed" strokeWidth="1" opacity="0.5"/>
        {/* Conical roof */}
        <path d="M65 100 L100 55 L135 100Z" fill="#4c1d95"/>
        <path d="M65 100 L100 55Z" stroke="#6d28d9" strokeWidth="1" opacity="0.5"/>
        <path d="M135 100 L100 55Z" stroke="#6d28d9" strokeWidth="1" opacity="0.5"/>
        {/* Roof spiral ridges */}
        {[0,1,2,3].map(i => (
          <path key={`rr${i}`} d={`M${65+i*9} ${100-i*11} L${100} ${55+i*3} L${135-i*9} ${100-i*11}`}
            stroke="#6d28d9" strokeWidth="1" fill="none" opacity="0.5"/>
        ))}
        {/* Spire */}
        <line x1="100" y1="35" x2="100" y2="55" stroke="#7c3aed" strokeWidth="3"/>
        {/* Crystal at top */}
        <path d="M93 35 L100 20 L107 35 L100 40Z" fill="#a855f7"/>
        <path d="M93 35 L100 40 L107 35 L100 30Z" fill="#c4b5fd" opacity="0.8"/>
        {/* Crystal glow */}
        <circle cx="100" cy="30" r="10" fill="#a855f7" opacity="0.2"/>
        <circle cx="100" cy="30" r="6" fill="#c4b5fd" opacity="0.3"/>
        {/* Orbiting orbs */}
        <circle cx="65" cy="120" r="5" fill="#7c3aed" opacity="0.85"/>
        <circle cx="65" cy="120" r="8" fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.4"/>
        <circle cx="138" cy="135" r="4" fill="#8b5cf6" opacity="0.8"/>
        <circle cx="138" cy="135" r="7" fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.4"/>
        <circle cx="72" cy="165" r="3" fill="#a78bfa" opacity="0.7"/>
        {/* Orbit path hints */}
        <ellipse cx="100" cy="130" rx="38" ry="18" fill="none" stroke="#6d28d9" strokeWidth="0.5" opacity="0.3" strokeDasharray="4 4"/>
        {/* Door arch */}
        <path d="M88 172 Q100 165 112 172 L112 185 L88 185Z" fill="#0f0a2e"/>
        <path d="M88 172 Q100 165 112 172" stroke="#7c3aed" strokeWidth="1.5" fill="none"/>
        {/* Magic rune above door */}
        <circle cx="100" cy="168" r="6" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.7"/>
        <text x="100" y="171" textAnchor="middle" fill="#c4b5fd" fontSize="7" opacity="0.8">✦</text>
      </svg>
    )
  },
  {
    id: 6,
    name: "Thornwood Apothecary",
    type: "Alchemist Shop",
    description: "A crooked half-timbered herbalist with bottles gleaming in every window. Dried herbs hang from the eaves, a bubbling cauldron sits outside, and the sign bears a mortar & pestle.",
    accent: "#84cc16",
    bg: "from-slate-900 to-green-950",
    icon: "🌿",
    tags: ["Crooked", "Herbal", "Cozy"],
    svg: (
      <svg viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="205" rx="80" ry="14" fill="#052e16" opacity="0.5"/>
        {/* Base */}
        <path d="M48 170 L100 148 L152 170 L152 200 L48 200Z" fill="#3b4a2f"/>
        {/* Main walls - slightly leaning */}
        <path d="M46 122 L98 100 L152 124 L152 170 L100 148 L46 170Z" fill="#fef3c7"/>
        {/* Timber framing - irregular for "crooked" look */}
        <line x1="46" y1="122" x2="46" y2="170" stroke="#713f12" strokeWidth="3.5"/>
        <line x1="152" y1="124" x2="152" y2="170" stroke="#713f12" strokeWidth="3.5"/>
        <line x1="46" y1="148" x2="152" y2="150" stroke="#713f12" strokeWidth="2"/>
        <line x1="65" y1="115" x2="63" y2="170" stroke="#92400e" strokeWidth="2"/>
        <line x1="85" y1="108" x2="84" y2="148" stroke="#92400e" strokeWidth="2"/>
        <line x1="115" y1="110" x2="116" y2="150" stroke="#92400e" strokeWidth="2"/>
        <line x1="136" y1="118" x2="138" y2="170" stroke="#92400e" strokeWidth="2"/>
        {/* Diagonal braces */}
        <line x1="65" y1="115" x2="85" y2="148" stroke="#92400e" strokeWidth="1.5" opacity="0.7"/>
        <line x1="115" y1="110" x2="136" y2="148" stroke="#92400e" strokeWidth="1.5" opacity="0.7"/>
        {/* Windows with colorful bottles */}
        <rect x="50" y="130" width="22" height="18" rx="2" fill="#fbbf24" opacity="0.7"/>
        {/* Bottle silhouettes */}
        <rect x="53" y="132" width="4" height="12" rx="2" fill="#22c55e" opacity="0.8"/>
        <rect x="59" y="133" width="4" height="11" rx="2" fill="#a855f7" opacity="0.8"/>
        <rect x="65" y="132" width="4" height="12" rx="2" fill="#06b6d4" opacity="0.8"/>
        <rect x="90" y="128" width="22" height="18" rx="2" fill="#fbbf24" opacity="0.6"/>
        <rect x="93" y="130" width="4" height="12" rx="2" fill="#f97316" opacity="0.8"/>
        <rect x="99" y="131" width="4" height="11" rx="2" fill="#ec4899" opacity="0.8"/>
        <rect x="105" y="130" width="4" height="12" rx="2" fill="#84cc16" opacity="0.8"/>
        <rect x="126" y="130" width="18" height="16" rx="2" fill="#fbbf24" opacity="0.65"/>
        {/* Roof - wavy shingles */}
        <path d="M32 122 L98 87 L162 122 L98 105Z" fill="#3f6212"/>
        {/* Wavy roof edge */}
        <path d="M32 122 Q42 118 52 122 Q62 126 72 122 Q82 118 92 122 Q102 126 112 122 Q122 118 132 122 Q142 126 152 122 Q157 119 162 122"
          stroke="#4d7c0f" strokeWidth="2" fill="none" opacity="0.7"/>
        {/* Moss on roof */}
        {[[60,108],[80,98],[100,95],[120,100],[140,108]].map(([x,y],i) => (
          <circle key={`m${i}`} cx={x} cy={y} r={4+i%2*2} fill="#84cc16" opacity="0.4"/>
        ))}
        {/* Second floor dormer */}
        <path d="M84 87 L98 74 L112 87 L112 105 L84 105Z" fill="#fef3c7"/>
        <path d="M80 87 L98 68 L116 87Z" fill="#3f6212"/>
        <rect x="89" y="80" width="18" height="14" rx="2" fill="#fbbf24" opacity="0.8"/>
        {/* Chimney */}
        <rect x="120" y="80" width="14" height="28" fill="#4b5563"/>
        {/* Hanging herbs */}
        {[42,54,66,78].map((x,i) => (
          <g key={`h${i}`}>
            <line x1={x} y1="122" x2={x} y2="134" stroke="#713f12" strokeWidth="1"/>
            <path d={`M${x-4} 134 Q${x} 130 ${x+4} 134`} fill="#84cc16" opacity="0.8"/>
            <path d={`M${x-3} 130 Q${x} 126 ${x+3} 130`} fill="#65a30d" opacity="0.7"/>
          </g>
        ))}
        {/* Cauldron */}
        <ellipse cx="40" cy="185" rx="12" ry="8" fill="#1c1917"/>
        <path d="M30 185 Q40 175 50 185" fill="#374151"/>
        <ellipse cx="40" cy="178" rx="10" ry="4" fill="#14532d" opacity="0.8"/>
        {/* Bubbles */}
        <circle cx="37" cy="174" r="2" fill="#84cc16" opacity="0.6"/>
        <circle cx="43" cy="172" r="1.5" fill="#22c55e" opacity="0.5"/>
        {/* Sign */}
        <line x1="150" y1="136" x2="166" y2="136" stroke="#713f12" strokeWidth="2"/>
        <rect x="158" y="132" width="20" height="16" rx="2" fill="#3f6212" stroke="#713f12" strokeWidth="1"/>
        <text x="168" y="143" textAnchor="middle" fill="#d9f99d" fontSize="10">⚗</text>
        {/* Door */}
        <path d="M87 165 Q100 158 113 165 L113 196 L87 196Z" fill="#713f12"/>
        <rect x="95" y="170" width="5" height="14" rx="1" fill="#92400e"/>
        <rect x="102" y="170" width="5" height="14" rx="1" fill="#92400e"/>
        <circle cx="113" cy="180" r="2" fill="#fbbf24"/>
        {/* Flowers at base */}
        {[55,70,130,145].map((x,i) => (
          <g key={`fl${i}`}>
            <circle cx={x} cy={196} r="3" fill={["#fbbf24","#f9a8d4","#86efac","#fde68a"][i]} opacity="0.8"/>
            <line x1={x} y1="196" x2={x} y2="202" stroke="#16a34a" strokeWidth="1"/>
          </g>
        ))}
      </svg>
    )
  },
  {
    id: 7,
    name: "Gilded Lore",
    type: "Library / Scriptorium",
    description: "A tall, narrow library of pale sandstone with gothic pointed windows, brass-trimmed bookshelves visible within, and a grand carved entrance arch bearing the seal of knowledge.",
    accent: "#eab308",
    bg: "from-slate-900 to-yellow-950",
    icon: "📚",
    tags: ["Gothic", "Sandstone", "Scholarly"],
    svg: (
      <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="212" rx="72" ry="13" fill="#1c0a00" opacity="0.4"/>
        {/* Base */}
        <path d="M55 178 L100 160 L145 178 L145 208 L55 208Z" fill="#d4a96a"/>
        {/* Main building */}
        <path d="M52 98 L100 78 L148 98 L148 178 L100 160 L52 178Z" fill="#e5c98a"/>
        {/* Stone blocks texture */}
        {[0,1,2,3,4,5,6,7].map(r => [0,1,2].map(c => (
          <rect key={`w${r}${c}`} x={55 + c*30 + (r%2)*15} y={102 + r*10} width="26" height="8" rx="1" fill="#d4a96a" opacity="0.5"/>
        )))}
        {/* Gothic pointed windows */}
        {[[60,110],[90,105],[120,108],[60,138],[120,140]].map(([x,y],i) => (
          <g key={`gw${i}`}>
            <path d={`M${x} ${y+20} L${x} ${y+5} Q${x+8} ${y-5} ${x+16} ${y+5} L${x+16} ${y+20}Z`} fill="#fbbf24" opacity={0.7+i*0.05}/>
            <path d={`M${x} ${y+20} L${x} ${y+5} Q${x+8} ${y-5} ${x+16} ${y+5}`} stroke="#b45309" strokeWidth="1.5" fill="none"/>
            <line x1={x+8} y1={y-2} x2={x+8} y2={y+20} stroke="#b45309" strokeWidth="0.8" opacity="0.5"/>
            <line x1={x} y1={y+12} x2={x+16} y2={y+12} stroke="#b45309" strokeWidth="0.8" opacity="0.5"/>
          </g>
        ))}
        {/* Bookshelf visible through main window */}
        <rect x="84" y="135" width="32" height="28" rx="1" fill="#fbbf24" opacity="0.5"/>
        {[0,1,2].map(i => (
          <line key={`bs${i}`} x1={84} y1={141+i*7} x2={116} y2={141+i*7} stroke="#b45309" strokeWidth="0.8"/>
        ))}
        {[0,1,2,3,4].map(i => (
          <rect key={`bk${i}`} x={86+i*5} y={136} width="3" height="24" rx="0.5"
            fill={["#dc2626","#2563eb","#16a34a","#9333ea","#ea580c"][i]} opacity="0.8"/>
        ))}
        {/* Roof - pagoda style with decorative ridges */}
        <path d="M42 98 L100 68 L158 98 L100 83Z" fill="#b45309"/>
        {/* Roof curves */}
        <path d="M42 98 Q60 102 70 98" stroke="#d97706" strokeWidth="2" fill="none"/>
        <path d="M130 98 Q140 102 158 98" stroke="#d97706" strokeWidth="2" fill="none"/>
        {/* Decorative ridge tiles */}
        {[0,1,2,3,4].map(i => (
          <path key={`rt${i}`} d={`M${42+i*12} ${98-i*6} L${100} ${68+i*3} L${158-i*12} ${98-i*6}`}
            stroke="#92400e" strokeWidth="1.2" fill="none" opacity="0.6"/>
        ))}
        {/* Ridge ornament */}
        <path d="M100 68 L96 62 L100 55 L104 62 Z" fill="#eab308" stroke="#b45309" strokeWidth="1"/>
        <circle cx="100" cy="55" r="4" fill="#fbbf24"/>
        <line x1="96" y1="50" x2="104" y2="50" stroke="#b45309" strokeWidth="1.5"/>
        {/* Corner finials */}
        <circle cx="42" cy="97" r="4" fill="#eab308"/>
        <circle cx="158" cy="97" r="4" fill="#eab308"/>
        {/* Grand entrance arch */}
        <path d="M82 180 Q100 168 118 180 L118 205 L82 205Z" fill="#d4a96a"/>
        <path d="M82 180 Q100 168 118 180" stroke="#b45309" strokeWidth="2.5" fill="none"/>
        {/* Arch carved details */}
        <path d="M85 180 Q100 171 115 180" stroke="#eab308" strokeWidth="1" fill="none" opacity="0.7"/>
        <circle cx="100" cy="175" r="5" fill="none" stroke="#eab308" strokeWidth="1" opacity="0.7"/>
        <text x="100" y="178" textAnchor="middle" fill="#eab308" fontSize="6" opacity="0.8">📖</text>
        {/* Door panels */}
        <rect x="84" y="183" width="14" height="20" rx="1" fill="#92400e"/>
        <rect x="100" y="183" width="16" height="20" rx="1" fill="#92400e"/>
        <rect x="86" y="186" width="10" height="8" rx="1" fill="#b45309"/>
        <rect x="102" y="186" width="11" height="8" rx="1" fill="#b45309"/>
        {/* Brass door knockers */}
        <circle cx="98" cy="196" r="2" fill="#eab308"/>
        <circle cx="101" cy="196" r="2" fill="#eab308"/>
        {/* Side pilasters */}
        <rect x="50" y="98" width="8" height="80" rx="2" fill="#d4a96a" opacity="0.7"/>
        <rect x="142" y="98" width="8" height="80" rx="2" fill="#d4a96a" opacity="0.7"/>
        {/* Carved seal */}
        <circle cx="100" cy="118" r="12" fill="none" stroke="#b45309" strokeWidth="1.5"/>
        <circle cx="100" cy="118" r="8" fill="none" stroke="#eab308" strokeWidth="0.8" opacity="0.7"/>
        <text x="100" y="122" textAnchor="middle" fill="#eab308" fontSize="10">✦</text>
        {/* Ivy/vines */}
        <path d="M52 178 Q56 165 53 152 Q58 160 55 145" stroke="#16a34a" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round"/>
        <path d="M148 180 Q145 167 148 154 Q143 162 146 147" stroke="#15803d" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    id: 8,
    name: "Chapel of Embers",
    type: "Temple / Shrine",
    description: "A modest yet ethereal stone chapel with a rose window aglow, buttressed arched walls, and a bell tower rising above. Candles flicker within and pilgrims' offerings line the steps.",
    accent: "#f43f5e",
    bg: "from-slate-950 to-rose-950",
    icon: "⛪",
    tags: ["Gothic", "Sacred", "Rose window"],
    svg: (
      <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="215" rx="75" ry="13" fill="#1a0010" opacity="0.5"/>
        {/* Base */}
        <path d="M50 178 L100 158 L150 178 L150 210 L50 210Z" fill="#44403c"/>
        {/* Stone steps */}
        {[0,1,2].map(i => (
          <path key={`st${i}`} d={`M${80+i*6} ${200+i*3} L${100} ${192+i*2} L${120-i*6} ${200+i*3} L${120-i*6} ${204+i*3} L${80+i*6} ${204+i*3}Z`} fill="#57534e"/>
        ))}
        {/* Main nave */}
        <path d="M55 125 L100 105 L145 125 L145 178 L100 158 L55 178Z" fill="#57534e"/>
        {/* Stone blocks */}
        {[0,1,2,3,4].map(r => [0,1,2].map(c => (
          <rect key={`b${r}${c}`} x={58 + c*28 + (r%2)*14} y={130 + r*9} width="24" height="7" rx="1" fill="#44403c" opacity="0.6"/>
        )))}
        {/* Bell tower */}
        <path d="M85 62 L100 52 L115 62 L115 125 L85 125Z" fill="#4b4845"/>
        {/* Tower stone */}
        {[0,1,2,3,4,5,6].map(r => (
          <rect key={`tw${r}`} x={87 + (r%2)*8} y={65+r*8} width="15" height="6" rx="1" fill="#44403c" opacity="0.5"/>
        ))}
        {/* Bell window */}
        <path d="M88 80 L100 72 L112 80 L112 96 L88 96Z" fill="#1a0010" opacity="0.9"/>
        <path d="M88 80 L100 72 L112 80" stroke="#f43f5e" strokeWidth="1.5" fill="none"/>
        {/* Bell */}
        <path d="M95 84 Q100 80 105 84 L105 92 Q100 96 95 92Z" fill="#b45309"/>
        <circle cx="100" cy="92" r="2" fill="#78350f"/>
        {/* Tower roof - pointed */}
        <path d="M82 62 L100 38 L118 62Z" fill="#9f1239"/>
        <path d="M82 62 L100 62Z" stroke="#f43f5e" strokeWidth="1" fill="none"/>
        {/* Cross */}
        <line x1="100" y1="28" x2="100" y2="38" stroke="#fef2f2" strokeWidth="2.5"/>
        <line x1="95" y1="32" x2="105" y2="32" stroke="#fef2f2" strokeWidth="2.5"/>
        {/* Nave roof */}
        <path d="M40 125 L100 98 L160 125 L100 110Z" fill="#9f1239"/>
        <path d="M40 125 L100 110 L100 98Z" fill="#881337"/>
        {/* Roof ridges */}
        {[0,1,2,3].map(i => (
          <path key={`nr${i}`} d={`M${40+i*13} ${125-i*7} L${100} ${98+i*3} L${160-i*13} ${125-i*7}`}
            stroke="#7f1d1d" strokeWidth="1.2" fill="none" opacity="0.7"/>
        ))}
        {/* Rose window */}
        <circle cx="100" cy="140" r="16" fill="#f43f5e" opacity="0.2"/>
        <circle cx="100" cy="140" r="14" fill="none" stroke="#f43f5e" strokeWidth="1.5"/>
        <circle cx="100" cy="140" r="8" fill="none" stroke="#fb7185" strokeWidth="1"/>
        <circle cx="100" cy="140" r="4" fill="#f43f5e" opacity="0.6"/>
        {/* Rose window spokes */}
        {[0,1,2,3,4,5,6,7].map(i => {
          const a = i * Math.PI / 4;
          return <line key={`rsp${i}`} x1={100 + Math.cos(a)*8} y1={140 + Math.sin(a)*8}
            x2={100 + Math.cos(a)*14} y2={140 + Math.sin(a)*14}
            stroke="#fb7185" strokeWidth="1" opacity="0.8"/>;
        })}
        {/* Inner glow */}
        <circle cx="100" cy="140" r="13" fill="#f43f5e" opacity="0.1"/>
        {/* Buttresses */}
        <path d="M55 125 L45 150 L55 150 L55 125Z" fill="#4b4845"/>
        <path d="M145 125 L155 150 L145 150 L145 125Z" fill="#4b4845"/>
        {/* Gothic side windows */}
        <path d="M62 150 L62 165 Q70 158 78 165 L78 150Z" fill="#fbbf24" opacity="0.5"/>
        <path d="M62 150 Q70 143 78 150" stroke="#b45309" strokeWidth="1.2" fill="none"/>
        <path d="M122 150 L122 165 Q130 158 138 165 L138 150Z" fill="#fbbf24" opacity="0.5"/>
        <path d="M122 150 Q130 143 138 150" stroke="#b45309" strokeWidth="1.2" fill="none"/>
        {/* Main door - arch */}
        <path d="M86 178 Q100 168 114 178 L114 200 L86 200Z" fill="#1c1917"/>
        <path d="M86 178 Q100 168 114 178" stroke="#f43f5e" strokeWidth="1.5" fill="none"/>
        {/* Candles on steps */}
        {[72,82,118,128].map((x,i) => (
          <g key={`c${i}`}>
            <rect x={x} y={200} width="3" height="8" rx="1" fill="#fef3c7"/>
            <circle cx={x+1.5} cy={198} r="2" fill="#fbbf24" opacity="0.9"/>
          </g>
        ))}
        {/* Offering bowls */}
        <ellipse cx="76" cy="210" rx="5" ry="2" fill="#92400e"/>
        <ellipse cx="124" cy="210" rx="5" ry="2" fill="#92400e"/>
      </svg>
    )
  },
  {
    id: 9,
    name: "Frostpeak Outpost",
    type: "Scout Tower",
    description: "A sturdy timber-and-stone watchtower built for harsh northern climates, with a conical shingled cap, exterior ladder, signal fire platform, and arrow-slit windows.",
    accent: "#38bdf8",
    bg: "from-slate-950 to-sky-950",
    icon: "🗼",
    tags: ["Nordic", "Military", "Snow-capped"],
    svg: (
      <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="212" rx="65" ry="12" fill="#082f49" opacity="0.5"/>
        {/* Snow ground */}
        <ellipse cx="100" cy="210" rx="62" ry="10" fill="#e2e8f0" opacity="0.3"/>
        {/* Base - wide stone */}
        <path d="M62 175 L100 158 L138 175 L138 206 L62 206Z" fill="#374151"/>
        {/* Stone texture base */}
        {[0,1,2,3].map(r => [0,1,2].map(c => (
          <rect key={`b${r}${c}`} x={65 + c*24 + (r%2)*12} y={178 + r*7} width="20" height="5" rx="1" fill="#4b5563" opacity="0.5"/>
        )))}
        {/* Tower shaft */}
        <path d="M70 80 L100 68 L130 80 L130 175 L100 158 L70 175Z" fill="#4b5563"/>
        {/* Log/timber horizontal bands */}
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <path key={`log${i}`} d={`M70 ${85+i*11} L100 ${73+i*11} L130 ${85+i*11}`} stroke="#374151" strokeWidth="2" fill="none"/>
        ))}
        {/* Arrow slit windows */}
        <rect x="91" y="95" width="6" height="14" rx="1" fill="#fbbf24" opacity="0.7"/>
        <rect x="91" y="120" width="6" height="14" rx="1" fill="#fbbf24" opacity="0.65"/>
        <rect x="91" y="145" width="6" height="12" rx="1" fill="#fbbf24" opacity="0.6"/>
        {/* Arrow slits right face */}
        <rect x="116" y="98" width="5" height="12" rx="1" fill="#fbbf24" opacity="0.55"/>
        <rect x="116" y="124" width="5" height="12" rx="1" fill="#fbbf24" opacity="0.5"/>
        {/* Watch platform */}
        <path d="M62 80 L100 65 L138 80 L138 92 L100 78 L62 92Z" fill="#374151"/>
        <path d="M62 80 L62 92" stroke="#4b5563" strokeWidth="1"/>
        <path d="M138 80 L138 92" stroke="#4b5563" strokeWidth="1"/>
        {/* Platform battlements */}
        {[0,1,2,3,4].map(i => <rect key={`pb${i}`} x={65+i*14} y={78} width="8" height="10" rx="1" fill="#374151" stroke="#4b5563" strokeWidth="0.5"/>)}
        {/* Signal fire on platform */}
        <rect x="92" y="68" width="16" height="8" rx="1" fill="#1c1917"/>
        <path d="M96 68 Q100 58 104 68 Q100 63 96 68Z" fill="#f97316" opacity="0.9"/>
        <circle cx="100" cy="62" r="5" fill="#fbbf24" opacity="0.4"/>
        {/* Smoke */}
        <path d="M100 58 Q97 50 100 43 Q103 50 100 43" stroke="#94a3b8" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"/>
        {/* Conical roof - snow capped */}
        <path d="M55 80 L100 42 L145 80Z" fill="#78350f"/>
        {/* Snow on roof */}
        <path d="M55 80 Q65 74 75 78 Q85 72 95 76 Q100 70 105 76 Q115 72 125 78 Q135 74 145 80"
          fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.5"/>
        <path d="M70 72 Q80 66 90 70 Q95 65 100 68 Q105 65 110 70 Q120 66 130 72"
          fill="#e2e8f0" opacity="0.6"/>
        {/* Spire */}
        <line x1="100" y1="30" x2="100" y2="42" stroke="#92400e" strokeWidth="3"/>
        <path d="M95 30 L100 18 L105 30 L100 33Z" fill="#fbbf24"/>
        {/* Rope ladder on exterior */}
        <line x1="68" y1="92" x2="68" y2="175" stroke="#92400e" strokeWidth="1.5"/>
        <line x1="73" y1="92" x2="73" y2="175" stroke="#92400e" strokeWidth="1.5"/>
        {[0,1,2,3,4,5,6,7].map(i => (
          <line key={`rl${i}`} x1={68} y1={102+i*10} x2={73} y2={102+i*10} stroke="#78350f" strokeWidth="1.5"/>
        ))}
        {/* Door */}
        <rect x="90" y="168" width="20" height="18" rx="2" fill="#1c1917"/>
        <rect x="93" y="171" width="6" height="10" rx="1" fill="#292524"/>
        <rect x="101" y="171" width="6" height="10" rx="1" fill="#292524"/>
        {/* Pine trees with snow */}
        <path d="M50 198 L58 175 L66 198Z" fill="#166534"/>
        <path d="M48 190 L58 166 L68 190Z" fill="#15803d"/>
        <path d="M48 190 Q58 183 68 190" fill="#e2e8f0" opacity="0.6"/>
        <rect x="56" y="198" width="4" height="8" fill="#92400e"/>
        <path d="M135 198 L143 175 L151 198Z" fill="#166534"/>
        <path d="M133 190 L143 166 L153 190Z" fill="#15803d"/>
        <path d="M133 190 Q143 183 153 190" fill="#e2e8f0" opacity="0.6"/>
        <rect x="141" y="198" width="4" height="8" fill="#92400e"/>
        {/* Snow flecks */}
        {[[55,100],[145,90],[60,130],[140,120],[55,160]].map(([x,y],i) => (
          <circle key={`sn${i}`} cx={x} cy={y} r="1.5" fill="#e2e8f0" opacity="0.7"/>
        ))}
      </svg>
    )
  },
  {
    id: 10,
    name: "The Sunken Vault",
    type: "Dungeon Entrance",
    description: "A foreboding subterranean entrance half-buried in the hillside. Iron-banded double doors descend below grade, flanked by skull-carved pillars, green torch flames, and bone-white stonework.",
    accent: "#4ade80",
    bg: "from-slate-950 to-emerald-950",
    icon: "💀",
    tags: ["Underground", "Ominous", "Dungeon"],
    svg: (
      <svg viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="200" rx="82" ry="14" fill="#022c22" opacity="0.6"/>
        {/* Hillside/mound */}
        <ellipse cx="100" cy="175" rx="82" ry="35" fill="#1c2918"/>
        <ellipse cx="100" cy="170" rx="78" ry="30" fill="#1a3a1a"/>
        {/* Grass on top */}
        <ellipse cx="100" cy="165" rx="74" ry="20" fill="#14532d" opacity="0.8"/>
        {/* Rock outcropping */}
        <path d="M30 158 Q50 140 80 145 Q100 138 120 145 Q150 140 170 158 Q150 165 100 168 Q50 165 30 158Z" fill="#2d4a2d"/>
        {/* Lichen patches */}
        {[[50,152],[80,145],[130,148],[160,155]].map(([x,y],i) => (
          <ellipse key={`li${i}`} cx={x} cy={y} rx={8+i*2} ry={4} fill="#365314" opacity="0.6"/>
        ))}
        {/* Sunken area */}
        <path d="M65 168 Q100 155 135 168 L135 200 L65 200Z" fill="#0f1a0f"/>
        {/* Stone surround arch */}
        <path d="M60 168 Q100 148 140 168" stroke="#4b5563" strokeWidth="6" fill="none"/>
        <path d="M60 168 Q100 148 140 168" stroke="#374151" strokeWidth="4" fill="none"/>
        {/* Arch keystone details */}
        {[0,1,2,3,4,5,6,7].map(i => {
          const t = i / 7;
          const angle = Math.PI - t * Math.PI;
          const r = 40;
          const cx = 100 + r * Math.cos(angle);
          const cy = 158 + r * Math.sin(angle) * 0.55;
          return <rect key={`ak${i}`} x={cx-4} y={cy-3} width="8" height="6" rx="1"
            fill="#4b5563" opacity="0.8" transform={`rotate(${(t*180)-90} ${cx} ${cy})`}/>;
        })}
        {/* Stone pillars */}
        <rect x="60" y="158" width="14" height="42" rx="2" fill="#374151"/>
        <rect x="126" y="158" width="14" height="42" rx="2" fill="#374151"/>
        {/* Pillar stone texture */}
        {[0,1,2,3,4].map(i => (
          <rect key={`pl${i}`} x={62} y={162+i*7} width="10" height="5" rx="1" fill="#4b5563" opacity="0.5"/>
        ))}
        {[0,1,2,3,4].map(i => (
          <rect key={`pr${i}`} x={128} y={162+i*7} width="10" height="5" rx="1" fill="#4b5563" opacity="0.5"/>
        ))}
        {/* Skull carvings on pillars */}
        <circle cx="67" cy="162" r="5" fill="#292524"/>
        <circle cx="65" cy="161" r="1.5" fill="#4ade80" opacity="0.7"/>
        <circle cx="69" cy="161" r="1.5" fill="#4ade80" opacity="0.7"/>
        <path d="M64 164 Q67 166 70 164" stroke="#4ade80" strokeWidth="0.8" fill="none" opacity="0.6"/>
        <circle cx="133" cy="162" r="5" fill="#292524"/>
        <circle cx="131" cy="161" r="1.5" fill="#4ade80" opacity="0.7"/>
        <circle cx="135" cy="161" r="1.5" fill="#4ade80" opacity="0.7"/>
        <path d="M130 164 Q133 166 136 164" stroke="#4ade80" strokeWidth="0.8" fill="none" opacity="0.6"/>
        {/* Iron-banded doors going down */}
        <path d="M72 168 Q100 160 128 168 L128 200 L72 200Z" fill="#1c1917"/>
        {/* Left door */}
        <rect x="73" y="169" width="26" height="30" rx="1" fill="#292524"/>
        {/* Right door */}
        <rect x="101" y="169" width="26" height="30" rx="1" fill="#1c1917"/>
        {/* Iron bands */}
        {[0,1,2].map(i => (
          <rect key={`ib${i}`} x={73} y={175+i*8} width="26" height="3" rx="1" fill="#374151"/>
        ))}
        {[0,1,2].map(i => (
          <rect key={`ib2${i}`} x={101} y={175+i*8} width="26" height="3" rx="1" fill="#374151"/>
        ))}
        {/* Door bolts */}
        {[[79,177],[85,177],[79,193],[85,193]].map(([x,y],i) => (
          <circle key={`bl${i}`} cx={x} cy={y} r="2" fill="#6b7280"/>
        ))}
        {[[107,177],[113,177],[107,193],[113,193]].map(([x,y],i) => (
          <circle key={`br${i}`} cx={x} cy={y} r="2" fill="#6b7280"/>
        ))}
        {/* Green torch flames */}
        <line x1="62" y1="175" x2="62" y2="190" stroke="#166534" strokeWidth="2"/>
        <path d="M58 175 Q62 165 66 175 Q62 170 58 175Z" fill="#4ade80" opacity="0.9"/>
        <circle cx="62" cy="170" r="5" fill="#4ade80" opacity="0.3"/>
        <line x1="138" y1="175" x2="138" y2="190" stroke="#166534" strokeWidth="2"/>
        <path d="M134 175 Q138 165 142 175 Q138 170 134 175Z" fill="#4ade80" opacity="0.9"/>
        <circle cx="138" cy="170" r="5" fill="#4ade80" opacity="0.3"/>
        {/* Green glow on ground */}
        <ellipse cx="62" cy="188" rx="8" ry="3" fill="#4ade80" opacity="0.15"/>
        <ellipse cx="138" cy="188" rx="8" ry="3" fill="#4ade80" opacity="0.15"/>
        {/* Chains on doors */}
        {[0,1,2,3,4].map(i => (
          <circle key={`ch${i}`} cx={100} cy={175+i*5} r="2" fill="none" stroke="#6b7280" strokeWidth="1"/>
        ))}
        {/* Eerie mist at base */}
        <ellipse cx="100" cy="200" rx="30" ry="5" fill="#4ade80" opacity="0.08"/>
        {/* Bones/skulls at base */}
        <circle cx="80" cy="198" r="3" fill="#d4d4d4" opacity="0.5"/>
        <circle cx="120" cy="197" r="3" fill="#d4d4d4" opacity="0.5"/>
        {/* Warning runes */}
        <text x="100" y="155" textAnchor="middle" fill="#4ade80" fontSize="8" opacity="0.5">⚠ ☠ ⚠</text>
      </svg>
    )
  }
];

export default function FantasyBuildings() {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29, #1a1a2e, #16213e)",
      fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
      padding: "32px 20px"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "12px", letterSpacing: "6px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
          ✦ Fantasy World Builder ✦
        </div>
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: "bold",
          background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: "0 0 8px 0",
          textShadow: "none",
          letterSpacing: "2px"
        }}>
          Realm Structures
        </h1>
        <p style={{ color: "#64748b", fontSize: "15px", margin: 0, fontStyle: "italic" }}>
          Ten buildings for your world — tap to inspect
        </p>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "20px",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        {buildings.map((b) => (
          <div
            key={b.id}
            onClick={() => setSelected(selected?.id === b.id ? null : b)}
            onMouseEnter={() => setHovered(b.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              cursor: "pointer",
              borderRadius: "16px",
              overflow: "hidden",
              border: `1.5px solid ${selected?.id === b.id ? b.accent : hovered === b.id ? b.accent + "80" : "#1e293b"}`,
              boxShadow: selected?.id === b.id
                ? `0 0 30px ${b.accent}40, 0 8px 32px rgba(0,0,0,0.5)`
                : hovered === b.id
                ? `0 0 16px ${b.accent}30, 0 4px 20px rgba(0,0,0,0.4)`
                : "0 4px 16px rgba(0,0,0,0.3)",
              transition: "all 0.3s ease",
              transform: hovered === b.id ? "translateY(-4px)" : "none",
              background: "#0f172a"
            }}
          >
            {/* Image area */}
            <div style={{
              height: "220px",
              background: `linear-gradient(135deg, ${b.bg.split(" ")[1].replace("from-","").replace("slate-900","#0f172a").replace("slate-950","#020617")}, ${b.bg.split(" ")[2].replace("to-teal-950","#042f2e").replace("to-blue-950","#0a0f2e").replace("to-cyan-950","#0a1c2e").replace("to-orange-950","#1c0a00").replace("to-purple-950","#1a0030").replace("to-green-950","#0a1f0a").replace("to-yellow-950","#1a0f00").replace("to-rose-950","#1a0010").replace("to-sky-950","#020f1c").replace("to-emerald-950","#020f0a")} )`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              padding: "16px"
            }}>
              {/* Number badge */}
              <div style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: b.accent + "22",
                border: `1px solid ${b.accent}66`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                color: b.accent,
                fontWeight: "bold"
              }}>
                {b.id}
              </div>
              {/* Icon */}
              <div style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                fontSize: "20px"
              }}>{b.icon}</div>
              {/* SVG building */}
              <div style={{ width: "170px", height: "190px", filter: hovered === b.id ? `drop-shadow(0 0 12px ${b.accent}60)` : "none", transition: "filter 0.3s" }}>
                {b.svg}
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <h3 style={{ margin: 0, color: "#f1f5f9", fontSize: "16px", fontWeight: "bold", letterSpacing: "0.5px" }}>
                  {b.name}
                </h3>
                <span style={{
                  fontSize: "10px",
                  color: b.accent,
                  border: `1px solid ${b.accent}50`,
                  borderRadius: "4px",
                  padding: "2px 6px",
                  whiteSpace: "nowrap",
                  marginLeft: "8px"
                }}>
                  {b.type}
                </span>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "10px" }}>
                {b.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: "10px",
                    color: "#64748b",
                    background: "#1e293b",
                    borderRadius: "3px",
                    padding: "2px 6px"
                  }}>{tag}</span>
                ))}
              </div>

              {/* Description - shows when selected */}
              <div style={{
                maxHeight: selected?.id === b.id ? "100px" : "0",
                overflow: "hidden",
                transition: "max-height 0.3s ease"
              }}>
                <p style={{
                  margin: "0",
                  color: "#94a3b8",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  fontStyle: "italic",
                  borderTop: `1px solid ${b.accent}30`,
                  paddingTop: "10px"
                }}>
                  {b.description}
                </p>
              </div>

              {/* Accent bar */}
              <div style={{
                height: "2px",
                borderRadius: "1px",
                background: `linear-gradient(90deg, ${b.accent}, transparent)`,
                marginTop: "10px",
                opacity: hovered === b.id || selected?.id === b.id ? 1 : 0.3,
                transition: "opacity 0.3s"
              }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "48px", color: "#334155", fontSize: "12px", letterSpacing: "3px" }}>
        ✦ &nbsp; TAP A BUILDING TO REVEAL ITS LORE &nbsp; ✦
      </div>
    </div>
  );
}
