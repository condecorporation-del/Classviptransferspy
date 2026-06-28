import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CarFront, CheckCircle2, Loader2, Mail, Phone, Plus, Truck, Users, X } from 'lucide-react';

import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import { getApiBaseUrl } from '@/shared/lib/api';

const GOLD = '#D9AE5F';

const apiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
};

type ApiErrorPayload = {
  detail?: string;
};

// Forma real que devuelve el backend FastAPI (snake_case, sin envelope).
type DriverApiRecord = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at: string;
};

type VehicleApiRecord = {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
};

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  createdAt: string;
};

type Vehicle = {
  id: string;
  make: string;
  model: string;
  plate: string;
  capacity: number;
  active: boolean;
  createdAt: string;
};

const normalizeApiError = (fallback: string, payload?: ApiErrorPayload) => {
  return payload?.detail || fallback;
};

const mapDriver = (driver: DriverApiRecord): Driver => ({
  id: driver.id,
  name: driver.name,
  phone: driver.phone ?? null,
  email: driver.email ?? null,
  active: driver.is_active,
  createdAt: driver.created_at,
});

const mapVehicle = (vehicle: VehicleApiRecord): Vehicle => ({
  id: vehicle.id,
  make: vehicle.make,
  model: vehicle.model,
  plate: vehicle.license_plate,
  capacity: vehicle.capacity,
  active: vehicle.is_active,
  createdAt: vehicle.created_at,
});

function ActiveDot({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-500'}`}
        style={active ? { boxShadow: '0 0 6px rgba(52,211,153,0.7)' } : undefined}
      />
      <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
        {active ? 'Activo' : 'Inactivo'}
      </span>
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ').filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] || 'NA').slice(0, 2);

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm"
      style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.06))',
        border: '1px solid rgba(212,175,55,0.25)',
        color: GOLD,
        letterSpacing: '0.05em',
      }}
    >
      {letters.toUpperCase()}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onFocus={(event) => {
          event.currentTarget.style.border = '1px solid rgba(212,175,55,0.4)';
          event.currentTarget.style.background = 'rgba(212,175,55,0.04)';
        }}
        onBlur={(event) => {
          event.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
          event.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }}
      />
    </div>
  );
}

function Toast({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void }) {
  const isSuccess = type === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
      style={{
        background: isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
        color: isSuccess ? '#34d399' : '#f87171',
      }}
    >
      <div className="flex items-center gap-2">
        {isSuccess ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
        {message}
      </div>
      <button onClick={onDismiss} className="shrink-0 transition-opacity hover:opacity-70">
        <X size={13} />
      </button>
    </motion.div>
  );
}

function ColumnShell({
  icon,
  iconTint,
  countTint,
  title,
  count,
  activeCount,
  children,
  onToggleForm,
}: {
  icon: React.ReactNode;
  iconTint: string;
  countTint: string;
  title: string;
  count: number;
  activeCount: number;
  children: React.ReactNode;
  onToggleForm: () => void;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(180deg, #060f1e 0%, #080f20 100%)',
        border: '1px solid rgba(212,175,55,0.15)',
        boxShadow: '0 16px 50px rgba(0,0,0,0.22)',
      }}
    >
      <div className="flex items-center justify-between px-5 pb-4 pt-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${iconTint}14`, border: `1px solid ${iconTint}33` }}
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: `${countTint}1A`, color: countTint }}>
                {count}
              </span>
            </div>
            <p className="mt-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {activeCount} activo{activeCount !== 1 ? 's' : ''} de {count}
            </p>
          </div>
        </div>
        <button
          onClick={onToggleForm}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black text-navy transition-all hover:scale-105 hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #c9a227, #f0c040)', boxShadow: '0 4px 12px rgba(212,175,55,0.3)' }}
        >
          <Plus size={13} /> Agregar
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">{children}</div>
    </div>
  );
}

function DriversColumn({ getAuthHeaders }: { getAuthHeaders: () => Record<string, string> }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(apiUrl('/api/v1/admin/drivers'), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const json = await response.json();

      if (response.ok) {
        setDrivers((json.items as DriverApiRecord[]).map(mapDriver));
      } else {
        setLoadError(normalizeApiError('No se pudo cargar la lista de conductores.', json));
      }
    } catch {
      setLoadError('No se pudo cargar la lista de conductores.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void fetchDrivers();
  }, [fetchDrivers]);

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim()) return;

    setSaving(true);
    setResult(null);

    try {
      const response = await fetch(apiUrl('/api/v1/admin/drivers'), {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
        }),
      });
      const json = await response.json();

      if (response.ok) {
        setResult({ message: 'Conductor agregado correctamente.', type: 'success' });
        resetForm();
        await fetchDrivers();
      } else {
        setResult({ message: normalizeApiError('No se pudo agregar el conductor.', json), type: 'error' });
      }
    } catch {
      setResult({ message: 'Error de conexión.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const activeCount = useMemo(() => drivers.filter((driver) => driver.active).length, [drivers]);

  return (
    <ColumnShell
      icon={<Users size={17} style={{ color: GOLD }} />}
      iconTint="rgba(212,175,55,0.5)"
      countTint={GOLD}
      title="Conductores"
      count={drivers.length}
      activeCount={activeCount}
      onToggleForm={() => setShowForm((value) => !value)}
    >
      <AnimatePresence>{result && <Toast message={result.message} type={result.type} onDismiss={() => setResult(null)} />}</AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(212,175,55,0.5)' }}>
                Nuevo Conductor
              </p>
              <FieldInput label="Nombre" value={formName} onChange={setFormName} placeholder="Nombre completo" required />
              <FieldInput label="Teléfono" type="tel" value={formPhone} onChange={setFormPhone} placeholder="+52 624 000 0000" required />
              <FieldInput label="Email" type="email" value={formEmail} onChange={setFormEmail} placeholder="conductor@ejemplo.com" />
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => void handleSave()}
                  disabled={saving || !formName.trim() || !formPhone.trim()}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-black text-navy transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #c9a227, #f0c040)' }}
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  Guardar
                </button>
                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 size={20} className="animate-spin text-gold" />
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {loadError}
        </div>
      ) : drivers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Users size={22} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No hay conductores registrados
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {drivers.map((driver, index) => (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className="flex items-center gap-3 rounded-xl p-3 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Initials name={driver.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-white">{driver.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-3">
                  {driver.phone && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <Phone size={9} /> {driver.phone}
                    </span>
                  )}
                  {driver.email && (
                    <span className="flex items-center gap-1 truncate text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <Mail size={9} /> {driver.email}
                    </span>
                  )}
                </div>
              </div>
              <ActiveDot active={driver.active} />
            </motion.div>
          ))}
        </div>
      )}
    </ColumnShell>
  );
}

