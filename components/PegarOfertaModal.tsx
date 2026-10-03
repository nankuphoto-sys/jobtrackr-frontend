'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Tag,
  InlineNotification,
  InlineLoading,
} from '@carbon/react';
import { api, ApiError } from '@/lib/api';
import {
  EstadoExtractor,
  JobApplication,
  MODALITY_LABELS,
  Modality,
  OfertaExtraida,
  RespuestaExtractor,
  SALARY_PERIOD_LABELS,
  SalaryPeriod,
  SENIORITY_LABELS,
  Seniority,
} from '@/lib/types';

const MAX_TEXTO = 15000;

/** Nombres legibles de los campos que el backend puede descartar por no estar en el texto. */
const NOMBRE_CAMPO: Record<string, string> = {
  company: 'empresa',
  applyUrl: 'link',
  'salary.min': 'salario mínimo',
  'salary.max': 'salario máximo',
};

type Formulario = {
  company: string;
  role: string;
  location: string;
  modality: Modality | '';
  seniority: Seniority | '';
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: SalaryPeriod | '';
  stack: string;
  deadline: string;
  link: string;
  summary: string;
  notes: string;
};

const VACIO: Formulario = {
  company: '', role: '', location: '', modality: '', seniority: '', salaryMin: '', salaryMax: '',
  salaryCurrency: '', salaryPeriod: '', stack: '', deadline: '', link: '', summary: '', notes: '',
};

