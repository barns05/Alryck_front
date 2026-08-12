import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Edit2, UploadCloud, AlertCircle, CheckCircle, Clock, CheckCheck, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import ControleModal from './ControleModal';

const CATEGORIE_COLORS = {
  'Sécurité incendie': 'bg-red-100 text-red-700',
  'Electricité': 'bg-yellow-100 text-yellow-700',
  'Hygiène': 'bg-green-100 text-green-700',
  'Structure': 'bg-blue-100 text-blue-700',
  'Administratif': 'bg-purple-100 text-purple-700',
  'Autre': 'bg-slate-100 text-slate-700',
};

function MarquerFaitModal({ controle, onClose, onSaved }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const nextDate = addDays(new Date(date), controle.frequence_jours);
    await base44.entities.ControleSecurite.update(controle.id, {
      derniere_date_controle: date,
      prochaine_date_prevue: format(nextDate, 'yyyy-MM-dd'),
      statut: 'À jour',
    });
    qc.invalidateQueries(['controles-securite']);
    setLoading(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold text-base">✅ Marquer comme fait</h3>
        <p className="text-sm text-muted-foreground">
          Saisissez la date d'intervention pour <strong>{controle.nom}</strong>.
        </p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date d'intervention</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {date && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">
            Prochain contrôle prévu le :{' '}
            <strong>
              {format(addDays(new Date(date), controle.frequence_jours), 'd MMMM yyyy', { locale: fr })}
            </strong>
          </div>
        )}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
          <Button onClick={handleSave} disabled={loading || !date} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            {loading ? 'Enregistrement...' : 'Confirmer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RappelToggle({ controle }) {
  const qc = useQueryClient();
  const [showConfig, setShowConfig] = useState(false);
  const [delai, setDelai] = useState(controle.rappel_delai_jours || 30);
  const [loading, setLoading] = useState(false);

  const rappelActif = !!controle.rappel_actif;

  const toggleRappel = async () => {
    if (rappelActif) {
      // Désactiver
      await base44.entities.ControleSecurite.update(controle.id, { rappel_actif: false });
      qc.invalidateQueries(['controles-securite']);
    } else {
      setShowConfig(true);
    }
  };

  const activerRappel = async () => {
    setLoading(true);
    // Mettre à jour le contrôle avec le rappel activé
    await base44.entities.ControleSecurite.update(controle.id, {
      rappel_actif: true,
      rappel_delai_jours: delai,
    });

    // Créer un rappel dans l'entité Rappel si prochaine_date_prevue existe
    if (controle.prochaine_date_prevue) {
      const dateRappel = format(
        addDays(parseISO(controle.prochaine_date_prevue), -delai),
        'yyyy-MM-dd'
      );
      await base44.entities.Rappel.create({
        titre: `🔒 Contrôle sécurité : ${controle.nom}`,
        date_rappel: dateRappel,
        type: 'Automatique',
        type_lie: 'aucun',
        notes: `Rappel automatique — prochain contrôle prévu le ${format(parseISO(controle.prochaine_date_prevue), 'd MMMM yyyy', { locale: fr })}`,
        statut: 'En attente',
      });
    }

    qc.invalidateQueries(['controles-securite']);
    qc.invalidateQueries(['rappels']);
    setLoading(false);
    setShowConfig(false);
  };

  return (
    <div>
      <button
        onClick={toggleRappel}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
          rappelActif
            ? 'bg-primary/10 text-primary hover:bg-primary/20'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        {rappelActif ? <Bell size={12} /> : <BellOff size={12} />}
        {rappelActif ? `Rappel ${controle.rappel_delai_jours || 30}j avant` : 'Rappel désactivé'}
      </button>

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-base">🔔 Activer un rappel</h3>
            <p className="text-sm text-muted-foreground">
              Un rappel sera créé automatiquement avant la date d'expiration du contrôle <strong>{controle.nom}</strong>.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Délai avant expiration</label>
              <select
                value={delai}
                onChange={e => setDelai(parseInt(e.target.value))}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={7}>7 jours avant</option>
                <option value={14}>14 jours avant</option>
                <option value={30}>30 jours avant</option>
                <option value={60}>60 jours avant</option>
                <option value={90}>90 jours avant</option>
              </select>
            </div>
            {controle.prochaine_date_prevue ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                Rappel créé le :{' '}
                <strong>
                  {format(
                    addDays(parseISO(controle.prochaine_date_prevue), -delai),
                    'd MMMM yyyy',
                    { locale: fr }
                  )}
                </strong>
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ Aucune date de prochain contrôle définie. Enregistrez d'abord une date d'intervention.
              </p>
            )}
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setShowConfig(false)} className="flex-1">Annuler</Button>
              <Button
                onClick={activerRappel}
                disabled={loading || !controle.prochaine_date_prevue}
                className="flex-1"
              >
                {loading ? 'Activation...' : 'Activer le rappel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsSecurite({ onSaved }) {
  const qc = useQueryClient();
  const [modalControle, setModalControle] = useState(null);
  const [marquerFait, setMarquerFait] = useState(null);
  const [search, setSearch] = useState('');

  const { data: controles = [] } = useQuery({
    queryKey: ['controles-securite'],
    queryFn: () => base44.entities.ControleSecurite.list('-updated_date', 200),
  });

  const deleteControle = useMutation({
    mutationFn: (id) => base44.entities.ControleSecurite.delete(id),
    onSuccess: () => qc.invalidateQueries(['controles-securite']),
  });

  const filtered = controles.filter(c =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.categorie?.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date();

  const expiringControles = controles.filter(c => {
    if (!c.prochaine_date_prevue) return false;
    const nextDate = parseISO(c.prochaine_date_prevue);
    return nextDate > today && nextDate <= addDays(today, 30);
  });

  const expiredControles = controles.filter(c => {
    if (!c.prochaine_date_prevue) return false;
    return parseISO(c.prochaine_date_prevue) < today;
  });

  const getStatutBadge = (controle) => {
    if (!controle.prochaine_date_prevue) return null;
    const nextDate = parseISO(controle.prochaine_date_prevue);
    if (nextDate < today) {
      return { text: '🔴 Expiré', icon: AlertCircle, color: 'text-red-600 bg-red-50 border border-red-200' };
    }
    if (nextDate <= addDays(today, 30)) {
      return { text: '⚠️ Bientôt expiré', icon: Clock, color: 'text-amber-600 bg-amber-50 border border-amber-200' };
    }
    return { text: '✅ À jour', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border border-emerald-200' };
  };

  return (
    <div className="space-y-6">
      {/* Alertes */}
      {expiredControles.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-red-900">
              🔴 {expiredControles.length} contrôle{expiredControles.length > 1 ? 's' : ''} expiré{expiredControles.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-700 mt-1">Action immédiate requise pour rester en conformité ERP.</p>
          </div>
        </div>
      )}
      {expiringControles.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-amber-900">
              ⚠️ {expiringControles.length} contrôle{expiringControles.length > 1 ? 's' : ''} expire{expiringControles.length > 1 ? 'nt' : ''} dans moins de 30 jours
            </p>
          </div>
        </div>
      )}

      {/* Barre de recherche et bouton + */}
      <div className="flex gap-2">
        <Input
          placeholder="Rechercher un contrôle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => setModalControle({})} className="gap-2">
          <Plus size={16} /> Nouveau contrôle
        </Button>
      </div>

      {/* Liste des contrôles */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Aucun contrôle trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(controle => {
            const statut = getStatutBadge(controle);
            const StatutIcon = statut?.icon;

            return (
              <div key={controle.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                {/* En-tête */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-sm">{controle.nom}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORIE_COLORS[controle.categorie] || CATEGORIE_COLORS['Autre']}`}>
                        {controle.categorie}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                      <div>
                        <span className="font-medium text-foreground">Fréquence : </span>
                        {controle.frequence_jours === 30 ? 'Mensuel' :
                         controle.frequence_jours === 365 ? 'Annuel' :
                         controle.frequence_jours === 730 ? 'Biannuel' :
                         controle.frequence_jours === 1095 ? '3 ans' :
                         controle.frequence_jours === 1825 ? '5 ans' : controle.frequence_jours + ' jours'}
                      </div>
                      {controle.organisme_intervenant && (
                        <div>
                          <span className="font-medium text-foreground">Organisme : </span>
                          {controle.organisme_intervenant}
                        </div>
                      )}
                      {controle.derniere_date_controle && (
                        <div>
                          <span className="font-medium text-foreground">Dernier contrôle : </span>
                          {format(parseISO(controle.derniere_date_controle), 'd MMM yyyy', { locale: fr })}
                        </div>
                      )}
                      {controle.prochaine_date_prevue && (
                        <div>
                          <span className="font-medium text-foreground">Prochain prévu : </span>
                          {format(parseISO(controle.prochaine_date_prevue), 'd MMM yyyy', { locale: fr })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statut + actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {statut && (
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs ${statut.color}`}>
                        <StatutIcon size={13} />
                        {statut.text}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setModalControle(controle)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Éditer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Supprimer ce contrôle ?')) deleteControle.mutate(controle.id); }}
                        className="p-1.5 rounded hover:bg-red-100 transition-colors text-muted-foreground hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document attaché */}
                {controle.document_url && (
                  <div className="bg-muted/30 rounded-lg p-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UploadCloud size={12} />
                      {controle.document_nom || 'Document'}
                    </div>
                    <a href={controle.document_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                      Télécharger
                    </a>
                  </div>
                )}

                {controle.notes && (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 rounded p-2">{controle.notes}</p>
                )}

                {/* Actions bas de carte */}
                <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => setMarquerFait(controle)}
                  >
                    <CheckCheck size={13} /> Marquer comme fait
                  </Button>
                  <RappelToggle controle={controle} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalControle && (
        <ControleModal
          controle={modalControle}
          onClose={() => setModalControle(null)}
          onSaved={() => {
            setModalControle(null);
            qc.invalidateQueries(['controles-securite']);
          }}
        />
      )}

      {marquerFait && (
        <MarquerFaitModal
          controle={marquerFait}
          onClose={() => setMarquerFait(null)}
          onSaved={() => setMarquerFait(null)}
        />
      )}
    </div>
  );
}