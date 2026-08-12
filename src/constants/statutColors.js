/**
 * Mappings de couleurs Tailwind pour les statuts de l'application.
 * Centralise toutes les définitions locales dupliquées.
 */

export const STATUT_EVENEMENT_COLORS = {
  'En attente':     'bg-gray-100 text-gray-700 border-gray-200',
  'À configurer':   'bg-orange-100 text-orange-700 border-orange-200',
  'Confirmé':       'bg-yellow-100 text-yellow-700 border-yellow-200',
  'En préparation': 'bg-blue-100 text-blue-700 border-blue-200',
  'Prêt':           'bg-emerald-100 text-emerald-700 border-emerald-200',
  'En cours':       'bg-orange-100 text-orange-700 border-orange-200',
  'Terminé':        'bg-purple-100 text-purple-700 border-purple-200',
  'Annulé':         'bg-red-100 text-red-600 border-red-200',
};

export const STATUT_EVENEMENT_DETAIL_COLORS = {
  'En préparation': 'bg-amber-100 text-amber-700',
  'Confirmé':       'bg-emerald-100 text-emerald-700',
  'En cours':       'bg-blue-100 text-blue-700',
  'Terminé':        'bg-slate-100 text-slate-600',
  'Annulé':         'bg-red-100 text-red-600',
};

export const STATUT_PRESTATAIRE_COLORS = {
  'Recommandé': 'bg-amber-100 text-amber-700',
  'Contacté':    'bg-blue-100 text-blue-700',
  'Confirmé':    'bg-emerald-100 text-emerald-700',
  'Annulé':      'bg-red-100 text-red-600',
};

export const STATUT_RDV_COLORS = {
  'Confirmé':   'bg-emerald-100 text-emerald-700',
  'En attente': 'bg-amber-100 text-amber-700',
};