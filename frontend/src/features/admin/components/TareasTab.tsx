import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import { getApiBaseUrl } from '@/shared/lib/api';

const apiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
};

type Tarea = {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora?: string;
  categoria: 'servicio-vehiculo' | 'operacion' | 'admin' | 'otro';
  status: 'pendiente' | 'completada' | 'cancelada';
  creadoEn: string;
};

const categoryLabels: Record<Tarea['categoria'], string> = {
  'servicio-vehiculo': 'Servicio / Vehiculo',
  operacion: 'Operacion',
  admin: 'Admin',
  otro: 'Otro',
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function TareasTab() {
  const { getAuthHeaders } = useAdminAuth();
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fecha: todayKey(),
    hora: '',
    categoria: 'operacion' as Tarea['categoria'],
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/tasks'), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      setTasks(res.ok ? json.items : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial al montar; fetchTasks es estable.
  }, []);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => `${a.fecha} ${a.hora || '99:99'}`.localeCompare(`${b.fecha} ${b.hora || '99:99'}`)),
    [tasks],
  );

  const pendingToday = tasks.filter((task) => task.status === 'pendiente' && task.fecha <= todayKey()).length;
  const completed = tasks.filter((task) => task.status === 'completada').length;

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.titulo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/tasks'), {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim() || undefined,
          fecha: form.fecha,
          hora: form.hora || undefined,
          categoria: form.categoria,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        setForm({ titulo: '', descripcion: '', fecha: todayKey(), hora: '', categoria: 'operacion' });
      }
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: Tarea['status']) => {
    const res = await fetch(apiUrl(`/api/v1/admin/tasks/${id}`), {
      method: 'PATCH',
      credentials: 'include',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
    }
  };

  const deleteTask = async (id: string) => {
    const res = await fetch(apiUrl(`/api/v1/admin/tasks/${id}`), {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      setTasks((prev) => prev.filter((task) => task.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold mb-1">Operacion</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Tareas Pendientes</h1>
        <p className="text-sm text-white/55 mt-1">Control ligero para pendientes del dia, vehiculos, admin y seguimiento operativo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Pendientes hoy" value={pendingToday} />
        <SummaryCard label="Total activas" value={tasks.filter((task) => task.status === 'pendiente').length} />
        <SummaryCard label="Completadas" value={completed} />
      </div>

      <form onSubmit={createTask} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <PlusCircle size={16} className="text-gold" />
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Nueva tarea</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_160px_120px] gap-3">
          <input
            value={form.titulo}
            onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
            placeholder="Titulo"
            className="border-2 border-white/10 rounded-xl px-4 py-3 bg-white/[0.05] text-sm focus:border-gold/60 focus:ring-2 focus:ring-gold/20 outline-none"
          />
          <input
            value={form.descripcion}
            onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
            placeholder="Descripcion opcional"
            className="border-2 border-white/10 rounded-xl px-4 py-3 bg-white/[0.05] text-sm focus:border-gold/60 focus:ring-2 focus:ring-gold/20 outline-none"
          />
          <input
            type="date"
            value={form.fecha}
            onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
            className="border-2 border-white/10 rounded-xl px-4 py-3 bg-white/[0.05] text-sm focus:border-gold/60 focus:ring-2 focus:ring-gold/20 outline-none"
          />
          <input
            type="time"
            value={form.hora}
            onChange={(event) => setForm((prev) => ({ ...prev, hora: event.target.value }))}
            className="border-2 border-white/10 rounded-xl px-4 py-3 bg-white/[0.05] text-sm focus:border-gold/60 focus:ring-2 focus:ring-gold/20 outline-none"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={form.categoria}
            onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value as Tarea['categoria'] }))}
            className="border-2 border-white/10 rounded-xl px-4 py-3 bg-white/[0.05] text-sm focus:border-gold/60 focus:ring-2 focus:ring-gold/20 outline-none"
          >
            <option value="operacion">Operacion</option>
            <option value="servicio-vehiculo">Servicio / Vehiculo</option>
            <option value="admin">Admin</option>
            <option value="otro">Otro</option>
          </select>
          <button
            type="submit"
            disabled={saving || !form.titulo.trim()}
            className="rounded-xl px-8 py-3.5 font-bold text-navy shadow-lg disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c9a227, #f0c040, #c9a227)' }}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : 'Agregar tarea'}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_140px_150px] gap-3 px-5 py-3 border-b border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase tracking-[0.1em] text-white/55 max-lg:hidden">
          <span>Tarea</span>
          <span>Fecha</span>
          <span>Categoria</span>
          <span>Accion</span>
        </div>
        <div className="divide-y divide-white/[0.08]">
          {loading && <p className="p-8 text-center text-sm text-white/55">Cargando tareas…</p>}
          {!loading && sortedTasks.map((task) => (
            <div key={task.id} className="grid grid-cols-1 lg:grid-cols-[1fr_140px_140px_150px] gap-3 px-5 py-4 items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${task.status === 'completada' ? 'bg-emerald-500' : task.status === 'cancelada' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <p className="font-semibold text-sm text-white">{task.titulo}</p>
                </div>
                {task.descripcion && <p className="text-xs text-white/55 mt-1">{task.descripcion}</p>}
              </div>
              <p className="text-sm text-white/55">{task.fecha}{task.hora ? ` · ${task.hora}` : ''}</p>
              <span className="w-fit rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase text-white/55">{categoryLabels[task.categoria]}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateStatus(task.id, 'completada')} className="rounded-full bg-emerald-500/15 text-emerald-300 p-2" title="Completar">
                  <CheckCircle2 size={14} />
                </button>
                <button onClick={() => updateStatus(task.id, 'cancelada')} className="rounded-full bg-red-500/15 text-red-300 p-2" title="Cancelar">
                  <Clock3 size={14} />
                </button>
                <button onClick={() => deleteTask(task.id)} className="rounded-full bg-white/10 text-white/60 p-2" title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {!loading && sortedTasks.length === 0 && <p className="p-8 text-center text-sm text-white/55">No hay tareas registradas.</p>}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
