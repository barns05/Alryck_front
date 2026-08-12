/**
 * useInviteTheme — Récupère le thème visuel du Programme du Jour J lié à un
 * événement, pour l'appliquer aux pages invité (RSVP + détail invitation).
 *
 * Source unique : ProgrammeJourJ.theme_id + themes_debloques.
 * Aucune duplication : les pages invité lisent la même source que le Programme.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getTheme } from '@/components/programme/programmeTheme';
import PremiumWrapper from '@/components/programme/PremiumWrapper';

export { PremiumWrapper };

export function useInviteTheme(evenementId) {
  const qc = useQueryClient();
  const { data: programme = null } = useQuery({
    queryKey: ['invite-theme-programme', evenementId],
    queryFn: () => base44.entities.ProgrammeJourJ.filter({ evenement_id: evenementId }).then(r => r[0] || null),
    enabled: !!evenementId,
    staleTime: 60000,
  });

  const themeId = programme?.theme_id || 'navy_cristal';
  const theme = getTheme(themeId);
  const themesDebloques = programme?.themes_debloques || [];
  const isPremiumUnlocked = !!theme.premium && themesDebloques.includes(themeId);

  const updateTheme = async (newThemeId) => {
    if (!programme?.id) return;
    await base44.entities.ProgrammeJourJ.update(programme.id, { theme_id: newThemeId });
    qc.invalidateQueries({ queryKey: ['invite-theme-programme', evenementId] });
  };

  return { theme, themeId, isPremiumUnlocked, programme, updateTheme };
}

/**
 * Déduit un jeu de styles cohérents depuis un objet thème, pour les pages invité.
 * Les champs de saisie restent sur fond blanc solide pour la lisibilité.
 */
export function inviteThemeStyle(theme, isPremiumUnlocked) {
  if (!theme) theme = getTheme('navy_cristal');
  const accent = theme.accent || '#C5A059';
  return {
    page: { background: theme.pageBg, color: theme.text, minHeight: '100vh' },
    text: theme.text,
    textMuted: theme.textMuted,
    accent,
    accentBg: theme.accentBg,
    cardBg: theme.cardBg,
    cardBorder: theme.cardBorder,
    inputBg: '#ffffff',
    inputText: '#1e293b',
    btnBg: theme.buttonBg || accent,
    btnText: theme.buttonText || theme.accentText || '#ffffff',
    headerBg: isPremiumUnlocked ? 'transparent' : theme.cardBg,
    headingFont: theme.headingFont || undefined,
  };
}