/** Convierte lo extraído en el formulario editable. "unknown" → vacío. */
function desdeOferta(o: OfertaExtraida): Formulario {
  const notas = [
    o.requirements.length ? `Requisitos:\n${o.requirements.map((r) => `- ${r}`).join('\n')}` : '',
    o.language ? `Idioma: ${o.language}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  return {
    company: o.company ?? '',
    role: o.role,
    location: o.location ?? '',
    modality: o.modality === 'unknown' ? '' : o.modality,
    seniority: o.seniority === 'unknown' ? '' : o.seniority,
    salaryMin: o.salary.min?.toString() ?? '',
    salaryMax: o.salary.max?.toString() ?? '',
    salaryCurrency: o.salary.currency ?? '',
    salaryPeriod: o.salary.period ?? '',
    stack: o.stack.join(', '),
    deadline: o.deadline ?? '',
    link: o.applyUrl ?? '',
    summary: o.summary,
    notes: notas,
  };
}

const aEntero = (s: string) => (s.trim() === '' ? null : Math.round(Number(s.replace(/[^\d.]/g, ''))));
const listaStack = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

function urlValida(v: string) {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

type Props = {
  onClose: () => void;
  onCreated: (app: JobApplication) => void;
};

/**
 * "Pegar oferta": el texto va al modelo local (POST /ai/extract-job), que
 * devuelve los datos sin guardar nada. El usuario revisa y edita, y recién
 * "Crear tarjeta" usa el POST /applications de siempre (columna "Por aplicar").
 * Si el extractor no está disponible (producción, Ollama cerrado), se llena a mano.
 */
export function PegarOfertaModal({ onClose, onCreated }: Props) {
  const [paso, setPaso] = useState<'pegar' | 'revisar'>('pegar');
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<EstadoExtractor | null>(null);
  const [extrayendo, setExtrayendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [descartados, setDescartados] = useState<string[]>([]);
  const [form, setForm] = useState<Formulario>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    api
      .get<EstadoExtractor>('/ai/status')
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado({ habilitado: false, disponible: false, modelo: '' }));
    return () => {
      vivo = false;
    };
  }, []);

  const extractorListo = estado?.habilitado && estado.disponible;
  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function extraer() {
    setAviso(null);
    setExtrayendo(true);
    try {
      const r = await api.post<RespuestaExtractor>('/ai/extract-job', { text: texto });
      setForm(desdeOferta(r.oferta));
      setDescartados(r.descartados);
      setPaso('revisar');
    } catch (err) {
      // 503 (Ollama apagado) o 422 (respuesta inválida): se avisa y se puede seguir a mano.
      setAviso(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setExtrayendo(false);
    }
  }

  function llenarAMano() {
    // El texto pegado no se pierde: queda en las notas para copiar de ahí.
    setForm({ ...VACIO, notes: texto.trim() ? `Oferta original:\n${texto.trim()}` : '' });
    setDescartados([]);
    setPaso('revisar');
  }

  async function crear() {
    setError(null);
    if (!form.company.trim() || !form.role.trim()) {
      setError('Empresa y cargo son obligatorios.');
      return;
    }
    if (form.link && !urlValida(form.link)) {
      setError('El link de la vacante no es una URL válida.');
      return;
    }
    setGuardando(true);
    try {
      const creada = await api.post<JobApplication>('/applications', {
        company: form.company.trim(),
        role: form.role.trim(),
        status: 'POR_APLICAR',
        link: form.link.trim() || null,
        notes: form.notes.trim() || null,
        location: form.location.trim() || null,
        modality: form.modality || null,
        seniority: form.seniority || null,
        salaryMin: aEntero(form.salaryMin),
        salaryMax: aEntero(form.salaryMax),
        salaryCurrency: form.salaryCurrency.trim().toUpperCase() || null,
        salaryPeriod: form.salaryPeriod || null,
        stack: listaStack(form.stack),
        deadline: form.deadline || null,
        summary: form.summary.trim() || null,
      });
      onCreated(creada);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
      setGuardando(false);
    }
  }

  return (
    <ComposedModal open size="md" onClose={onClose} preventCloseOnClickOutside>
      <ModalHeader title={paso === 'pegar' ? 'Pegar oferta' : 'Revisa antes de crear la tarjeta'} />
      <ModalBody hasForm>
        {paso === 'pegar' ? (
          <div className="flex flex-col gap-4">
            {estado && !extractorListo && (
              <InlineNotification
                kind="info"
                lowContrast
                hideCloseButton
                title="El extractor de IA local no está disponible."
                subtitle={
                  estado.habilitado
                    ? 'Abre Ollama en tu computadora y vuelve a intentar, o llena la tarjeta a mano.'
                    : 'Solo funciona con el backend corriendo en tu computadora. Puedes llenar la tarjeta a mano.'
                }
              />
            )}
            <TextArea
              id="texto-oferta"
              labelText="Texto de la oferta"
              helperText="Copia y pega la oferta completa. Se procesa en tu computadora, no se envía a la nube."
              rows={10}
              maxCount={MAX_TEXTO}
              enableCounter
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            {extrayendo && <InlineLoading description="Extrayendo con el modelo local…" />}
            {aviso && <InlineNotification kind="warning" lowContrast hideCloseButton title={aviso} subtitle="Puedes llenar la tarjeta a mano." />}
            <Button kind="ghost" size="sm" className="self-start" onClick={llenarAMano}>
              Llenar a mano
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {descartados.length > 0 && (
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title={`Se dejaron vacíos porque no aparecen en el texto: ${descartados.map((d) => NOMBRE_CAMPO[d] ?? d).join(', ')}.`}
                subtitle="El modelo los devolvió, pero no están en la oferta: complétalos solo si los conoces."
              />
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput id="po-company" labelText="Empresa" value={form.company} onChange={(e) => set('company', e.target.value)} />
              <TextInput id="po-role" labelText="Cargo" value={form.role} onChange={(e) => set('role', e.target.value)} />
              <TextInput id="po-location" labelText="Ubicación" value={form.location} onChange={(e) => set('location', e.target.value)} />
              <Select id="po-modality" labelText="Modalidad" value={form.modality} onChange={(e) => set('modality', e.target.value as Formulario['modality'])}>
                <SelectItem value="" text="Sin dato" />
                {Object.entries(MODALITY_LABELS).map(([v, t]) => <SelectItem key={v} value={v} text={t} />)}
              </Select>
              <Select id="po-seniority" labelText="Seniority" value={form.seniority} onChange={(e) => set('seniority', e.target.value as Formulario['seniority'])}>
                <SelectItem value="" text="Sin dato" />
                {Object.entries(SENIORITY_LABELS).map(([v, t]) => <SelectItem key={v} value={v} text={t} />)}
              </Select>
              <TextInput id="po-deadline" type="date" labelText="Fecha límite para postular" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="cds--label">Salario</legend>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <TextInput id="po-salmin" labelText="Mínimo" inputMode="numeric" value={form.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} />
                <TextInput id="po-salmax" labelText="Máximo" inputMode="numeric" value={form.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} />
                <TextInput id="po-currency" labelText="Moneda" placeholder="COP, USD…" value={form.salaryCurrency} onChange={(e) => set('salaryCurrency', e.target.value)} />
                <Select id="po-period" labelText="Periodo" value={form.salaryPeriod} onChange={(e) => set('salaryPeriod', e.target.value as Formulario['salaryPeriod'])}>
                  <SelectItem value="" text="Sin dato" />
                  {Object.entries(SALARY_PERIOD_LABELS).map(([v, t]) => <SelectItem key={v} value={v} text={t} />)}
                </Select>
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <TextInput id="po-stack" labelText="Stack (separado por comas)" value={form.stack} onChange={(e) => set('stack', e.target.value)} />
              {listaStack(form.stack).length > 0 && (
                <div className="flex flex-wrap gap-1" aria-label="Stack">
                  {listaStack(form.stack).map((t) => (
                    <Tag key={t} type="cool-gray" size="sm">{t}</Tag>
                  ))}
                </div>
              )}
            </div>

            <TextInput id="po-link" labelText="Link de la vacante" value={form.link} onChange={(e) => set('link', e.target.value)} />
            <TextArea id="po-summary" labelText="Resumen" rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
            <TextArea id="po-notes" labelText="Notas" rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} />

            {error && <InlineNotification kind="error" title={error} lowContrast hideCloseButton />}
            <Button kind="ghost" size="sm" className="self-start" onClick={() => setPaso('pegar')} disabled={guardando}>
              Volver a la oferta
            </Button>
          </div>
        )}
      </ModalBody>
      {/* Dos botones, el patrón de Carbon (mitad y mitad): con un tercero el pie
          no entra a 375px. La acción alternativa va al final del cuerpo. */}
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancelar
        </Button>
        {paso === 'pegar' ? (
          <Button kind="primary" onClick={extraer} disabled={!extractorListo || extrayendo || !texto.trim() || texto.length > MAX_TEXTO}>
            {extrayendo ? 'Extrayendo…' : estado === null ? 'Comprobando IA local…' : 'Extraer con IA local'}
          </Button>
        ) : (
          <Button kind="primary" onClick={crear} disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear tarjeta'}
          </Button>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}
