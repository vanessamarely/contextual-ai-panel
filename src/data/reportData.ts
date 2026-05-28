/**
 * reportData.ts — Static report content and flag badge configuration.
 * Separated from components so tests and stories can import it independently.
 */
import type { Entry, FlagConfig, FlagKey, ReportSection, TabConfig, PanelTab } from '../types'

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: 'labs',
    label: 'Resultados de Laboratorio',
    entries: [
      {
        id: 'tsh',
        term: 'TSH',
        value: '4.5 mIU/L',
        ref: '0.5 – 4.0 mIU/L',
        flag: 'high',
        raw: 'TSH 4.5 mIU/L (ref 0.5–4.0 mIU/L). Indica función tiroidea potencialmente disminuida. Requiere correlación clínica y posible seguimiento con T4 libre.',
      },
      {
        id: 'hba1c',
        term: 'HbA1c',
        value: '6.8 %',
        ref: '< 5.7 %',
        flag: 'high',
        raw: 'HbA1c 6.8% (ref <5.7%). Valores entre 5.7–6.4% indican prediabetes; ≥6.5% es criterio diagnóstico de diabetes tipo 2. Se recomienda evaluación por endocrinología.',
      },
      {
        id: 'ldl',
        term: 'LDL Colesterol',
        value: '142 mg/dL',
        ref: '< 100 mg/dL',
        flag: 'high',
        raw: 'LDL 142 mg/dL (ref <100 mg/dL). Colesterol LDL elevado. Aumenta riesgo cardiovascular. Considerar cambios de estilo de vida y posible terapia farmacológica.',
      },
      {
        id: 'creatinine',
        term: 'Creatinina',
        value: '0.9 mg/dL',
        ref: '0.6 – 1.2 mg/dL',
        flag: 'normal',
        raw: 'Creatinina 0.9 mg/dL (ref 0.6–1.2 mg/dL). Dentro del rango normal. Indica función renal adecuada para la filtración de desechos metabólicos.',
      },
    ] satisfies Entry[],
  },
  {
    id: 'meds',
    label: 'Prescripciones',
    entries: [
      {
        id: 'metformin',
        term: 'Metformina 850 mg',
        value: '2×/día',
        ref: 'Con alimentos',
        flag: 'info',
        raw: 'Metformina 850mg c/12h con alimentos. Biguanida de primera línea para diabetes tipo 2. Reduce gluconeogénesis hepática. Contraindicada en insuficiencia renal severa (TFG<30).',
      },
      {
        id: 'levothyroxine',
        term: 'Levotiroxina 50 mcg',
        value: '1×/día',
        ref: 'Ayunas, 30 min antes de comer',
        flag: 'info',
        raw: 'Levotiroxina 50mcg cada mañana en ayunas. Hormona tiroidea sintética para hipotiroidismo. Evitar con calcio, hierro o antiácidos dentro de 4h. Verificar TSH en 6–8 semanas.',
      },
    ] satisfies Entry[],
  },
  {
    id: 'imaging',
    label: 'Imagen Diagnóstica',
    entries: [
      {
        id: 'echo',
        term: 'Ecocardiograma',
        value: 'FE 58%',
        ref: 'Normal ≥ 55%',
        flag: 'normal',
        raw: 'Fracción de Eyección (FE) 58%. Función sistólica del ventrículo izquierdo conservada. No se evidencian alteraciones valvulares significativas. Seguimiento rutinario anual recomendado.',
      },
      {
        id: 'thyroid-us',
        term: 'Ecografía Tiroidea',
        value: 'Nódulo 6 mm',
        ref: 'TIRADS 2',
        flag: 'warning',
        raw: 'Nódulo tiroideo derecho de 6mm, TIRADS 2 (benigno). Características benignas. Sin vascularización anormal. Seguimiento ecográfico en 12 meses según guías ACR.',
      },
    ] satisfies Entry[],
  },
]

export const FLAG_CONFIG: Record<FlagKey, FlagConfig> = {
  high:    { label: '↑ Alto',     cls: 'flag-high'    },
  low:     { label: '↓ Bajo',     cls: 'flag-low'     },
  normal:  { label: '✓ Normal',   cls: 'flag-normal'  },
  warning: { label: '⚠ Atención', cls: 'flag-warning' },
  info:    { label: 'ℹ Info',     cls: 'flag-info'    },
}

export const TAB_CONFIG: TabConfig[] = [
  { id: 'summary' as PanelTab, icon: '✦', label: 'Resumen'        },
  { id: 'faq'     as PanelTab, icon: '❓', label: 'Preguntas'      },
  { id: 'actions' as PanelTab, icon: '✓', label: 'Plan de Acción'  },
]
