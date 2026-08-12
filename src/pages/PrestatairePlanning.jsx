import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Briefcase, Phone, Mail } from 'lucide-react';

const statutColors = {
  'À contacter': 'bg-amber-100 text-amber-700 border-amber-200',
  'Contacté':    'bg-blue-100 text-blue-700 border-blue-200',
  'Confirmé':    'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Annulé':      'bg-red-100 text-red-600 border-red-200',
};

const typeIcons = {
  'Mariage':             '💍',
  'Baptême':             '🕊️',
  'Anniversaire':        '🎂',
  "Soirée d'entreprise": '🏢',
  'Cocktail':            '🥂',
  'Gala':                '✨',
  'Autre':               '🎉',
};

export default function PrestatairePlanning() {
  const [prestataire, setPrestataire] = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setError('Lien invalide. Aucun token trouvé.');
      setLoading(false);
      return;
    }

    (async () => {
      const prestataires = await base44.entities.Prestataire.filter({ lien_token: token });
      if (!prestataires || prestataires.length === 0) {
        setError('Prestataire introuvable. Vérifiez le lien ou contactez votre organisateur.');
        setLoading(false);
        return;
      }
      const p = prestataires[0];
      setPrestataire(p);

      // Récupérer les associations de cet prestataire
      const assocs = await base44.entities.EvenementPrestataire.filter({ prestataire_id: p.id });

      // Récupérer les événements associés
      const evResults = await Promise.all(
        assocs.map(a =>
          base44.entities.Evenement.filter({ id: a.evenement_id })
            .then(evs => evs[0] ? { ...evs[0], assoc: a } : null)
        )
      );

      setEvenements(evResults.filter(Boolean).sort((a, b) => (a.date || '').localeCompare(b.date || '')));
      setLoading(false);
    })().catch(() => {
      setError('Impossible de charger les données.');
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Chargement de votre planning...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-md shadow-sm">
          <div className="text-4xl mb-3">😕</div>
          <h2 className="font-semibold text-lg mb-2">Accès impossible</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcoming = evenements.filter(e => e.date && new Date(e.date) >= now);
  const past = evenements.filter(e => e.date && new Date(e.date) < now);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">{prestataire.nom}</h1>
          {prestataire.domaine && (
            <span className="inline-block bg-white/20 text-white text-sm px-3 py-1 rounded-full font-medium">
              {prestataire.domaine}
            </span>
          )}
          <div className="flex items-center justify-center gap-4 mt-4 text-white/75 text-sm flex-wrap">
            {prestataire.telephone && (
              <span className="flex items-center gap-1.5"><Phone size={13} />{prestataire.telephone}</span>
            )}
            {prestataire.email && (
              <span className="flex items-center gap-1.5"><Mail size={13} />{prestataire.email}</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{evenements.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Événements</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{upcoming.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">À venir</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">
              {evenements.filter(e => e.assoc?.statut === 'Confirmé').length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Confirmés</p>
          </div>
        </div>

        {/* Événements à venir */}
        {upcoming.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Prochains événements</h2>
            {upcoming.map(ev => <EvenementCard key={ev.id} ev={ev} />)}
          </div>
        )}

        {upcoming.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
            <Calendar size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">Aucun événement à venir</p>
          </div>
        )}

        {/* Passés */}
        {past.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-400 text-sm uppercase tracking-wide">Passés</h2>
            {past.map(ev => <EvenementCard key={ev.id} ev={ev} past />)}
          </div>
        )}

        <div className="text-center pt-4 pb-8 text-slate-400 text-xs flex items-center justify-center gap-1.5">
          <Briefcase size={12} />
          <span>Planning partagé par votre organisateur — ExtraPlanning</span>
        </div>
      </div>
    </div>
  );
}

function EvenementCard({ ev, past }) {
  const emoji = typeIcons[ev.type_evenement] || '🎉';
  const days = ev.date ? differenceInDays(new Date(ev.date), new Date()) : null;
  const statutClass = {
    'À contacter': 'bg-amber-100 text-amber-700 border-amber-200',
    'Contacté':    'bg-blue-100 text-blue-700 border-blue-200',
    'Confirmé':    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Annulé':      'bg-red-100 text-red-600 border-red-200',
  }[ev.assoc?.statut] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 ${past ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{emoji}</div>
          <div>
            <p className="font-semibold text-slate-800">{ev.nom}</p>
            {ev.date && (
              <p className="text-sm text-slate-500 capitalize">
                {format(parseISO(ev.date), 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            )}
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${statutClass}`}>
          {ev.assoc?.statut}
        </span>
      </div>

      {!past && days !== null && days >= 0 && (
        <div className="bg-purple-50 rounded-xl px-3 py-2 text-center">
          <p className="text-purple-700 font-bold text-lg">{days === 0 ? "Aujourd'hui !" : `J−${days}`}</p>
          <p className="text-purple-500 text-xs">{days === 0 ? '' : `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        {(ev.heure_debut || ev.heure_fin) && (
          <span className="flex items-center gap-1.5">
            <Clock size={12} />{ev.heure_debut} – {ev.heure_fin}
          </span>
        )}
        {ev.lieu_nom && (
          <span className="flex items-center gap-1.5 col-span-2">
            <MapPin size={12} />{ev.lieu_nom}
          </span>
        )}
      </div>

      {ev.assoc?.montant && (
        <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
          Montant négocié : <span className="font-semibold text-slate-700">{ev.assoc.montant.toLocaleString('fr-FR')} €</span>
        </div>
      )}

      {ev.assoc?.notes && (
        <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 border-t border-slate-100">
          {ev.assoc.notes}
        </div>
      )}
    </div>
  );
}