function VehiclesColumn({ getAuthHeaders }: { getAuthHeaders: () => Record<string, string> }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formMake, setFormMake] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formCapacity, setFormCapacity] = useState('14');

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(apiUrl('/api/v1/admin/vehicles'), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const json = await response.json();

      if (response.ok) {
        setVehicles((json.items as VehicleApiRecord[]).map(mapVehicle));
      } else {
        setLoadError(normalizeApiError('No se pudo cargar la lista de vehículos.', json));
      }
    } catch {
      setLoadError('No se pudo cargar la lista de vehículos.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  const resetForm = () => {
    setFormMake('');
    setFormModel('');
    setFormPlate('');
    setFormCapacity('14');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formMake.trim() || !formModel.trim() || !formPlate.trim()) return;

    setSaving(true);
    setResult(null);

    try {
      const response = await fetch(apiUrl('/api/v1/admin/vehicles'), {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: formMake.trim(),
          model: formModel.trim(),
          license_plate: formPlate.trim().toUpperCase(),
          capacity: parseInt(formCapacity, 10) || 14,
        }),
      });
      const json = await response.json();

      if (response.ok) {
        setResult({ message: 'Vehículo agregado correctamente.', type: 'success' });
        resetForm();
        await fetchVehicles();
      } else {
        setResult({ message: normalizeApiError('No se pudo agregar el vehículo.', json), type: 'error' });
      }
    } catch {
      setResult({ message: 'Error de conexión.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const activeCount = useMemo(() => vehicles.filter((vehicle) => vehicle.active).length, [vehicles]);
  const formValid = formMake.trim() && formModel.trim() && formPlate.trim();

  return (
    <ColumnShell
      icon={<Truck size={17} style={{ color: '#60a5fa' }} />}
      iconTint="rgba(96,165,250,0.5)"
      countTint="#60a5fa"
      title="Vehículos"
      count={vehicles.length}
      activeCount={activeCount}
      onToggleForm={() => setShowForm((value) => !value)}
    >
      <AnimatePresence>{result && <Toast message={result.message} type={result.type} onDismiss={() => setResult(null)} />}</AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(212,175,55,0.5)' }}>
                Nuevo Vehículo
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Marca" value={formMake} onChange={setFormMake} placeholder="Ford" required />
                <FieldInput label="Modelo" value={formModel} onChange={setFormModel} placeholder="Transit" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Placa" value={formPlate} onChange={(value) => setFormPlate(value.toUpperCase())} placeholder="ABC-1234" required />
                <FieldInput label="Capacidad (pax)" type="number" value={formCapacity} onChange={setFormCapacity} placeholder="14" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => void handleSave()}
                  disabled={saving || !formValid}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-black text-navy transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #c9a227, #f0c040)' }}
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  Guardar
                </button>
                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 size={20} className="animate-spin text-gold" />
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {loadError}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Truck size={22} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No hay vehículos registrados
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {vehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className="flex items-center gap-3 rounded-xl p-3 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <CarFront size={16} style={{ color: '#60a5fa' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold leading-tight text-white">
                    {vehicle.make} {vehicle.model}
                  </p>
                  <span className="rounded-md px-2 py-0.5 font-mono text-[10px] font-black" style={{ background: 'rgba(212,175,55,0.1)', color: GOLD, border: '1px solid rgba(212,175,55,0.2)' }}>
                    {vehicle.plate}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {vehicle.capacity} pax
                </p>
              </div>
              <ActiveDot active={vehicle.active} />
            </motion.div>
          ))}
        </div>
      )}
    </ColumnShell>
  );
}

export function RRHHTab() {
  const { getAuthHeaders } = useAdminAuth();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl px-6 py-5 md:px-8 md:py-6"
        style={{
          background: 'linear-gradient(135deg, #060f1e 0%, #0c1829 60%, #050d1a 100%)',
          border: '1px solid rgba(212,175,55,0.18)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(212,175,55,0.06)',
        }}
      >
        <div className="pointer-events-none absolute right-0 top-[-4rem] h-64 w-64" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 65%)' }} />
        <div className="relative">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(212,175,55,0.45)' }}>
            Class VIP · RRHH
          </p>
          <p className="font-display mb-1 font-black text-white" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)' }}>
            Recursos Humanos
          </p>
          <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Gestión de conductores y flota vehicular
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <DriversColumn getAuthHeaders={getAuthHeaders} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
          <VehiclesColumn getAuthHeaders={getAuthHeaders} />
        </motion.div>
      </div>
    </div>
  );
}
