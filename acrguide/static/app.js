'use strict';

// ─── Colour helpers ───────────────────────────────────────────────────────────
const COLOURS = {
  green:  { card: 'result-green',  badge: 'badge-green',  label: 'No Follow-up Needed' },
  yellow: { card: 'result-yellow', badge: 'badge-yellow', label: 'Short-term Follow-up' },
  orange: { card: 'result-orange', badge: 'badge-orange', label: 'Further Workup Needed' },
  red:    { card: 'result-red',    badge: 'badge-red',    label: 'Intervention / Surgery' },
  blue:   { card: 'result-blue',   badge: 'badge-blue',   label: 'Imaging Recommended' },
};

function result(colour, recommendation, notes = [], extra = '', copyString = '') {
  return { colour, recommendation, notes, extra, copyString };
}

// ─── Field builders ───────────────────────────────────────────────────────────
function numField(id, label, unit = '', placeholder = '', help = '') {
  return { type: 'number', id, label, unit, placeholder, help };
}
function selectField(id, label, options, help = '') {
  return { type: 'select', id, label, options, help };
}
function checkboxField(id, label, options, help = '') {
  return { type: 'checkbox', id, label, options, help };
}
function radioField(id, label, options, help = '') {
  return { type: 'radio', id, label, options, help };
}
function pointsField(id, label, options, help = '') {
  return { type: 'points', id, label, options, help };
}
function sectionField(label) {
  return { type: 'section', label };
}

