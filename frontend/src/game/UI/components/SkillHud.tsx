import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../../storage/gameStore';
import { CharacterName, GameConfig } from '@transcendence/types';
import { theme } from '../../../configs/theme';

import zeusBox from '../../../assets/images/ZeusHUD.png';
import adeBox from '../../../assets/images/AdeHUD.png';
import zeusSpell from '../../../assets/images/SkillZeusSpell.png';
import zeusMelee from '../../../assets/images/SkillZeusMelee.png';
import zeusDef from '../../../assets/images/SkillZeusDef.png';
import adeSpell from '../../../assets/images/SkillAdeSpell.png';
import adeMelee from '../../../assets/images/SkillAdeMelee.png';
import adeDef from '../../../assets/images/SkillAdeDef.png';

// ── CALIBRAZIONE ──────────────────────────────────────────────
const DEBUG_SLOTS = false;        // true: contorna gli slot in rosso
const DEBUG_COOLDOWN = false;     // true: simula i cooldown da tastiera (test senza partita)

const HUD_SCALE = 0.45;           // DIMENSIONE COMPLESSIVA.
const BOX = { w: 747, h: 408 };
const SLOT = 90;
const SLOTS = [
  { x: 379, y: 79 },   // alto-sinistra  -> skills[0]
  { x: 572, y: 78 },   // alto-destra    -> skills[1]
  { x: 573, y: 235 },  // basso-destra   -> skills[2]
];

const DEBUG_HP = false;
const HP_BAR = { x: 102, y: 310, w: 400, h: 30 };
const HP_MAX = GameConfig.PLAYER.DEFAULT_HP;   // 100, dal config condiviso

const DEBUG_KD = false;
const KD_POS = { x: 350, y: 200 };
const KD_FONT = 28;

const SIM_CD: Record<string, number> = { spell: 8, melee: 4, defence: 6 };
// ──────────────────────────────────────────────────────────────

// Copia locale di CHARACTER_DATA (danno + cooldown): sta nel backend di Giovanni,
// non in @transcendence/types, quindi non e' importabile. A regime conviene che
// Giovanni lo sposti in shared e poi lo si importa. Per ora: mirror manuale.
const CHARACTER_STATS = {
  [CharacterName.ZEUS]: {
    melee:   { damage: 15,  cooldown: 0.8 },
    spell:   { damage: 8,   cooldown: 1.5, speed: 40 },
    defence: { cooldown: 5.0 },
  },
  [CharacterName.ADE]: {
    melee:   { damage: 15,  cooldown: 1.2 },
    spell:   { damage: 7.5, cooldown: 1.0, speed: 40 },
    defence: { cooldown: 6.0 },
  },
} as const;

// nome del campo cooldown nello snapshot, per skill
const CD_FIELD: Record<string, string> = {
  melee:   'meleeAttackCooldown',
  spell:   'spellAttackCooldown',
  defence: 'defenceAttackCooldown',
};

type SkillDef = { id: 'spell' | 'melee' | 'defence'; icon: string; key: string; code: string };

const HUD: Record<string, { box: string; skills: SkillDef[] }> = {
  [CharacterName.ZEUS]: {
    box: zeusBox,
    skills: [
      { id: 'spell',   icon: zeusSpell, key: 'SHIFT', code: 'ShiftLeft' },
      { id: 'melee',   icon: zeusMelee, key: 'SPACE', code: 'Space' },
      { id: 'defence', icon: zeusDef,   key: 'C',     code: 'KeyC' },
    ],
  },
  [CharacterName.ADE]: {
    box: adeBox,
    skills: [
      { id: 'spell',   icon: adeSpell, key: 'SHIFT', code: 'ShiftLeft' },
      { id: 'melee',   icon: adeMelee, key: 'SPACE', code: 'Space' },
      { id: 'defence', icon: adeDef,   key: 'C',     code: 'KeyC' },
    ],
  },
};

