/**
 * ImportInvitesModal — Import CSV/Excel d'invités
 * Props: evenementId, evenementNom, onClose, onImported
 */
import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

function genToken() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function parseRows(rows) {
  // Essaie de trouver les colonnes prenom/nom/email/telephone/groupe
  if (rows.length === 0) return [];
  const header = rows[0].map(h => String(h || '').toLowerCase().trim());
  const idx = (keys) => {
    for (const k of keys) {
      const i = header.findIndex(h => h.includes(k));
      if (i !== -1) return i;
    }
    return -1;
  };
  const prenomIdx    = idx(['prenom', 'prénom', 'firstname', 'first']);
  const nomIdx       = idx(['nom', 'lastname', 'last', 'name']);
  const emailIdx     = idx(['email', 'mail', 'courriel']);
  const telIdx       = idx(['tel', 'phone', 'mobile', 'portable']);
  const groupeIdx    = idx(['groupe', 'group', 'table']);

  return rows.slice(1).map(row => ({
    prenom:    prenomIdx    >= 0 ? String(row[prenomIdx] || '').trim() : '',
    nom:       nomIdx       >= 0 ? String(row[nomIdx]    || '').trim() : '',
    email:     emailIdx     >= 0 ? String(row[emailIdx]  || '').trim() : '',
    telephone: telIdx       >= 0 ? String(row[telIdx]    || '').trim() : '',
    groupe:    groupeIdx    >= 0 ? String(row[groupeIdx] || '').trim() : '',
  })).filter(r => r.prenom || r.nom);
}

export default function ImportInvitesModal({ evenementId, evenementNom, onClose, onImported }) {
  const [preview, setPreview] = useState(null); // parsed rows
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      setPreview(parseRows(rows));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    let ok = 0, errors = 0;
    for (const row of preview) {
      if (!row.prenom && !row.nom) { errors++; continue; }
      await base44.entities.Invite.create({
        evenement_id:  evenementId,
        evenement_nom: evenementNom || '',
        prenom:        row.prenom || '?',
        nom:           row.nom || '?',
        email:         row.email || null,
        telephone:     row.telephone || null,
        groupe:        row.groupe || null,
        lien_token:    genToken(),
        statut_rsvp:   'En attente',
      });
      ok++;
    }
    setImporting(false);
    setResult({ ok, errors });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>📥 Importer des invités</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-500">
                Importez un fichier <strong>CSV ou Excel</strong> avec les colonnes : Prénom, Nom, Email, Téléphone, Groupe.
              </p>

              {/* Zone upload */}
              <div
                className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors hover:border-purple-300 hover:bg-purple-50"
                style={{ borderColor: '#e2e8f0' }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              >
                <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500">
                  {fileName || 'Cliquez ou glissez un fichier ici'}
                </p>
                <p className="text-xs text-gray-400 mt-1">.csv, .xlsx, .xls</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => handleFile(e.target.files[0])}
                />
              </div>

              {/* Aperçu */}
              {preview && preview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Aperçu — {preview.length} ligne{preview.length > 1 ? 's' : ''} détectée{preview.length > 1 ? 's' : ''}
                  </p>
                  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#e2e8f0' }}>
                    <table className="w-full text-xs">
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          {['Prénom', 'Nom', 'Email', 'Tél', 'Groupe'].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold border-b" style={{ borderColor: '#f1f5f9' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 20).map((r, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td className="px-3 py-1.5 text-gray-800">{r.prenom || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-700">{r.nom || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-500">{r.email || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-500">{r.telephone || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-500">{r.groupe || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length > 20 && (
                      <p className="text-xs text-gray-400 text-center py-2">+{preview.length - 20} lignes supplémentaires</p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">{result.errors === 0 ? '✅' : '⚠️'}</div>
              <p className="font-bold text-[#1e1b4b] text-lg">Import terminé</p>
              <p className="text-sm text-gray-600">
                <span className="text-emerald-600 font-semibold">{result.ok} invité{result.ok > 1 ? 's' : ''}</span> importé{result.ok > 1 ? 's' : ''}
                {result.errors > 0 && <span className="text-red-500 ml-1">· {result.errors} erreur{result.errors > 1 ? 's' : ''}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t shrink-0 flex gap-3" style={{ borderColor: '#f1f5f9' }}>
          {!result ? (
            <>
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 text-sm font-semibold text-gray-500" style={{ borderColor: '#e2e8f0' }}>
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !preview || preview.length === 0}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#1e1b4b' }}
              >
                {importing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : `Importer ${preview?.length || 0} invité${preview?.length > 1 ? 's' : ''}`}
              </button>
            </>
          ) : (
            <button onClick={onImported} className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold" style={{ background: '#1e1b4b' }}>
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}