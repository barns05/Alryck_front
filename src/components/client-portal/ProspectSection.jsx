/**
 * ProspectSection — Wrapper léger vers VitrineProfil
 *
 * Maintenu pour la compatibilité avec ProspectPortal et ClientPortal.
 * Toute la logique est dans components/vitrine/VitrineProfil.jsx
 */
import VitrineProfil from '@/components/vitrine/VitrineProfil';

export default function ProspectSection({ prospect, settings }) {
  return <VitrineProfil mode="prospect" prospect={prospect} settings={settings} />;
}