// ─── Guidelines ──────────────────────────────────────────────────────────────
const GUIDELINES = {

  // ════════════════════════════════════════════════════════ LUNG ══════════════

  fleischner_solid: {
    name: 'Fleischner Society — Solid Pulmonary Nodule',
    source: 'Fleischner Society 2017',
    desc: 'Incidental solid nodule in patients ≥35 years without known malignancy',
    fields: [
      numField('size', 'Nodule Diameter', 'mm', 'e.g. 7'),
      radioField('count', 'Number of Nodules', [
        { value: 'single',   label: 'Single' },
        { value: 'multiple', label: 'Multiple (≥2)' },
      ]),
      radioField('risk', 'Patient Risk', [
        { value: 'low',  label: 'Low Risk — minimal or absent smoking history, no other risk factors' },
        { value: 'high', label: 'High Risk — heavy smoking, family history, emphysema, upper lobe location' },
      ]),
    ],
    compute(f) {
      const sz = parseFloat(f.size);
      if (isNaN(sz) || sz < 0) return null;
      const multi = f.count === 'multiple';
      const hi = f.risk === 'high';
      const notes = [
        'Does not apply to known malignancy, immunocompromised patients, or occupational exposure.',
        'Use mean diameter = (length + width) / 2.',
        'Dominant nodule in multiple-nodule patients should drive management.',
      ];

      if (!multi) {
        if (sz < 6) return result(hi ? 'yellow' : 'green',
          hi ? 'Optional CT at 12 months.' : 'No routine follow-up recommended.',
          notes);
        if (sz <= 8) return result('yellow',
          'CT at 6–12 months; consider CT at 18–24 months.',
          notes);
        return result('orange',
          'CT at 3 months; consider PET-CT or tissue sampling.',
          [...notes, 'PET-CT preferred for nodules ≥8 mm with intermediate pre-test probability.']);
      } else {
        if (sz < 6) return result(hi ? 'yellow' : 'green',
          hi ? 'Optional CT at 12 months.' : 'No routine follow-up recommended.',
          notes);
        return result('yellow',
          'CT at 3–6 months; consider CT at 18–24 months.',
          notes);
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  fleischner_subsolid: {
    name: 'Fleischner Society — Subsolid / Ground-Glass Nodule',
    source: 'Fleischner Society 2017',
    desc: 'Incidental subsolid (GGN or part-solid) pulmonary nodule, patients ≥35 years',
    fields: [
      radioField('type', 'Nodule Type', [
        { value: 'ggn',       label: 'Pure ground-glass (non-solid)' },
        { value: 'partsolid', label: 'Part-solid (has solid component)' },
      ]),
      numField('total_size', 'Total Nodule Diameter', 'mm', 'e.g. 12', 'Longest axis including ground-glass component'),
      numField('solid_size',  'Solid Component Diameter', 'mm', 'e.g. 5', 'Leave blank / 0 for pure GGN'),
      radioField('count', 'Number of Nodules', [
        { value: 'single',   label: 'Single' },
        { value: 'multiple', label: 'Multiple (≥2)' },
      ]),
    ],
    compute(f) {
      const total = parseFloat(f.total_size);
      const solid = parseFloat(f.solid_size) || 0;
      if (isNaN(total) || total < 0) return null;
      const isGGN = f.type === 'ggn';
      const multi = f.count === 'multiple';
      const notes = [
        'Does not apply to known malignancy or immunocompromised patients.',
        'Confirm persistence at 3–6 months before committing to long-term follow-up.',
        'Part-solid nodules with solid component ≥6 mm carry higher malignancy risk.',
      ];

      if (isGGN) {
        if (!multi) {
          if (total < 6) return result('green', 'No routine follow-up recommended.', notes);
          return result('yellow',
            'CT at 6–12 months to confirm persistence, then CT every 2 years until 5 years.',
            notes);
        } else {
          if (total < 6) return result('yellow', 'CT at 3–5 years.', notes);
          return result('yellow',
            'CT at 3–6 months; if stable, CT every 2 years until 5 years.',
            notes);
        }
      } else {
        // Part-solid
        if (!multi) {
          if (total < 6) return result('green', 'No routine follow-up recommended.', notes);
          if (solid < 6) return result('yellow',
            'CT at 3–6 months to confirm persistence. If stable and solid component <6 mm: annual CT for 5 years.',
            notes);
          return result('orange',
            'CT at 3–6 months. If solid component ≥6 mm: consider PET-CT or biopsy.',
            [...notes, 'Resection may be considered even for stable part-solid nodules with solid component ≥6 mm.']);
        } else {
          if (total < 6) return result('yellow', 'CT at 3–6 months; if stable, annual CT for 5 years.', notes);
          return result('orange',
            'CT at 3–6 months; if stable, annual CT for 5 years. Consider PET-CT or biopsy for dominant/growing lesion.',
            notes);
        }
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  lungrads: {
    name: 'Lung-RADS 2022',
    source: 'ACR Lung-RADS v2022',
    desc: 'Annual low-dose CT lung cancer screening — nodule assessment',
    fields: [
      radioField('type', 'Nodule Type', [
        { value: 'solid',      label: 'Solid' },
        { value: 'partsolid',  label: 'Part-solid' },
        { value: 'ggn',        label: 'Non-solid (ground-glass)' },
        { value: 'perifissural', label: 'Perifissural (solid, lenticular/triangular)' },
      ]),
      numField('size', 'Mean Nodule Diameter', 'mm', 'e.g. 9'),
      numField('solid_comp', 'Solid Component Diameter', 'mm', 'e.g. 5', 'Part-solid only; leave 0 otherwise'),
      radioField('new_growing', 'New or Growing?', [
        { value: 'no',  label: 'No (baseline or stable)' },
        { value: 'yes', label: 'Yes (new or growing since prior CT)' },
      ]),
      radioField('spiculated', 'Spiculated Margins?', [
        { value: 'no',  label: 'No' },
        { value: 'yes', label: 'Yes' },
      ]),
    ],
    compute(f) {
      const sz   = parseFloat(f.size) || 0;
      const sol  = parseFloat(f.solid_comp) || 0;
      const grow = f.new_growing === 'yes';
      const spic = f.spiculated  === 'yes';

      const catInfo = {
        '1': { col: 'green',  label: 'Lung-RADS 1', mgmt: 'Continue annual screening.' },
        '2': { col: 'green',  label: 'Lung-RADS 2', mgmt: 'Continue annual screening.' },
        '3': { col: 'yellow', label: 'Lung-RADS 3', mgmt: 'LDCT at 6 months.' },
        '4A':{ col: 'orange', label: 'Lung-RADS 4A', mgmt: 'LDCT at 3 months; PET-CT may be appropriate for nodules ≥8 mm.' },
        '4B':{ col: 'red',    label: 'Lung-RADS 4B', mgmt: 'Chest CT with/without contrast + PET-CT; tissue sampling.' },
        '4X':{ col: 'red',    label: 'Lung-RADS 4X', mgmt: 'Chest CT with/without contrast + PET-CT; tissue sampling strongly recommended.' },
      };

      let cat;

      if (f.type === 'perifissural') {
        cat = sz < 10 ? '2' : (sz < 20 ? '3' : '4A');
      } else if (f.type === 'ggn') {
        if (sz < 20) cat = '2';
        else if (sz < 30) cat = '3';
        else cat = grow ? '4B' : '4A';
      } else if (f.type === 'partsolid') {
        if (sz < 6)        cat = '1';
        else if (sol < 6)  cat = '3';
        else if (sol < 8)  cat = '4A';
        else               cat = spic ? '4X' : '4B';
        if (grow && cat === '3') cat = '4A';
      } else {
        // solid
        if (sz < 6) {
          cat = grow ? '3' : '2';
        } else if (sz < 8) {
          cat = grow ? '4A' : '3';
        } else if (sz < 15) {
          cat = spic ? (grow ? '4X' : '4B') : '4A';
        } else {
          cat = spic || grow ? '4X' : '4B';
        }
      }

      const info = catInfo[cat];
      const notes = [
        'Applies to low-dose CT lung cancer screening programme participants.',
        'Modifier S may be added for clinically significant incidental findings.',
        'Compare with all prior CT scans when available.',
      ];
      return result(info.col, `${info.label} — ${info.mgmt}`, notes);
    },
  },

  // ════════════════════════════════════════════════════════ THYROID ═══════════

  tirads: {
    name: 'ACR TI-RADS',
    source: 'ACR TI-RADS 2017',
    desc: 'Thyroid Imaging Reporting and Data System for ultrasound evaluation of thyroid nodules',
    fields: [
      numField('size', 'Nodule Size (largest dimension)', 'cm', 'e.g. 2.0'),
      pointsField('composition', 'Composition', [
        { value: 0, label: 'Cystic or almost completely cystic' },
        { value: 0, label: 'Spongiform' },
        { value: 1, label: 'Mixed cystic and solid' },
        { value: 2, label: 'Solid or almost completely solid' },
      ]),
      pointsField('echogenicity', 'Echogenicity', [
        { value: 0, label: 'Anechoic' },
        { value: 1, label: 'Hyperechoic or isoechoic' },
        { value: 2, label: 'Hypoechoic' },
        { value: 3, label: 'Very hypoechoic' },
      ]),
      pointsField('shape', 'Shape', [
        { value: 0, label: 'Wider-than-tall' },
        { value: 3, label: 'Taller-than-wide' },
      ]),
      pointsField('margin', 'Margin', [
        { value: 0, label: 'Smooth' },
        { value: 0, label: 'Ill-defined' },
        { value: 2, label: 'Lobulated or irregular' },
        { value: 3, label: 'Extra-thyroidal extension' },
      ]),
      pointsField('echogenic_foci', 'Echogenic Foci', [
        { value: 0, label: 'None or large comet-tail artifacts' },
        { value: 1, label: 'Macrocalcifications' },
        { value: 2, label: 'Peripheral (rim) calcifications' },
        { value: 3, label: 'Punctate echogenic foci' },
      ]),
    ],
    compute(f) {
      const size = parseFloat(f.size);
      const pts  = (parseFloat(f.composition)  || 0)
                 + (parseFloat(f.echogenicity)  || 0)
                 + (parseFloat(f.shape)         || 0)
                 + (parseFloat(f.margin)        || 0)
                 + (parseFloat(f.echogenic_foci)|| 0);

      let level, col, fnaThresh, followThresh, recommendation;

      if (pts === 0) {
        level = 'TR1 (Benign)'; col = 'green';
        recommendation = 'No FNA. No follow-up required.';
      } else if (pts <= 2) {
        level = 'TR2 (Not Suspicious)'; col = 'green';
        recommendation = 'No FNA. No follow-up required.';
      } else if (pts === 3) {
        level = 'TR3 (Mildly Suspicious)'; col = 'yellow';
        fnaThresh = 2.5; followThresh = 1.5;
        recommendation = size >= 2.5
          ? `FNA recommended (size ${size} cm ≥ 2.5 cm threshold).`
          : size >= 1.5
          ? `Follow-up ultrasound in 1–3 years (size ${size} cm, FNA if growth or new features).`
          : 'No FNA, no routine follow-up required for this size.';
      } else if (pts <= 6) {
        level = 'TR4 (Moderately Suspicious)'; col = 'orange';
        fnaThresh = 1.5; followThresh = 1.0;
        recommendation = size >= 1.5
          ? `FNA recommended (size ${size} cm ≥ 1.5 cm threshold).`
          : size >= 1.0
          ? `Follow-up ultrasound in 1–2 years (size ${size} cm, FNA if growth or new features).`
          : 'No FNA, no routine follow-up required for this size.';
      } else {
        level = 'TR5 (Highly Suspicious)'; col = 'red';
        fnaThresh = 1.0; followThresh = 0.5;
        recommendation = size >= 1.0
          ? `FNA recommended (size ${size} cm ≥ 1.0 cm threshold).`
          : size >= 0.5
          ? `Follow-up ultrasound in 6–12 months (size ${size} cm, FNA if growth or new features).`
          : 'Follow-up ultrasound; FNA threshold not yet reached.';
      }

      const notes = [
        `Total points: ${pts} → ${level}`,
        'ACR TI-RADS does not apply to known thyroid malignancy or diffuse thyroid disease.',
        'Clinical risk factors (e.g. prior radiation, family history, MEN2) may lower FNA threshold.',
      ];
      return result(col, recommendation, notes,
        `<div class="sub-result"><div class="sub-result-title">Points breakdown</div>
        Composition: ${f.composition||0} &nbsp;|&nbsp; Echogenicity: ${f.echogenicity||0} &nbsp;|&nbsp;
        Shape: ${f.shape||0} &nbsp;|&nbsp; Margin: ${f.margin||0} &nbsp;|&nbsp;
        Echogenic foci: ${f.echogenic_foci||0} &nbsp;|&nbsp; <strong>Total: ${pts}</strong></div>`);
    },
  },

  // ════════════════════════════════════════════════════════ KIDNEY ════════════

  bosniak: {
    name: 'Bosniak Renal Cyst Classification 2019',
    source: 'Bosniak Classification v2019',
    desc: 'CT/MRI classification of cystic renal masses',
    fields: [
      selectField('class', 'Bosniak Class (select the best match)', [
        { value: 'I',   label: 'I — Simple cyst: thin smooth wall, water attenuation, no septa/calcification/enhancement' },
        { value: 'II',  label: 'II — Minimal complexity: ≤3 thin septa, thin wall, no measurable enhancement; OR uniform high density <3 cm' },
        { value: 'IIF', label: 'IIF — Multiple thin septa OR minimally thickened wall/septa; thick/irregular calcification; OR high-density ≥3 cm; no measurable enhancement' },
        { value: 'III', label: 'III — Thickened irregular or smooth wall/septa WITH measurable enhancement' },
        { value: 'IV',  label: 'IV — Enhancing soft-tissue components (distinct from wall/septa)' },
      ], 'Choose the class that best fits the CT/MRI features'),
    ],
    compute(f) {
      const mgmt = {
        'I':   result('green',  'No follow-up required. Benign simple cyst.',
          ['Approximately 0% malignancy risk.', 'No imaging follow-up needed.']),
        'II':  result('green',  'No follow-up required.',
          ['<1% malignancy risk.', 'High-density cysts must be <3 cm and show no enhancement.']),
        'IIF': result('yellow', 'Imaging follow-up: MRI (preferred) or CT at 6 months, then annually for 5 years.',
          ['~5% malignancy risk.', 'If any increase in complexity on follow-up, upgrade to Class III or IV.',
           'Most IIF cysts remain benign on follow-up.']),
        'III': result('orange', 'Active surveillance or surgical resection — multidisciplinary discussion recommended.',
          ['~50% malignancy risk.', 'Surgical resection is standard; active surveillance acceptable in poor surgical candidates.',
           'Biopsy may help guide management in select cases.']),
        'IV':  result('red',    'Surgical resection or ablation recommended.',
          ['~90% malignancy risk.', 'Enhancing soft-tissue components are the hallmark of Bosniak IV.',
           'Partial nephrectomy preferred when technically feasible.']),
      };
      return mgmt[f.class] || null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  renal_mass: {
    name: 'Renal Mass — ACR Incidental Findings White Paper',
    source: 'ACR Incidental Findings Committee 2017',
    desc: 'Management of incidental solid or indeterminate renal masses found on CT/MRI',
    fields: [
      numField('size', 'Mass Size', 'cm', 'e.g. 3.5'),
      radioField('enhancement', 'Enhancement on Contrast CT/MRI?', [
        { value: 'yes',  label: 'Yes — measurable enhancement (>20 HU or >15% signal change)' },
        { value: 'no',   label: 'No — no measurable enhancement' },
        { value: 'unk',  label: 'Indeterminate / not given contrast' },
      ]),
      radioField('nature', 'Nature of Mass', [
        { value: 'solid',       label: 'Solid (≥25% solid, enhancing)' },
        { value: 'cystic',      label: 'Predominantly cystic' },
        { value: 'fat_density', label: 'Fat density on CT (−10 HU or less) — likely angiomyolipoma' },
      ]),
    ],
    compute(f) {
      const sz = parseFloat(f.size);
      if (isNaN(sz)) return null;
      const notes = [
        'Use Bosniak classification for cystic lesions.',
        'AML with fat density on CT can be diagnosed without further workup in most cases.',
        'High-risk patients (VHL, hereditary RCC syndromes) may warrant earlier intervention.',
      ];

      if (f.nature === 'fat_density') {
        return result('green',
          'Fat-containing lesion — typical angiomyolipoma. No immediate workup if classic fat density on unenhanced CT.',
          [...notes, 'If >4 cm, refer to urology for embolisation risk assessment.']);
      }
      if (f.nature === 'cystic') {
        return result('blue', 'Apply Bosniak classification (see Kidney → Bosniak).', notes);
      }
      if (f.enhancement === 'no') {
        return result('green',
          'Non-enhancing hyperdense cyst — likely benign. No follow-up if classic appearance.',
          notes);
      }
      // Solid / enhancing
      if (sz < 1) return result('yellow', 'Too small to characterise (TSTC). Follow-up CT/MRI in 12 months.', notes);
      if (sz < 3) return result('yellow',
        `Solid enhancing mass (${sz} cm). Urology referral; active surveillance or nephron-sparing surgery.`,
        notes);
      if (sz < 4) return result('orange',
        `Solid enhancing mass (${sz} cm). Urology referral. Consider partial nephrectomy or active surveillance.`,
        notes);
      return result('red',
        `Solid enhancing mass (${sz} cm). Urology referral. Surgical resection recommended.`,
        notes);
    },
  },

  // ════════════════════════════════════════════════════════ LIVER ═════════════

  lirads: {
    name: 'LI-RADS v2018',
    source: 'ACR LI-RADS v2018',
    desc: 'Liver Imaging Reporting and Data System for HCC risk — patients with cirrhosis or chronic HBV',
    fields: [
      numField('size', 'Observation Size', 'mm', 'e.g. 25'),
      radioField('aphe', 'Arterial Phase Hyperenhancement (APHE)?', [
        { value: 'yes', label: 'Yes — non-rim, hyper-enhancing in arterial phase' },
        { value: 'no',  label: 'No' },
      ]),
      radioField('washout', 'Washout Appearance?', [
        { value: 'yes', label: 'Yes — hypo-enhancing in portal venous or delayed phase' },
        { value: 'no',  label: 'No' },
      ]),
      radioField('capsule', 'Enhancing Capsule?', [
        { value: 'yes', label: 'Yes' },
        { value: 'no',  label: 'No' },
      ]),
      radioField('growth', 'Threshold Growth?', [
        { value: 'yes', label: 'Yes — ≥50% increase in ≤6 months (or ≥50% if measured at same diameter)' },
        { value: 'no',  label: 'No' },
      ]),
    ],
    compute(f) {
      const sz      = parseFloat(f.size) || 0;
      const aphe    = f.aphe     === 'yes';
      const washout = f.washout  === 'yes';
      const capsule = f.capsule  === 'yes';
      const growth  = f.growth   === 'yes';

      const majors = [aphe, washout, capsule, growth].filter(Boolean).length;
      const notes = [
        'Applies only to patients at high risk for HCC (cirrhosis or chronic HBV infection).',
        'LI-RADS does not apply to transplant recipients before liver transplant work-up.',
        'Hepatobiliary agent MRI may alter category.',
      ];

      let cat, col, mgmt;

      if (!aphe && majors === 0) {
        if (sz < 10) { cat = 'LR-1'; col = 'green'; mgmt = 'Definitely benign. Continue routine surveillance.'; }
        else         { cat = 'LR-2'; col = 'green'; mgmt = 'Probably benign. Continue routine HCC surveillance (US ± AFP every 6 months).'; }
      } else if (aphe && majors >= 2 && sz >= 10) {
        if (majors >= 3 || growth) {
          cat = 'LR-5'; col = 'red';
          mgmt = 'Definite HCC. Discuss with multidisciplinary team. Treatment per BCLC staging.';
        } else {
          cat = sz < 20 ? 'LR-4' : 'LR-5'; col = 'orange';
          mgmt = cat === 'LR-5'
            ? 'Definite HCC. Multidisciplinary discussion and treatment.'
            : 'Probably HCC. Biopsy or LI-RADS 5-level work-up; multidisciplinary discussion.';
        }
      } else if (aphe) {
        cat = 'LR-4'; col = 'orange';
        mgmt = 'Probably HCC. Consider biopsy; multidisciplinary discussion.';
      } else {
        cat = 'LR-3'; col = 'yellow';
        mgmt = 'Intermediate probability of HCC. Repeat multiphasic CT/MRI in 3–6 months.';
      }

      return result(col, `${cat} — ${mgmt}`, notes,
        `<div class="sub-result"><div class="sub-result-title">Major features present</div>
        APHE: ${aphe?'✓':'–'} &nbsp;|&nbsp; Washout: ${washout?'✓':'–'} &nbsp;|&nbsp;
        Capsule: ${capsule?'✓':'–'} &nbsp;|&nbsp; Threshold growth: ${growth?'✓':'–'}
        &nbsp;|&nbsp; Size: ${sz} mm</div>`);
    },
  },

  // ════════════════════════════════════════════════════════ ADRENAL ════════════

  adrenal: {
    name: 'Adrenal Incidentaloma',
    source: 'ACR / Endocrine Society 2010 / 2016',
    desc: 'Management of incidentally discovered adrenal masses on CT or MRI',
    fields: [
      numField('size', 'Mass Size', 'cm', 'e.g. 3.2'),
      numField('hu_unenhanced', 'Unenhanced CT Attenuation', 'HU', 'e.g. 8', 'Leave blank if CT not available'),
      numField('washout', 'Absolute Contrast Washout', '%', 'e.g. 65', 'Optional: (EPH − DPH) / (EPH − UPH) × 100'),
      radioField('bilateral', 'Bilateral Masses?', [
        { value: 'no',  label: 'No (unilateral)' },
        { value: 'yes', label: 'Yes (bilateral)' },
      ]),
      radioField('hormonal', 'Hormonal Work-up Done?', [
        { value: 'pending', label: 'Pending / not done yet' },
        { value: 'normal',  label: 'Done — normal (non-functioning)' },
        { value: 'active',  label: 'Done — hypersecretion confirmed' },
      ]),
    ],
    compute(f) {
      const sz   = parseFloat(f.size);
      const hu   = parseFloat(f.hu_unenhanced);
      const wash = parseFloat(f.washout);
      if (isNaN(sz)) return null;

      const notes = [
        'All incidental adrenal masses should have biochemical evaluation: 1 mg DST (Cushing), plasma metanephrines (pheo), and aldosterone/renin if hypertensive.',
        'Bilateral masses require additional work-up to exclude metastases, bilateral pheo, and primary bilateral hyperplasia.',
        'History of malignancy significantly increases risk of adrenal metastasis.',
      ];

      if (f.hormonal === 'active') {
        return result('red',
          'Hormonally active mass — refer to endocrinology/surgery regardless of size.',
          notes);
      }

      // Unenhanced HU available
      if (!isNaN(hu)) {
        if (hu <= 10) {
          if (sz < 4)  return result('green',
            `Lipid-rich adenoma likely (HU=${hu} ≤10). If non-functioning: no imaging follow-up needed. Hormonal work-up recommended.`,
            notes);
          if (sz <= 6) return result('yellow',
            `Lipid-rich adenoma likely (HU=${hu} ≤10) but size ${sz} cm warrants follow-up CT in 6–12 months. Surgery if growth.`,
            notes);
          return result('red',
            `Mass ${sz} cm — surgery recommended regardless of attenuation. Adrenocortical carcinoma cannot be excluded.`,
            notes);
        }
        // HU >10
        if (!isNaN(wash)) {
          if (wash >= 60) return result(sz >= 4 ? 'orange' : 'yellow',
            `Adenoma likely (washout ${wash}% ≥60%). ${sz >= 4 ? 'Urology/surgery consult for size ≥4 cm.' : 'Annual follow-up CT × 2 years to confirm stability.'}`,
            notes);
          return result('orange',
            `Indeterminate/suspicious (HU=${hu}, washout ${wash}% <60%). Consider further imaging (MRI chemical shift) or biopsy. Surgery for growing or functional lesions.`,
            notes);
        }
        return result('orange',
          `Indeterminate attenuation (HU=${hu} >10). Recommend contrast washout CT or MRI chemical shift. If indeterminate, surgery for lesions ≥4 cm.`,
          notes);
      }

      // No HU — size-based guidance
      if (sz < 4) return result('yellow',
        `No unenhanced HU available. Follow-up imaging (unenhanced CT or MRI chemical shift) to characterise. Hormonal work-up recommended.`,
        notes);
      if (sz <= 6) return result('orange',
        `Mass ${sz} cm — unenhanced CT or MRI chemical shift for characterisation. High suspicion lesion: surgery discussion recommended.`,
        notes);
      return result('red',
        `Mass ${sz} cm — surgery recommended. Risk of adrenocortical carcinoma increases significantly >6 cm.`,
        notes);
    },
  },

  // ════════════════════════════════════════════════════════ PANCREAS ══════════

  pancreatic_cyst: {
    name: 'Pancreatic Cyst — ACR 2022',
    source: 'ACR Incidental Findings 2022 / IAP Fukuoka',
    desc: 'Management of incidental pancreatic cystic lesions on CT or MRI',
    fields: [
      numField('size', 'Cyst Size', 'cm', 'e.g. 2.0', 'Largest dimension'),
      numField('age', 'Patient Age', 'years', 'e.g. 68', 'Age affects surveillance duration and surgical candidacy'),
      radioField('mri_done', 'MRI / MRCP Performed?', [
        { value: 'yes', label: 'Yes' },
        { value: 'no',  label: 'No' },
      ]),
      checkboxField('high_risk', 'High-Risk Stigmata (any = surgery)', [
        { value: 'jaundice',    label: 'Obstructive jaundice from cystic pancreatic head lesion' },
        { value: 'solid_enh',  label: 'Enhancing solid component within cyst' },
        { value: 'mpd_10',     label: 'Main pancreatic duct (MPD) ≥ 10 mm' },
      ]),
      checkboxField('worrisome', 'Worrisome Features', [
        { value: 'pancreatitis', label: 'Acute pancreatitis attributed to cyst' },
        { value: 'size_3cm',     label: 'Cyst ≥ 3 cm' },
        { value: 'thick_wall',   label: 'Thickened or enhancing cyst walls' },
        { value: 'nodule',       label: 'Non-enhancing mural nodule' },
        { value: 'mpd_5',       label: 'MPD 5–9 mm calibre change with distal atrophy' },
        { value: 'lymph',        label: 'Lymphadenopathy' },
        { value: 'ca199',        label: 'Elevated serum CA 19-9' },
        { value: 'growth',       label: 'Rapid growth ≥5 mm over 2 years' },
        { value: 'dm',           label: 'New-onset DM or significant worsening of glycaemic control' },
      ]),
    ],
    compute(f) {
      const sz  = parseFloat(f.size);
      const age = parseFloat(f.age) || 0;
      if (isNaN(sz)) return null;
      const hrs = Array.isArray(f.high_risk)  ? f.high_risk  : (f.high_risk  ? [f.high_risk]  : []);
      const wfs = Array.isArray(f.worrisome)  ? f.worrisome  : (f.worrisome  ? [f.worrisome]  : []);
      const elderlyNote = (age > 0 && age >= 75)
        ? 'Patient age ≥75: consider discontinuing surveillance after 5 years of stability if no worrisome features; weigh surgical risk carefully.'
        : (age > 0 && age >= 65 ? 'Patient age 65–74: surgical candidacy and risk-benefit should guide surveillance intensity.' : '');
      const notes = [
        'These guidelines are primarily intended for branch-duct IPMN and indeterminate cysts.',
        'Serous cystadenomas rarely require resection; MCNs in women should generally be resected if surgical risk acceptable.',
        'Reassess imaging type — if CT only, obtain MRI/MRCP for better characterisation.',
        ...(elderlyNote ? [elderlyNote] : []),
      ];

      if (hrs.length > 0) {
        return result('red',
          'Surgery recommended — one or more high-risk stigmata present.',
          [...notes, `High-risk features: ${hrs.join(', ')}.`]);
      }
      if (wfs.length >= 2 || (wfs.length >= 1 && sz >= 3)) {
        return result('orange',
          'EUS ± FNA or multidisciplinary evaluation recommended.',
          [...notes, `Worrisome features: ${wfs.join(', ')}.`]);
      }
      if (wfs.length === 1) {
        return result('yellow',
          'MRI/CT in 3–6 months, then annually.',
          [...notes, `Worrisome feature: ${wfs.join(', ')}.`]);
      }
      // No high-risk or worrisome features — size-based
      if (sz < 1.5) return result('green',
        'MRI in 2 years; if stable, every 2 years for 5 years total.',
        notes);
      if (sz < 2.5) return result('yellow',
        'MRI/CT in 1 year.',
        notes);
      if (sz < 3)   return result('yellow',
        'MRI/CT in 6–12 months.',
        notes);
      return result('orange',
        'EUS or multidisciplinary evaluation (cyst ≥ 3 cm without high-risk features). Consider surgery if patient is fit.',
        notes);
    },
  },

  // ════════════════════════════════════════════════════════ BREAST ════════════

  birads: {
    name: 'ACR BI-RADS',
    source: 'ACR BI-RADS 5th Edition',
    desc: 'Breast Imaging Reporting and Data System — mammography, ultrasound, MRI',
    fields: [
      selectField('category', 'BI-RADS Assessment Category', [
        { value: '0',  label: '0 — Incomplete: additional imaging needed' },
        { value: '1',  label: '1 — Negative: no abnormality' },
        { value: '2',  label: '2 — Benign finding' },
        { value: '3',  label: '3 — Probably benign (≤2% malignancy risk)' },
        { value: '4A', label: '4A — Low suspicion (>2% to ≤10%)' },
        { value: '4B', label: '4B — Moderate suspicion (>10% to ≤50%)' },
        { value: '4C', label: '4C — High suspicion (>50% to <95%)' },
        { value: '5',  label: '5 — Highly suggestive of malignancy (≥95%)' },
        { value: '6',  label: '6 — Known biopsy-proven malignancy' },
      ]),
      radioField('modality', 'Imaging Modality', [
        { value: 'mammo', label: 'Mammography' },
        { value: 'us',    label: 'Ultrasound' },
        { value: 'mri',   label: 'MRI' },
      ]),
    ],
    compute(f) {
      const mgmt = {
        '0':  result('blue',   'Recall for additional imaging (additional views, ultrasound, or prior comparison).',
          ['Category 0 should be resolved to a final assessment category after additional imaging.']),
        '1':  result('green',  'Routine screening. Annual mammogram per screening guidelines.',
          ['No abnormality detected. Continue age-appropriate screening.']),
        '2':  result('green',  'Routine screening. Annual mammogram per screening guidelines.',
          ['Definitively benign finding (e.g. cyst, lymph node, stable calcification).']),
        '3':  result('yellow', 'Short-interval follow-up: repeat imaging in 6 months, then 6 months, then 12 months (total 2–3 years).',
          ['≤2% risk of malignancy.',
           'Tissue sampling is acceptable alternative if patient preference or high clinical concern.',
           'If stable at 2–3 years of follow-up, may be reclassified as BI-RADS 2.']),
        '4A': result('orange', 'Tissue sampling (core needle biopsy) recommended.',
          ['>2–10% risk of malignancy.', 'Benign biopsy result is concordant and routine follow-up can resume.']),
        '4B': result('orange', 'Tissue sampling recommended. Radiology-pathology concordance essential.',
          ['>10–50% risk of malignancy.', 'Benign discordant results should prompt repeat biopsy or excision.']),
        '4C': result('red',    'Tissue sampling recommended. High clinical suspicion warrants surgical consultation.',
          ['>50–<95% risk of malignancy.', 'Benign pathology is discordant — surgical excision recommended.']),
        '5':  result('red',    'Tissue sampling mandatory; surgical oncology referral.',
          ['≥95% risk of malignancy.', 'Pre-treatment biopsy required. Do not proceed to surgery without histological confirmation.']),
        '6':  result('red',    'Known malignancy — imaging used for treatment planning, monitoring, or pre-surgical assessment.',
          ['Management directed by oncology/surgical team.']),
      };
      return mgmt[f.category] || null;
    },
  },

  // ════════════════════════════════════════════════════════ OVARY ══════════════

  orads: {
    name: 'ACR O-RADS',
    source: 'ACR O-RADS US v2022',
    desc: 'Ovarian-Adnexal Reporting and Data System — ultrasound',
    fields: [
      radioField('patient', 'Patient Status', [
        { value: 'premenopausal',  label: 'Premenopausal' },
        { value: 'postmenopausal', label: 'Postmenopausal' },
      ]),
      selectField('score', 'O-RADS Ultrasound Score', [
        { value: '1', label: '1 — Normal ovary or physiologic finding' },
        { value: '2', label: '2 — Almost certainly benign (<1% risk): simple cyst, follicle, corpus luteum, dermoid, endometrioma' },
        { value: '3', label: '3 — Low risk (1–<10%): unilocular cyst >10 cm, multilocular smooth wall, echogenic cyst' },
        { value: '4', label: '4 — Intermediate risk (10–<50%): solid smooth lesion, irregular wall, blood flow present' },
        { value: '5', label: '5 — High risk (≥50%): irregular solid, ascites, peritoneal nodularity, papillary projections with blood flow' },
      ]),
    ],
    compute(f) {
      const post = f.patient === 'postmenopausal';
      const mgmt = {
        '1': result('green',  'Normal. No follow-up needed.',
          ['Physiologic cysts (follicles, corpus luteum) in premenopausal patients.']),
        '2': result('green',  post
          ? 'Probably benign. Follow-up ultrasound in 1 year for simple cysts ≤1 cm; otherwise no follow-up.'
          : 'Probably benign. No follow-up for simple cysts ≤3 cm. Follow-up at 12 weeks for simple cysts 3–5 cm.',
          ['<1% malignancy risk. Classic benign features (simple cyst, dermoid, endometrioma) can be characterised definitively.']),
        '3': result('yellow', 'Gynaecology referral. Repeat ultrasound in 6–12 weeks to re-evaluate.',
          ['1–<10% malignancy risk.', 'Further characterisation with MRI may help downgrade or upstage.']),
        '4': result('orange', 'Gynaecology-oncology referral. MRI for further characterisation.',
          ['10–<50% malignancy risk.', 'Surgical consultation or close follow-up with tumour markers (CA-125, HE4).']),
        '5': result('red',    'Gynaecology-oncology referral — high suspicion for malignancy.',
          ['≥50% malignancy risk.', 'CA-125, HE4, and ROMA score recommended.',
           'CT chest/abdomen/pelvis for staging if malignancy confirmed.']),
      };
      return mgmt[f.score] || null;
    },
  },

  // ════════════════════════════════════════════════════════ PROSTATE ══════════

  pirads: {
    name: 'PI-RADS v2.1',
    source: 'ACR/ESUR PI-RADS v2.1 2019',
    desc: 'Prostate Imaging-Reporting and Data System — multiparametric MRI (mpMRI)',
    fields: [
      radioField('zone', 'Lesion Location', [
        { value: 'pz', label: 'Peripheral Zone (PZ)' },
        { value: 'tz', label: 'Transition Zone (TZ) / Central Zone' },
      ]),
      selectField('t2', 'T2-Weighted Score', [
        { value: '1', label: '1 — Uniform hyperintense (PZ) or uniform low/hypointense (TZ) — benign' },
        { value: '2', label: '2 — Linear, wedge-shaped, or diffuse hypointensity (PZ); or encapsulated nodule (TZ)' },
        { value: '3', label: '3 — Heterogeneous signal or non-encapsulated low signal (TZ); or non-circumscribed homogeneous hypointensity (PZ)' },
        { value: '4', label: '4 — Lenticular/non-circumscribed, homogeneous low signal, ≥1.5 cm' },
        { value: '5', label: '5 — Same as 4 but ≥1.5 cm or definite extraprostatic extension' },
      ]),
      selectField('dwi', 'DWI / ADC Score', [
        { value: '1', label: '1 — No restriction' },
        { value: '2', label: '2 — Indistinct, mild diffuse hypointensity on ADC' },
        { value: '3', label: '3 — Focal mild/moderate hypointensity on ADC; b-value hyperintensity not marked' },
        { value: '4', label: '4 — Marked focal hypointensity on ADC; hyperintense on high b-value, <1.5 cm' },
        { value: '5', label: '5 — Same as 4 but ≥1.5 cm or definite extraprostatic extension' },
      ]),
      selectField('dce', 'DCE (Dynamic Contrast Enhancement)', [
        { value: 'neg', label: 'Negative (no early enhancement or diffuse enhancement)' },
        { value: 'pos', label: 'Positive (focal, earlier than or simultaneous with adjacent tissue)' },
      ]),

    ],
    compute(f) {
      const t2  = parseInt(f.t2)  || 1;
      const dwi = parseInt(f.dwi) || 1;
      const dce = f.dce === 'pos';
      const pz  = f.zone === 'pz';

      let pirads;
      if (pz) {
        pirads = dwi;
        if (dwi === 3 && dce) pirads = 4;
      } else {
        pirads = t2;
        if (t2 === 3 && dwi === 5) pirads = 4;
      }

      const info = {
        1: { col: 'green',  label: 'PI-RADS 1', mgmt: 'Very low risk. Continue age-appropriate PSA screening.' },
        2: { col: 'green',  label: 'PI-RADS 2', mgmt: 'Low risk. Continue PSA surveillance.' },
        3: { col: 'yellow', label: 'PI-RADS 3', mgmt: 'Equivocal. Clinical correlation with PSA and PSAD. Consider targeted biopsy — discuss with urology.' },
        4: { col: 'orange', label: 'PI-RADS 4', mgmt: 'Clinically significant PCa likely. Targeted + systematic biopsy recommended.' },
        5: { col: 'red',    label: 'PI-RADS 5', mgmt: 'Clinically significant PCa highly likely. Targeted + systematic biopsy; urology referral.' },
      };

      const c    = info[pirads] || info[3];
      const zone = pz ? 'peripheral zone' : 'transition zone';
      const notes = [
        'PI-RADS v2.1 applies to multiparametric MRI (T2WI + DWI + DCE).',
        'PSAD >0.15 ng/mL/cc increases risk of clinically significant PCa; may prompt biopsy even at PI-RADS 3.',
        'Equivocal PI-RADS 3 lesions in the PZ with positive DCE should be upgraded to PI-RADS 4.',
      ];

      const dceLine  = dce ? 'positive' : 'negative';
      const copyString = `Prostate mpMRI (PI-RADS v2.1): ${c.label} lesion in the ${zone} (T2: ${t2}, DWI: ${dwi}, DCE: ${dceLine}). ${c.mgmt}`;

      const scoreBox = `<div class="sub-result"><div class="sub-result-title">Score summary</div>
        Zone: ${pz ? 'Peripheral' : 'Transition'} &nbsp;|&nbsp; T2: ${t2} &nbsp;|&nbsp; DWI: ${dwi} &nbsp;|&nbsp; DCE: ${dce ? 'Positive' : 'Negative'} &nbsp;|&nbsp; <strong>PI-RADS: ${pirads}</strong></div>`;

      return result(c.col, `${c.label} — ${c.mgmt}`, notes, scoreBox, copyString);
    },
  },

  // ════════════════════════════════════════════════════════ PSA DENSITY ════════

  psa_density: {
    name: 'PSA Density Calculator',
    source: 'EAU / AUA Guidelines',
    desc: 'Prostate volume (ellipsoid formula) and PSA density with auto-generated report string',
    fields: [
      numField('psa',     'Serum PSA',                  'ng/mL', 'e.g. 7.2'),
      numField('prost_l', 'Prostate Length (AP)',        'cm',    'e.g. 4.8', 'Anteroposterior on axial MRI/US'),
      numField('prost_w', 'Prostate Width (transverse)', 'cm',    'e.g. 4.2', 'Transverse dimension on axial image'),
      numField('prost_h', 'Prostate Height (SI)',        'cm',    'e.g. 3.8', 'Craniocaudal on sagittal/coronal image'),
    ],
    compute(f) {
      const psa = parseFloat(f.psa);
      const pl  = parseFloat(f.prost_l);
      const pw  = parseFloat(f.prost_w);
      const ph  = parseFloat(f.prost_h);

      if (isNaN(pl) || isNaN(pw) || isNaN(ph) || pl <= 0 || pw <= 0 || ph <= 0) return null;
      if (isNaN(psa) || psa <= 0) return null;

      const volRaw  = pl * pw * ph * 0.52;
      const vol     = volRaw.toFixed(1);
      const psadRaw = psa / volRaw;
      const psad    = psadRaw.toFixed(3);

      let colour, label, interp;
      if (psadRaw >= 0.20) {
        colour = 'red';
        label  = 'High';
        interp = 'PSAD ≥20.20 ng/mL/cc — high risk of clinically significant PCa. Biopsy strongly recommended regardless of PI-RADS score.';
      } else if (psadRaw >= 0.15) {
        colour = 'orange';
        label  = 'Elevated';
        interp = 'PSAD 0.15–0.20 ng/mL/cc — elevated risk. Supports biopsy at PI-RADS 3 and above.';
      } else if (psadRaw >= 0.10) {
        colour = 'yellow';
        label  = 'Borderline';
        interp = 'PSAD 0.10–0.15 ng/mL/cc — borderline. Use in conjunction with PI-RADS score and clinical context.';
      } else {
        colour = 'green';
        label  = 'Normal';
        interp = 'PSAD <0.10 ng/mL/cc — low risk. Active surveillance may be appropriate for PI-RADS 3 lesions.';
      }

      const psadCol = colour === 'red' ? '#c0392b' : colour === 'orange' ? '#e67e22' : colour === 'yellow' ? '#b8860b' : '#27ae60';

      const notes = [
        'Ellipsoid formula: Volume = Length × Width × Height × 0.52.',
        'PSAD = PSA / prostate volume (ng/mL/cc = ng/mL/mL).',
        'PSAD ≥0.15 is the widely used threshold to support biopsy in equivocal (PI-RADS 3) lesions.',
        'Transition zone PSAD (PSAD-TZ) may be more specific but requires separate TZ volume measurement.',
      ];

      const extraHtml = `<div class="sub-result">
        <div class="sub-result-title">Calculation</div>
        <table style="width:100%;font-size:.84rem;border-collapse:collapse">
          <tr>
            <td style="padding:3px 12px 3px 0;width:40%"><strong>Prostate volume</strong></td>
            <td><strong>${vol} mL</strong></td>
            <td style="font-size:.77rem;color:#5c7a96;padding-left:8px">${pl} × ${pw} × ${ph} cm</td>
          </tr>
          <tr>
            <td style="padding:3px 12px 3px 0"><strong>PSA</strong></td>
            <td>${psa} ng/mL</td><td></td>
          </tr>
          <tr>
            <td style="padding:3px 12px 3px 0"><strong>PSA density</strong></td>
            <td><strong style="color:${psadCol}">${psad} ng/mL/cc</strong></td>
            <td style="font-size:.77rem;color:${psadCol};padding-left:8px">${label}</td>
          </tr>
        </table>
      </div>`;

      const copyString = `Prostate volume: ${vol} mL (${pl} × ${pw} × ${ph} cm, ellipsoid formula). PSA: ${psa} ng/mL. PSA density: ${psad} ng/mL/cc (${label.toLowerCase()}). ${interp}`;

      return result(colour, interp, notes, extraHtml, copyString);
    },
    criteria: [
      { title: 'PSAD Thresholds', items: [
        { label: 'Normal — <0.10 ng/mL/cc', risk: 'Low', riskCol: 'cr-green',
          desc: 'Low probability of clinically significant PCa. For PI-RADS 3 lesions, active surveillance may be appropriate. No biopsy threshold met on density alone.' },
        { label: 'Borderline — 0.10–0.15 ng/mL/cc', risk: 'Borderline', riskCol: 'cr-yellow',
          desc: 'Intermediate range. Clinical decision should incorporate PI-RADS score, age, family history, and prior biopsy results. Shared decision-making recommended.' },
        { label: 'Elevated — 0.15–0.20 ng/mL/cc', risk: 'Elevated', riskCol: 'cr-orange',
          desc: 'Widely cited biopsy threshold. PSAD ≥0.15 supports biopsy recommendation at PI-RADS 3 and reinforces recommendation at PI-RADS 4–5.' },
        { label: 'High — ≥0.20 ng/mL/cc', risk: 'High', riskCol: 'cr-red',
          desc: 'Strongly supports biopsy. High PSAD in context of PI-RADS 4–5 lesion warrants urgent urology referral and targeted + systematic biopsy.' },
      ]},
      { title: 'Volume Formula', items: [
        { label: 'Ellipsoid formula', risk: '', riskCol: 'cr-grey',
          desc: 'Volume (mL) = Length (AP) × Width (Trans) × Height (SI) × 0.52. Widely validated on both MRI and transrectal ultrasound. Accuracy improves when dimensions are measured on orthogonal planes.' },
        { label: 'PSA Density (PSAD)', risk: '', riskCol: 'cr-grey',
          desc: 'PSAD = Total PSA (ng/mL) ÷ Prostate Volume (mL). Corrects for the contribution of benign prostatic enlargement to PSA. A larger gland produces more PSA per gram, so PSAD adjusts for this.' },
      ]},
    ],
  },

  // ════════════════════════════════════════════════════════ SPINE / MSK ════════

  incidental_vertebral: {
    name: 'Incidental Vertebral Compression Fracture',
    source: 'ACR Appropriateness Criteria / NOF Guidelines',
    desc: 'Workup of incidentally discovered vertebral compression or height loss on CT or MRI',
    fields: [
      numField('height_loss', 'Estimated Height Loss', '%', 'e.g. 20', 'Grade: mild <20%, moderate 20–40%, severe >40%'),
      radioField('acuity', 'Fracture Acuity (if known)', [
        { value: 'unknown', label: 'Unknown / indeterminate' },
        { value: 'acute',   label: 'Acute / subacute (marrow oedema on MRI)' },
        { value: 'chronic', label: 'Chronic (no oedema, sclerotic)' },
      ]),
      radioField('malignancy', 'Underlying Malignancy?', [
        { value: 'no',  label: 'No known malignancy' },
        { value: 'yes', label: 'Yes — known or suspected malignancy' },
      ]),
      radioField('osteoporosis', 'Known Osteoporosis / High Risk?', [
        { value: 'no',      label: 'No' },
        { value: 'yes',     label: 'Yes — osteoporosis or steroid use' },
        { value: 'unknown', label: 'Unknown' },
      ]),
    ],
    compute(f) {
      const hl   = parseFloat(f.height_loss) || 0;
      const notes = [
        'All incidental vertebral fractures warrant DEXA scan if not recent.',
        'MRI is the preferred modality to assess acuity and marrow signal.',
        'Pathological fracture (malignancy) has distinct imaging features: convex posterior cortex, marrow replacement, soft-tissue mass.',
      ];

      if (f.malignancy === 'yes') {
        return result('red',
          'Known/suspected malignancy — MRI spine for staging, pathological fracture assessment. Oncology referral.',
          notes);
      }
      if (f.acuity === 'acute') {
        return result('orange',
          `Acute fracture — pain management, DEXA scan, anti-fracture therapy referral (endocrinology/rheumatology). ${hl > 40 ? 'Severe height loss: consider vertebroplasty/kyphoplasty.' : 'Conservative management initially.'}`,
          notes);
      }
      return result('yellow',
        'Chronic/indeterminate fracture — DEXA scan, vertebral fracture assessment (VFA), anti-fracture therapy evaluation. No urgent intervention needed.',
        notes);
    },
  },

  incidental_disc: {
    name: 'Incidental Disc and Degenerative Finding',
    source: 'ACR Appropriateness Criteria / NASS Guidelines',
    desc: 'Common incidental lumbar/cervical spine findings — contextualising significance',
    fields: [
      selectField('finding', 'Primary Finding', [
        { value: 'bulge',       label: 'Disc bulge (diffuse, <25% circumferential)' },
        { value: 'protrusion',  label: 'Disc protrusion (focal, broad-based)' },
        { value: 'extrusion',   label: 'Disc extrusion (extends beyond disc space)' },
        { value: 'sequestrum',  label: 'Sequestrated / free disc fragment' },
        { value: 'schmorl',     label: "Schmorl's node" },
        { value: 'modic',       label: 'Modic endplate change' },
        { value: 'facet',       label: 'Facet arthropathy' },
        { value: 'listhesis',   label: 'Spondylolisthesis' },
      ]),
      radioField('symptoms', 'Patient Symptoms?', [
        { value: 'none',    label: 'Asymptomatic / incidental' },
        { value: 'axial',   label: 'Axial pain only (no radiculopathy)' },
        { value: 'radicular', label: 'Radiculopathy / myelopathy' },
      ]),
    ],
    compute(f) {
      const notes = [
        'Most degenerative findings are common in the asymptomatic population and do not require intervention.',
        'Imaging findings must always be correlated with clinical symptoms.',
        'Red flag symptoms (bladder/bowel dysfunction, progressive weakness) warrant urgent evaluation.',
      ];

      const radio = f.symptoms === 'radicular';
      const asym  = f.symptoms === 'none';
      const sympNotes = radio
        ? [...notes, 'Radiculopathy: conservative management 4–6 weeks. If refractory, consider ESI or surgical referral.']
        : notes;

      const msgs = {
        'bulge':      [asym ? 'green' : 'yellow', asym
          ? 'Disc bulge is a normal variant in adults. No action required if asymptomatic.'
          : 'Disc bulge with symptoms — correlate clinically. Conservative management (physio, analgesia).'],
        'protrusion': [radio ? 'orange' : 'yellow', radio
          ? 'Disc protrusion causing radiculopathy — conservative management 4–6 weeks; if no improvement, neurosurgery referral.'
          : 'Disc protrusion — correlate clinically. Conservative management if symptomatic.'],
        'extrusion':  ['orange', radio
          ? 'Disc extrusion causing radiculopathy — neurosurgery referral. Consider urgent MRI if myelopathy suspected.'
          : 'Disc extrusion — monitor; clinical correlation essential.'],
        'sequestrum': ['orange', 'Sequestrated disc — neurosurgery referral. May resolve spontaneously but surgical risk is higher.'],
        'schmorl':    ['green',  'Schmorl\'s node — normal variant in most cases. No further workup if asymptomatic.'],
        'modic':      [asym ? 'green' : 'yellow', asym
          ? 'Modic changes — common degenerative finding. No action required if asymptomatic.'
          : 'Modic changes with pain — correlate clinically. Inflammatory type 1 may respond to anti-inflammatory therapy.'],
        'facet':      [asym ? 'green' : 'yellow', asym
          ? 'Facet arthropathy — extremely common with age. No action required.'
          : 'Facet arthropathy with axial pain — consider physiotherapy, facet joint injections if conservative management fails.'],
        'listhesis':  [radio ? 'orange' : 'yellow', radio
          ? 'Spondylolisthesis with radiculopathy/myelopathy — neurosurgery referral. Standing flexion/extension films to assess stability.'
          : 'Spondylolisthesis — clinical correlation. Grade I/II often managed conservatively. Standing X-rays for grading.'],
      };

      const [col, mgmt] = msgs[f.finding] || ['blue', 'Clinical correlation required.'];
      return result(col, mgmt, sympNotes);
    },
  },

  // ════════════════════════════════════════════════════════ VASCULAR ════════════

  aortic_aneurysm: {
    name: 'Aortic Aneurysm — Surveillance & Management',
    source: 'SVS 2018 / ACC-AHA 2022',
    desc: 'Size-based follow-up for incidental aortic aneurysm (abdominal and thoracic)',
    fields: [
      radioField('location', 'Aneurysm Location', [
        { value: 'aaa',        label: 'Abdominal Aortic Aneurysm (AAA)' },
        { value: 'ascending',  label: 'Thoracic — Ascending Aorta' },
        { value: 'descending', label: 'Thoracic — Descending Aorta / Arch' },
      ]),
      numField('diameter', 'Maximum Diameter', 'cm', 'e.g. 4.5', 'Outer-to-outer on axial image'),
      radioField('sex', 'Patient Sex', [
        { value: 'male',   label: 'Male' },
        { value: 'female', label: 'Female (lower surgical thresholds apply)' },
      ]),
      radioField('symptomatic', 'Symptomatic?', [
        { value: 'no',  label: 'Asymptomatic (incidental)' },
        { value: 'yes', label: 'Symptomatic — pain, tenderness, haemodynamic instability' },
      ]),
      radioField('ctd', 'Bicuspid Aortic Valve or Connective Tissue Disorder?', [
        { value: 'no',  label: 'No' },
        { value: 'yes', label: 'Yes — Marfan, Loeys-Dietz, bicuspid AV' },
      ]),
    ],
    compute(f) {
      const d = parseFloat(f.diameter);
      if (isNaN(d) || d <= 0) return null;
      const female = f.sex === 'female';
      const symp   = f.symptomatic === 'yes';
      const ctd    = f.ctd === 'yes';
      if (symp) return result('red',
        'Symptomatic aneurysm — emergency vascular surgery referral. Urgent CTA if not already performed.',
        ['Symptomatic AAA/TAA carries very high rupture risk regardless of size.',
         'Haemodynamically unstable patients require immediate surgical intervention.']);
      const notes = [
        'Growth rate >5 mm over 6 months warrants expedited surgical referral.',
        'CTA is preferred over ultrasound for thoracic aneurysms.',
        'All patients should receive cardiovascular risk factor optimisation (statin, BP control, smoking cessation).',
      ];
      if (f.location === 'aaa') {
        const surg = female ? 5.0 : 5.5;
        if (d < 3.0) return result('green', 'Normal aortic diameter — no surveillance required.', notes);
        if (d < 4.0) return result('green', 'Small AAA — ultrasound surveillance every 2–3 years.', notes);
        if (d < 4.5) return result('yellow', 'AAA 4.0–4.4 cm — ultrasound every 12 months.', notes);
        if (d < surg) return result('yellow', 'AAA ' + d + ' cm — ultrasound every 6 months. Consider CT for morphology.', notes);
        return result('red', 'AAA \u2265' + surg + ' cm — vascular surgery referral for repair (EVAR or open). Threshold lower in females (\u22655.0 cm).', notes);
      }
      if (f.location === 'ascending') {
        const surg = ctd ? 4.5 : 5.5;
        const warn = ctd ? 4.0 : 5.0;
        if (d < 4.0) return result('yellow', 'Ascending aorta dilation — CTA or MRA at 12 months. Cardiothoracic referral.', notes);
        if (d < warn) return result('yellow', 'Ascending aorta ' + d + ' cm — imaging every 6–12 months.', notes);
        if (d < surg) return result('orange', 'Ascending aorta ' + d + ' cm — expedited cardiothoracic surgery referral.', notes);
        return result('red', 'Ascending aorta \u2265' + surg + ' cm — surgical repair indicated' + (ctd ? ' (lower threshold: CTD/bicuspid AV).' : '.'), notes);
      }
      const surg = ctd ? 5.5 : 6.0;
      if (d < 4.5) return result('yellow', 'Descending aortic dilation — CTA at 12 months.', notes);
      if (d < surg) return result('orange', 'Descending aorta ' + d + ' cm — vascular/cardiothoracic referral. Imaging every 6 months.', notes);
      return result('red', 'Descending aorta \u2265' + surg + ' cm — TEVAR or surgical repair indicated.', notes);
    },
    criteria: [
      { title: 'AAA — Surveillance (SVS 2018)', items: [
        { label: '<3.0 cm', risk: 'Normal', riskCol: 'cr-green', desc: 'Normal infrarenal aorta. No surveillance needed.' },
        { label: '3.0–3.9 cm', risk: 'Small', riskCol: 'cr-green', desc: 'Very low rupture risk (<0.5%/yr). US every 2–3 years.' },
        { label: '4.0–4.4 cm', risk: 'Moderate', riskCol: 'cr-yellow', desc: 'Annual ultrasound. Rupture risk ~1%/yr.' },
        { label: '4.5–5.4 cm', risk: 'Elevated', riskCol: 'cr-orange', desc: 'US every 6 months. Rupture risk 1–3%/yr. CT for morphology.' },
        { label: '\u22655.5 cm (M) / \u22655.0 cm (F)', risk: 'Repair', riskCol: 'cr-red', desc: 'Elective repair recommended. EVAR preferred if anatomy suitable. Annual rupture risk ~5–10%.' },
      ]},
      { title: 'Thoracic Aorta (ACC/AHA 2022)', items: [
        { label: 'Ascending <4.5 cm', risk: 'Surveillance', riskCol: 'cr-yellow', desc: 'Annual CTA or MRA.' },
        { label: 'Ascending 4.5–5.5 cm', risk: 'Referral', riskCol: 'cr-orange', desc: 'Cardiothoracic referral. Lower threshold (\u22655.0 cm or 4.5 cm) if CTD or bicuspid AV.' },
        { label: 'Ascending \u22655.5 cm', risk: 'Surgery', riskCol: 'cr-red', desc: 'Surgery indicated. Threshold \u22654.5 cm for CTD/bicuspid AV patients.' },
        { label: 'Descending \u22656.0 cm', risk: 'Repair', riskCol: 'cr-red', desc: 'TEVAR or surgery. \u22655.5 cm if CTD.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  carotid_stenosis: {
    name: 'Carotid Artery Stenosis — NASCET Grading & Management',
    source: 'AHA/ASA 2021 / NASCET Criteria',
    desc: 'ICA stenosis grading and management based on symptom status',
    fields: [
      selectField('stenosis', 'Degree of Stenosis (NASCET)', [
        { value: '0',   label: '<30% — minimal' },
        { value: '30',  label: '30–49% — mild' },
        { value: '50',  label: '50–69% — moderate' },
        { value: '70',  label: '70–99% — severe' },
        { value: '100', label: '100% — total occlusion' },
      ], 'NASCET: (1 \u2212 [ICA min lumen / distal ICA diameter]) \xd7 100'),
      radioField('symptoms', 'Symptomatic? (ipsilateral TIA or stroke \u22646 months)', [
        { value: 'asymptomatic', label: 'Asymptomatic' },
        { value: 'symptomatic',  label: 'Symptomatic' },
      ]),
      radioField('sex', 'Patient Sex', [
        { value: 'male',   label: 'Male' },
        { value: 'female', label: 'Female' },
      ]),
    ],
    compute(f) {
      const sten = parseInt(f.stenosis);
      const symp = f.symptoms === 'symptomatic';
      const male = f.sex === 'male';
      const notes = [
        'Optimal medical therapy: antiplatelet, statin, BP control — for all patients.',
        'NASCET measures residual lumen vs distal ICA above the bulb (not estimated original diameter).',
        'CAS (carotid artery stenting) is an alternative in high surgical-risk patients.',
        'CEA confers maximal benefit when performed within 2 weeks of symptoms in eligible patients.',
      ];
      if (sten === 100) return result('orange', 'Total occlusion — CEA/CAS not possible. Optimal medical therapy. Neurology referral.', notes);
      if (!symp) {
        if (sten < 50) return result('green',  'Asymptomatic stenosis <50% — optimal medical therapy only. No intervention.', notes);
        if (sten < 70) return result('yellow', 'Asymptomatic stenosis 50–69% — medical therapy. CEA benefit marginal; vascular surgery referral for shared decision-making.', notes);
        return result('orange', 'Asymptomatic stenosis 70–99% — CEA may be considered if surgical risk <3% and life expectancy >5 years. ' + (male ? 'Males benefit more.' : 'Benefit less clear in females.') + ' Vascular surgery referral.', notes);
      }
      if (sten < 50) return result('yellow', 'Symptomatic stenosis <50% — no CEA benefit. Intensive medical therapy (dual antiplatelet acutely, statin, BP control).', notes);
      if (sten < 70) return result('orange', 'Symptomatic stenosis 50–69% — CEA reduces 5-year stroke risk by ~4%. Vascular surgery referral. Medical therapy concurrently.', notes);
      return result('red', 'Symptomatic stenosis 70–99% — CEA strongly recommended within 2 weeks of symptoms. Reduces 5-year ipsilateral stroke risk by ~16%. Urgent vascular surgery referral.', notes);
    },
    criteria: [
      { title: 'NASCET Stenosis Severity', items: [
        { label: '<30% — Minimal', risk: 'Low', riskCol: 'cr-green', desc: 'Minimal disease. Medical management only. No interventional benefit demonstrated.' },
        { label: '30–49% — Mild', risk: 'Low-Mod', riskCol: 'cr-green', desc: 'No CEA benefit. Optimal medical therapy: antiplatelet, statin, hypertension control.' },
        { label: '50–69% — Moderate', risk: 'Moderate', riskCol: 'cr-yellow', desc: 'Symptomatic: marginal CEA benefit (NNT ~28 at 5yr). Asymptomatic: no clear benefit from CEA.' },
        { label: '70–99% — Severe', risk: 'High', riskCol: 'cr-red', desc: 'Symptomatic: CEA strongly recommended (NNT ~6 at 5yr). Asymptomatic: CEA beneficial if surgical risk <3%.' },
        { label: '100% — Occlusion', risk: 'None', riskCol: 'cr-grey', desc: 'Not amenable to revascularisation. Medical management only. Evaluate contralateral carotid.' },
      ]},
      { title: 'NASCET Measurement Method', items: [
        { label: 'NASCET formula', risk: '', riskCol: 'cr-grey', desc: 'Stenosis% = (1 \u2212 [minimum ICA lumen / distal normal ICA]) \xd7 100. Distal ICA measured above bulb where walls are parallel.' },
        { label: 'ECST vs NASCET', risk: '', riskCol: 'cr-grey', desc: 'ECST measures against estimated original vessel diameter. NASCET is the internationally adopted standard for clinical trials and guidelines.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  cac_scoring: {
    name: 'Coronary Artery Calcium (CAC) Score',
    source: 'ACC/AHA 2018 Cholesterol Guidelines',
    desc: 'Agatston score interpretation for ASCVD risk stratification and statin therapy',
    fields: [
      numField('score', 'Agatston CAC Score', '', 'e.g. 125', 'Enter 0 if no calcification detected'),
      numField('age',   'Patient Age', 'years', 'e.g. 58'),
      selectField('risk', '10-Year ASCVD Risk (Pooled Cohort Equations)', [
        { value: 'low',          label: '<5% — Low risk' },
        { value: 'borderline',   label: '5–7.5% — Borderline risk' },
        { value: 'intermediate', label: '7.5–20% — Intermediate risk' },
        { value: 'high',         label: '\u226520% — High risk' },
      ]),
    ],
    compute(f) {
      const score = parseFloat(f.score);
      if (isNaN(score) || score < 0) return null;
      const notes = [
        'CAC scanning uses non-contrast ECG-gated CT; effective dose ~1 mSv.',
        'CAC 0 at any age confers very low 10-year ASCVD risk — may defer statin in borderline-risk patients.',
        'CAC >400 indicates extensive coronary calcification; risk equivalent to known ASCVD.',
        'Repeat CAC scanning is generally not recommended — baseline score guides long-term therapy.',
      ];
      let colour, rec;
      if (score === 0) {
        colour = 'green';
        rec = 'CAC 0 — very low 10-year ASCVD event rate. Consider withholding or deferring statin in borderline or intermediate risk. Reassurance appropriate.';
      } else if (score < 100) {
        colour = 'yellow';
        rec = 'CAC 1–99 (score: ' + score + ') — intermediate risk modifier. Statin initiation favoured in borderline/intermediate ASCVD risk patients.';
      } else if (score < 300) {
        colour = 'orange';
        rec = 'CAC 100–299 (score: ' + score + ') — significant coronary calcification. Statin therapy recommended; consider high-intensity. Cardiology referral.';
      } else {
        colour = 'red';
        rec = 'CAC \u2265300 (score: ' + score + ') — extensive calcification. 10-year ASCVD risk >20%. High-intensity statin strongly indicated. Cardiology referral.';
      }
      return result(colour, rec, notes);
    },
    criteria: [
      { title: 'Agatston Score Interpretation', items: [
        { label: 'CAC 0', risk: 'Very Low', riskCol: 'cr-green', desc: 'No coronary calcification. 10-year event rate <2%. Supports withholding statin in borderline-risk patients.' },
        { label: 'CAC 1–99', risk: 'Mild', riskCol: 'cr-yellow', desc: 'Mild calcification. Risk-enhancing factor; favours statin initiation in borderline to intermediate ASCVD risk.' },
        { label: 'CAC 100–299', risk: 'Moderate', riskCol: 'cr-orange', desc: 'Moderate calcification. Independent predictor of MACE. Statin therapy recommended. 2-fold increase in 10-year risk vs zero-calcium.' },
        { label: 'CAC \u2265300', risk: 'High', riskCol: 'cr-red', desc: 'Extensive calcification. Risk equivalent to known ASCVD. High-intensity statin + cardiology referral. CAC >400 ~25% 10-year MACE rate.' },
      ]},
      { title: 'Age/Sex Percentile Context', items: [
        { label: 'MESA percentile calculator', risk: '', riskCol: 'cr-grey', desc: 'A score at the \u226575th percentile for age/sex/race confers higher-than-expected risk, even with a low absolute score (e.g. CAC 10 in a 45-year-old male).' },
      ]},
    ],
  },

  // ════════════════════════════════════════════════════════ NEURO / HEAD ════════

  pituitary_incidentaloma: {
    name: 'Incidental Pituitary Adenoma',
    source: 'Endocrine Society 2011 / Pituitary Society 2023',
    desc: 'Management of incidentally discovered pituitary lesion on head CT or MRI',
    fields: [
      numField('size', 'Maximum Lesion Diameter', 'mm', 'e.g. 8', '<10 mm = microadenoma; \u226510 mm = macroadenoma'),
      radioField('visual', 'Visual Symptoms or Field Defect?', [
        { value: 'no',  label: 'No' },
        { value: 'yes', label: 'Yes — visual field loss or diplopia' },
      ]),
      radioField('hormone', 'Hormone Excess Symptoms?', [
        { value: 'no',  label: 'No (likely non-functioning)' },
        { value: 'yes', label: "Yes — Cushing's features, acromegaly, galactorrhoea, amenorrhoea" },
      ]),
      radioField('cavernous', 'Cavernous Sinus Invasion on Imaging?', [
        { value: 'no',       label: 'No' },
        { value: 'possible', label: 'Possible / indeterminate' },
        { value: 'yes',      label: 'Definite cavernous sinus invasion' },
      ]),
    ],
    compute(f) {
      const sz = parseFloat(f.size);
      if (isNaN(sz) || sz <= 0) return null;
      const macro   = sz >= 10;
      const visual  = f.visual === 'yes';
      const hormone = f.hormone === 'yes';
      const notes = [
        'All incidentally found pituitary adenomas require endocrinology referral.',
        'Baseline hormonal workup: prolactin, IGF-1, ACTH/cortisol, LH/FSH, sex steroids, TSH/fT4.',
        'Dedicated pituitary protocol MRI (3T, thin slices, dynamic contrast) if not already performed.',
        'Pituitary apoplexy (sudden headache, visual loss, altered consciousness) — emergency neurosurgery.',
      ];
      if (visual) return result('red', 'Visual symptoms or field defect — urgent ophthalmology + neurosurgery referral. Likely chiasmal compression.', notes);
      if (hormone) return result('orange',
        (macro ? 'Macroadenoma' : 'Microadenoma') + ' with hormonal excess — endocrinology referral. Functional adenoma requires specific treatment (dopamine agonist for prolactinoma; surgery for Cushing\'s/acromegaly).', notes);
      if (macro) return result('orange',
        'Macroadenoma (' + sz + ' mm) — dedicated pituitary MRI, full hormone panel, formal visual fields. Neurosurgery referral.' + (f.cavernous === 'yes' ? ' Cavernous sinus invasion suggests aggressive behaviour.' : '') + ' MRI at 6 months, then annually.', notes);
      if (sz < 5) return result('yellow', 'Microincidentaloma (' + sz + ' mm) — low growth risk. MRI at 1 year; if stable, repeat at 3 years, then discharge if no change.', notes);
      return result('yellow', 'Microadenoma (' + sz + ' mm) — non-functioning. MRI at 6–12 months. Endocrinology review. If stable \xd72 years, extend to 2-yearly, then discharge.', notes);
    },
    criteria: [
      { title: 'Size Classification', items: [
        { label: 'Microadenoma — <10 mm', risk: 'Low', riskCol: 'cr-green', desc: 'Low risk of growth (<10%). Annual MRI initially. Very low risk of chiasmal compression. Hormonal workup at baseline.' },
        { label: 'Macroadenoma — \u226510 mm', risk: 'Moderate', riskCol: 'cr-orange', desc: 'Higher risk of growth, visual symptoms, hypopituitarism. Neurosurgery involvement. Visual fields mandatory. Full hormone panel required.' },
      ]},
      { title: 'Hormonal Subtypes', items: [
        { label: 'Prolactinoma', risk: 'Functional', riskCol: 'cr-yellow', desc: 'Most common functioning adenoma. Serum prolactin >200 ng/mL highly specific. First-line: cabergoline or bromocriptine. Surgery reserved for drug-resistant cases.' },
        { label: "Cushing's — ACTH-secreting", risk: 'Functional', riskCol: 'cr-orange', desc: '24h urinary cortisol, midnight salivary cortisol. Petrosal sinus sampling may localise. Transsphenoidal surgery first-line.' },
        { label: 'Acromegaly — GH-secreting', risk: 'Functional', riskCol: 'cr-orange', desc: 'IGF-1 elevation; OGTT fails to suppress GH. Transsphenoidal surgery \xb1 somatostatin analogue. Cardiac and sleep apnoea screening required.' },
        { label: 'Non-functioning', risk: 'Incidental', riskCol: 'cr-grey', desc: 'Most incidentalomas. No hormone excess. Risk of hypopituitarism from mass effect. Follow-up imaging and baseline pituitary panel.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  intracranial_aneurysm: {
    name: 'Unruptured Intracranial Aneurysm — Risk Stratification',
    source: 'AHA/ASA 2015 / ISUIA',
    desc: 'Management of incidentally discovered unruptured intracranial aneurysm',
    fields: [
      numField('size', 'Maximum Aneurysm Diameter', 'mm', 'e.g. 6', 'Largest dimension on CTA or MRA'),
      selectField('location', 'Aneurysm Location', [
        { value: 'anterior',  label: 'Anterior circulation (ICA, MCA, ACA)' },
        { value: 'pcom',      label: 'Posterior communicating artery (PCOM)' },
        { value: 'posterior', label: 'Posterior circulation (basilar, posterior fossa, PICA)' },
      ]),
      radioField('symptoms', 'Symptomatic?', [
        { value: 'no',  label: 'Incidental / asymptomatic' },
        { value: 'yes', label: 'Symptomatic — headache, 3rd nerve palsy, visual change' },
      ]),
      radioField('prior_sah', 'Prior SAH from a different aneurysm?', [
        { value: 'no',  label: 'No' },
        { value: 'yes', label: 'Yes' },
      ]),
      radioField('morphology', 'Aneurysm Morphology', [
        { value: 'regular',   label: 'Regular / smooth dome' },
        { value: 'irregular', label: 'Irregular / lobulated / bleb present' },
      ]),
    ],
    compute(f) {
      const sz = parseFloat(f.size);
      if (isNaN(sz) || sz <= 0) return null;
      const post     = f.location === 'posterior';
      const symp     = f.symptoms === 'yes';
      const priorSAH = f.prior_sah === 'yes';
      const irreg    = f.morphology === 'irregular';
      const notes = [
        'All unruptured intracranial aneurysms require neurovascular specialist review.',
        'PHASES score integrates: Population, Hypertension, Age, Size, Earlier SAH, Site.',
        'Irregular morphology (bleb, daughter sac) is an independent risk factor for rupture.',
        'Smoking cessation and BP control reduce rupture risk.',
        'CTA or DSA with 3D reconstruction recommended for treatment planning.',
      ];
      if (symp) return result('red', 'Symptomatic aneurysm — urgent neurovascular referral. High rupture risk (e.g. 3rd nerve palsy from PCOM aneurysm).', notes);
      const highRiskFeatures = [irreg ? 'irregular morphology' : '', priorSAH ? 'prior SAH' : '', post ? 'posterior circulation' : ''].filter(Boolean);
      if (sz < 5 && !post && !irreg && !priorSAH) {
        return result('yellow', 'Small anterior aneurysm (' + sz + ' mm) — low rupture risk. MRA/CTA at 6–12 months, then annually \xd73 years if stable. Neurovascular referral.', notes);
      }
      if (sz < 7 && highRiskFeatures.length === 0) {
        return result('orange', sz + ' mm aneurysm — intermediate risk. Neurovascular MDT review. ' + (post ? 'Posterior circulation — higher risk for same size. ' : '') + 'Consider treatment vs surveillance.', notes);
      }
      if (sz < 7) {
        return result('orange', sz + ' mm aneurysm with high-risk features (' + highRiskFeatures.join(', ') + ') — neurovascular MDT review; treatment likely recommended.', notes);
      }
      return result('red', 'Large aneurysm (' + sz + ' mm) — elevated rupture risk. Neurovascular surgery referral. ' + (post ? 'Posterior circulation — higher risk. ' : '') + (irreg ? 'Irregular morphology further increases risk.' : ''), notes);
    },
    criteria: [
      { title: 'Size & Rupture Risk (ISUIA)', items: [
        { label: '<5 mm — Anterior circulation', risk: 'Low', riskCol: 'cr-green', desc: '5-year rupture risk ~0.5%. Surveillance imaging recommended. Annual MRA typically adequate.' },
        { label: '5–9.9 mm', risk: 'Intermediate', riskCol: 'cr-yellow', desc: '5-year rupture risk 1–3%. PHASES score guides treatment vs surveillance. Neurovascular team decision.' },
        { label: '10–24 mm', risk: 'High', riskCol: 'cr-orange', desc: '5-year rupture risk 3–6%. Treatment (clipping or coiling) generally recommended in suitable patients.' },
        { label: '\u226525 mm — Giant', risk: 'Very High', riskCol: 'cr-red', desc: 'Annual rupture rate ~6%. Treatment usually advised. Complex anatomy may require staged procedures.' },
        { label: 'Posterior circulation', risk: 'Higher', riskCol: 'cr-orange', desc: 'Basilar tip, PICA, and vertebral aneurysms carry 2–4\xd7 higher rupture risk than anterior circulation lesions of the same size.' },
      ]},
      { title: 'High-Risk Features', items: [
        { label: 'Irregular morphology / bleb', risk: 'Risk+', riskCol: 'cr-red', desc: 'Lobulation, multilobed shape, or daughter sac (bleb) are independent predictors of rupture. Lower threshold for treatment.' },
        { label: 'Prior SAH from another aneurysm', risk: 'Risk+', riskCol: 'cr-red', desc: 'History of SAH increases rupture risk of co-existing aneurysm. Lower size threshold for intervention.' },
        { label: 'Symptomatic (3rd nerve palsy)', risk: 'Urgent', riskCol: 'cr-red', desc: '3rd nerve palsy from PCOM aneurysm indicates active expansion. Urgent neurovascular intervention.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  fazekas: {
    name: 'White Matter Hyperintensities — Fazekas Scale',
    source: 'Fazekas et al. 1987 / STRIVE 2013',
    desc: 'Grading of T2/FLAIR white matter hyperintensities as a marker of cerebral small vessel disease',
    fields: [
      selectField('pvwmh', 'Periventricular WMH', [
        { value: '0', label: 'Grade 0 — Absent' },
        { value: '1', label: 'Grade 1 — Caps or pencil-thin lining' },
        { value: '2', label: 'Grade 2 — Smooth halo' },
        { value: '3', label: 'Grade 3 — Irregular, extending into deep WM' },
      ], 'T2/FLAIR signal change around lateral ventricles'),
      selectField('dwmh', 'Deep / Subcortical WMH', [
        { value: '0', label: 'Grade 0 — Absent' },
        { value: '1', label: 'Grade 1 — Punctate foci' },
        { value: '2', label: 'Grade 2 — Beginning confluence (early confluent)' },
        { value: '3', label: 'Grade 3 — Large confluent areas' },
      ], 'T2/FLAIR foci in deep white matter away from ventricles'),
      radioField('clinical', 'Clinical Context', [
        { value: 'asymptomatic', label: 'Asymptomatic / incidental' },
        { value: 'cognitive',    label: 'Cognitive symptoms or memory concern' },
        { value: 'stroke',       label: 'Stroke / TIA workup' },
      ]),
    ],
    compute(f) {
      const pv    = parseInt(f.pvwmh) || 0;
      const dw    = parseInt(f.dwmh)  || 0;
      const total = pv + dw;
      const notes = [
        'Fazekas scale is ordinal — not designed for volumetric quantification.',
        'WMH are associated with vascular risk factors: hypertension, diabetes, smoking, hyperlipidaemia.',
        'Confluent WMH (Fazekas \u22652) associated with increased stroke risk and cognitive decline.',
        'FLAIR is the most sensitive MRI sequence for WMH detection.',
        'Lacunes in basal ganglia or thalamus suggest more severe small vessel disease.',
      ];
      let col, rec;
      if (total <= 1) {
        col = 'green';
        rec = 'Fazekas PV ' + pv + ' / Deep ' + dw + ' — minimal white matter changes. Age-related or mild SVD. No specific intervention required.';
      } else if (total <= 3 && pv <= 2 && dw <= 2) {
        col = 'yellow';
        rec = 'Fazekas PV ' + pv + ' / Deep ' + dw + ' — moderate WMH. Cerebral small vessel disease. Vascular risk factor optimisation recommended (BP, lipids, glucose, smoking cessation). Neurology review if symptomatic.';
      } else {
        col = 'orange';
        rec = 'Fazekas PV ' + pv + ' / Deep ' + dw + ' — severe/confluent WMH. Significant cerebral SVD. Neurology referral. Cognitive assessment. Aggressive vascular risk factor management.';
      }
      return result(col, rec, notes);
    },
    criteria: [
      { title: 'Periventricular WMH (PVWMH)', items: [
        { label: 'Grade 0 — Absent', risk: 'Normal', riskCol: 'cr-green', desc: 'No periventricular signal change.' },
        { label: 'Grade 1 — Caps / pencil-thin lining', risk: 'Mild', riskCol: 'cr-green', desc: 'Thin cap at frontal or occipital horn tips. Common in healthy adults >50. Usually normal variant.' },
        { label: 'Grade 2 — Smooth halo', risk: 'Moderate', riskCol: 'cr-yellow', desc: 'Smooth periventricular rim/halo. Moderate small vessel disease. Vascular risk optimisation recommended.' },
        { label: 'Grade 3 — Irregular, extends into WM', risk: 'Severe', riskCol: 'cr-red', desc: 'Irregular periventricular signal extending into deep white matter. Significant SVD burden. Neurology referral.' },
      ]},
      { title: 'Deep / Subcortical WMH (DWMH)', items: [
        { label: 'Grade 0 — Absent', risk: 'Normal', riskCol: 'cr-green', desc: 'No deep white matter foci.' },
        { label: 'Grade 1 — Punctate foci', risk: 'Mild', riskCol: 'cr-green', desc: 'Small discrete hyperintense foci. Very common in older adults. Represent enlarged perivascular spaces or minimal SVD.' },
        { label: 'Grade 2 — Beginning confluence', risk: 'Moderate', riskCol: 'cr-yellow', desc: 'Early confluent lesions. Moderate SVD. Associated with subtle cognitive and gait effects.' },
        { label: 'Grade 3 — Large confluent areas', risk: 'Severe', riskCol: 'cr-red', desc: 'Large areas of confluent WMH. Severe SVD. Significantly elevated dementia and stroke risk. Cognitive evaluation essential.' },
      ]},
    ],
  },

  // ════════════════════════════════════════════════════════ ABDOMEN / GI ════════

  gallbladder_polyp: {
    name: 'Gallbladder Polyp — Surveillance & Management',
    source: 'ESGAR/EAHPBA 2017 / ACR 2022',
    desc: 'Follow-up and surgical recommendation for incidentally discovered gallbladder polyp',
    fields: [
      numField('size', 'Largest Polyp Diameter', 'mm', 'e.g. 8', 'Measure largest polyp on ultrasound'),
      radioField('mobile', 'Polyp Characteristics', [
        { value: 'mobile',    label: 'Mobile / echogenic with posterior shadowing (cholesterol polyp)' },
        { value: 'sessile',   label: 'Sessile / broad-based / non-mobile' },
        { value: 'uncertain', label: 'Uncertain morphology' },
      ]),
      checkboxField('risk', 'Risk Factors for Malignancy (select all that apply)', [
        { value: 'age',      label: 'Age \u226550 years' },
        { value: 'psc',      label: 'Primary sclerosing cholangitis (PSC)' },
        { value: 'solitary', label: 'Solitary polyp' },
        { value: 'growth',   label: 'Growth \u22652 mm vs prior imaging' },
        { value: 'indian',   label: 'South Asian / Indian subcontinent ethnicity' },
      ]),
    ],
    compute(f) {
      const sz = parseFloat(f.size);
      if (isNaN(sz) || sz <= 0) return null;
      const mobile  = f.mobile === 'mobile';
      const sessile = f.mobile === 'sessile';
      const risks   = Array.isArray(f.risk) ? f.risk : (f.risk ? [f.risk] : []);
      const hasPSC  = risks.includes('psc');
      const growth  = risks.includes('growth');
      const highRisk = risks.length > 0;
      const notes = [
        'Most gallbladder polyps are benign cholesterol polyps — mobile, multiple, echogenic.',
        'True adenomas carry malignant potential; rare below 10 mm.',
        'Cholecystectomy is the definitive treatment where indicated.',
        'Ultrasound is the primary surveillance modality.',
      ];
      if (sz >= 18 || (sz >= 10 && (hasPSC || growth))) {
        return result('red', 'Polyp \u226518 mm or \u226510 mm with high-risk features — high risk of malignancy. Cholecystectomy recommended. Pre-operative staging CT/MRI.', notes);
      }
      if (sz >= 10) return result('red', 'Polyp \u226510 mm (' + sz + ' mm) — cholecystectomy recommended regardless of other features.', notes);
      if (sz >= 6 && (highRisk || sessile)) return result('orange', 'Polyp 6–9 mm with risk factors or sessile morphology — cholecystectomy recommended. If patient unfit/declines, 6-monthly ultrasound.', notes);
      if (sz >= 6) return result('yellow', 'Polyp 6–9 mm, low-risk features — ultrasound at 6 months, then annually \xd75 years. Cholecystectomy if growth >2 mm.', notes);
      if (mobile) return result('green', 'Polyp <6 mm, mobile (likely cholesterol polyp) — no follow-up required unless symptoms develop.', notes);
      return result('yellow', 'Polyp <6 mm, sessile or uncertain — ultrasound at 1 year. Discharge if stable and <6 mm.', notes);
    },
    criteria: [
      { title: 'Size-Based Management', items: [
        { label: '<6 mm — Mobile/echogenic', risk: 'Benign', riskCol: 'cr-green', desc: 'Almost certainly cholesterol polyp. No surveillance required if mobile and echogenic.' },
        { label: '<6 mm — Sessile/uncertain', risk: 'Low', riskCol: 'cr-yellow', desc: 'US in 1 year. Discharge if stable. Low but non-zero adenoma risk.' },
        { label: '6–9 mm — No risk factors', risk: 'Intermediate', riskCol: 'cr-yellow', desc: 'US at 6 months, then annually \xd75 years. Cholecystectomy if growth \u22652 mm.' },
        { label: '6–9 mm — With risk factors', risk: 'High', riskCol: 'cr-orange', desc: 'Cholecystectomy recommended. Risk factors: age \u226550, PSC, solitary, rapid growth, sessile.' },
        { label: '\u226510 mm', risk: 'Surgery', riskCol: 'cr-red', desc: 'Cholecystectomy in all patients regardless of other features.' },
        { label: '\u226518 mm', risk: 'Urgent', riskCol: 'cr-red', desc: 'High likelihood of malignancy. Urgent cholecystectomy + staging CT/MRI. Oncology referral.' },
      ]},
      { title: 'Malignancy Risk Factors', items: [
        { label: 'Age \u226550 years', risk: 'Risk+', riskCol: 'cr-orange', desc: 'Higher prevalence of true adenomatous polyps and gallbladder carcinoma in older patients.' },
        { label: 'PSC', risk: 'High Risk', riskCol: 'cr-red', desc: 'Markedly increases risk of gallbladder dysplasia and carcinoma. Lower cholecystectomy threshold.' },
        { label: 'Growth \u22652 mm', risk: 'Risk+', riskCol: 'cr-red', desc: 'Progressive growth is a strong indicator of neoplastic polyp. Cholecystectomy regardless of absolute size.' },
        { label: 'Solitary, sessile polyp', risk: 'Risk+', riskCol: 'cr-orange', desc: 'Multiple small polyps are usually cholesterol polyps. A solitary sessile polyp has higher adenoma risk.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  crads: {
    name: 'C-RADS — CT Colonography Reporting',
    source: 'ACR C-RADS 2005 / 2021 Update',
    desc: 'Colonic and extracolonic reporting categories for CT colonography findings',
    fields: [
      sectionField('Colonic Findings'),
      selectField('colonic', 'Colonic C-RADS Category', [
        { value: 'C0', label: 'C0 — Inadequate study / incomplete preparation' },
        { value: 'C1', label: 'C1 — Normal colon / no polyp \u22656 mm' },
        { value: 'C2', label: 'C2 — One or two 6–9 mm polyps' },
        { value: 'C3', label: 'C3 — \u22653 polyps 6–9 mm OR any polyp \u226510 mm' },
        { value: 'C4', label: 'C4 — Colonic mass — likely malignant' },
      ]),
      sectionField('Extracolonic Findings'),
      selectField('extracolonic', 'Extracolonic E-RADS Category', [
        { value: 'E1', label: 'E1 — No clinically significant extracolonic finding' },
        { value: 'E2', label: 'E2 — Significant finding — diagnosis established, no workup needed' },
        { value: 'E3', label: 'E3 — Indeterminate finding — workup recommended' },
        { value: 'E4', label: 'E4 — Potentially significant finding — workup required' },
      ]),
    ],
    compute(f) {
      const c = f.colonic;
      const e = f.extracolonic;
      if (!c && !e) return null;
      const colonicRecs = {
        'C0': { col: 'orange', rec: 'C0 — Inadequate study. Repeat CTC with improved bowel prep, or proceed to colonoscopy.' },
        'C1': { col: 'green',  rec: 'C1 — Normal study. Routine colorectal cancer screening in 5–10 years (per age/risk).' },
        'C2': { col: 'yellow', rec: "C2 — 1–2 polyps 6–9 mm. Colonoscopy at patient's discretion, or 3-year surveillance CTC." },
        'C3': { col: 'orange', rec: 'C3 — \u22653 polyps (6–9 mm) or \u22651 polyp \u226510 mm. Colonoscopy with polypectomy recommended.' },
        'C4': { col: 'red',    rec: 'C4 — Likely colorectal malignancy. Urgent colonoscopy for tissue confirmation. Staging CT chest/abdomen/pelvis.' },
      };
      const extrarecs = {
        'E1': 'E1 — No significant extracolonic finding.',
        'E2': 'E2 — Significant finding, diagnosis established. No further workup required.',
        'E3': 'E3 — Indeterminate extracolonic finding. Dedicated follow-up imaging or clinical review recommended.',
        'E4': 'E4 — Potentially significant extracolonic finding. Further workup required — communicate to referring clinician.',
      };
      const notes = [
        'CTC does not require sedation; CO\u2082 insufflation is standard.',
        'Polypoid lesions \u226510 mm have ~10% malignancy rate and require polypectomy.',
        'Flat lesions may be underestimated by CTC; clinical correlation essential.',
        'Extracolonic findings are found in ~40% of patients; most are benign or incidental.',
      ];
      const cr    = colonicRecs[c] || { col: 'blue', rec: '' };
      const erStr = e ? extrarecs[e] : '';
      const extra = erStr ? '<div class="sub-result"><div class="sub-result-title">Extracolonic</div>' + erStr + '</div>' : '';
      return result(cr.col, cr.rec, notes, extra);
    },
    criteria: [
      { title: 'Colonic C-RADS Categories', items: [
        { label: 'C0 — Inadequate', risk: 'Repeat', riskCol: 'cr-orange', desc: 'Incomplete bowel prep or technical failure. Repeat CTC or direct colonoscopy.' },
        { label: 'C1 — Normal', risk: 'Routine', riskCol: 'cr-green', desc: 'No polyp \u22656 mm. Routine CRC screening per guideline interval (5–10 years for average risk).' },
        { label: 'C2 — 1–2 polyps 6–9 mm', risk: 'Moderate', riskCol: 'cr-yellow', desc: '~1% malignancy risk. Patient may elect 3-year CTC follow-up or colonoscopy.' },
        { label: 'C3 — \u22653 polyps or \u226510 mm', risk: 'High', riskCol: 'cr-orange', desc: 'Higher adenoma burden. ~10% malignancy risk for \u226510 mm polyps. Colonoscopy with polypectomy.' },
        { label: 'C4 — Likely malignancy', risk: 'Urgent', riskCol: 'cr-red', desc: 'Morphological features of CRC (shouldering, mass lesion). Urgent colonoscopy and staging.' },
      ]},
      { title: 'Extracolonic E-RADS Categories', items: [
        { label: 'E1 — Insignificant', risk: 'None', riskCol: 'cr-green', desc: 'Normal or common age-related finding (e.g. small haemangioma, colonic diverticulosis).' },
        { label: 'E2 — Established diagnosis', risk: 'None', riskCol: 'cr-green', desc: 'Significant but already known; no further workup needed (e.g. known AAA, nephrolithiasis).' },
        { label: 'E3 — Indeterminate', risk: 'Workup', riskCol: 'cr-yellow', desc: 'Uncertain significance (e.g. small indeterminate liver lesion). Dedicated follow-up imaging.' },
        { label: 'E4 — Potentially significant', risk: 'Urgent', riskCol: 'cr-red', desc: 'New clinically significant finding (e.g. renal mass, adrenal nodule, lung nodule). Communicate to referrer.' },
      ]},
    ],
  },

};

// ─── Criteria panel renderer ─────────────────────────────────────────────────
function renderCriteria(gl) {
  var panel  = document.getElementById('criteria-panel');
  var content = document.getElementById('content');
  if (!gl.criteria || gl.criteria.length === 0) {
    panel.style.display = 'none';
    content.classList.remove('has-criteria');
    return;
  }
  content.classList.add('has-criteria');
  panel.style.display = 'block';

  var html = '<div class="criteria-card">';
  html += '<div class="criteria-hdr"><i class="bi bi-book me-1"></i> Reference Criteria</div>';

  gl.criteria.forEach(function(section) {
    html += '<div class="crit-section">';
    html += '<div class="crit-section-title">' + section.title + '</div>';
    section.items.forEach(function(item) {
      html += '<div class="crit-item">';
      html += '<div class="crit-item-top">';
      html += '<span class="crit-item-label">' + item.label + '</span>';
      if (item.risk) {
        html += '<span class="crit-risk ' + (item.riskCol || 'cr-grey') + '">' + item.risk + '</span>';
      }
      html += '</div>';
      html += '<div class="crit-item-desc">' + item.desc + '</div>';
      html += '</div>';
    });
    html += '</div>';
  });

  html += '</div>';
  panel.innerHTML = html;
}

// ─── Form rendering ───────────────────────────────────────────────────────────
let activeGl = null;

function renderForm(glId) {
  const gl = GUIDELINES[glId];
  if (!gl) return;
  activeGl = glId;

  document.getElementById('welcome').style.display = 'none';
  document.getElementById('guideline-panel').style.display = 'block';
  document.getElementById('result-panel').style.display = 'none';

  renderCriteria(gl);

  document.getElementById('gl-title').textContent  = gl.name;
  document.getElementById('gl-source').textContent = gl.source;
  document.getElementById('gl-desc').textContent   = gl.desc || '';

  const form = document.getElementById('gl-form');
  form.innerHTML = '';

  gl.fields.forEach(field => {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-3';

    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = field.label;
    if (field.unit) {
      const u = document.createElement('span');
      u.className = 'text-muted ms-1';
      u.style.fontSize = '.8rem';
      u.textContent = `(${field.unit})`;
      label.appendChild(u);
    }
    wrapper.appendChild(label);

    if (field.type === 'section') {
      var hr = document.createElement('hr');
      hr.className = 'my-3';
      wrapper.appendChild(hr);
      var secLabel = document.createElement('p');
      secLabel.className = 'text-muted mb-2';
      secLabel.style.cssText = 'font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;';
      secLabel.textContent = field.label;
      wrapper.appendChild(secLabel);
      form.appendChild(wrapper);
      return;
    }

    if (field.type === 'number') {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'form-control';
      inp.id = `field_${field.id}`;
      inp.name = field.id;
      inp.placeholder = field.placeholder || '';
      inp.min = 0;
      inp.step = 'any';
      wrapper.appendChild(inp);

    } else if (field.type === 'select') {
      const sel = document.createElement('select');
      sel.className = 'form-select';
      sel.id = `field_${field.id}`;
      sel.name = field.id;
      const def = document.createElement('option');
      def.value = ''; def.textContent = '— Select —';
      sel.appendChild(def);
      field.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        sel.appendChild(o);
      });
      wrapper.appendChild(sel);

    } else if (field.type === 'radio') {
      field.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'form-check';
        const inp = document.createElement('input');
        inp.type = 'radio';
        inp.className = 'form-check-input';
        inp.name = field.id;
        inp.id = `field_${field.id}_${opt.value}`;
        inp.value = opt.value;
        const lbl = document.createElement('label');
        lbl.className = 'form-check-label';
        lbl.htmlFor = inp.id;
        lbl.textContent = opt.label;
        div.appendChild(inp);
        div.appendChild(lbl);
        wrapper.appendChild(div);
      });

    } else if (field.type === 'checkbox') {
      field.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'form-check';
        const inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.className = 'form-check-input';
        inp.name = field.id;
        inp.id = `field_${field.id}_${opt.value}`;
        inp.value = opt.value;
        const lbl = document.createElement('label');
        lbl.className = 'form-check-label';
        lbl.htmlFor = inp.id;
        lbl.textContent = opt.label;
        div.appendChild(inp);
        div.appendChild(lbl);
        wrapper.appendChild(div);
      });

    } else if (field.type === 'points') {
      const sel = document.createElement('select');
      sel.className = 'form-select';
      sel.id = `field_${field.id}`;
      sel.name = field.id;
      const def = document.createElement('option');
      def.value = ''; def.textContent = '— Select —';
      sel.appendChild(def);
      field.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = `${opt.label} (${opt.value} pt${opt.value !== 1 ? 's' : ''})`;
        sel.appendChild(o);
      });
      wrapper.appendChild(sel);
    }

    if (field.help) {
      const help = document.createElement('div');
      help.className = 'form-text';
      help.textContent = field.help;
      wrapper.appendChild(help);
    }

    form.appendChild(wrapper);
  });
}

// ─── Collect form values ──────────────────────────────────────────────────────
function collectValues(glId) {
  const gl = GUIDELINES[glId];
  const values = {};
  gl.fields.forEach(field => {
    if (field.type === 'radio') {
      const checked = document.querySelector(`input[name="${field.id}"]:checked`);
      values[field.id] = checked ? checked.value : '';
    } else if (field.type === 'checkbox') {
      const checked = document.querySelectorAll(`input[name="${field.id}"]:checked`);
      values[field.id] = Array.from(checked).map(el => el.value);
    } else {
      const el = document.getElementById(`field_${field.id}`);
      values[field.id] = el ? el.value : '';
    }
  });
  return values;
}

// ─── Display result ───────────────────────────────────────────────────────────
function displayResult(res) {
  if (!res) {
    alert('Please fill in all required fields.');
    return;
  }
  const col = COLOURS[res.colour] || COLOURS.blue;
  const panel = document.getElementById('result-panel');
  const card  = document.getElementById('result-card');

  card.className = `result-card ${col.card}`;

  const badge = document.getElementById('result-badge');
  badge.className = `result-badge ${col.badge}`;
  badge.textContent = col.label;

  document.getElementById('result-recommendation').textContent = res.recommendation;

  const notesEl = document.getElementById('result-notes');
  if (res.notes && res.notes.length) {
    notesEl.innerHTML = '<strong>Notes:</strong><ul>' +
      res.notes.map(n => `<li>${n}</li>`).join('') + '</ul>';
  } else {
    notesEl.innerHTML = '';
  }

  document.getElementById('result-extra').innerHTML = res.extra || '';

  var copyEl = document.getElementById('result-copy');
  if (res.copyString) {
    copyEl.innerHTML =
      '<div class="copy-box mt-3">' +
        '<div class="copy-box-label"><i class="bi bi-clipboard-fill me-1"></i>Report string' +
          '<button class="copy-btn" id="copy-btn-trigger">Copy</button>' +
        '</div>' +
        '<div class="copy-box-text" id="copy-box-text">' + res.copyString + '</div>' +
      '</div>';
    document.getElementById('copy-btn-trigger').addEventListener('click', function() {
      navigator.clipboard.writeText(res.copyString).then(function() {
        var btn = document.getElementById('copy-btn-trigger');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    });
  } else {
    copyEl.innerHTML = '';
  }

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Event wiring (script at end of body — DOM already ready) ────────────────────────────

// Sidebar and welcome card clicks
document.querySelectorAll('[data-gl]').forEach(function(el) {
  el.addEventListener('click', function(e) {
    e.preventDefault();
    var glId = el.dataset.gl;
    renderForm(glId);
    document.querySelectorAll('[data-gl]').forEach(function(x) { x.classList.remove('active'); });
    document.querySelectorAll('[data-gl="' + glId + '"]').forEach(function(x) { x.classList.add('active'); });
  });
});

// Organ header collapse/expand
document.querySelectorAll('.organ-header').forEach(function(hdr) {
  hdr.addEventListener('click', function() {
    var target = document.getElementById(hdr.dataset.target);
    if (!target) return;
    var isCollapsed = target.style.display === 'none';
    target.style.display = isCollapsed ? '' : 'none';
    hdr.classList.toggle('collapsed', !isCollapsed);
  });
});

// Calculate button
var calcBtn = document.getElementById('calc-btn');
if (calcBtn) {
  calcBtn.addEventListener('click', function() {
    if (!activeGl) return;
    var values = collectValues(activeGl);
    var res = GUIDELINES[activeGl].compute(values);
    displayResult(res);
  });
}

// Reset button
var resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', function() {
    if (!activeGl) return;
    renderForm(activeGl);
  });
}

// ─── Criteria reference data ─────────────────────────────────────────────────
// Injected as .criteria on each guideline after definition
GUIDELINES.bosniak.criteria = [
  { title: 'Bosniak Classification Criteria', items: [
    { label: 'Class I', risk: '~0%', riskCol: 'cr-green',
      desc: 'Hairline thin smooth wall. Round. No septa, no calcification, no solid components. Homogeneous water attenuation (0–20 HU) or signal intensity. No enhancement.' },
    { label: 'Class II', risk: '<1%', riskCol: 'cr-green',
      desc: '≤3 thin (≤2 mm) smooth septa, no measurable enhancement. Thin smooth wall. May have fine calcification. OR: uniform high attenuation (40–70 HU) lesion <3 cm with no enhancement.' },
    { label: 'Class IIF', risk: '~5%', riskCol: 'cr-yellow',
      desc: '≥4 thin smooth septa. OR minimally thickened (3 mm) smooth septa/wall without measurable enhancement. Thick or irregular calcification. OR high-attenuation cyst ≥3 cm. No measurable enhancement anywhere.' },
    { label: 'Class III', risk: '~50%', riskCol: 'cr-orange',
      desc: 'One or more thickened (≥4 mm) irregular OR smooth enhancing septa or wall with measurable enhancement. No soft-tissue nodule distinct from walls/septa.' },
    { label: 'Class IV', risk: '~90%', riskCol: 'cr-red',
      desc: 'Enhancing soft-tissue component clearly distinct from wall or septa. Measurable enhancement of this component. May also have all features of Class III.' },
  ]},
];

GUIDELINES.birads.criteria = [
  { title: 'BI-RADS Assessment Criteria', items: [
    { label: '0 — Incomplete', risk: 'N/A', riskCol: 'cr-blue',
      desc: 'Additional imaging needed before a final category can be assigned. Needs prior films, additional views, or ultrasound correlation.' },
    { label: '1 — Negative', risk: '0%', riskCol: 'cr-green',
      desc: 'No abnormality. Symmetric fibroglandular tissue. No mass, architectural distortion, or suspicious calcification.' },
    { label: '2 — Benign', risk: '0%', riskCol: 'cr-green',
      desc: 'Definitely benign. Examples: simple cysts, intramammary lymph nodes, calcified fibroadenoma, fat-containing lesions (lipoma, hamartoma), implants, diffuse skin thickening.' },
    { label: '3 — Probably benign', risk: '≤2%', riskCol: 'cr-yellow',
      desc: 'Short-interval follow-up preferred. Examples: non-calcified circumscribed solid mass on ultrasound, focal asymmetry, solitary group of punctate calcifications. Established by stability on 2–3 year follow-up.' },
    { label: '4A — Low suspicion', risk: '2–10%', riskCol: 'cr-yellow',
      desc: 'Biopsy required. Mild suspicious features: palpable firm mass, new solid circumscribed mass on ultrasound, isolated dilated duct.' },
    { label: '4B — Moderate suspicion', risk: '10–50%', riskCol: 'cr-orange',
      desc: 'Biopsy required. Moderate suspicious features: grouped amorphous or coarse heterogeneous calcifications, discrete mass without clearly circumscribed margins.' },
    { label: '4C — High suspicion', risk: '>50–<95%', riskCol: 'cr-orange',
      desc: 'Biopsy required. High suspicion but not classic malignancy: ill-defined irregular solid mass, new fine pleomorphic or linear calcifications.' },
    { label: '5 — Highly malignant', risk: '≥95%', riskCol: 'cr-red',
      desc: 'Classic malignancy features: spiculated irregular high-density mass, segmental/linear fine pleomorphic calcifications, irregular spiculated mass + calcifications.' },
    { label: '6 — Known malignancy', risk: '100%', riskCol: 'cr-red',
      desc: 'Biopsy-proven malignancy. Imaging used for treatment planning, monitoring neoadjuvant therapy, or pre-surgical assessment.' },
  ]},
];

GUIDELINES.orads.criteria = [
  { title: 'O-RADS Ultrasound Criteria', items: [
    { label: 'O-RADS 1 — Normal', risk: '<1%', riskCol: 'cr-green',
      desc: 'Normal ovary with or without follicle ≤3 cm (premenopausal). Postmenopausal: ovary not visualised or normal for age.' },
    { label: 'O-RADS 2 — Almost certainly benign', risk: '<1%', riskCol: 'cr-green',
      desc: 'Classic benign features. Unilocular anechoic cyst any size with smooth thin wall. Dermoid: echogenic fat component with shadowing, hair, calcification. Endometrioma: homogeneous low-level echoes ("ground glass"). Hydrosalpinx: tubular with incomplete septations. Postmenopausal simple cyst ≤3 cm.' },
    { label: 'O-RADS 3 — Low risk', risk: '1–<10%', riskCol: 'cr-yellow',
      desc: 'Unilocular cyst >10 cm. Multilocular cyst with thin smooth septa, no solid component. Echogenic cyst >3 cm without other suspicious features. Smooth wall with minimal vascularity (color score 1–2).' },
    { label: 'O-RADS 4 — Intermediate risk', risk: '10–<50%', riskCol: 'cr-orange',
      desc: 'Unilocular cyst with solid component or irregular wall. Multilocular cyst with solid components or irregular septa. Smooth solid lesion. Blood flow in solid component (color score ≥1). Ascites.' },
    { label: 'O-RADS 5 — High risk', risk: '≥50%', riskCol: 'cr-red',
      desc: 'Irregular solid lesion. Papillary projections with blood flow (color score ≥3). Peritoneal/omental nodularity. Features of carcinomatosis. Ascites with any suspicious lesion.' },
  ]},
];

GUIDELINES.lirads.criteria = [
  { title: 'LI-RADS Major Features', items: [
    { label: 'APHE — Arterial Phase Hyperenhancement', risk: '', riskCol: 'cr-blue',
      desc: 'Non-rim arterial phase hyperenhancement: observation is unequivocally hyperenhancing relative to liver parenchyma in the hepatic arterial phase. Must be non-rim pattern (rim APHE favours cholangiocarcinoma).' },
    { label: 'Washout Appearance', risk: '', riskCol: 'cr-blue',
      desc: 'Non-peripheral washout: observation appears unequivocally hypointense (washes out) in portal venous or delayed phase relative to liver. Must be non-peripheral pattern.' },
    { label: 'Enhancing Capsule', risk: '', riskCol: 'cr-blue',
      desc: 'Smooth peripheral rim enhancement in portal venous or delayed phase. Corresponds to fibrous capsule / pseudocapsule. Must be clearly perceptible (not just a vague border).' },
    { label: 'Threshold Growth', risk: '', riskCol: 'cr-blue',
      desc: '≥50% increase in diameter in ≤6 months (for observations measured ≤10 mm on prior). OR ≥50% increase in ≤12 months (for ≥10 mm observations). Growth must be measured at the same scan phase.' },
  ]},
  { title: 'LI-RADS Category Criteria', items: [
    { label: 'LR-1 — Definitely benign', risk: '0%', riskCol: 'cr-green',
      desc: 'Definite benign entity: cyst, hemangioma, focal fat deposition/sparing, perfusion alteration, hypertrophic pseudomass, AVM, confluent fibrosis, focal scar.' },
    { label: 'LR-2 — Probably benign', risk: '<5%', riskCol: 'cr-green',
      desc: 'Probable benign entity. Features suggesting benign aetiology but not meeting LR-1 criteria. Or observation with imaging features pointing to benign hepatic entity.' },
    { label: 'LR-3 — Intermediate', risk: '~40%', riskCol: 'cr-yellow',
      desc: 'Intermediate HCC probability. Features do not fit LR-1/2 or LR-4/5. Often: APHE without washout/capsule; or washout/capsule without APHE; or neither in intermediate-size lesion.' },
    { label: 'LR-4 — Probably HCC', risk: '~70%', riskCol: 'cr-orange',
      desc: 'One major feature (APHE) but insufficient for LR-5. OR observation ≥10 mm with APHE + one additional major feature. Requires biopsy or multidisciplinary discussion.' },
    { label: 'LR-5 — Definite HCC', risk: '>95%', riskCol: 'cr-red',
      desc: '≥10 mm with APHE + two major features (washout + capsule). OR APHE + threshold growth. OR ≥20 mm with APHE + any one additional major feature. No biopsy required for treatment.' },
  ]},
];

GUIDELINES.lungrads.criteria = [
  { title: 'Lung-RADS Category Criteria', items: [
    { label: 'Lung-RADS 1 — Negative', risk: '<1%', riskCol: 'cr-green',
      desc: 'No lung nodules OR nodule(s) with specific benign features: complete calcification, fat-containing nodule, perifissural <10 mm.' },
    { label: 'Lung-RADS 2 — Benign', risk: '<1%', riskCol: 'cr-green',
      desc: 'Solid: <6 mm baseline or new <4 mm. Part-solid: total <6 mm. Non-solid (GGN): <20 mm or ≥20 mm unchanged ≥3 months. Perifissural: <10 mm.' },
    { label: 'Lung-RADS 3 — Probably benign', risk: '1–2%', riskCol: 'cr-yellow',
      desc: 'Solid: 6–<8 mm baseline; new 4–<6 mm. Part-solid: ≥6 mm total with solid component <6 mm. GGN: 20–<30 mm or new <30 mm. Perifissural: 10–<20 mm.' },
    { label: 'Lung-RADS 4A — Suspicious', risk: '5–15%', riskCol: 'cr-orange',
      desc: 'Solid: ≥8–<15 mm; new/growing 6–<8 mm. Part-solid with solid ≥6 mm. Growing GGN ≥20 mm. Perifissural ≥20 mm. Endobronchial nodule.' },
    { label: 'Lung-RADS 4B — Very suspicious', risk: '>15%', riskCol: 'cr-red',
      desc: 'Solid ≥15 mm; new/growing 4B solid. Part-solid with solid component ≥8 mm. Any nodule with additional suspicious features (spiculation, upper lobe, emphysema background).' },
    { label: 'Lung-RADS 4X — Additional features', risk: '>15%', riskCol: 'cr-red',
      desc: 'Category 4 nodule with additional features increasing suspicion of malignancy: spiculation, upper lobe location, associated lymphadenopathy, or pleural retraction.' },
  ]},
];

GUIDELINES.pirads.criteria = [
  { title: 'T2-Weighted Imaging (T2WI) Criteria', items: [
    { label: 'T2: 1', risk: '', riskCol: 'cr-grey',
      desc: 'PZ: Uniform high signal (normal). TZ: Uniform low signal with sharply demarcated margin — classic benign prostatic hyperplasia nodule.' },
    { label: 'T2: 2', risk: '', riskCol: 'cr-grey',
      desc: 'PZ: Linear/wedge-shaped or diffuse hypointensity — not focal. TZ: Mostly low signal with obscured margins, not lenticular.' },
    { label: 'T2: 3', risk: '', riskCol: 'cr-yellow',
      desc: 'PZ: Focal mild/moderate hypointensity or heterogeneous signal not entirely encapsulated. TZ: Heterogeneous signal or non-circumscribed low signal, no lenticular shape.' },
    { label: 'T2: 4', risk: '', riskCol: 'cr-orange',
      desc: 'Focal marked hypointensity, well-defined, <1.5 cm. PZ: discrete rounded/lenticular lesion. TZ: lenticular or non-circumscribed, homogeneous low signal.' },
    { label: 'T2: 5', risk: '', riskCol: 'cr-red',
      desc: 'Same as T2:4 but ≥1.5 cm OR definite extraprostatic extension/invasion of seminal vesicles.' },
  ]},
  { title: 'DWI / ADC Map Criteria', items: [
    { label: 'DWI: 1', risk: '', riskCol: 'cr-grey',
      desc: 'No restriction of diffusion. ADC is not hypointense compared to normal tissue. No significant signal on high b-value (b≥1400).' },
    { label: 'DWI: 2', risk: '', riskCol: 'cr-grey',
      desc: 'Indistinct mild hypointensity on ADC map. Isointense or indistinct hyperintensity on high b-value DWI.' },
    { label: 'DWI: 3', risk: '', riskCol: 'cr-yellow',
      desc: 'Focal mild/moderate ADC hypointensity. Focal low or intermediate signal on high b-value DWI.' },
    { label: 'DWI: 4', risk: '', riskCol: 'cr-orange',
      desc: 'Focal marked ADC hypointensity. Focal definite hyperintensity on high b-value DWI (b≥1400). Size <1.5 cm.' },
    { label: 'DWI: 5', risk: '', riskCol: 'cr-red',
      desc: 'Same as DWI:4 but ≥1.5 cm OR extraprostatic extension.' },
  ]},
  { title: 'DCE (Dynamic Contrast Enhancement)', items: [
    { label: 'DCE Negative', risk: '', riskCol: 'cr-grey',
      desc: 'No early enhancement, or diffuse enhancement not corresponding to a focal T2/DWI lesion, or enhancement corresponding to a BPH nodule.' },
    { label: 'DCE Positive', risk: '', riskCol: 'cr-orange',
      desc: 'Focal enhancement earlier than or simultaneous with adjacent normal prostatic tissue AND corresponds to a suspicious finding on T2WI or DWI. In PZ: upgrades DWI:3 to PI-RADS 4.' },
  ]},
];

GUIDELINES.tirads.criteria = [
  { title: 'Composition', items: [
    { label: '0 pts — Cystic / Spongiform', risk: '', riskCol: 'cr-green',
      desc: 'Cystic or almost completely cystic (≥50% cystic). Spongiform: aggregation of multiple small cystic spaces in >50% of the nodule volume — classic benign appearance.' },
    { label: '1 pt — Mixed', risk: '', riskCol: 'cr-grey',
      desc: 'Mixed cystic and solid. Neither predominantly cystic nor predominantly solid.' },
    { label: '2 pts — Solid', risk: '', riskCol: 'cr-orange',
      desc: 'Solid or almost completely solid (≤10% cystic). Highest malignancy risk from this category.' },
  ]},
  { title: 'Echogenicity', items: [
    { label: '0 pts — Anechoic', risk: '', riskCol: 'cr-green', desc: 'Applies only to cystic components.' },
    { label: '1 pt — Hyperechoic / Isoechoic', risk: '', riskCol: 'cr-grey',
      desc: 'Echogenicity equal to or greater than adjacent thyroid tissue.' },
    { label: '2 pts — Hypoechoic', risk: '', riskCol: 'cr-yellow',
      desc: 'Less echogenic than adjacent thyroid tissue but more echogenic than strap muscles.' },
    { label: '3 pts — Very hypoechoic', risk: '', riskCol: 'cr-orange',
      desc: 'Less echogenic than adjacent strap muscles. Significantly increases malignancy risk.' },
  ]},
  { title: 'Shape', items: [
    { label: '0 pts — Wider-than-tall', risk: '', riskCol: 'cr-green',
      desc: 'AP dimension < transverse dimension on a transverse image. Normal orientation.' },
    { label: '3 pts — Taller-than-wide', risk: '', riskCol: 'cr-red',
      desc: 'AP dimension > transverse dimension on a transverse image. Growth perpendicular to tissue planes — strong risk factor for malignancy.' },
  ]},
  { title: 'Margin', items: [
    { label: '0 pts — Smooth / Ill-defined', risk: '', riskCol: 'cr-green',
      desc: 'Smooth: well-defined uniform margin. Ill-defined: no clear demarcation from surrounding thyroid tissue.' },
    { label: '2 pts — Lobulated / Irregular', risk: '', riskCol: 'cr-orange',
      desc: 'Lobulated: protrusions from the margin. Irregular: angular, spiculated, or jagged margin.' },
    { label: '3 pts — Extra-thyroidal extension', risk: '', riskCol: 'cr-red',
      desc: 'Tumour extending beyond the thyroid capsule. Highly suspicious for malignancy.' },
  ]},
  { title: 'Echogenic Foci', items: [
    { label: '0 pts — None / Large comet-tail', risk: '', riskCol: 'cr-green',
      desc: 'No echogenic foci OR large comet-tail artifacts (>1 mm V-shaped reverberation) — classic for colloid, benign.' },
    { label: '1 pt — Macrocalcifications', risk: '', riskCol: 'cr-grey',
      desc: 'Coarse calcifications causing acoustic shadowing. Can occur in benign or malignant nodules.' },
    { label: '2 pts — Peripheral (rim) calcifications', risk: '', riskCol: 'cr-yellow',
      desc: 'Eggshell calcification around the nodule margin. Associated with follicular variant papillary carcinoma.' },
    { label: '3 pts — Punctate echogenic foci', risk: '', riskCol: 'cr-orange',
      desc: 'Small (<1 mm) non-shadowing echogenic foci — psammoma bodies. Highly associated with papillary thyroid carcinoma.' },
  ]},
];

GUIDELINES.pancreatic_cyst.criteria = [
  { title: 'High-Risk Stigmata (any single feature = surgery)', items: [
    { label: 'Obstructive jaundice', risk: 'Surgery', riskCol: 'cr-red',
      desc: 'Jaundice caused by the cystic lesion in the head of the pancreas. Suggests ductal involvement or malignant transformation.' },
    { label: 'Enhancing solid component', risk: 'Surgery', riskCol: 'cr-red',
      desc: 'Any soft-tissue component within the cyst that shows measurable contrast enhancement — distinct from septa or wall thickening.' },
    { label: 'MPD ≥ 10 mm', risk: 'Surgery', riskCol: 'cr-red',
      desc: 'Main pancreatic duct dilatation ≥10 mm indicates high-grade obstruction. Combined with a cyst, strongly suggests malignancy.' },
  ]},
  { title: 'Worrisome Features (1 alone or combinations)', items: [
    { label: 'Cyst ≥ 3 cm', risk: 'EUS/MDT', riskCol: 'cr-orange',
      desc: 'Size alone is a worrisome feature. Cysts ≥3 cm with any additional worrisome feature warrant EUS or multidisciplinary evaluation.' },
    { label: 'Thickened/enhancing walls', risk: 'EUS/MDT', riskCol: 'cr-orange',
      desc: 'Cyst wall thickening >1 mm or cyst wall that shows enhancement on contrast imaging.' },
    { label: 'Non-enhancing mural nodule', risk: 'EUS/MDT', riskCol: 'cr-orange',
      desc: 'Protrusion from the cyst wall that does not show enhancement — must be distinguished from enhancing solid component (high-risk).' },
    { label: 'MPD 5–9 mm', risk: 'EUS/MDT', riskCol: 'cr-orange',
      desc: 'Mild-moderate MPD dilatation with caliber change and distal pancreatic parenchymal atrophy. Suggests partial obstruction.' },
    { label: 'Acute pancreatitis', risk: 'Evaluate', riskCol: 'cr-yellow',
      desc: 'Episode of acute pancreatitis attributed to the cyst (typically IPMN secreting mucin causing ductal obstruction).' },
    { label: 'Rapid growth ≥5 mm / 2 yr', risk: 'Evaluate', riskCol: 'cr-yellow',
      desc: 'Change in cyst size of ≥5 mm over 2 years on serial imaging. Indicates evolving biology.' },
    { label: 'New-onset DM', risk: 'Evaluate', riskCol: 'cr-yellow',
      desc: 'New or significantly worsening diabetes mellitus attributed to pancreatic exocrine/endocrine dysfunction from cyst.' },
  ]},
  { title: 'Size-Based Surveillance (no features)', items: [
    { label: '< 1.5 cm', risk: 'MRI 2yr', riskCol: 'cr-green',
      desc: 'MRI every 2 years for 5 years. If stable at 5 years, consider discontinuing in patients >75 years.' },
    { label: '1.5 – 2.4 cm', risk: 'MRI 1yr', riskCol: 'cr-yellow',
      desc: 'Annual MRI/CT. If stable for 2–3 years, may extend interval.' },
    { label: '2.5 – 2.9 cm', risk: 'MRI 6–12mo', riskCol: 'cr-yellow',
      desc: 'MRI/CT every 6–12 months. Close surveillance warranted due to proximity to 3 cm threshold.' },
    { label: '≥ 3 cm', risk: 'EUS/MDT', riskCol: 'cr-orange',
      desc: 'EUS or multidisciplinary evaluation regardless of other features. Surgical resection consideration if patient is fit.' },
  ]},
];

