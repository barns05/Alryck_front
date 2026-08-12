import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getYear, parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

function KpiCard({ label, value, sub, color = 'text-primary' }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ─── Tableau de bord équipe ───────────────────────────────────────────────
function TableauDeBordEquipe({ extras, collaborateurs, fichesList, evenements, currentYear }) {
  // Coût par extra (taux_horaire × heures — si heures_reelles dispo sinon on estime 8h/jour)
  const lignes = [];
  const parPersonne = {};

  fichesList.forEach(f => {
    if (!f.extra_id || !f.evenement_id) return;
    const ev = evenements.find(e => e.id === f.evenement_id);
    if (!ev?.date || getYear(parseISO(ev.date)) !== currentYear) return;

    const id = f.extra_id;
    if (!parPersonne[id]) parPersonne[id] = { jours: 0, heures: 0, cout: 0 };
    parPersonne[id].jours += 1;
    const heures = f.heures_reelles || f.heures_prevues || 8;
    parPersonne[id].heures += heures;
  });

  const allPersonnes = [...extras, ...collaborateurs.map(c => ({ ...c, _isCollab: true }))];

  allPersonnes.forEach(p => {
    const data = parPersonne[p.id];
    if (!data) return;
    const tauxHoraire = p.taux_horaire || 0;
    const cout = tauxHoraire * data.heures;
    lignes.push({
      nom: p.nom || `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Inconnu',
      jours: data.jours,
      heures: Math.round(data.heures),
      taux: tauxHoraire,
      cout: Math.round(cout),
      isCollab: !!p._isCollab,
    });
  });

  lignes.sort((a, b) => b.heures - a.heures);

  const totalHeures = lignes.reduce((s, l) => s + l.heures, 0);
  const totalCout = lignes.reduce((s, l) => s + l.cout, 0);

  // Récap mensuel
  const parMois = {};
  fichesList.forEach(f => {
    if (!f.extra_id || !f.evenement_id) return;
    const ev = evenements.find(e => e.id === f.evenement_id);
    if (!ev?.date || getYear(parseISO(ev.date)) !== currentYear) return;
    const mois = ev.date.slice(0, 7);
    if (!parMois[mois]) parMois[mois] = { jours: 0, heures: 0 };
    parMois[mois].jours += 1;
    parMois[mois].heures += f.heures_reelles || f.heures_prevues || 8;
  });

  const moisData = Object.entries(parMois)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mois, d]) => ({
      mois: format(parseISO(mois + '-01'), 'MMM', { locale: fr }),
      jours: d.jours,
      heures: Math.round(d.heures),
    }));

  return (
    <div className="space-y-5">
      {/* KPIs budget */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Total heures travaillées" value={totalHeures + 'h'} color="text-blue-600" />
        <KpiCard label="Budget personnel total" value={totalCout > 0 ? totalCout + ' €' : '—'} sub={totalCout === 0 ? 'Configurez les taux horaires' : undefined} color="text-emerald-600" />
        <KpiCard label="Personnes mobilisées" value={lignes.length} color="text-purple-600" />
      </div>

      {/* Tableau par personne */}
      {lignes.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 overflow-x-auto">
          <h3 className="font-semibold text-base mb-4">Détail par personne</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2 pr-4">Nom</th>
                <th className="text-center py-2 px-3">Jours</th>
                <th className="text-center py-2 px-3">Heures</th>
                <th className="text-center py-2 px-3">Taux / h</th>
                <th className="text-right py-2">Coût estimé</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2 pr-4 font-medium">
                    {l.nom}
                    {l.isCollab && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Collab</span>}
                  </td>
                  <td className="text-center py-2 px-3">{l.jours}</td>
                  <td className="text-center py-2 px-3 font-medium">{l.heures}h</td>
                  <td className="text-center py-2 px-3 text-muted-foreground">{l.taux > 0 ? l.taux + ' €' : '—'}</td>
                  <td className="text-right py-2 font-semibold">{l.cout > 0 ? l.cout + ' €' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Récap mensuel */}
      {moisData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-base mb-4">Récapitulatif mensuel — heures</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={moisData} margin={{ left: 0, right: 16 }}>
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v}h`, 'Heures']} />
              <Bar dataKey="heures" radius={[6, 6, 0, 0]}>
                {moisData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Alertes réglementaires ───────────────────────────────────────────────
function AlertesReglementaires({ fichesList, evenements, extras, collaborateurs, currentYear }) {
  const alertes = [];
  const DUREE_MAX_JOUR = 10; // heures
  const PAUSE_MIN = 0.5;     // 30 min
  const PREVENANCE_MIN_JOURS = 3;

  const yearFiches = fichesList.filter(f => {
    const ev = evenements.find(e => e.id === f.evenement_id);
    return ev?.date && getYear(parseISO(ev.date)) === currentYear;
  });

  // Durée max
  yearFiches.forEach(f => {
    const heures = f.heures_reelles || f.heures_prevues;
    if (!heures || heures <= DUREE_MAX_JOUR) return;
    const extra = [...extras, ...collaborateurs].find(p => p.id === f.extra_id);
    const ev = evenements.find(e => e.id === f.evenement_id);
    alertes.push({
      type: 'warning',
      label: `Durée max dépassée — ${extra?.nom || 'Inconnu'} le ${ev?.date || ''}`,
      detail: `${heures}h travaillées (max recommandé : ${DUREE_MAX_JOUR}h)`,
    });
  });

  // Pause manquante
  yearFiches.forEach(f => {
    const heures = f.heures_reelles || f.heures_prevues;
    const pause = f.duree_pause;
    if (!heures || heures < 6 || pause === undefined || pause === null) return;
    if (pause < PAUSE_MIN) {
      const extra = [...extras, ...collaborateurs].find(p => p.id === f.extra_id);
      const ev = evenements.find(e => e.id === f.evenement_id);
      alertes.push({
        type: 'warning',
        label: `Pause insuffisante — ${extra?.nom || 'Inconnu'} le ${ev?.date || ''}`,
        detail: `${pause * 60}min de pause pour ${heures}h travaillées (min recommandé : 30min)`,
      });
    }
  });

  // Délai de prévenance (date création vs date événement)
  yearFiches.forEach(f => {
    const ev = evenements.find(e => e.id === f.evenement_id);
    if (!ev?.date || !f.created_date) return;
    const evDate = parseISO(ev.date);
    const createdDate = parseISO(f.created_date);
    const diff = (evDate - createdDate) / (1000 * 60 * 60 * 24);
    if (diff < PREVENANCE_MIN_JOURS) {
      const extra = [...extras, ...collaborateurs].find(p => p.id === f.extra_id);
      alertes.push({
        type: 'info',
        label: `Délai de prévenance court — ${extra?.nom || 'Inconnu'}`,
        detail: `Affecté ${Math.round(diff)} jour(s) avant l'événement "${ev.nom}" (recommandé : ${PREVENANCE_MIN_JOURS}j min)`,
      });
    }
  });

  if (alertes.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-semibold text-emerald-800">Aucune alerte détectée</p>
          <p className="text-sm text-emerald-700 mt-0.5">Toutes les règles réglementaires sont respectées pour {currentYear}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <h3 className="font-semibold text-base">Alertes réglementaires — {currentYear}</h3>
      <p className="text-xs text-muted-foreground">Indicateurs d'aide à la gestion. Le code du travail s'applique indépendamment.</p>
      <div className="space-y-2">
        {alertes.map((a, i) => (
          <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
            a.type === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <span>{a.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <div>
              <p className={`font-medium ${a.type === 'warning' ? 'text-amber-800' : 'text-blue-800'}`}>{a.label}</p>
              <p className={`text-xs mt-0.5 ${a.type === 'warning' ? 'text-amber-700' : 'text-blue-700'}`}>{a.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Suivi des timings ───────────────────────────────────────────────────
function SuiviTimings({ fichesList, evenements, extras, collaborateurs, currentYear }) {
  const rows = [];

  fichesList.forEach(f => {
    if (!f.extra_id || !f.evenement_id) return;
    if (!f.heure_arrivee && !f.heure_depart && !f.heures_reelles) return;
    const ev = evenements.find(e => e.id === f.evenement_id);
    if (!ev?.date || getYear(parseISO(ev.date)) !== currentYear) return;
    const personne = [...extras, ...collaborateurs].find(p => p.id === f.extra_id);
    const heuresPrevues = f.heures_prevues || 8;
    const heuresReelles = f.heures_reelles;
    const ecart = heuresReelles != null ? heuresReelles - heuresPrevues : null;

    rows.push({
      nom: personne?.nom || 'Inconnu',
      evenement: ev.nom,
      date: ev.date,
      arrivee: f.heure_arrivee || '—',
      depart: f.heure_depart || '—',
      prevues: heuresPrevues,
      reelles: heuresReelles != null ? heuresReelles : null,
      ecart,
    });
  });

  rows.sort((a, b) => b.date.localeCompare(a.date));

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 text-center text-muted-foreground text-sm py-10">
        <p className="text-3xl mb-2">🕐</p>
        <p className="font-medium">Aucun timing enregistré</p>
        <p className="text-xs mt-1">Les heures d'arrivée et de départ s'afficheront ici une fois saisies sur les événements.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 overflow-x-auto">
      <h3 className="font-semibold text-base mb-4">Suivi des timings — {currentYear}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="text-left py-2 pr-3">Nom</th>
            <th className="text-left py-2 pr-3">Événement</th>
            <th className="text-center py-2 px-2">Date</th>
            <th className="text-center py-2 px-2">Arrivée</th>
            <th className="text-center py-2 px-2">Départ</th>
            <th className="text-center py-2 px-2">Prévues</th>
            <th className="text-center py-2 px-2">Réelles</th>
            <th className="text-center py-2">Écart</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-2 pr-3 font-medium">{r.nom}</td>
              <td className="py-2 pr-3 text-muted-foreground truncate max-w-[120px]">{r.evenement}</td>
              <td className="text-center py-2 px-2 text-xs">{format(parseISO(r.date), 'd MMM', { locale: fr })}</td>
              <td className="text-center py-2 px-2">{r.arrivee}</td>
              <td className="text-center py-2 px-2">{r.depart}</td>
              <td className="text-center py-2 px-2">{r.prevues}h</td>
              <td className="text-center py-2 px-2 font-medium">{r.reelles != null ? r.reelles + 'h' : '—'}</td>
              <td className="text-center py-2">
                {r.ecart != null ? (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    r.ecart > 0 ? 'bg-amber-100 text-amber-700' :
                    r.ecart < 0 ? 'bg-emerald-100 text-emerald-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {r.ecart > 0 ? '+' : ''}{r.ecart}h
                  </span>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────
export default function StatistiquesEquipeRH({ rhSettings }) {
  const currentYear = getYear(new Date());

  const { data: extras = [] } = useQuery({ queryKey: ['extras'], queryFn: () => base44.entities.Extra.list('-created_date') });
  const { data: collaborateurs = [] } = useQuery({ queryKey: ['collaborateurs'], queryFn: () => base44.entities.Collaborateur.list() });
  const { data: evenements = [] } = useQuery({ queryKey: ['evenements-stats'], queryFn: () => base44.entities.Evenement.list('-date', 500) });
  const { data: fichesList = [] } = useQuery({ queryKey: ['fiches-service-stats'], queryFn: () => base44.entities.FicheService.list('-created_date', 1000) });

  const showDashboard = rhSettings?.tableau_de_bord_actif;
  const showAlertes = rhSettings?.alertes_reglementaires_actif;
  const showTimings = rhSettings?.suivi_timings_actif;

  const hasAny = showDashboard || showAlertes || showTimings;
  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module RH</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {showDashboard && (
        <TableauDeBordEquipe
          extras={extras}
          collaborateurs={collaborateurs}
          fichesList={fichesList}
          evenements={evenements}
          currentYear={currentYear}
        />
      )}

      {showAlertes && (
        <AlertesReglementaires
          fichesList={fichesList}
          evenements={evenements}
          extras={extras}
          collaborateurs={collaborateurs}
          currentYear={currentYear}
        />
      )}

      {showTimings && (
        <SuiviTimings
          fichesList={fichesList}
          evenements={evenements}
          extras={extras}
          collaborateurs={collaborateurs}
          currentYear={currentYear}
        />
      )}
    </div>
  );
}