// nome + descrizione (testo libero, modificalo); i numeri vengono dal config.
const SKILL_TEXT: Record<string, Record<string, { name: string; desc: string }>> = {
  [CharacterName.ZEUS]: {
    spell:   { name: 'Thunder-bolt', desc: 'Una saetta viene scagliata con violenza dall\u2019aura di Zeus verso il punto scelto.' },
    melee:   { name: 'Thunderstorm',   desc: 'L\u2019aura di Zeus inizia a dilatarsi violentemente facendo danni a qualsiasi bersaglio rientri nella sua area.' },
    defence: { name: 'Thunder Shell',   desc: 'I fulmini di Zeus si raggruppano in un impenetrabile groviglio elettrico che lo isola completamente dai danni.' },
  },
  [CharacterName.ADE]: {
    spell:   { name: 'Fire-ball',   desc: 'Una sfera infuocata si stacca dall\u2019aura di Ade per essere scagliata sul bersaglio.' },
    melee:   { name: 'Fire explosion',   desc: 'L\u2019aura di Ade diventa un turbine di fuoco che colpisce tutto intorno a se.' },
    defence: { name: 'Fire Shell',    desc: 'Il fuoco di Ade si solidifica intorno a lui e annulla tutti i danni subiti per un breve periodo di tempo.' },
  },
};

// righe statistiche del tooltip, condizionali per tipo di skill (valori dal config)
function skillRows(character: CharacterName, id: string): { label: string; value: string }[] {
  const s: any = (CHARACTER_STATS as any)[character]?.[id] ?? {};
  const C = GameConfig.COMBAT;
  if (id === 'melee')
    return [
      { label: 'Danno',    value: `${s.damage}` },
      { label: 'Area',  value: `${C.MELEE_HITBOX_RADIUS}` },
      { label: 'Ricarica', value: `${s.cooldown}s` },
    ];
  if (id === 'spell')
    return [
      { label: 'Danno',    value: `${s.damage}` },
      { label: 'Area',     value: `${C.SPELL_HITBOX_RADIUS}` },
      { label: 'Velocita', value: `${s.speed}` },
      { label: 'Ricarica', value: `${s.cooldown}s` },
    ];
  if (id === 'defence')
    return [
      { label: 'Durata',   value: `${C.DEFENCE_DURATION}s` },
      { label: 'Ricarica', value: `${s.cooldown}s` },
    ];
  return [];
}

interface SkillHudProps {
  character: CharacterName;
  myUserId: string;
  myUsername: string;
}

