import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Search, MapPin, Phone, Globe, Star, Check, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function GoogleImportModal({ onImport, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [step, setStep] = useState('search'); // 'search' | 'confirm'
  const [extractedData, setExtractedData] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setSelected(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Recherche sur Google Places les établissements correspondant à : "${query}".
Retourne une liste de 5 résultats pertinents avec leurs informations de base.
Pour chaque résultat donne : name (nom de l'établissement), address (adresse complète), rating (note sur 5, number ou null), place_id (identifiant fictif unique), type (type d'établissement ex: restaurant, salle de réception, traiteur...).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  rating: { type: 'number' },
                  place_id: { type: 'string' },
                  type: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setResults(res?.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (place) => {
    setSelected(place);
    setLoadingDetails(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Récupère les informations complètes de l'établissement suivant depuis le web :
Nom : ${place.name}
Adresse : ${place.address}

Retourne: company_name (nom), adresse (adresse complète), telephone (numéro de téléphone), site_web (URL du site), description (courte description), note_google (note sur 5, number), nombre_avis (nombre d'avis Google, number), social_networks (array avec name et url pour chaque réseau trouvé: Facebook, Instagram, etc.).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            company_name: { type: 'string' },
            adresse: { type: 'string' },
            telephone: { type: 'string' },
            site_web: { type: 'string' },
            description: { type: 'string' },
            note_google: { type: 'number' },
            nombre_avis: { type: 'number' },
            social_networks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setExtractedData(res);
      setStep('confirm');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleConfirm = () => {
    onImport(extractedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm">Importer depuis Google</p>
              <p className="text-xs text-muted-foreground">Remplissage automatique de votre fiche</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {step === 'search' && (
            <>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Ex : L'Alizé Traiteur Bordeaux"
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching || !query.trim()} className="gap-1.5 shrink-0">
                  {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Rechercher
                </Button>
              </div>

              {searching && (
                <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                  <Loader2 size={20} className="animate-spin text-primary" />
                  <span className="text-sm">Recherche en cours...</span>
                </div>
              )}

              {loadingDetails && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 size={28} className="animate-spin text-primary" />
                  <p className="text-sm font-medium">Récupération des informations...</p>
                  <p className="text-xs text-muted-foreground">Amanda analyse la fiche Google de votre établissement</p>
                </div>
              )}

              {!searching && !loadingDetails && results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}</p>
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(r)}
                      className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10">
                          <Building2 size={16} className="text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={10} className="shrink-0" /> {r.address}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {r.rating && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <Star size={10} fill="currentColor" /> {r.rating}
                              </span>
                            )}
                            {r.type && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{r.type}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searching && !loadingDetails && results.length === 0 && query && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>Aucun résultat. Essayez avec le nom exact de votre établissement.</p>
                </div>
              )}
            </>
          )}

          {step === 'confirm' && extractedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <Check size={15} className="shrink-0" />
                <p className="text-sm font-medium">Informations récupérées depuis Google ✅</p>
              </div>
              <p className="text-xs text-muted-foreground">Vérifiez les informations avant de les importer :</p>

              <div className="space-y-3 bg-muted/30 rounded-2xl border border-border p-4">
                {[
                  { k: 'company_name', l: 'Nom' },
                  { k: 'adresse', l: 'Adresse' },
                  { k: 'telephone', l: 'Téléphone' },
                  { k: 'site_web', l: 'Site web' },
                ].map(({ k, l }) => (
                  <div key={k} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{l}</label>
                    <Input
                      value={extractedData[k] || ''}
                      onChange={e => setExtractedData(d => ({ ...d, [k]: e.target.value }))}
                      className="text-sm h-8"
                    />
                  </div>
                ))}

                {extractedData.note_google && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    <Star size={13} fill="currentColor" />
                    <span className="font-medium">{extractedData.note_google}/5</span>
                    {extractedData.nombre_avis && <span className="text-muted-foreground">({extractedData.nombre_avis} avis Google)</span>}
                  </div>
                )}

                {extractedData.social_networks?.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Réseaux sociaux trouvés</label>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedData.social_networks.map((sn, i) => (
                        <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{sn.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('search')}>← Modifier la recherche</Button>
                <Button className="flex-1 gap-1.5" onClick={handleConfirm}>
                  <Check size={14} /> Importer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}