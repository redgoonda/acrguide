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
        'PSAD >0.15 ng/mL/g increases risk of clinically significant PCa; may prompt biopsy even at PI-RADS 3.',
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
        interp = 'PSAD ≥20.20 ng/mL/g — high risk of clinically significant PCa. Biopsy strongly recommended regardless of PI-RADS score.';
      } else if (psadRaw >= 0.15) {
        colour = 'orange';
        label  = 'Elevated';
        interp = 'PSAD 0.15–0.20 ng/mL/g — elevated risk. Supports biopsy at PI-RADS 3 and above.';
      } else if (psadRaw >= 0.10) {
        colour = 'yellow';
        label  = 'Borderline';
        interp = 'PSAD 0.10–0.15 ng/mL/g — borderline. Use in conjunction with PI-RADS score and clinical context.';
      } else {
        colour = 'green';
        label  = 'Normal';
        interp = 'PSAD <0.10 ng/mL/g — low risk. Active surveillance may be appropriate for PI-RADS 3 lesions.';
      }

      const psadCol = colour === 'red' ? '#c0392b' : colour === 'orange' ? '#e67e22' : colour === 'yellow' ? '#b8860b' : '#27ae60';

      const notes = [
        'Ellipsoid formula: Volume = Length × Width × Height × 0.52.',
        'PSAD = PSA / prostate volume (ng/mL/g).',
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
            <td><strong style="color:${psadCol}">${psad} ng/mL/g</strong></td>
            <td style="font-size:.77rem;color:${psadCol};padding-left:8px">${label}</td>
          </tr>
        </table>
      </div>`;

      const copyString = `The prostate measures ${pw} x ${pl} x ${ph} cm in right-to-left, anterior-posterior and craniocaudal dimension. Prostate weight is estimated at ${vol} g. PSA density is ${psad} ng/mL/g.`;

      return result(colour, interp, notes, extraHtml, copyString);
    },
    criteria: [
      { title: 'PSAD Thresholds', items: [
        { label: 'Normal — <0.10 ng/mL/g', risk: 'Low', riskCol: 'cr-green',
          desc: 'Low probability of clinically significant PCa. For PI-RADS 3 lesions, active surveillance may be appropriate. No biopsy threshold met on density alone.' },
        { label: 'Borderline — 0.10–0.15 ng/mL/g', risk: 'Borderline', riskCol: 'cr-yellow',
          desc: 'Intermediate range. Clinical decision should incorporate PI-RADS score, age, family history, and prior biopsy results. Shared decision-making recommended.' },
        { label: 'Elevated — 0.15–0.20 ng/mL/g', risk: 'Elevated', riskCol: 'cr-orange',
          desc: 'Widely cited biopsy threshold. PSAD ≥0.15 supports biopsy recommendation at PI-RADS 3 and reinforces recommendation at PI-RADS 4–5.' },
        { label: 'High — ≥0.20 ng/mL/g', risk: 'High', riskCol: 'cr-red',
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
  // ════════════════════════════════════════════════════════ MSK / BONE ══════════

  bone_lesion: {
    name: 'Bone Lesion — Lodwick Characterisation',
    source: 'Lodwick Classification / ACR Appropriateness Criteria',
    desc: 'Imaging characterisation of incidental or symptomatic bone lesion on X-ray or CT',
    fields: [
      selectField('pattern', 'Osteolysis Pattern (Zone of Transition)', [
        { value: 'IA',  label: 'IA — Geographic lysis, sclerotic rim (narrow zone)' },
        { value: 'IB',  label: 'IB — Geographic lysis, no sclerotic rim, well-defined' },
        { value: 'IC',  label: 'IC — Geographic lysis, ill-defined margin' },
        { value: 'II',  label: 'II — Moth-eaten (multiple small holes)' },
        { value: 'III', label: 'III — Permeated (poorly defined, cortex intact or barely visible)' },
      ]),
      checkboxField('features', 'Additional Aggressive Features (select all that apply)', [
        { value: 'periosteal',  label: 'Periosteal reaction (Codman triangle, sunburst, lamellated)' },
        { value: 'cortex',      label: 'Cortical destruction or expansion' },
        { value: 'soft_tissue', label: 'Soft tissue mass' },
        { value: 'matrix',      label: 'Aggressive matrix mineralisation' },
      ]),
      selectField('matrix', 'Matrix Mineralisation Pattern (if present)', [
        { value: 'none',      label: 'None / lytic' },
        { value: 'osteoid',   label: 'Osteoid (dense, cloud-like, ivory)' },
        { value: 'chondroid', label: 'Chondroid (arcs, rings, stippled calcification)' },
        { value: 'fibrous',   label: 'Fibrous / ground-glass' },
      ]),
      radioField('location', 'Lesion Location', [
        { value: 'epiphysis',   label: 'Epiphysis / apophysis' },
        { value: 'metaphysis',  label: 'Metaphysis' },
        { value: 'diaphysis',   label: 'Diaphysis' },
        { value: 'flat',        label: 'Flat bone (pelvis, rib, scapula, skull)' },
      ]),
      numField('age', 'Patient Age', 'years', 'e.g. 35', 'Age strongly influences differential diagnosis'),
    ],
    compute(f) {
      const pattern  = f.pattern;
      const features = Array.isArray(f.features) ? f.features : (f.features ? [f.features] : []);
      const nAggressive = features.length;
      const age = parseFloat(f.age) || 0;
      const notes = [
        'Lodwick class I lesions are usually benign; class II/III suggest malignancy until proven otherwise.',
        'Age is the most important epidemiological predictor: <30 years favours Ewing sarcoma/osteosarcoma; 40–60 years favours metastases or myeloma.',
        'MRI is the gold standard for local staging; CT chest/abdomen/pelvis for staging if malignancy suspected.',
        'Bone scintigraphy or whole-body MRI for multifocal disease assessment.',
        'Biopsy should be planned with orthopaedic oncology to ensure correct tract placement.',
      ];
      const diffByAge = age < 30
        ? 'In patients <30 years: osteosarcoma, Ewing sarcoma, giant cell tumour, simple bone cyst, aneurysmal bone cyst.'
        : age < 60
          ? 'In patients 30–60 years: giant cell tumour, chondrosarcoma, metastasis, lymphoma, myeloma.'
          : 'In patients >60 years: metastasis (most common), myeloma, lymphoma, primary bone sarcoma (rare).';

      if (pattern === 'IA' && nAggressive === 0) {
        return result('green',
          'Lodwick IA — benign-appearing lesion. Geographic lysis with sclerotic margin, no aggressive features. Likely benign (e.g. non-ossifying fibroma, simple bone cyst, enchondroma, fibrous dysplasia). Radiological follow-up to confirm stability.',
          [...notes, diffByAge]);
      }
      if (pattern === 'IB' && nAggressive === 0) {
        return result('yellow',
          'Lodwick IB — probably benign. Well-defined geographic lysis without sclerotic rim. MRI recommended for further characterisation. Orthopaedic review.',
          [...notes, diffByAge]);
      }
      if (pattern === 'IC' || (pattern === 'IB' && nAggressive >= 1)) {
        return result('orange',
          'Lodwick IC / IB with aggressive features — indeterminate. Ill-defined margin suggests active lesion. MRI + orthopaedic oncology referral. Biopsy likely required.',
          [...notes, diffByAge]);
      }
      return result('red',
        'Lodwick ' + pattern + ' — aggressive pattern. High suspicion for malignancy (primary sarcoma, metastasis, myeloma, lymphoma). Urgent MRI + CT staging + orthopaedic oncology referral. Biopsy planning required.',
        [...notes, diffByAge]);
    },
    criteria: [
      { title: 'Lodwick Classification', items: [
        { label: 'IA — Sclerotic margin', risk: 'Benign', riskCol: 'cr-green', desc: 'Geographic lysis with complete sclerotic rim. Narrow zone of transition. Almost always benign (NOF, simple cyst, enchondroma). No aggressive features.' },
        { label: 'IB — Well-defined, no sclerosis', risk: 'Prob Benign', riskCol: 'cr-yellow', desc: 'Geographic lysis with well-defined but non-sclerotic margin. Usually benign but MRI recommended.' },
        { label: 'IC — Ill-defined margin', risk: 'Indeterminate', riskCol: 'cr-orange', desc: 'Geographic lysis with poorly defined zone of transition. Indeterminate; active lesion. Biopsy consideration.' },
        { label: 'II — Moth-eaten', risk: 'Aggressive', riskCol: 'cr-red', desc: 'Multiple small areas of lysis that do not coalesce. Wide zone of transition. Strongly suggests malignancy.' },
        { label: 'III — Permeated', risk: 'Malignant', riskCol: 'cr-red', desc: 'Innumerable tiny holes permeate the cortex. Cortex may appear intact at low resolution. Highly aggressive; round cell tumours (Ewing, lymphoma, myeloma).' },
      ]},
      { title: 'Aggressive Features', items: [
        { label: 'Periosteal reaction', risk: 'Aggressive', riskCol: 'cr-red', desc: 'Codman triangle (elevated periosteum at lesion edge) or sunburst/lamellated pattern all indicate aggressive biology. Codman is NOT pathognomonic of osteosarcoma.' },
        { label: 'Cortical destruction', risk: 'Aggressive', riskCol: 'cr-red', desc: 'Thinning, expansion, or breakthrough of cortex. Cortical destruction with soft tissue mass strongly suggests malignancy.' },
        { label: 'Soft tissue mass', risk: 'Malignant', riskCol: 'cr-red', desc: 'Extension beyond the cortex into surrounding soft tissues. Nearly always associated with malignant or aggressive benign lesions (aneurysmal bone cyst, giant cell tumour).' },
      ]},
      { title: 'Matrix Types', items: [
        { label: 'Osteoid matrix', risk: '', riskCol: 'cr-grey', desc: 'Dense, ivory, cloud-like mineralisation. Suggests osteosarcoma (aggressive) or bone island (sclerotic, benign). Osteosarcoma matrix is typically not well-organised.' },
        { label: 'Chondroid matrix', risk: '', riskCol: 'cr-grey', desc: 'Arcs, rings, and stippled calcification (popcorn). Suggests enchondroma (benign) or chondrosarcoma (aggressive). Endosteal scalloping >2/3 cortex thickness favours chondrosarcoma.' },
        { label: 'Ground-glass', risk: '', riskCol: 'cr-grey', desc: 'Hazy, uniform density replacing normal trabeculae. Classic for fibrous dysplasia; shepherd\'s crook deformity in proximal femur.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  meniscal_tear: {
    name: 'Meniscal Tear — MRI Stoller Grading',
    source: 'Stoller 1987 / ISAKOS Classification',
    desc: 'MRI grading of meniscal signal and tear classification with management guidance',
    fields: [
      selectField('grade', 'Stoller MRI Grade', [
        { value: '0', label: 'Grade 0 — Normal, homogeneous low signal' },
        { value: '1', label: 'Grade 1 — Focal globular intrameniscal signal (not reaching surface)' },
        { value: '2', label: 'Grade 2 — Linear intrameniscal signal (not reaching surface)' },
        { value: '3', label: 'Grade 3 — Signal reaches articular surface = TEAR' },
      ]),
      selectField('location', 'Meniscus / Location', [
        { value: 'medial_posterior', label: 'Medial — Posterior horn' },
        { value: 'medial_body',      label: 'Medial — Body' },
        { value: 'medial_anterior',  label: 'Medial — Anterior horn' },
        { value: 'lateral_posterior', label: 'Lateral — Posterior horn' },
        { value: 'lateral_body',      label: 'Lateral — Body' },
        { value: 'lateral_anterior',  label: 'Lateral — Anterior horn' },
      ]),
      selectField('pattern', 'Tear Pattern (if Grade 3)', [
        { value: 'na',            label: 'N/A — Not a tear (Grade 0-2)' },
        { value: 'horizontal',    label: 'Horizontal cleavage tear' },
        { value: 'vertical',      label: 'Vertical / longitudinal tear' },
        { value: 'bucket_handle', label: 'Bucket-handle tear (displaced fragment)' },
        { value: 'radial',        label: 'Radial (transverse) tear' },
        { value: 'complex',       label: 'Complex / degenerative tear' },
        { value: 'root',          label: 'Root tear (posterior root)' },
      ]),
      radioField('symptoms', 'Clinical Symptoms?', [
        { value: 'none',    label: 'Asymptomatic / incidental' },
        { value: 'present', label: 'Symptomatic — pain, locking, effusion' },
      ]),
      numField('age', 'Patient Age', 'years', 'e.g. 42'),
    ],
    compute(f) {
      const grade = parseInt(f.grade);
      const symp  = f.symptoms === 'present';
      const age   = parseFloat(f.age) || 0;
      const notes = [
        'Grade 1 and 2 signal represents intrasubstance mucinous degeneration — NOT a tear. Do not report as tear.',
        'Grade 3 signal reaching at least one articular surface = tear by MRI definition.',
        'MRI has ~90% sensitivity and specificity for medial meniscal tears; slightly lower for lateral.',
        'Clinical correlation is essential — asymptomatic meniscal tears are common in patients >40 years.',
        'Joint-line tenderness, McMurray test, and Thessaly test aid clinical diagnosis.',
      ];
      if (grade <= 1) return result('green', 'Stoller Grade ' + grade + ' — no tear. Intrasubstance signal change represents mucinous degeneration. No surgical intervention required. Conservative management.', notes);
      if (grade === 2) return result('yellow', 'Stoller Grade 2 — linear intrameniscal signal, NOT reaching articular surface. Not a tear. Conservative management. May progress to Grade 3 with continued loading.', notes);
      // Grade 3 — tear
      const pattern = f.pattern;
      if (pattern === 'bucket_handle') {
        return result('red', 'Grade 3 — Bucket-handle tear with displaced fragment. Urgent orthopaedic referral. Surgical repair (meniscal repair or partial meniscectomy) usually required. Risk of locked knee.', notes);
      }
      if (pattern === 'root') {
        return result('red', 'Grade 3 — Posterior root tear. High risk of extrusion and accelerated osteoarthritis. Orthopaedic referral for root repair consideration, especially in younger patients.', notes);
      }
      if (!symp && age > 45) {
        return result('yellow', 'Grade 3 meniscal tear — asymptomatic in patient >45 years. Likely degenerative. Conservative management initially (physiotherapy, weight loss). Orthopaedic review if symptoms develop. Meniscectomy not shown to benefit asymptomatic degenerative tears.', notes);
      }
      if (!symp) {
        return result('yellow', 'Grade 3 meniscal tear — currently asymptomatic. Conservative management with orthopaedic follow-up. Activity modification.', notes);
      }
      return result('orange', 'Grade 3 meniscal tear — symptomatic ' + (pattern !== 'na' ? '(' + pattern.replace('_', ' ') + ')' : '') + '. Orthopaedic referral. Consider arthroscopy if symptoms refractory to 6 weeks of conservative management (physiotherapy, analgesia, intra-articular injection).', notes);
    },
    criteria: [
      { title: 'Stoller MRI Grading', items: [
        { label: 'Grade 0 — Normal', risk: 'Normal', riskCol: 'cr-green', desc: 'Homogeneous low signal. Normal meniscus.' },
        { label: 'Grade 1 — Focal globular signal', risk: 'Not a tear', riskCol: 'cr-green', desc: 'Focal, round or globular increased signal that does NOT reach the articular surface. Represents mucinous degeneration. NOT a tear — do not report as such.' },
        { label: 'Grade 2 — Linear signal', risk: 'Not a tear', riskCol: 'cr-yellow', desc: 'Linear increased signal that does NOT reach the articular surface. Intrasubstance degeneration. NOT a tear. May progress to Grade 3.' },
        { label: 'Grade 3 — Signal reaches surface', risk: 'TEAR', riskCol: 'cr-red', desc: 'Increased signal reaching at least one articular surface = tear. Clinical correlation required for management. In patients >45 years, often degenerative.' },
      ]},
      { title: 'Tear Patterns', items: [
        { label: 'Horizontal cleavage', risk: 'Degenerative', riskCol: 'cr-yellow', desc: 'Horizontal split through meniscus parallel to tibial plateau. Most common degenerative pattern. Usually in older patients.' },
        { label: 'Bucket-handle', risk: 'Urgent', riskCol: 'cr-red', desc: 'Vertical longitudinal tear with displacement of inner fragment into intercondylar notch. May cause locked knee. Surgical referral.' },
        { label: 'Radial / transverse', risk: 'Significant', riskCol: 'cr-orange', desc: 'Perpendicular to free margin. Disrupts circumferential fibres and "hoop stress" function. Can lead to meniscal extrusion.' },
        { label: 'Root tear', risk: 'Urgent', riskCol: 'cr-red', desc: 'Tear at posterior root attachment. Functionally equivalent to total meniscectomy. Rapidly accelerates articular cartilage loss.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  rotator_cuff: {
    name: 'Rotator Cuff Tear — MRI Grading',
    source: 'Balich 1997 / AOSSM / AAOS Guidelines',
    desc: 'MRI-based grading of rotator cuff pathology and management guidance',
    fields: [
      radioField('thickness', 'Tear Type', [
        { value: 'none',     label: 'No tear — tendinopathy / tendinosis only' },
        { value: 'partial',  label: 'Partial thickness tear' },
        { value: 'full',     label: 'Full thickness tear' },
      ]),
      selectField('tendon', 'Tendon Involved', [
        { value: 'supraspinatus',   label: 'Supraspinatus (most common)' },
        { value: 'infraspinatus',   label: 'Infraspinatus' },
        { value: 'subscapularis',   label: 'Subscapularis' },
        { value: 'teres_minor',     label: 'Teres minor' },
        { value: 'multiple',        label: 'Multiple tendons' },
      ]),
      selectField('partial_surface', 'Partial Tear — Surface (if applicable)', [
        { value: 'na',       label: 'N/A' },
        { value: 'articular', label: 'Articular surface (undersurface)' },
        { value: 'bursal',    label: 'Bursal surface' },
        { value: 'intratendinous', label: 'Intratendinous' },
      ]),
      selectField('full_size', 'Full Thickness Tear Size (if applicable)', [
        { value: 'na',      label: 'N/A' },
        { value: 'small',   label: 'Small — <1 cm' },
        { value: 'medium',  label: 'Medium — 1–3 cm' },
        { value: 'large',   label: 'Large — 3–5 cm' },
        { value: 'massive', label: 'Massive — >5 cm or \u22652 tendons' },
      ]),
      radioField('retraction', 'Tendon Retraction / Muscle Atrophy?', [
        { value: 'no',  label: 'No significant retraction or atrophy' },
        { value: 'yes', label: 'Yes — significant retraction or fatty atrophy (Goutallier \u22652)' },
      ]),
      radioField('symptoms', 'Symptomatic?', [
        { value: 'none',    label: 'Asymptomatic / incidental' },
        { value: 'present', label: 'Symptomatic — pain, weakness, restricted range of motion' },
      ]),
    ],
    compute(f) {
      const notes = [
        'Rotator cuff tears are common incidental findings — prevalence increases with age (>50% in patients >60 years).',
        'Partial tears: PASTA (Partial Articular-Surface Tendon Avulsion) is most common partial tear subtype.',
        'Full-thickness tears with significant retraction and fatty atrophy have lower surgical repair success.',
        'MRI arthrography improves sensitivity for partial tears and labral pathology.',
        'Ultrasound (dynamic) can diagnose full-thickness tears with equivalent sensitivity to MRI.',
      ];
      if (f.thickness === 'none') {
        const symp = f.symptoms === 'present';
        return result(symp ? 'yellow' : 'green',
          symp ? 'Rotator cuff tendinopathy — no tear. Conservative management: physiotherapy (strengthening, range of motion), NSAIDs, subacromial corticosteroid injection. Orthopaedic referral if refractory at 3 months.'
               : 'Rotator cuff tendinopathy — asymptomatic. No intervention required. Monitor.',
          notes);
      }
      if (f.thickness === 'partial') {
        const symp = f.symptoms === 'present';
        const surf = f.partial_surface;
        const surfStr = surf && surf !== 'na' ? ' (' + surf.replace('_', ' ') + ' surface)' : '';
        return result(symp ? 'orange' : 'yellow',
          symp ? 'Partial thickness tear' + surfStr + ' — symptomatic. Conservative management 3–6 months (physiotherapy, injection). Orthopaedic referral if refractory. Surgical repair (debridement or completion and repair) for failed conservative management.'
               : 'Partial thickness tear' + surfStr + ' — asymptomatic/incidental. Conservative management. Orthopaedic follow-up. Risk of progression to full thickness over time.',
          notes);
      }
      // Full thickness
      const size    = f.full_size;
      const retract = f.retraction === 'yes';
      const symp    = f.symptoms === 'present';
      const tendon  = f.tendon;
      if (size === 'massive' || tendon === 'multiple') {
        return result('red',
          'Massive rotator cuff tear / multi-tendon involvement.' + (retract ? ' Significant retraction and/or fatty atrophy reduces reparability.' : '') + ' Orthopaedic surgery referral for repair feasibility assessment. Options: surgical repair, tendon transfer, superior capsule reconstruction, reverse shoulder arthroplasty.',
          notes);
      }
      if (retract) {
        return result('orange',
          'Full thickness tear (' + (size || '') + ') with significant retraction/atrophy — reduced reparability. Orthopaedic referral. Surgical repair more complex; consider patient age, activity demands, and timing.',
          notes);
      }
      return result(symp ? 'orange' : 'yellow',
        symp ? 'Full thickness tear (' + (size || '') + ', ' + (tendon || 'supraspinatus') + ') — symptomatic. Conservative management 3–6 months. Surgical repair recommended for young, active patients with acute tear or failure of conservative treatment.'
             : 'Full thickness tear (' + (size || '') + ') — asymptomatic/incidental. Conservative management. Monitor for symptom development. Orthopaedic review.',
        notes);
    },
    criteria: [
      { title: 'Partial Thickness Tear Classification', items: [
        { label: 'Articular surface (PASTA)', risk: 'Most common', riskCol: 'cr-yellow', desc: 'Undersurface tear. Often missed on non-arthrographic MRI. >50% cross-sectional involvement has higher progression risk.' },
        { label: 'Bursal surface', risk: 'Partial', riskCol: 'cr-yellow', desc: 'Upper surface tear. Seen as defect at bursa-tendon interface. Associated with acromial impingement.' },
        { label: 'Intratendinous', risk: 'Partial', riskCol: 'cr-yellow', desc: 'Internal tear not reaching either surface. May be missed on standard MRI. MRI arthrography recommended for complete evaluation.' },
      ]},
      { title: 'Full Thickness Tear Size', items: [
        { label: 'Small — <1 cm', risk: 'Repairable', riskCol: 'cr-green', desc: 'Easily repairable. Good outcomes with arthroscopic repair.' },
        { label: 'Medium — 1–3 cm', risk: 'Repairable', riskCol: 'cr-yellow', desc: 'Good surgical outcomes. Repair recommended in younger, active patients.' },
        { label: 'Large — 3–5 cm', risk: 'Complex', riskCol: 'cr-orange', desc: 'More complex repair. Outcomes depend on tissue quality and retraction. Early referral preferred.' },
        { label: 'Massive — >5 cm / \u22652 tendons', risk: 'Poor outcome', riskCol: 'cr-red', desc: 'Irreparable in some. Options include partial repair, tendon transfer, superior capsule reconstruction, or reverse arthroplasty. Fatty atrophy/retraction limits options.' },
      ]},
      { title: 'Goutallier Fatty Atrophy', items: [
        { label: 'Grade 0–1 — Normal / mild', risk: 'Good', riskCol: 'cr-green', desc: 'No or minimal fatty infiltration. Muscle quality preserved. Good outcomes with repair.' },
        { label: 'Grade 2 — <50% fatty infiltration', risk: 'Moderate', riskCol: 'cr-yellow', desc: 'Less than half of muscle replaced by fat. Repair still beneficial in most cases.' },
        { label: 'Grade 3–4 — \u226550% fatty infiltration', risk: 'Poor', riskCol: 'cr-red', desc: 'More than half of muscle is fatty. Poor prognosis for functional recovery after repair. May be considered irreparable.' },
      ]},
    ],
  },

  // ════════════════════════════════════════════════════════ KIDNEY / URINARY ════

  hydronephrosis: {
    name: 'Hydronephrosis — SFU Grading & Management',
    source: 'SFU Grading System / EAU Guidelines',
    desc: 'Grading of renal pelvicalyceal dilation and management guidance',
    fields: [
      selectField('grade', 'SFU Hydronephrosis Grade', [
        { value: '0', label: 'Grade 0 — No dilation, normal kidney' },
        { value: '1', label: 'Grade 1 — Mild: renal pelvis only, no calyceal dilation' },
        { value: '2', label: 'Grade 2 — Mild-moderate: pelvis + major calyces dilated' },
        { value: '3', label: 'Grade 3 — Moderate: pelvis + major + minor calyces, cortex preserved' },
        { value: '4', label: 'Grade 4 — Severe: cortical thinning present' },
      ]),
      numField('apd', 'Anteroposterior Pelvic Diameter', 'mm', 'e.g. 14', 'On coronal/axial US or MRI, measured at renal pelvis'),
      radioField('side', 'Laterality', [
        { value: 'unilateral', label: 'Unilateral' },
        { value: 'bilateral',  label: 'Bilateral' },
      ]),
      radioField('cause', 'Likely Cause (if known)', [
        { value: 'unknown',      label: 'Unknown / to be determined' },
        { value: 'stone',        label: 'Calculus (ureteric stone)' },
        { value: 'obstruction',  label: 'Extrinsic obstruction (mass, lymphadenopathy, retroperitoneal fibrosis)' },
        { value: 'upj',          label: 'Intrinsic obstruction — UPJ (ureteropelvic junction stenosis)' },
        { value: 'physiological', label: 'Physiological — pregnancy' },
        { value: 'vesicoureteral', label: 'Vesicoureteral reflux' },
      ]),
      radioField('symptoms', 'Symptomatic?', [
        { value: 'no',  label: 'Asymptomatic / incidental' },
        { value: 'yes', label: 'Symptomatic — flank pain, fever, reduced urine output' },
      ]),
    ],
    compute(f) {
      const grade = parseInt(f.grade) || 0;
      const symp  = f.symptoms === 'yes';
      const apd   = parseFloat(f.apd) || 0;
      const bilat = f.side === 'bilateral';
      const notes = [
        'MAG3 or DTPA renogram (diuretic nuclear medicine) quantifies split renal function and obstruction.',
        'Obstruction with infection (pyonephrosis) requires urgent drainage.',
        'Bilateral hydronephrosis suggests bladder outlet obstruction (BPH, bladder neck, neurogenic bladder) until proven otherwise.',
        'CT urogram or MR urogram is the gold standard for defining ureteric anatomy and cause.',
        'In pregnancy, mild-moderate right-sided hydronephrosis is physiological from uterine compression.',
      ];
      if (symp && (grade >= 3 || bilat)) {
        return result('red',
          'Grade ' + grade + ' hydronephrosis — symptomatic' + (bilat ? ', bilateral' : '') + '. Urgent urology referral. Risk of pyonephrosis/obstructive uropathy. Consider nephrostomy/ureteric stent if high-grade obstruction or infection.',
          notes);
      }
      if (grade === 0) return result('green', 'No hydronephrosis. Normal pelvicalyceal system.', notes);
      if (grade === 1 && apd < 10 && !symp) return result('green', 'Grade 1 — mild dilation of renal pelvis only. APD ' + (apd || 'not measured') + ' mm. Likely physiological or minimal obstruction. Repeat ultrasound in 3–6 months if aetiology unknown.', notes);
      if (grade <= 2 && !symp) return result('yellow', 'Grade ' + grade + ' hydronephrosis (APD ' + (apd || '?') + ' mm) — mild to moderate. Urology referral. Diuretic renogram to assess function. Monitor renal function (eGFR, creatinine).', notes);
      if (grade === 3 && !symp) return result('orange', 'Grade 3 hydronephrosis — moderate with preserved cortex. Urology referral. Diuretic renogram. CT/MR urogram to define aetiology. Intervention may be required.', notes);
      return result('orange', 'Grade 4 hydronephrosis — severe, cortical thinning.' + (symp ? ' Symptomatic — urgent urology referral.' : ' Urology referral. Assess for functional kidney loss. Intervention (pyeloplasty, stent, nephrostomy) likely required.'), notes);
    },
    criteria: [
      { title: 'SFU Hydronephrosis Grading', items: [
        { label: 'Grade 0 — Normal', risk: 'Normal', riskCol: 'cr-green', desc: 'No dilation of renal pelvis or calyces.' },
        { label: 'Grade 1 — Pelvis only', risk: 'Mild', riskCol: 'cr-green', desc: 'Renal pelvis mildly dilated; calyces not seen. APD typically <10 mm. Likely physiological.' },
        { label: 'Grade 2 — Pelvis + major calyces', risk: 'Mild-Mod', riskCol: 'cr-yellow', desc: 'Renal pelvis and major calyces visible. No parenchymal thinning. APD 10–15 mm range. Urology referral and renogram.' },
        { label: 'Grade 3 — + minor calyces', risk: 'Moderate', riskCol: 'cr-orange', desc: 'Pelvis, major and minor calyces all dilated. Cortex appears normal. APD often >15 mm. Obstruction likely. Intervention often required.' },
        { label: 'Grade 4 — Cortical thinning', risk: 'Severe', riskCol: 'cr-red', desc: 'Gross dilation with thinning of renal parenchyma. Renal functional impairment. Urgent intervention to preserve renal function.' },
      ]},
      { title: 'APD Thresholds (Adults)', items: [
        { label: '<10 mm', risk: 'Low risk', riskCol: 'cr-green', desc: 'Usually physiological or minimal obstruction. Monitor.' },
        { label: '10–20 mm', risk: 'Moderate', riskCol: 'cr-yellow', desc: 'Clinically significant in the context of symptoms or functional impairment. Renogram indicated.' },
        { label: '>20 mm', risk: 'Significant', riskCol: 'cr-red', desc: 'High likelihood of significant obstruction. Urgent urology referral and functional assessment.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  urinary_stone: {
    name: 'Urinary Stone — Size & Location Management (AUA 2016)',
    source: 'AUA Stone Guidelines 2016 / EAU 2023',
    desc: 'Non-contrast CT-based stone management recommendations',
    fields: [
      numField('size', 'Maximum Stone Diameter', 'mm', 'e.g. 6', 'Longest axis on non-contrast CT'),
      selectField('location', 'Stone Location', [
        { value: 'upper_calyx',   label: 'Kidney — Upper / mid calyx' },
        { value: 'lower_calyx',   label: 'Kidney — Lower pole' },
        { value: 'renal_pelvis',  label: 'Kidney — Renal pelvis' },
        { value: 'prox_ureter',   label: 'Ureter — Proximal (UPJ to upper sacrum)' },
        { value: 'mid_ureter',    label: 'Ureter — Mid ureter (sacrum level)' },
        { value: 'distal_ureter', label: 'Ureter — Distal (VUJ / lower ureter)' },
        { value: 'bladder',       label: 'Bladder' },
      ]),
      radioField('symptoms', 'Symptomatic?', [
        { value: 'no',  label: 'Asymptomatic / incidental' },
        { value: 'yes', label: 'Symptomatic — colic, haematuria' },
      ]),
      radioField('obstruction', 'Hydronephrosis / Obstruction?', [
        { value: 'no',     label: 'No / minimal' },
        { value: 'mild',   label: 'Mild' },
        { value: 'severe', label: 'Moderate-severe' },
      ]),
      radioField('solitary', 'Solitary Kidney or Bilateral Stones?', [
        { value: 'no',  label: 'No — contralateral kidney normal' },
        { value: 'yes', label: 'Yes — solitary kidney or bilateral stones' },
      ]),
    ],
    compute(f) {
      const sz      = parseFloat(f.size);
      if (isNaN(sz) || sz <= 0) return null;
      const loc     = f.location;
      const symp    = f.symptoms === 'yes';
      const obst    = f.obstruction;
      const solitary = f.solitary === 'yes';
      const notes = [
        'Non-contrast CT KUB is the gold standard for stone detection and sizing.',
        'Stone composition affects fragmentation: calcium oxalate monohydrate and brushite are hard; cystine is resistant to SWL.',
        'Spontaneous passage rates: <4 mm ~80%, 4–6 mm ~60%, >6 mm ~20%.',
        'Alpha-blockers (tamsulosin 0.4 mg OD) speed passage of distal ureteric stones \u226410 mm (medical expulsive therapy).',
        'Infected obstructed system (pyonephrosis) = urological emergency — decompress with nephrostomy or stent.',
      ];
      if (obst === 'severe' || solitary) {
        return result('red',
          (solitary ? 'Solitary kidney / bilateral stones — ' : '') + (obst === 'severe' ? 'Significant obstruction — ' : '') + 'urgent urology referral. ' + (obst === 'severe' ? 'Consider ureteric stent or nephrostomy. ' : '') + 'Risk of renal impairment.',
          notes);
      }
      const isUreteral = loc.includes('ureter');
      const isRenal    = loc.includes('calyx') || loc === 'renal_pelvis';
      const isDistal   = loc === 'distal_ureter';
      let col, rec;
      if (sz <= 4) {
        col = symp ? 'yellow' : 'green';
        rec = 'Stone \u22644 mm (' + sz + ' mm, ' + loc.replace(/_/g, ' ') + ') — high likelihood of spontaneous passage (~80%). ' + (symp ? 'Medical expulsive therapy (tamsulosin) for ureteral stones. Analgesia. Urology follow-up.' : 'Observe. Strain urine. Repeat imaging in 4–6 weeks.');
      } else if (sz <= 6) {
        col = 'yellow';
        rec = 'Stone 4–6 mm (' + sz + ' mm, ' + loc.replace(/_/g, ' ') + ') — ~60% chance of passage. ' + (isUreteral ? 'Medical expulsive therapy. Urology follow-up in 2–4 weeks. ' : '') + 'SWL or URS if no passage within 4–6 weeks.';
      } else if (sz <= 10) {
        col = 'orange';
        rec = 'Stone 6–10 mm (' + sz + ' mm, ' + loc.replace(/_/g, ' ') + ') — unlikely to pass spontaneously. Urology referral. ' + (isUreteral ? 'Ureteroscopy (URS) preferred for ureteral stones. ' : '') + (isRenal ? 'SWL first-line for renal stones (if anatomy suitable); URS alternative. ' : '') + 'Medical expulsive therapy for distal ureteral stones while awaiting procedure.';
      } else if (sz <= 20) {
        col = 'red';
        rec = 'Stone 10–20 mm (' + sz + ' mm, ' + loc.replace(/_/g, ' ') + ') — intervention required. ' + (isRenal ? 'SWL for upper/mid calyx; URS or PCNL for lower pole stones >10 mm. ' : '') + (isUreteral ? 'Ureteroscopy (URS) recommended. ' : '') + 'Urology referral.';
      } else {
        col = 'red';
        rec = 'Stone >20 mm (' + sz + ' mm, ' + loc.replace(/_/g, ' ') + ') — PCNL (percutaneous nephrolithotomy) is first-line. Staghorn calculi require multisession PCNL or combination therapy. Urgent urology referral.';
      }
      return result(col, rec, notes);
    },
    criteria: [
      { title: 'Size-Based Management', items: [
        { label: '\u22644 mm', risk: 'Observe', riskCol: 'cr-green', desc: '~80% pass spontaneously within 40 days. Conservative management with analgesia and hydration. Strain urine for stone analysis.' },
        { label: '4–6 mm', risk: 'MET', riskCol: 'cr-yellow', desc: '~60% passage rate. Medical expulsive therapy (tamsulosin 0.4 mg OD) accelerates passage of distal ureteral stones. Urology follow-up.' },
        { label: '6–10 mm', risk: 'SWL / URS', riskCol: 'cr-orange', desc: '~20% spontaneous passage. SWL for renal stones; URS preferred for ureteral stones. PCNL rarely needed.' },
        { label: '10–20 mm', risk: 'URS / PCNL', riskCol: 'cr-red', desc: 'Active intervention required. PCNL or SWL for large renal stones. URS for ureteral stones.' },
        { label: '>20 mm', risk: 'PCNL', riskCol: 'cr-red', desc: 'PCNL is first-line. Multisession or combination therapy may be needed for staghorn calculi.' },
      ]},
      { title: 'Location-Based Considerations', items: [
        { label: 'Distal ureter (VUJ)', risk: 'Highest passage', riskCol: 'cr-green', desc: 'Highest spontaneous passage rate. MET most effective here. SWL and URS both effective if intervention needed.' },
        { label: 'Lower pole renal', risk: 'SWL less effective', riskCol: 'cr-yellow', desc: 'Gravity impairs fragment clearance after SWL. URS or PCNL preferred for stones >10 mm in lower pole.' },
        { label: 'UPJ / renal pelvis', risk: 'SWL effective', riskCol: 'cr-yellow', desc: 'SWL is effective for stones in upper ureter and renal pelvis. URS or PCNL for SWL failure.' },
      ]},
    ],
  },

  // ════════════════════════════════════════════════════════ LIVER / BILIARY ═════

  liver_lesion_noncirrhotic: {
    name: 'Incidental Liver Lesion — Non-Cirrhotic Patient',
    source: 'ACR 2017 Incidental Findings / EASL 2018',
    desc: 'Characterisation and follow-up of incidental hepatic lesion in a patient without cirrhosis or known malignancy',
    fields: [
      numField('size', 'Lesion Size', 'mm', 'e.g. 25'),
      selectField('morphology', 'Most Likely Morphology (based on imaging)', [
        { value: 'simple_cyst',    label: 'Simple cyst — anechoic/hypodense, no wall, no septae, posterior acoustic enhancement' },
        { value: 'haemangioma',    label: 'Haemangioma — peripheral nodular enhancement with centripetal fill-in, T2 bright' },
        { value: 'fnh',            label: 'FNH — central scar, spoke-wheel arterial enhancement, hepatobiliary phase uptake (Gd-EOB)' },
        { value: 'adenoma',        label: 'Hepatic adenoma — arterial enhancement, may contain fat/haemorrhage' },
        { value: 'metastasis',     label: 'Metastasis — multiple lesions, rim-enhancing, or target sign, known primary' },
        { value: 'indeterminate',  label: 'Indeterminate — does not fit above patterns' },
      ]),
      radioField('known_malignancy', 'Known Primary Malignancy?', [
        { value: 'no',  label: 'No' },
        { value: 'yes', label: 'Yes' },
      ]),
      radioField('oca', 'Oral Contraceptive Pill use (for adenoma assessment)?', [
        { value: 'no',       label: 'No / not applicable' },
        { value: 'yes',      label: 'Yes — current or recent OCP use' },
      ]),
    ],
    compute(f) {
      const sz  = parseFloat(f.size);
      if (isNaN(sz) || sz <= 0) return null;
      const mal = f.known_malignancy === 'yes';
      const ocp = f.oca === 'yes';
      const notes = [
        'MRI with hepatobiliary contrast (Gd-EOB-DTPA) is the gold standard for liver lesion characterisation.',
        'If cirrhosis is suspected, use LI-RADS criteria instead.',
        'All indeterminate lesions in patients with known malignancy should be reported as "indeterminate — exclude metastasis".',
        'Hepatic adenoma may rupture or undergo malignant transformation — surgical review for lesions >5 cm.',
      ];
      if (mal) {
        return result('orange',
          'Known malignancy — any liver lesion requires characterisation to exclude metastasis. If CT/US indeterminate: MRI liver with hepatobiliary contrast (Gd-EOB). PET-CT may be appropriate for staging.',
          notes);
      }
      const morph = f.morphology;
      if (morph === 'simple_cyst') {
        if (sz < 20) return result('green', 'Simple cyst ' + sz + ' mm — classic features, no follow-up required. Benign.', notes);
        return result('green', 'Large simple cyst ' + sz + ' mm — no follow-up if completely typical features. Consider US or MRI to confirm if any atypical feature.', notes);
      }
      if (morph === 'haemangioma') {
        if (sz < 30) return result('green', 'Haemangioma ' + sz + ' mm — classic features. No follow-up required. Benign.', notes);
        return result('yellow', 'Large haemangioma ' + sz + ' mm — confirm with MRI if not already done. Once confirmed, no further follow-up needed.', notes);
      }
      if (morph === 'fnh') {
        return result('green', 'FNH — no malignant potential. No treatment or follow-up required. Reassure patient. Confirm with MRI (Gd-EOB) if CT findings atypical.', notes);
      }
      if (morph === 'adenoma') {
        const notes2 = [...notes, 'Hepatocyte Nuclear Factor 1-alpha (HNF1A) mutated adenomas: steatotic, low malignant potential. Beta-catenin mutated: higher malignant risk. Inflammatory: OCP-associated.'];
        if (sz >= 50) return result('red', 'Hepatic adenoma \u226550 mm (' + sz + ' mm) — surgical resection recommended due to risk of rupture and malignant transformation. Hepatobiliary surgery referral.' + (ocp ? ' Discontinue OCP.' : ''), notes2);
        if (ocp) return result('orange', 'Hepatic adenoma ' + sz + ' mm — OCP-associated. Discontinue OCP. MRI in 6 months; if regression to <30 mm, surveillance. If no regression or growth, surgical referral.', notes2);
        return result('orange', 'Hepatic adenoma ' + sz + ' mm — hepatobiliary surgery referral for risk stratification. MRI to characterise subtype. ' + (sz >= 30 ? 'Consider resection.' : 'Surveillance MRI at 6 months.'), notes2);
      }
      if (morph === 'metastasis') {
        return result('red', 'Imaging features suggest metastasis. Urgent referral to primary team / oncology. Staging CT chest/abdomen/pelvis. Tissue confirmation if primary unknown.', notes);
      }
      // Indeterminate
      return result('orange',
        'Indeterminate liver lesion ' + sz + ' mm — further characterisation required. MRI with hepatobiliary contrast (Gd-EOB-DTPA) recommended. Hepatobiliary radiology review.',
        [...notes, sz < 10 ? 'Lesions <10 mm: if all imaging features are benign (cyst or haemangioma-like) on 2 modalities, no follow-up needed per ACR.' : 'Lesions \u226510 mm: MRI characterisation required if CT indeterminate.']);
    },
    criteria: [
      { title: 'Lesion Characterisation', items: [
        { label: 'Simple hepatic cyst', risk: 'Benign', riskCol: 'cr-green', desc: 'Anechoic on US, hypodense on CT (<0 HU). No wall, septae, nodularity, or enhancement. Posterior acoustic enhancement on US. No follow-up needed.' },
        { label: 'Haemangioma', risk: 'Benign', riskCol: 'cr-green', desc: 'Peripheral nodular enhancement with centripetal fill-in on CT/MRI. T2-hyperintense (light bulb sign) on MRI. Most common benign hepatic tumour. No follow-up once confirmed.' },
        { label: 'FNH', risk: 'Benign', riskCol: 'cr-green', desc: 'Central scar with spoke-wheel arterial enhancement. Isointense or hyperintense on hepatobiliary phase (Gd-EOB). No malignant potential. No OCP contraindication.' },
        { label: 'Hepatic adenoma', risk: 'Monitor', riskCol: 'cr-orange', desc: 'Arterial enhancement, may contain fat (HNF1A type) or haemorrhage. Risk of rupture (>5 cm) and malignant transformation (beta-catenin type). OCP cessation and size-based management.' },
        { label: 'Metastasis', risk: 'Urgent', riskCol: 'cr-red', desc: 'Often multiple. Rim/peripheral enhancement or target sign. Central necrosis. Known primary is key. Requires oncological staging.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  hepatic_steatosis: {
    name: 'Hepatic Steatosis — CT-based Grading',
    source: 'ACR / AASLD / EASL Guidelines',
    desc: 'Unenhanced CT assessment of hepatic steatosis using liver attenuation values',
    fields: [
      numField('liver_hu', 'Liver Attenuation', 'HU', 'e.g. 38', 'Measure ROI in right lobe, away from vessels, on unenhanced CT'),
      numField('spleen_hu', 'Spleen Attenuation', 'HU', 'e.g. 55', 'Optional: ROI in spleen on same series for liver-spleen ratio'),
      radioField('contrast', 'CT Type', [
        { value: 'noncontrast', label: 'Non-contrast CT (preferred for steatosis assessment)' },
        { value: 'contrast',    label: 'Contrast-enhanced CT (less reliable — use with caution)' },
      ]),
    ],
    compute(f) {
      const liverHU  = parseFloat(f.liver_hu);
      const spleenHU = parseFloat(f.spleen_hu);
      if (isNaN(liverHU)) return null;
      const isContrast = f.contrast === 'contrast';
      const notes = [
        'Unenhanced CT is preferred. Contrast enhancement reduces liver attenuation by ~20–30 HU, making thresholds unreliable on post-contrast imaging.',
        'Normal liver attenuation: 50–70 HU on unenhanced CT.',
        'Liver-spleen attenuation difference <-10 HU (liver lower than spleen by >10 HU) indicates significant steatosis.',
        'CT underestimates steatosis <25–30% fat fraction. MRI PDFF is more sensitive.',
        'Iron overload increases liver attenuation (hepatic siderosis): liver HU >75 HU suggests iron deposition.',
        'Steatohepatitis (NASH) cannot be diagnosed on CT — liver biopsy or MR elastography required.',
      ];
      const caveats = isContrast ? ['Contrast-enhanced CT: these thresholds are approximate; attenuation values are reduced by contrast. Non-contrast CT strongly preferred.'] : [];

      let diff = null;
      let ratio = null;
      let spleenNote = '';
      if (!isNaN(spleenHU) && spleenHU > 0) {
        diff  = liverHU - spleenHU;
        ratio = (liverHU / spleenHU).toFixed(2);
        spleenNote = ' Liver\u2013spleen difference: ' + diff.toFixed(0) + ' HU (ratio: ' + ratio + ').';
      }

      let col, rec, grade;
      if (liverHU >= 50) {
        col   = 'green';
        grade = 'Normal';
        rec   = 'Liver attenuation ' + liverHU + ' HU — normal.' + spleenNote + ' No significant hepatic steatosis on CT.';
      } else if (liverHU >= 40) {
        col   = 'yellow';
        grade = 'Mild steatosis';
        rec   = 'Liver attenuation ' + liverHU + ' HU — mild hepatic steatosis.' + spleenNote + ' Lifestyle modification: weight loss, reduce alcohol, treat metabolic risk factors. Gastroenterology/hepatology referral if clinically indicated.';
      } else if (liverHU >= 20) {
        col   = 'orange';
        grade = 'Moderate steatosis';
        rec   = 'Liver attenuation ' + liverHU + ' HU — moderate hepatic steatosis.' + spleenNote + ' Hepatology referral for assessment of NAFLD/NASH. Liver function tests, metabolic panel. Consider FibroScan or MR elastography.';
      } else {
        col   = 'red';
        grade = 'Severe steatosis';
        rec   = 'Liver attenuation ' + liverHU + ' HU — severe hepatic steatosis.' + spleenNote + ' Urgent hepatology referral. Screen for NASH and advanced fibrosis (FibroScan, liver biopsy). Avoid hepatotoxic medications.';
      }

      if (!isNaN(spleenHU) && diff !== null && diff < -10 && col === 'green') {
        col = 'yellow';
        rec = 'Liver attenuation ' + liverHU + ' HU — borderline by absolute value, but liver-spleen difference (' + diff.toFixed(0) + ' HU) indicates steatosis. Mild-moderate steatosis likely.';
      }

      const extra = '<div class="sub-result"><div class="sub-result-title">Calculation</div>' +
        '<table style="width:100%;font-size:.84rem;border-collapse:collapse">' +
        '<tr><td style="padding:3px 12px 3px 0;width:50%"><strong>Liver attenuation</strong></td><td><strong>' + liverHU + ' HU</strong></td></tr>' +
        (!isNaN(spleenHU) ? '<tr><td style="padding:3px 12px 3px 0"><strong>Spleen attenuation</strong></td><td>' + spleenHU + ' HU</td></tr>' +
          '<tr><td style="padding:3px 12px 3px 0"><strong>Liver \u2212 Spleen</strong></td><td><strong>' + diff.toFixed(0) + ' HU</strong></td></tr>' +
          '<tr><td style="padding:3px 12px 3px 0"><strong>Liver:Spleen ratio</strong></td><td>' + ratio + '</td></tr>' : '') +
        '<tr><td style="padding:3px 12px 3px 0"><strong>Grade</strong></td><td><strong>' + grade + '</strong></td></tr>' +
        '</table></div>';

      return result(col, rec, [...notes, ...caveats], extra);
    },
    criteria: [
      { title: 'Liver HU Thresholds (Unenhanced CT)', items: [
        { label: '\u226550 HU — Normal', risk: 'Normal', riskCol: 'cr-green', desc: 'Normal hepatic attenuation. No significant steatosis. Normal range 50–70 HU.' },
        { label: '40–49 HU — Mild steatosis', risk: 'Mild', riskCol: 'cr-yellow', desc: 'Mild hepatic steatosis (~5–15% fat fraction). Lifestyle counselling: weight loss, alcohol reduction, dietary modification.' },
        { label: '20–39 HU — Moderate steatosis', risk: 'Moderate', riskCol: 'cr-orange', desc: 'Moderate steatosis (~15–30% fat fraction). Hepatology referral. Assess for NASH, metabolic syndrome, and fibrosis.' },
        { label: '<20 HU — Severe steatosis', risk: 'Severe', riskCol: 'cr-red', desc: 'Severe steatosis (>30% fat fraction). May approach or exceed fat attenuation. Urgent hepatology referral. Risk of NASH and cirrhosis.' },
      ]},
      { title: 'Liver-Spleen Ratio', items: [
        { label: 'Difference > \u22120 HU (liver > spleen)', risk: 'Normal', riskCol: 'cr-green', desc: 'Normal liver is denser than spleen. No steatosis.' },
        { label: 'Difference \u22120 to \u221210 HU', risk: 'Borderline', riskCol: 'cr-yellow', desc: 'Liver approaches spleen attenuation. Borderline steatosis. CT PDFF or MRI for confirmation.' },
        { label: 'Difference < \u221210 HU (liver < spleen)', risk: 'Steatosis', riskCol: 'cr-orange', desc: 'Liver is >10 HU less dense than spleen. Reliable indicator of hepatic steatosis regardless of absolute liver HU.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  cbd_dilation: {
    name: 'Bile Duct Dilation — Significance & Workup',
    source: 'ACR / BSG / EASL Guidelines',
    desc: 'Assessment of common bile duct and intrahepatic duct dilation',
    fields: [
      numField('cbd', 'Common Bile Duct Diameter', 'mm', 'e.g. 9', 'Measured on US, CT or MRI at widest point'),
      radioField('cholecystectomy', 'Prior Cholecystectomy?', [
        { value: 'no',  label: 'No (gallbladder in situ)' },
        { value: 'yes', label: 'Yes (post-cholecystectomy — CBD may be physiologically enlarged)' },
      ]),
      radioField('ihd', 'Intrahepatic Duct (IHD) Dilation?', [
        { value: 'no',  label: 'No intrahepatic dilation' },
        { value: 'yes', label: 'Yes — intrahepatic ducts dilated' },
      ]),
      radioField('cause', 'Likely Cause (if identifiable)', [
        { value: 'unknown',      label: 'Unknown / indeterminate' },
        { value: 'stone',        label: 'Choledocholithiasis — stone visible in duct' },
        { value: 'stricture',    label: 'Biliary stricture' },
        { value: 'double_duct',  label: 'Double duct sign (CBD + MPD both dilated)' },
        { value: 'mass',         label: 'Mass / cholangiocarcinoma suspected' },
        { value: 'physiological', label: 'Physiological / post-cholecystectomy' },
      ]),
      radioField('jaundice', 'Clinical Jaundice / Raised Bilirubin?', [
        { value: 'no',  label: 'No' },
        { value: 'yes', label: 'Yes' },
      ]),
    ],
    compute(f) {
      const cbd      = parseFloat(f.cbd);
      if (isNaN(cbd) || cbd <= 0) return null;
      const postchole = f.cholecystectomy === 'yes';
      const ihd       = f.ihd === 'yes';
      const cause     = f.cause;
      const jaundice  = f.jaundice === 'yes';
      const normalMax  = postchole ? 10 : 7;
      const notes = [
        'Normal CBD: \u22647 mm (gallbladder in situ); \u226410 mm post-cholecystectomy.',
        'MRCP is the gold standard for non-invasive evaluation of biliary anatomy.',
        'EUS (endoscopic ultrasound) is highly sensitive for choledocholithiasis.',
        'ERCP is reserved for therapeutic intervention (sphincterotomy, stenting, stone extraction).',
        'Double duct sign (CBD + pancreatic duct dilation) raises concern for periampullary/pancreatic head malignancy.',
      ];
      if (cause === 'double_duct') {
        return result('red',
          'Double duct sign — dilation of both CBD and main pancreatic duct. High suspicion for periampullary or pancreatic head malignancy. Urgent pancreatic protocol CT, CA 19-9, CEA, MRI/MRCP. Gastroenterology/hepatobiliary surgery referral.',
          notes);
      }
      if (cause === 'mass') {
        return result('red',
          'Biliary obstruction with mass/stricture — cholangiocarcinoma or extrinsic compression. Urgent MRCP + CT staging + CA 19-9. Hepatobiliary surgery referral.',
          notes);
      }
      if (jaundice && cbd > normalMax) {
        return result('red',
          'Jaundice with CBD dilation (' + cbd + ' mm, normal \u2264' + normalMax + ' mm) — obstructive jaundice. Urgent MRCP. Liver function tests, bilirubin, CA 19-9. Hepatobiliary referral. Consider ERCP if stone suspected.',
          notes);
      }
      if (cbd <= normalMax) {
        return result('green',
          'CBD diameter ' + cbd + ' mm — within normal limits for ' + (postchole ? 'post-cholecystectomy patient' : 'intact gallbladder') + ' (\u2264' + normalMax + ' mm). No significant biliary dilation.',
          notes);
      }
      if (cause === 'stone') {
        return result('orange',
          'CBD ' + cbd + ' mm with visible choledocholithiasis — biliary stone obstruction. MRCP for full mapping. ERCP with sphincterotomy and stone extraction. Hepatobiliary surgery or gastroenterology referral.',
          notes);
      }
      if (cause === 'physiological' && postchole && !ihd) {
        return result('yellow',
          'CBD ' + cbd + ' mm post-cholecystectomy — marginally above expected but may be physiological compensatory dilation. MRCP if symptomatic or >10 mm. Monitor LFTs.',
          notes);
      }
      const ihd_note = ihd ? ' Intrahepatic duct dilation present — higher obstruction level.' : '';
      if (cbd <= 10) {
        return result('yellow',
          'Mild CBD dilation ' + cbd + ' mm.' + ihd_note + ' MRCP recommended for aetiology. LFTs, bilirubin. Gastroenterology review.',
          notes);
      }
      return result('orange',
        'Significant CBD dilation ' + cbd + ' mm.' + ihd_note + ' MRCP urgently. Exclude choledocholithiasis, cholangiocarcinoma, extrinsic compression. Hepatobiliary surgery referral.',
        notes);
    },
    criteria: [
      { title: 'Normal CBD Diameter', items: [
        { label: '\u22647 mm — Gallbladder in situ', risk: 'Normal', riskCol: 'cr-green', desc: 'Normal upper limit with gallbladder present. Age-related increase of ~1 mm per decade may apply, but clinical correlation is required.' },
        { label: '\u226410 mm — Post-cholecystectomy', risk: 'Normal', riskCol: 'cr-green', desc: 'Physiological compensatory dilation after cholecystectomy. Up to 10 mm considered normal if no symptoms or LFT abnormality.' },
        { label: '7–10 mm (intact GB)', risk: 'Abnormal', riskCol: 'cr-orange', desc: 'Mild dilation above normal. MRCP recommended to exclude choledocholithiasis or stricture.' },
        { label: '>10 mm (any)', risk: 'Significant', riskCol: 'cr-red', desc: 'Definite significant dilation. Biliary obstruction until proven otherwise. MRCP + LFTs essential.' },
      ]},
      { title: 'Double Duct Sign', items: [
        { label: 'CBD + MPD both dilated', risk: 'Urgent', riskCol: 'cr-red', desc: 'The double duct sign (dilated CBD and pancreatic duct) is associated with periampullary or pancreatic head malignancy in 65–80% of cases. Pancreatic protocol CT and MRCP urgently required.' },
      ]},
    ],
  },

  // ════════════════════════════════════════════════════════ NEURO / STROKE ══════

  aspects: {
    name: 'ASPECTS — Alberta Stroke Programme Early CT Score',
    source: 'Barber et al. 2000 / DAWN / DEFUSE-3 Criteria',
    desc: '10-point CT score for early ischaemic change in MCA territory — guides thrombolysis and thrombectomy eligibility',
    fields: [
      sectionField('MCA Territory Regions — select ALL regions with early ischaemic change (hypoattenuation, sulcal effacement, loss of grey-white differentiation)'),
      checkboxField('regions_subcortical', 'Subcortical Structures (each = 1 point deducted)', [
        { value: 'C',  label: 'C — Caudate nucleus' },
        { value: 'L',  label: 'L — Lentiform nucleus (putamen + globus pallidus)' },
        { value: 'IC', label: 'IC — Internal capsule' },
        { value: 'I',  label: 'I — Insular cortex (insular ribbon sign)' },
      ]),
      checkboxField('regions_cortical', 'MCA Cortical Regions (each = 1 point deducted)', [
        { value: 'M1', label: 'M1 — Anterior MCA cortex (frontal operculum)' },
        { value: 'M2', label: 'M2 — MCA cortex lateral to insular ribbon (anterior temporal)' },
        { value: 'M3', label: 'M3 — Posterior MCA cortex (posterior temporal)' },
        { value: 'M4', label: 'M4 — Anterior MCA territory superior to M1' },
        { value: 'M5', label: 'M5 — Lateral MCA territory superior to M2' },
        { value: 'M6', label: 'M6 — Posterior MCA territory superior to M3' },
      ]),
    ],
    compute(f) {
      const subReg = Array.isArray(f.regions_subcortical) ? f.regions_subcortical : (f.regions_subcortical ? [f.regions_subcortical] : []);
      const corReg = Array.isArray(f.regions_cortical)   ? f.regions_cortical   : (f.regions_cortical   ? [f.regions_cortical]   : []);
      const involved = subReg.length + corReg.length;
      const score    = 10 - involved;
      const notes = [
        'ASPECTS is scored on non-contrast CT: deduct 1 point for each region with early ischaemic change.',
        'Early ischaemic change: focal hypoattenuation, loss of grey-white differentiation, sulcal effacement.',
        'ASPECTS \u22656 is the conventional threshold for IV thrombolysis and mechanical thrombectomy eligibility.',
        'DAWN and DEFUSE-3 trials used ASPECTS \u22656 for extended-window thrombectomy (6-24h).',
        'CT perfusion (CTP) adds mismatch volume information and may guide eligibility beyond ASPECTS alone.',
        'MR DWI is more sensitive for early ischaemia than CT, especially in small or posterior fossa strokes.',
      ];
      let col, rec;
      const regionStr = involved === 0 ? 'No involved regions' : [...subReg, ...corReg].join(', ');
      if (score >= 8) {
        col = 'green';
        rec = 'ASPECTS ' + score + '/10 (' + (involved === 0 ? 'no ischaemic change' : 'minimal involvement: ' + regionStr) + '). Excellent score — favours IV thrombolysis and/or mechanical thrombectomy. Good functional outcome expected.';
      } else if (score >= 6) {
        col = 'yellow';
        rec = 'ASPECTS ' + score + '/10 (involved: ' + regionStr + '). Acceptable score — within conventional threshold (\u22656) for IV alteplase and mechanical thrombectomy. Multidisciplinary stroke team decision.';
      } else if (score >= 4) {
        col = 'orange';
        rec = 'ASPECTS ' + score + '/10 (involved: ' + regionStr + '). Low score — below standard thrombectomy threshold. Evidence for benefit is limited. Case-by-case decision by stroke team. CT perfusion mismatch may still support intervention.';
      } else {
        col = 'red';
        rec = 'ASPECTS ' + score + '/10 (involved: ' + regionStr + '). Very low score — extensive MCA territory ischaemia. Reperfusion therapy unlikely to benefit; risk of haemorrhagic transformation. Comfort care and best medical management. Stroke team and palliative care consultation.';
      }
      const extra = '<div class="sub-result"><div class="sub-result-title">Score</div>' +
        '<span style="font-size:1.4rem;font-weight:700">' + score + '</span><span style="font-size:.9rem"> / 10</span>' +
        ' &nbsp;|&nbsp; Regions involved: ' + involved + ' (' + (involved === 0 ? 'none' : regionStr) + ')</div>';
      return result(col, rec, notes, extra);
    },
    criteria: [
      { title: 'ASPECTS Regions (10 total)', items: [
        { label: 'C — Caudate', risk: 'Subcortical', riskCol: 'cr-grey', desc: 'Head of caudate nucleus. Lenticulostriate territory.' },
        { label: 'L — Lentiform nucleus', risk: 'Subcortical', riskCol: 'cr-grey', desc: 'Putamen and globus pallidus. Lenticulostriate territory.' },
        { label: 'IC — Internal capsule', risk: 'Subcortical', riskCol: 'cr-grey', desc: 'Posterior limb of internal capsule, between caudate and lentiform.' },
        { label: 'I — Insular cortex', risk: 'Cortical', riskCol: 'cr-grey', desc: 'Insular ribbon. Loss of insular grey-white differentiation (insular ribbon sign) is one of the earliest CT signs of MCA ischaemia.' },
        { label: 'M1–M3 — Basal cortex', risk: 'Cortical', riskCol: 'cr-grey', desc: 'M1: anterior frontal; M2: lateral to insula; M3: posterior temporal. Assessed at basal ganglia level.' },
        { label: 'M4–M6 — Suprabasal cortex', risk: 'Cortical', riskCol: 'cr-grey', desc: 'M4: above M1; M5: above M2; M6: above M3. Assessed at level above basal ganglia.' },
      ]},
      { title: 'Score Thresholds', items: [
        { label: 'ASPECTS 8–10', risk: 'Excellent', riskCol: 'cr-green', desc: 'Minimal ischaemic change. Strong evidence for reperfusion therapy benefit. Best functional outcomes.' },
        { label: 'ASPECTS 6–7', risk: 'Acceptable', riskCol: 'cr-yellow', desc: 'Conventional threshold for IV thrombolysis and mechanical thrombectomy. Moderate functional outcomes expected.' },
        { label: 'ASPECTS 4–5', risk: 'Marginal', riskCol: 'cr-orange', desc: 'Below standard threshold. Thrombectomy may be considered with CT perfusion mismatch guidance (DAWN/DEFUSE-3). Case-by-case.' },
        { label: 'ASPECTS 0–3', risk: 'Poor prognosis', riskCol: 'cr-red', desc: 'Near-complete MCA infarction. Reperfusion therapy risk (haemorrhagic transformation) likely outweighs benefit. Palliative/comfort care discussion.' },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  ich_score: {
    name: 'ICH Score — Intracerebral Haemorrhage Severity',
    source: 'Hemphill et al. 2001 / AHA/ASA 2022',
    desc: '30-day mortality prediction for spontaneous intracerebral haemorrhage',
    fields: [
      selectField('gcs', 'GCS Score at Presentation', [
        { value: '0', label: 'GCS 13–15 — 0 points' },
        { value: '1', label: 'GCS 5–12 — 1 point' },
        { value: '2', label: 'GCS 3–4 — 2 points' },
      ]),
      numField('volume', 'ICH Volume', 'mL', 'e.g. 25', 'Use ABC/2 method: A \xd7 B \xd7 C \xf7 2 (cm dimensions from CT)'),
      radioField('ivh', 'Intraventricular Haemorrhage (IVH)?', [
        { value: 'no',  label: 'No IVH' },
        { value: 'yes', label: 'Yes — blood in ventricles (1 point)' },
      ]),
      radioField('location', 'ICH Location', [
        { value: 'supratentorial', label: 'Supratentorial (cortex, basal ganglia, thalamus) — 0 points' },
        { value: 'infratentorial', label: 'Infratentorial (brainstem or cerebellum) — 1 point' },
      ]),
      radioField('age', 'Patient Age', [
        { value: 'under80', label: 'Age <80 years — 0 points' },
        { value: 'over80',  label: 'Age \u226580 years — 1 point' },
      ]),
    ],
    compute(f) {
      const gcsPoints  = parseInt(f.gcs) || 0;
      const volRaw     = parseFloat(f.volume);
      const vol        = isNaN(volRaw) ? null : volRaw;
      const volPoints  = vol !== null ? (vol >= 30 ? 1 : 0) : 0;
      const ivhPoints  = f.ivh === 'yes' ? 1 : 0;
      const locPoints  = f.location === 'infratentorial' ? 1 : 0;
      const agePoints  = f.age === 'over80' ? 1 : 0;
      const total      = gcsPoints + volPoints + ivhPoints + locPoints + agePoints;

      const mortality = { 0: 0, 1: 13, 2: 26, 3: 72, 4: 97, 5: 100, 6: 100 };
      const mort = mortality[Math.min(total, 6)];

      const notes = [
        'ICH volume (ABC/2): A = max diameter (cm), B = perpendicular diameter (cm), C = slices with haemorrhage \xd7 slice thickness (cm). Divide by 2.',
        'ICH score does not determine futility — it should not be used in isolation to withdraw care.',
        'Early do-not-resuscitate orders have been shown to worsen outcomes (self-fulfilling prophecy).',
        'Aggressive care in the first 24 hours improves outcomes even in high-score patients.',
        'Haematoma expansion (>33% growth or >6 mL absolute growth) occurs in ~30% within 24h.',
        'Blood pressure management: target SBP <140 mmHg (AHA/ASA 2022) if presenting SBP 150–220 mmHg.',
      ];

      let col;
      if (mort === 0)       col = 'green';
      else if (mort <= 26)  col = 'yellow';
      else if (mort <= 72)  col = 'orange';
      else                  col = 'red';

      const breakdown = 'GCS (' + gcsPoints + ') + Volume ' + (vol !== null ? vol + ' mL' : '?') + ' (' + volPoints + ') + IVH (' + ivhPoints + ') + Location (' + locPoints + ') + Age (' + agePoints + ')';

      const extra = '<div class="sub-result"><div class="sub-result-title">Score</div>' +
        '<span style="font-size:1.4rem;font-weight:700">' + total + '</span><span style="font-size:.9rem"> / 6</span>' +
        ' &nbsp;|&nbsp; Predicted 30-day mortality: <strong>' + mort + '%</strong>' +
        '<div style="font-size:.75rem;color:#5c7a96;margin-top:4px">' + breakdown + '</div></div>';

      return result(col, 'ICH Score ' + total + '/6 — predicted 30-day mortality: ' + mort + '%. ' +
        (mort <= 13 ? 'Low mortality. Full resuscitative care. Neurosurgery/neurology referral. Blood pressure management, reversal of anticoagulation.' :
         mort <= 26 ? 'Intermediate mortality. Full resuscitative care with neurosurgical evaluation. Surgical evacuation rarely indicated for spontaneous ICH but consider if cerebellar haemorrhage \u226530 mL or brainstem compression.' :
         mort <= 72 ? 'High mortality. Goals-of-care discussion with family essential. Neurology/neurosurgical evaluation. Individualised care plan.' :
         'Very high mortality. Early, thorough goals-of-care discussion. Aggressive early care for 24–48 hours before reassessment is recommended (avoid premature DNAR).'),
        notes, extra);
    },
    criteria: [
      { title: 'ICH Score Components', items: [
        { label: 'GCS 13–15: 0pt | 5–12: 1pt | 3–4: 2pts', risk: 'GCS', riskCol: 'cr-grey', desc: 'Glasgow Coma Scale at presentation. GCS is the highest-weighted predictor of 30-day mortality in spontaneous ICH.' },
        { label: 'Volume \u226530 mL: 1pt | <30 mL: 0pt', risk: 'Volume', riskCol: 'cr-grey', desc: 'ICH volume calculated using ABC/2 method from CT. Volume \u226530 mL is associated with higher mortality and haematoma expansion risk.' },
        { label: 'IVH: 1pt | No IVH: 0pt', risk: 'IVH', riskCol: 'cr-grey', desc: 'Intraventricular haemorrhage worsens prognosis by causing obstructive hydrocephalus and brainstem compression.' },
        { label: 'Infratentorial: 1pt | Supratentorial: 0pt', risk: 'Location', riskCol: 'cr-grey', desc: 'Infratentorial (brainstem, cerebellum) haemorrhages are associated with higher mortality due to proximity to vital structures.' },
        { label: 'Age \u226580: 1pt | <80: 0pt', risk: 'Age', riskCol: 'cr-grey', desc: 'Older age independently predicts higher mortality after ICH.' },
      ]},
      { title: '30-day Mortality by Score', items: [
        { label: 'Score 0 — 0%', risk: 'Very Low', riskCol: 'cr-green', desc: 'No deaths in original validation cohort. Full resuscitative care recommended.' },
        { label: 'Score 1 — 13%', risk: 'Low', riskCol: 'cr-green', desc: '13% 30-day mortality. Aggressive management appropriate.' },
        { label: 'Score 2 — 26%', risk: 'Moderate', riskCol: 'cr-yellow', desc: 'Goals-of-care discussion advised while continuing full care.' },
        { label: 'Score 3 — 72%', risk: 'High', riskCol: 'cr-orange', desc: 'High mortality. Early goals-of-care discussion. Avoid premature DNAR.' },
        { label: 'Score 4–6 — 97–100%', risk: 'Very High', riskCol: 'cr-red', desc: 'Near-universal mortality in validation cohort. ICH score should not be used in isolation for withdrawal decisions. Aggressive care for 24–48h before reassessment.' },
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