export default function SkillHud({ character, myUserId, myUsername }: SkillHudProps) {
  const cfg = HUD[character];
  const players = useGameStore((s) => s.gameState?.players) || [];
  const me = players.find((p) => (p as any).userName === myUsername || p.id === myUserId);

  const k = HUD_SCALE;
  const [hovered, setHovered] = useState<string | null>(null);

  // ── DEBUG_COOLDOWN: timer locali per testare la lancetta senza partita ──
  const cdEnd = useRef<Record<string, number>>({});
  const [, force] = useState(0);
  useEffect(() => {
    if (!DEBUG_COOLDOWN || !cfg) return;
    const onKey = (e: KeyboardEvent) => {
      const s = cfg.skills.find((sk) => sk.code === e.code);
      if (!s) return;
      if (e.code === 'Space') e.preventDefault();
      if ((cdEnd.current[s.id] || 0) - Date.now() > 0) return;
      cdEnd.current[s.id] = Date.now() + (SIM_CD[s.id] || 5) * 1000;
    };
    window.addEventListener('keydown', onKey);
    let raf = 0;
    const tick = () => { force((n) => n + 1); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); };
  }, [cfg]);

  if (!cfg) return null;

  // Cooldown reale: lo snapshot manda il tempo TRASCORSO dall'ultimo uso (sale da 0).
  // ready quando trascorso >= totale; remaining = totale - trascorso.
  const readCooldown = (id: string) => {
    const total = (CHARACTER_STATS as any)[character]?.[id]?.cooldown ?? 1;
    if (DEBUG_COOLDOWN) {
      const rem = Math.max(0, ((cdEnd.current[id] || 0) - Date.now()) / 1000);
      return { remaining: rem, total: SIM_CD[id] || 5 };
    }
    const elapsed = Number((me as any)?.[CD_FIELD[id]] ?? total); // default = pronto
    return { remaining: Math.max(0, total - elapsed), total };
  };

  // HP / Kill / Death dallo snapshot live
  const hpRaw = (me as any)?.hp ?? (me as any)?.health;
  const hp = Math.max(0, Math.min(HP_MAX, hpRaw ?? HP_MAX));
  const hpRatio = HP_MAX > 0 ? hp / HP_MAX : 0;
  const hpColor = hpRatio > 0.5 ? '#46c66b' : hpRatio > 0.25 ? '#e0a32e' : '#e84057';

  const kills = (me as any)?.kill ?? 0;
  const deaths = (me as any)?.dead ?? 0;

  return (
    <>
    <div style={{
      position: 'fixed', left: 16, bottom: 16, zIndex: 500,
      width: BOX.w, height: BOX.h,
      transform: `scale(${k})`, transformOrigin: 'bottom left',
      pointerEvents: 'none',
    }}>
      <img src={cfg.box} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* barra vita */}
      <div style={{
        position: 'absolute', left: HP_BAR.x, top: HP_BAR.y, width: HP_BAR.w, height: HP_BAR.h,
        borderRadius: HP_BAR.h / 2, overflow: 'hidden',
        background: 'rgba(6,14,20,0.85)',
        border: `2px solid ${theme.colors.border}`,
        outline: DEBUG_HP ? '1px solid red' : 'none',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${hpRatio * 100}%`,
          background: `linear-gradient(180deg, ${hpColor}, ${hpColor}cc)`,
          transition: 'width 0.25s ease, background 0.25s ease',
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: theme.fonts.heading, fontSize: 15, fontWeight: 700, letterSpacing: 0.5,
          color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}>
          {hp} / {HP_MAX}
        </div>
      </div>

      {/* Kill / Death — griglia: etichette a destra => i ':' si allineano */}
      <div style={{
        position: 'absolute', left: KD_POS.x, top: KD_POS.y,
        display: 'grid', gridTemplateColumns: 'auto auto', columnGap: '0.35em',
        justifyContent: 'start', alignItems: 'baseline',
        fontFamily: theme.fonts.heading, fontSize: KD_FONT, fontWeight: 400,
        color: theme.colors.gold, lineHeight: 1.25,
        textShadow: '0 2px 4px rgba(0,0,0,0.9)', whiteSpace: 'nowrap',
        outline: DEBUG_KD ? '1px solid red' : 'none',
      }}>
        <span style={{ textAlign: 'right' }}>Kill:</span><span>{kills}</span>
        <span style={{ textAlign: 'right' }}>Death:</span><span>{deaths}</span>
      </div>

      {cfg.skills.map((s, i) => {
        const pos = SLOTS[i];
        if (!pos) return null;
        const { remaining, total } = readCooldown(s.id);
        const onCd = remaining > 0.001;
        const angle = (remaining / total) * 360;

        return (
          <div key={s.id}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered((h) => (h === s.id ? null : h))}
            style={{
            position: 'absolute', left: pos.x, top: pos.y, width: SLOT, height: SLOT,
            overflow: 'hidden', borderRadius: 6,
            pointerEvents: 'auto', cursor: 'help',
            outline: DEBUG_SLOTS ? '1px solid red' : 'none',
          }}>
            <img src={s.icon} alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: onCd ? 'grayscale(0.6) brightness(0.7)' : 'none',
            }} />

            {onCd && (
              <div style={{
                position: 'absolute', inset: 0,
                background: `conic-gradient(rgba(6,14,20,0.78) ${angle}deg, transparent ${angle}deg)`,
              }} />
            )}

            {onCd && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontFamily: theme.fonts.heading, fontSize: 22, fontWeight: 700,
                color: theme.colors.goldBright, textShadow: '0 2px 4px rgba(0,0,0,0.9)',
              }}>
                {Math.ceil(remaining)}
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Tooltip skill (fuori dal container scalato, font leggibile) */}
    {hovered && SKILL_TEXT[character]?.[hovered] && (
      <div style={{
        position: 'fixed', left: 16, bottom: 16 + BOX.h * HUD_SCALE + 10, zIndex: 501,
        width: 320, padding: '14px 16px',
        background: 'rgba(8,16,22,0.96)',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
      }}>
        {(() => {
          const txt = SKILL_TEXT[character][hovered];
          const rows = skillRows(character, hovered);
          return (
            <>
              <div style={{
                fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 700,
                color: theme.colors.goldBright, marginBottom: 6,
              }}>{txt.name}</div>
              <div style={{
                fontFamily: (theme.fonts as any).body ?? 'serif', fontSize: 13,
                color: 'rgba(230,220,200,0.85)', lineHeight: 1.45, marginBottom: 10,
              }}>{txt.desc}</div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'auto auto', rowGap: 4, columnGap: 16,
                fontFamily: theme.fonts.heading, fontSize: 13, color: theme.colors.gold,
                borderTop: `1px solid ${theme.colors.border}`, paddingTop: 8,
              }}>
                {rows.map((r) => (
                  <div key={r.label} style={{ display: 'contents' }}>
                    <span>{r.label}</span>
                    <span style={{ color: '#fff', textAlign: 'right' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>
    )}
    </>
  );
}
