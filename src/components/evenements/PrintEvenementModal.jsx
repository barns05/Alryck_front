import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useModules } from '@/hooks/useModules';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const SECTIONS = [
  { key: 'recap',      emoji: '📋', label: 'Récapitulatif événement',         module: null,           tache: null },
  { key: 'programme',  emoji: '📅', label: 'Programme de la journée',          module: 'programme',    tache: 'programme' },
  { key: 'formulaire', emoji: '📝', label: 'Formulaire de préparation (réponses)', module: 'formulaire', tache: 'formulaire' },
  { key: 'fiche',      emoji: '🗂️', label: 'Fiche de service',                 module: 'fiche_service',tache: 'fiche_service' },
  { key: 'logistique', emoji: '📦', label: 'Checklist matériel logistique',    module: 'logistique',   tache: 'logistique' },
  { key: 'equipe',     emoji: '👥', label: 'Planning équipe / Extras',          module: 'extras',       tache: 'equipe_extras' },
  { key: 'plan_table', emoji: '🪑', label: 'Plan de table',                    module: 'plan_table',   tache: 'plan_table' },
];

export default function PrintEvenementModal({ evenement, onClose }) {
  const modules = useModules();
  const [selected, setSelected] = useState({ recap: true });
  const [generating, setGenerating] = useState(false);

  const { data: formulaires = [] } = useQuery({ queryKey: ['formulaires'], queryFn: () => base44.entities.FormulairePreparation.list('-created_date', 500) });
  const { data: fichesService = [] } = useQuery({ queryKey: ['fiches-service'], queryFn: () => base44.entities.FicheService.list('-created_date', 200) });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => base44.entities.Service.list('-date', 500) });
  const { data: assignments = [] } = useQuery({ queryKey: ['service-assignments'], queryFn: () => base44.entities.ServiceAssignment.list('-created_date', 1000) });
  const { data: logData = [] } = useQuery({ queryKey: ['logistique-ev', evenement.id], queryFn: () => base44.entities.LogistiqueEvenement.filter({ evenement_id: evenement.id }) });
  const { settings: _ownerSettings } = useOwnerCompanySettings();
  const { data: extras = [] } = useQuery({ queryKey: ['extras'], queryFn: () => base44.entities.Extra.list() });

  const companySettings = _ownerSettings || {};
  const logistique = logData[0] || null;
  const taches = evenement.taches_requises || {};

  const isAvailable = useMemo(() => {
    const formulaire = formulaires.find(f => f.evenement_id === evenement.id);
    const fiche = fichesService.find(f => f.evenement_id === evenement.id);
    const evServiceIds = new Set(services.filter(s => s.evenement_id === evenement.id).map(s => s.id));
    const hasEquipe = assignments.some(a => evServiceIds.has(a.service_id));

    return {
      recap: true,
      programme: modules.programme && taches.programme !== false && (evenement.programme_journee || []).length > 0,
      formulaire: modules.formulaire && taches.formulaire !== false && !!formulaire,
      fiche: modules.fiche_service && taches.fiche_service !== false && !!fiche,
      logistique: modules.logistique && taches.logistique === true && !!logistique,
      equipe: (modules.extras || modules.equipe) && taches.equipe_extras !== false && hasEquipe,
      plan_table: modules.plan_table && taches.plan_table !== false && !!evenement.plan_table_url,
    };
  }, [modules, taches, evenement, formulaires, fichesService, services, assignments, logistique]);

  const allAvailable = SECTIONS.filter(s => isAvailable[s.key]).map(s => s.key);
  const allSelected = allAvailable.every(k => selected[k]);

  const toggle = (key) => {
    if (!isAvailable[key]) return;
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected({ recap: true });
    } else {
      const all = {};
      allAvailable.forEach(k => { all[k] = true; });
      setSelected(all);
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;
      let pageNum = 1;

      const dateStr = evenement.date ? format(parseISO(evenement.date), 'd MMMM yyyy', { locale: fr }) : '';
      const companyName = companySettings.company_name || '';
      const printDate = format(new Date(), 'd/MM/yyyy', { locale: fr });

      const addHeader = () => {
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageW, 20, 'F');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, margin, 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`${evenement.nom}${dateStr ? ' — ' + dateStr : ''}`, pageW - margin, 13, { align: 'right' });
        y = 24;
      };

      const addFooter = () => {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(companyName, margin, pageH - 6);
        doc.text(`Imprimé le ${printDate}`, pageW / 2, pageH - 6, { align: 'center' });
        doc.text(`Page ${pageNum}`, pageW - margin, pageH - 6, { align: 'right' });
      };

      const newPage = () => {
        addFooter();
        doc.addPage();
        pageNum++;
        addHeader();
      };

      const checkPageBreak = (neededHeight = 20) => {
        if (y + neededHeight > pageH - 18) newPage();
      };

      const addSectionTitle = (title) => {
        checkPageBreak(16);
        doc.setFillColor(37, 99, 235);
        doc.rect(margin, y, contentW, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 3, y + 5.5);
        doc.setTextColor(30, 30, 30);
        y += 11;
      };

      const addRow = (label, value) => {
        checkPageBreak(7);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(label, margin + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(value || '—', contentW - 52);
        doc.text(lines, margin + 52, y);
        y += lines.length * 5 + 2;
      };

      const addText = (text, opts = {}) => {
        const lines = doc.splitTextToSize(text, contentW - (opts.indent || 0));
        checkPageBreak(lines.length * 5 + 2);
        doc.text(lines, margin + (opts.indent || 0), y);
        y += lines.length * 5 + 2;
      };

      const addSeparator = () => {
        y += 3;
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, pageW - margin, y);
        y += 5;
      };

      // Start first page
      addHeader();

      // 1. RECAP
      if (selected.recap) {
        addSectionTitle('📋 Récapitulatif événement');
        addRow('Nom :', evenement.nom);
        if (evenement.client_nom) addRow('Client :', evenement.client_nom);
        addRow('Date :', dateStr);
        if (evenement.lieu_nom) addRow('Lieu :', evenement.lieu_nom);
        if (evenement.nb_invites) addRow('Invités :', `${evenement.nb_invites}${evenement.nb_adultes ? ` (${evenement.nb_adultes} adultes, ${evenement.nb_adolescents || 0} ados, ${evenement.nb_enfants || 0} enfants)` : ''}`);
        if (evenement.formule_nom) addRow('Formule :', evenement.formule_nom);
        addRow('Statut :', evenement.statut || '—');
        if (evenement.heure_debut) addRow('Horaires :', `${evenement.heure_debut}${evenement.heure_fin ? ' → ' + evenement.heure_fin : ''}`);
        if (evenement.notes_contrat) addRow('Notes contrat :', evenement.notes_contrat);
        addSeparator();
      }

      // 2. PROGRAMME
      if (selected.programme && isAvailable.programme) {
        addSectionTitle('📅 Programme de la journée');
        const prog = evenement.programme_journee || [];
        prog.forEach(step => {
          checkPageBreak(8);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text(step.heure || '', margin + 2, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          doc.text(step.nom || step.intitule || '', margin + 22, y);
          y += 6;
        });
        addSeparator();
      }

      // 3. FORMULAIRE
      if (selected.formulaire && isAvailable.formulaire) {
        const formulaire = formulaires.find(f => f.evenement_id === evenement.id);
        addSectionTitle('📝 Formulaire de préparation — Réponses client');
        if (formulaire?.contenu) {
          const contenu = typeof formulaire.contenu === 'string' ? JSON.parse(formulaire.contenu) : formulaire.contenu;
          const reponses = contenu.reponses || contenu || {};
          Object.entries(reponses).forEach(([question, reponse]) => {
            if (typeof reponse === 'object') return;
            checkPageBreak(10);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            addText(String(question), { indent: 2 });
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            addText(String(reponse || '—'), { indent: 6 });
            y += 1;
          });
        } else {
          doc.setFontSize(9);
          doc.setTextColor(120, 120, 120);
          addText('Aucune réponse disponible.');
        }
        addSeparator();
      }

      // 4. FICHE SERVICE
      if (selected.fiche && isAvailable.fiche) {
        const fiche = fichesService.find(f => f.evenement_id === evenement.id);
        addSectionTitle('🗂️ Fiche de service');
        if (fiche?.consigne) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(80, 80, 80);
          addText('Consigne :', { indent: 2 });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          addText(fiche.consigne, { indent: 6 });
        }
        if (fiche?.contenu) {
          const contenu = typeof fiche.contenu === 'string' ? JSON.parse(fiche.contenu) : fiche.contenu;
          if (contenu.notes) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            addText(String(contenu.notes), { indent: 2 });
          }
        }
        addSeparator();
      }

      // 5. CHECKLIST MATERIEL
      if (selected.logistique && isAvailable.logistique) {
        addSectionTitle('📦 Checklist matériel logistique');
        const checklist = logistique?.checklist_materiel || [];
        checklist.forEach(item => {
          checkPageBreak(7);
          doc.setFontSize(9);
          doc.setDrawColor(100, 100, 100);
          doc.rect(margin + 2, y - 4, 4, 4);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          doc.text(`${item.nom}`, margin + 8, y - 0.5);
          doc.setTextColor(100, 100, 100);
          doc.text(`${item.quantite || 0}`, pageW - margin - 20, y - 0.5, { align: 'right' });
          y += 6;
        });
        if (checklist.length === 0) {
          doc.setFontSize(9); doc.setTextColor(120, 120, 120);
          addText('Aucun article dans la checklist.');
        }
        addSeparator();
      }

      // 6. PLANNING EQUIPE
      if (selected.equipe && isAvailable.equipe) {
        addSectionTitle('👥 Planning équipe / Extras');
        const evServiceIds = new Set(services.filter(s => s.evenement_id === evenement.id).map(s => s.id));
        const evAssignments = assignments.filter(a => evServiceIds.has(a.service_id));
        evAssignments.forEach(a => {
          checkPageBreak(7);
          const svc = services.find(s => s.id === a.service_id);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text(a.extra_nom || '—', margin + 2, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          doc.text(svc?.poste || '', margin + 60, y);
          doc.text(svc ? `${svc.heure_debut || ''}–${svc.heure_fin || ''}` : '', pageW - margin - 5, y, { align: 'right' });
          y += 6;
        });
        addSeparator();
      }

      // 7. PLAN DE TABLE
      if (selected.plan_table && isAvailable.plan_table) {
        addSectionTitle('🪑 Plan de table');
        checkPageBreak(80);
        try {
          const imgUrl = evenement.plan_table_url;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imgUrl;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const ratio = img.naturalHeight / img.naturalWidth;
          const imgW = Math.min(contentW, 160);
          const imgH = imgW * ratio;
          checkPageBreak(imgH + 5);
          doc.addImage(dataUrl, 'JPEG', margin, y, imgW, imgH);
          y += imgH + 5;
        } catch {
          doc.setFontSize(9); doc.setTextColor(120, 120, 120);
          addText('Image non disponible (CORS ou erreur de chargement).');
        }
      }

      addFooter();

      const nom = evenement.nom?.replace(/[^a-z0-9]/gi, '_') || 'evenement';
      doc.save(`${nom}_${dateStr.replace(/\s/g, '_')}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const buildPrintContent = () => {
    const dateStr = evenement.date ? format(parseISO(evenement.date), 'd MMMM yyyy', { locale: fr }) : '';
    const companyName = companySettings.company_name || '';
    const printDate = format(new Date(), 'd/MM/yyyy', { locale: fr });

    let html = `<html><head><meta charset="utf-8"><title>${evenement.nom}</title><style>
      @page { margin: 15mm; }
      body { font-family: Arial, sans-serif; font-size: 10pt; color: #1e1e1e; }
      .header { display:flex; justify-content:space-between; border-bottom:2px solid #2563eb; padding-bottom:8px; margin-bottom:16px; }
      .header-left { font-weight:bold; font-size:11pt; }
      .header-right { font-size:9pt; color:#555; text-align:right; }
      .section-title { background:#2563eb; color:#fff; padding:5px 8px; font-size:10pt; font-weight:bold; margin:16px 0 8px; border-radius:4px; }
      .row { display:flex; gap:8px; margin-bottom:4px; font-size:9pt; }
      .row-label { font-weight:bold; color:#555; min-width:130px; }
      .step { display:flex; gap:12px; margin-bottom:4px; font-size:9pt; }
      .step-time { color:#2563eb; font-weight:bold; min-width:50px; }
      .qa { margin-bottom:8px; font-size:9pt; }
      .qa-q { font-weight:bold; color:#555; margin-bottom:2px; }
      .qa-a { padding-left:12px; }
      .checklist-item { display:flex; align-items:center; gap:8px; margin-bottom:4px; font-size:9pt; }
      .checkbox { width:12px; height:12px; border:1.5px solid #555; display:inline-block; flex-shrink:0; }
      .equipe-row { display:flex; justify-content:space-between; margin-bottom:4px; font-size:9pt; border-bottom:1px solid #eee; padding-bottom:3px; }
      .footer { position:fixed; bottom:0; left:0; right:0; display:flex; justify-content:space-between; font-size:7pt; color:#999; border-top:1px solid #ddd; padding-top:4px; }
      .plan-img { max-width:100%; height:auto; margin-top:8px; }
      hr { border:none; border-top:1px solid #ddd; margin:12px 0; }
      @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head><body>`;

    html += `<div class="header"><div class="header-left">${companyName}</div><div class="header-right">${evenement.nom}${dateStr ? '<br>' + dateStr : ''}</div></div>`;

    if (selected.recap) {
      html += `<div class="section-title">📋 Récapitulatif événement</div>`;
      html += `<div class="row"><span class="row-label">Nom :</span><span>${evenement.nom || '—'}</span></div>`;
      if (evenement.client_nom) html += `<div class="row"><span class="row-label">Client :</span><span>${evenement.client_nom}</span></div>`;
      html += `<div class="row"><span class="row-label">Date :</span><span>${dateStr || '—'}</span></div>`;
      if (evenement.lieu_nom) html += `<div class="row"><span class="row-label">Lieu :</span><span>${evenement.lieu_nom}</span></div>`;
      if (evenement.nb_invites) html += `<div class="row"><span class="row-label">Invités :</span><span>${evenement.nb_invites}</span></div>`;
      if (evenement.formule_nom) html += `<div class="row"><span class="row-label">Formule :</span><span>${evenement.formule_nom}</span></div>`;
      html += `<div class="row"><span class="row-label">Statut :</span><span>${evenement.statut || '—'}</span></div>`;
      if (evenement.heure_debut) html += `<div class="row"><span class="row-label">Horaires :</span><span>${evenement.heure_debut}${evenement.heure_fin ? ' → ' + evenement.heure_fin : ''}</span></div>`;
      html += '<hr>';
    }

    if (selected.programme && isAvailable.programme) {
      html += `<div class="section-title">📅 Programme de la journée</div>`;
      (evenement.programme_journee || []).forEach(step => {
        html += `<div class="step"><span class="step-time">${step.heure || ''}</span><span>${step.nom || step.intitule || ''}</span></div>`;
      });
      html += '<hr>';
    }

    if (selected.formulaire && isAvailable.formulaire) {
      const formulaire = formulaires.find(f => f.evenement_id === evenement.id);
      html += `<div class="section-title">📝 Formulaire de préparation — Réponses client</div>`;
      if (formulaire?.contenu) {
        const contenu = typeof formulaire.contenu === 'string' ? JSON.parse(formulaire.contenu) : formulaire.contenu;
        const reponses = contenu.reponses || contenu || {};
        Object.entries(reponses).forEach(([q, r]) => {
          if (typeof r === 'object') return;
          html += `<div class="qa"><div class="qa-q">${q}</div><div class="qa-a">${r || '—'}</div></div>`;
        });
      }
      html += '<hr>';
    }

    if (selected.fiche && isAvailable.fiche) {
      const fiche = fichesService.find(f => f.evenement_id === evenement.id);
      html += `<div class="section-title">🗂️ Fiche de service</div>`;
      if (fiche?.consigne) html += `<div class="row"><span class="row-label">Consigne :</span><span>${fiche.consigne}</span></div>`;
      if (fiche?.contenu) {
        const contenu = typeof fiche.contenu === 'string' ? JSON.parse(fiche.contenu) : fiche.contenu;
        if (contenu.notes) html += `<p>${contenu.notes}</p>`;
      }
      html += '<hr>';
    }

    if (selected.logistique && isAvailable.logistique) {
      html += `<div class="section-title">📦 Checklist matériel logistique</div>`;
      (logistique?.checklist_materiel || []).forEach(item => {
        html += `<div class="checklist-item"><span class="checkbox"></span><span>${item.nom}</span><span style="margin-left:auto;color:#555">${item.quantite || 0}</span></div>`;
      });
      html += '<hr>';
    }

    if (selected.equipe && isAvailable.equipe) {
      html += `<div class="section-title">👥 Planning équipe / Extras</div>`;
      const evServiceIds = new Set(services.filter(s => s.evenement_id === evenement.id).map(s => s.id));
      assignments.filter(a => evServiceIds.has(a.service_id)).forEach(a => {
        const svc = services.find(s => s.id === a.service_id);
        html += `<div class="equipe-row"><span><strong>${a.extra_nom || '—'}</strong></span><span>${svc?.poste || ''}</span><span>${svc ? (svc.heure_debut || '') + '–' + (svc.heure_fin || '') : ''}</span></div>`;
      });
      html += '<hr>';
    }

    if (selected.plan_table && isAvailable.plan_table) {
      html += `<div class="section-title">🪑 Plan de table</div>`;
      html += `<img class="plan-img" src="${evenement.plan_table_url}" alt="Plan de table" />`;
      html += '<hr>';
    }

    html += `<div class="footer"><span>${companyName}</span><span>Imprimé le ${printDate}</span></div></body></html>`;
    return html;
  };

  const handlePrint = () => {
    const html = buildPrintContent();
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-semibold text-base">Que souhaitez-vous imprimer ?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{evenement.nom}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" style={{ paddingBottom: '110px' }}>
          {/* Tout sélectionner */}
          <button
            onClick={toggleAll}
            className="w-full text-left text-xs font-semibold text-primary hover:underline mb-3"
          >
            {allSelected ? '☑ Tout désélectionner' : '☐ Tout sélectionner'}
          </button>

          {SECTIONS.map(s => {
            const available = isAvailable[s.key];
            const checked = !!selected[s.key];
            return (
              <label
                key={s.key}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  !available
                    ? 'opacity-40 cursor-not-allowed border-border bg-muted/20'
                    : checked
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!available}
                  onChange={() => toggle(s.key)}
                  className="w-4 h-4 accent-primary shrink-0"
                />
                <span className="text-lg shrink-0">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.label}</p>
                  {!available && (
                    <p className="text-xs text-muted-foreground">Non configuré</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer sticky */}
        <div className="shrink-0 px-5 py-4 border-t border-border bg-card flex gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button variant="outline" className="flex-1 gap-1.5" onClick={handlePrint} disabled={generating || selectedCount === 0}>
            <Printer size={14} /> Imprimer
          </Button>
          <Button className="flex-1 gap-1.5" onClick={generatePDF} disabled={generating || selectedCount === 0}>
            {generating ? '...' : '📄 PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}