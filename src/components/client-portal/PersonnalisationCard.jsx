/**
 * PersonnalisationCard — Carte premium ALRYCK "Personnalisation"
 *
 * Deux états basculables manuellement par l'utilisateur :
 *   - Pleine largeur : asset Layer 1, liseré doré, titre blanc (défaut)
 *   - Compacte : carte réduite en barre pliable
 *
 * La préférence est persistée via evenement.personnalisation_card_reduced.
 * Le tap sur le contenu principal ouvre le drawer ; l'icône de réduction bascule l'état.
 *
 * Dynamiques :
 *   1. Bounce du bouton "Personnaliser" tant que les 3 étapes ne sont pas complétées.
 *   2. Réduction automatique vers la version compacte dès que les 3 étapes sont complétées.
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useInviteTheme } from '@/components/invite-portal/useInviteTheme';
import { ChevronDown, ChevronUp, Palette } from 'lucide-react';
import PersonnalisationProgress from './PersonnalisationProgress';

const LAYER1_URL = 'https://media.base44.com/images/public/69b804640546049d1a7bf53a/970596bf2_BF710DE4-F2B6-4AED-B089-1A5689E57CC7.png';

export default function PersonnalisationCard({ evenement, clientId, onClick, onToggleReduce }) {
  const isReduced = evenement?.personnalisation_card_reduced === true;
  const autoReducedRef = useRef(false);

  // ── Étape 1 : photo de profil du client ──────────────────────────────────
  const { data: client } = useQuery({
    queryKey: ['personnalisation-client', clientId],
    queryFn: () => base44.entities.Client.get(clientId),
    enabled: !!clientId,
    staleTime: 30000,
  });

  // ── Étape 3 : thème ProgrammeJourJ (≠ navy_cristal) ──────────────────────
  const { themeId } = useInviteTheme(evenement?.id);

  // ── Calcul des étapes ────────────────────────────────────────────────────
  const step1Done = !!(client?.photo_profil_url && String(client.photo_profil_url).trim() !== '');
  const step2Done = !!(evenement?.photo_bandeau_url?.trim() || evenement?.couleur_theme?.trim());
  const step3Done = !!themeId && themeId !== 'navy_cristal';
  const allDone = step1Done && step2Done && step3Done;

  // ── Réduction automatique quand les 3 étapes sont complétées ─────────────
  useEffect(() => {
    if (allDone && !isReduced && !autoReducedRef.current) {
      autoReducedRef.current = true;
      onToggleReduce?.(true);
    }
  }, [allDone, isReduced, onToggleReduce]);

  const handleToggle = (e) => {
    e.stopPropagation();
    onToggleReduce?.(!isReduced);
  };

  // ── Version compacte — une seule ligne fine ──────────────────────────────
  const compactCard = (
    <motion.div
      key="compact"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      whileTap={{ scale: 0.985 }}
      data-onboarding-target="personnalisation-card"
      onClick={onClick}
      className="relative w-full text-left overflow-hidden mx-auto cursor-pointer"
      style={{
        maxWidth: 480,
        background: '#FFFBF0',
        border: '1.5px solid #C5A059',
        borderRadius: 14,
      }}
    >
      <div className="flex items-center gap-2.5" style={{ padding: '7px 14px' }}>
        <Palette size={15} style={{ color: '#1e1b4b' }} />
        <p className="text-sm font-semibold truncate flex-1" style={{ color: '#1e1b4b' }}>
          Personnalisez votre espace
        </p>
        <PersonnalisationProgress
          step1Done={step1Done}
          step2Done={step2Done}
          step3Done={step3Done}
          variant="compact"
        />
        <button
          type="button"
          onClick={handleToggle}
          className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-colors hover:bg-amber-100/70"
          title="Agrandir"
          style={{ background: 'rgba(197,160,89,0.16)' }}
        >
          <ChevronDown size={15} style={{ color: '#9a7b1f' }} />
        </button>
      </div>
    </motion.div>
  );

  // ── Version pleine — asset Layer 1 + liseré doré ────────────────────────
  const fullCard = (
    <motion.div
      key="full"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      whileTap={{ scale: 0.985 }}
      whileHover={{ boxShadow: '0 16px 44px rgba(11,17,48,0.50), 0 0 16px rgba(197,160,89,0.15)' }}
      data-onboarding-target="personnalisation-card"
      onClick={onClick}
      className="relative w-full text-left overflow-hidden mx-auto cursor-pointer"
      style={{
        maxWidth: 480,
        backgroundImage: `url(${LAYER1_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'right center',
        backgroundRepeat: 'no-repeat',
        border: '1px solid #C5A059',
        borderRadius: 24,
        minHeight: 168,
        maxHeight: 190,
        boxShadow: '0 6px 24px rgba(11,17,48,0.30)',
      }}
    >
      <div className="relative z-10 flex flex-col justify-center" style={{ padding: '20px 22px', minHeight: 168, maxHeight: 190 }}>
        <p className="text-[16px] font-bold leading-tight text-white" style={{ letterSpacing: '-0.01em', maxWidth: '50%' }}>
          Créez l'univers de votre événement
        </p>
        <p className="text-[11px] font-semibold text-white/75 mt-1.5" style={{ maxWidth: '50%' }}>
          Invitation & Programme jour J
        </p>
        <button
          type="button"
          onClick={onClick}
          className={`mt-3 self-start px-4 py-2 rounded-full text-xs font-bold transition-transform active:scale-95 ${!allDone ? 'personnalisation-bounce' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #C5A059 0%, #f3d28a 100%)',
            color: '#1e1b4b',
            boxShadow: '0 4px 14px rgba(197,160,89,0.45)',
          }}
        >
          Personnaliser
        </button>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
        style={{ background: 'rgba(30,27,75,0.45)', backdropFilter: 'blur(4px)' }}
        title="Réduire"
      >
        <ChevronUp size={15} style={{ color: '#C5A059' }} />
      </button>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {isReduced ? compactCard : fullCard}
    </AnimatePresence>
  );
}