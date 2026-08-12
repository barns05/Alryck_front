import { useState } from 'react';
import { buildClientFullName } from '@/lib/contractModalHelpers';

/**
 * ClientEventSelector — section recherche/sélection client + événement extraite
 * de ContractModal. Gère l'état de recherche en interne.
 */
export default function ClientEventSelector({ form, setForm, clients, evenements, propProspectId, propProspectNom, propEvenementId }) {
  const [searchClients, setSearchClients] = useState('');
  const [searchEvenements, setSearchEvenements] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);

  const filteredClients = clients.filter(c =>
    !searchClients || buildClientFullName(c).toLowerCase().includes(searchClients.toLowerCase())
  );
  const filteredEvenements = evenements.filter(e =>
    !searchEvenements || e.nom.toLowerCase().includes(searchEvenements.toLowerCase())
  );

  return (
    <>
      {/* Client */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Client *</label>
        {propProspectId ? (
          <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium text-foreground">{form.client_nom || propProspectNom}</span>
          </div>
        ) : propEvenementId && form.client_id && !showClientSearch ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-input bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium text-foreground">{form.client_nom}</span>
            <button
              type="button"
              onClick={() => setShowClientSearch(true)}
              className="text-xs text-primary hover:underline shrink-0"
            >
              Changer de client
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={searchClients}
              onChange={e => setSearchClients(e.target.value)}
              placeholder="Rechercher un client…"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-2"
            />
            <div className="max-h-40 overflow-y-auto border border-input rounded-lg">
              {filteredClients.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">Aucun client trouvé</p>
              ) : (
                filteredClients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setForm(f => ({ ...f, client_id: c.id, client_nom: buildClientFullName(c) }));
                      setShowClientSearch(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b border-border last:border-b-0 ${form.client_id === c.id ? 'bg-primary/10' : ''}`}
                  >
                    {buildClientFullName(c)}
                  </button>
                ))
              )}
            </div>
            {propEvenementId && form.client_id && showClientSearch && (
              <button
                type="button"
                onClick={() => setShowClientSearch(false)}
                className="text-xs text-muted-foreground hover:text-foreground mt-1"
              >
                Annuler le changement
              </button>
            )}
          </>
        )}
      </div>

      {/* Événement */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Événement {propEvenementId ? '' : '(optionnel)'}</label>
        {propEvenementId && form.evenement_id ? (
          <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium text-foreground truncate">{form.evenement_nom || evenements.find(e => e.id === form.evenement_id)?.nom || 'Événement'}</span>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={searchEvenements}
              onChange={e => setSearchEvenements(e.target.value)}
              placeholder="Rechercher un événement…"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-2"
            />
            <div className="max-h-40 overflow-y-auto border border-input rounded-lg">
              <button
                onClick={() => setForm(f => ({ ...f, evenement_id: '', evenement_nom: '' }))}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b border-border ${!form.evenement_id ? 'bg-primary/10' : ''}`}
              >
                Aucun événement
              </button>
              {filteredEvenements.map(e => (
                <button
                  key={e.id}
                  onClick={() => setForm(f => ({ ...f, evenement_id: e.id, evenement_nom: e.nom }))}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b border-border last:border-b-0 ${form.evenement_id === e.id ? 'bg-primary/10' : ''}`}
                >
                  {e.nom}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}