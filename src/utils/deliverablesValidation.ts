import { DeliverablePoint, DeliverableGroupSummary } from '../data/learningGuidesDeliverables';

export interface GuideFailingSummary {
  guiaNumero: string;
  guiaNombre: string;
  grupo: 'Planeación Estratégica' | 'Talento Humano' | 'Mercadeo' | 'Inventarios' | 'Contabilidad';
  totalPuntos: number;
  puntosFaltantes: number;
  detallesFaltantes: {
    numeral: number | string;
    descripcion: string;
  }[];
}

export interface ValidationReport {
  isAllCompliant: boolean;
  totalItems: number;
  compliantItems: number;
  percentage: number;
  groups: DeliverableGroupSummary[];
  failingGuides: GuideFailingSummary[];
}

export function validateAllDeliverables(deliverables: DeliverablePoint[]): ValidationReport {
  const groupsList: ('Planeación Estratégica' | 'Talento Humano' | 'Mercadeo' | 'Inventarios' | 'Contabilidad')[] = [
    'Planeación Estratégica',
    'Talento Humano',
    'Mercadeo',
    'Inventarios',
    'Contabilidad',
  ];

  const groupGuidesMap: Record<string, string> = {
    'Planeación Estratégica': 'Guías 1 y 2 (Fundamentos & Planeación Estratégica)',
    'Talento Humano': 'Guías 4, 5 y 6 (Macroprocesos TH, Clima y Cultura, SG-SST)',
    'Mercadeo': 'Guías 7, 8, 9 y 10 (Mercados, Investigación, Marketing Mix, Servicio al Cliente)',
    'Inventarios': 'Guía 11 (Inventarios, Compras y Producción)',
    'Contabilidad': 'Guías 12 a 15 (Componente Contable & Financiero)',
  };

  const groups: DeliverableGroupSummary[] = groupsList.map((grp) => {
    const pointsInGrp = deliverables.filter((d) => d.grupo === grp);
    const puntosCumplidos = pointsInGrp.filter((d) => d.cumple).length;
    const puntosPendientes = pointsInGrp.filter((d) => !d.cumple);

    return {
      grupo: grp,
      guiasTexto: groupGuidesMap[grp] || '',
      totalPuntos: pointsInGrp.length,
      puntosCumplidos,
      cumpleTotal: puntosPendientes.length === 0,
      puntosPendientes,
    };
  });

  // Calculate failing guides specifically
  const failingGuidesMap = new Map<string, GuideFailingSummary>();

  for (const item of deliverables) {
    const key = `Guía ${item.guiaNumero} - ${item.guiaNombre}`;
    if (!failingGuidesMap.has(key)) {
      failingGuidesMap.set(key, {
        guiaNumero: item.guiaNumero,
        guiaNombre: item.guiaNombre,
        grupo: item.grupo,
        totalPuntos: 0,
        puntosFaltantes: 0,
        detallesFaltantes: [],
      });
    }

    const gInfo = failingGuidesMap.get(key)!;
    gInfo.totalPuntos += 1;
    if (!item.cumple) {
      gInfo.puntosFaltantes += 1;
      gInfo.detallesFaltantes.push({
        numeral: item.numeral,
        descripcion: item.descripcion,
      });
    }
  }

  const failingGuides = Array.from(failingGuidesMap.values()).filter((g) => g.puntosFaltantes > 0);

  const totalItems = deliverables.length;
  const compliantItems = deliverables.filter((d) => d.cumple).length;
  const percentage = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 0;
  const isAllCompliant = failingGuides.length === 0 && compliantItems === totalItems;

  return {
    isAllCompliant,
    totalItems,
    compliantItems,
    percentage,
    groups,
    failingGuides,
  };
}
