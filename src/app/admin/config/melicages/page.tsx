'use client';

import { useEffect, useState, useRef } from 'react';

interface LocalizacaoConfig {
  coo_lat: number;
  coo_lon: number;
  raio: number;
  origin: string;
}

interface MotoristasConfig {
  refresh_list: number;
  monitoramento: boolean;
  refresh_route: number;
  tracking_list?: string[];
}

interface XPT {
  id: string;
  cidade: string;
  codigo: string;
  latitude: number;
  longitude: number;
  raio: number;
  origin?: string;
}

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className={`mb-4 p-4 rounded flex justify-between items-center ${type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
    <span>{message}</span>
    <button onClick={onClose} className="ml-4 text-gray-600 hover:text-gray-900 font-bold">✕</button>
  </div>
);

export default function AdminConfigPage() {
  const [localConfig, setLocalConfig] = useState<LocalizacaoConfig | null>(null);
  const [motoristaConfig, setMotoristaConfig] = useState<MotoristasConfig | null>(null);
  const [xpts, setXpts] = useState<XPT[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
  };

  const hideToast = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(null);
  };

  const [savingLocal, setSavingLocal] = useState(false);
  const [savingMotorista, setSavingMotorista] = useState(false);

  // Modal XPT
  const [xptModalOpen, setXptModalOpen] = useState(false);
  const [editingXpt, setEditingXpt] = useState<XPT | null>(null);
  const [xptForm, setXptForm] = useState({
    cidade: '',
    codigo: '',
    latitude: '',
    longitude: '',
    raio: '',
    origin: '',
  });
  const [xptSaving, setXptSaving] = useState(false);
  const [xptError, setXptError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    hideToast();
    try {
      const [localRes, motoristaRes, xptsRes] = await Promise.all([
        fetch('/api/melicages/config/localizacoes'),
        fetch('/api/melicages/config/motoristas'),
        fetch('/api/melicages/xpts'),
      ]);

      if (localRes.ok) {
        const localData = await localRes.json();
        setLocalConfig(localData.data);
      } else {
        setLocalConfig({ coo_lat: -12.309797, coo_lon: -38.878809, raio: 500, origin: '' });
      }

      if (motoristaRes.ok) {
        const motoristaData = await motoristaRes.json();
        setMotoristaConfig(motoristaData.data);
      } else {
        setMotoristaConfig({ refresh_list: 10, monitoramento: true, refresh_route: 300, tracking_list: [] });
      }

      if (xptsRes.ok) {
        const xptsData = await xptsRes.json();
        setXpts(xptsData.data || []);
      } else {
        setXpts([]);
      }
    } catch (error) {
      showToast('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveLocal = async () => {
    if (!localConfig) return;
    setSavingLocal(true);
    hideToast();
    try {
      const response = await fetch('/api/melicages/config/localizacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localConfig),
      });
      if (response.ok) {
        showToast('Localização salva!', 'success');
        const updated = await response.json();
        setLocalConfig(updated.data);
      } else {
        const errorData = await response.json();
        showToast(`Erro: ${errorData.erro || 'Falha ao salvar'}`, 'error');
      }
    } catch (error) {
      showToast('Erro de rede ao salvar localização', 'error');
    } finally {
      setSavingLocal(false);
    }
  };

  const handleSaveMotorista = async () => {
    if (!motoristaConfig) return;
    setSavingMotorista(true);
    hideToast();
    try {
      const response = await fetch('/api/melicages/config/motoristas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(motoristaConfig),
      });
      if (response.ok) {
        showToast('Configuração de motoristas salva!', 'success');
        const updated = await response.json();
        setMotoristaConfig(updated.data);
      } else {
        const errorData = await response.json();
        showToast(`Erro: ${errorData.erro || 'Falha ao salvar'}`, 'error');
      }
    } catch (error) {
      showToast('Erro de rede ao salvar motoristas', 'error');
    } finally {
      setSavingMotorista(false);
    }
  };

  const openNewXptModal = () => {
    setEditingXpt(null);
    setXptForm({ cidade: '', codigo: '', latitude: '', longitude: '', raio: '', origin: '' });
    setXptError('');
    setXptModalOpen(true);
  };

  const openEditXptModal = (xpt: XPT) => {
    setEditingXpt(xpt);
    setXptForm({
      cidade: xpt.cidade,
      codigo: xpt.codigo,
      latitude: xpt.latitude.toString(),
      longitude: xpt.longitude.toString(),
      raio: xpt.raio.toString(),
      origin: xpt.origin || '',
    });
    setXptError('');
    setXptModalOpen(true);
  };

  const handleXptInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setXptForm(prev => ({ ...prev, [name]: value }));
  };

  const saveXpt = async () => {
    if (!xptForm.cidade.trim() || !xptForm.codigo.trim() || !xptForm.latitude || !xptForm.longitude || !xptForm.raio) {
      setXptError('Preencha todos os campos obrigatórios.');
      return;
    }

    const latitude = parseFloat(xptForm.latitude);
    const longitude = parseFloat(xptForm.longitude);
    const raio = parseInt(xptForm.raio, 10);
    if (isNaN(latitude) || isNaN(longitude) || isNaN(raio) || raio <= 0) {
      setXptError('Latitude, longitude e raio devem ser números válidos (raio positivo).');
      return;
    }

    const payload = {
      cidade: xptForm.cidade.trim(),
      codigo: xptForm.codigo.trim(),
      latitude,
      longitude,
      raio,
      origin: xptForm.origin.trim() || undefined,
    };

    setXptSaving(true);
    setXptError('');

    try {
      let response;
      if (editingXpt) {
        response = await fetch(`/api/melicages/xpts/${editingXpt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/melicages/xpts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        setXptModalOpen(false);
        fetchAll();
        showToast(editingXpt ? 'XPT atualizado!' : 'XPT criado!', 'success');
      } else {
        const error = await response.json();
        setXptError(error.erro || 'Falha ao salvar XPT');
      }
    } catch (error) {
      setXptError('Erro de rede. Tente novamente.');
    } finally {
      setXptSaving(false);
    }
  };

  const deleteXpt = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este XPT?')) return;
    try {
      const response = await fetch(`/api/melicages/xpts/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setXpts(prev => prev.filter(x => x.id !== id));
        showToast('XPT excluído!', 'success');
      } else {
        const error = await response.json();
        showToast(`Erro: ${error.erro || 'Falha ao excluir'}`, 'error');
      }
    } catch (error) {
      showToast('Erro de rede ao excluir XPT.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Configurações do Sistema</h1>

        {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

        {/* Localização Base */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📍 Localização Base</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={localConfig?.coo_lat || ''}
                onChange={(e) => setLocalConfig(prev => prev ? { ...prev, coo_lat: parseFloat(e.target.value) || 0 } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={localConfig?.coo_lon || ''}
                onChange={(e) => setLocalConfig(prev => prev ? { ...prev, coo_lon: parseFloat(e.target.value) || 0 } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raio (metros)</label>
              <input
                type="number"
                value={localConfig?.raio || ''}
                onChange={(e) => setLocalConfig(prev => prev ? { ...prev, raio: parseInt(e.target.value) || 0 } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
              <input
                type="text"
                value={localConfig?.origin || ''}
                onChange={(e) => setLocalConfig(prev => prev ? { ...prev, origin: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ex: Matriz"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveLocal}
              disabled={savingLocal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {savingLocal ? 'Salvando...' : 'Salvar Localização Base'}
            </button>
          </div>
        </div>

        {/* Configuração de Motoristas */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🚚 Configuração de Motoristas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Lista (segundos)</label>
              <input
                type="number"
                value={motoristaConfig?.refresh_list || ''}
                onChange={(e) => setMotoristaConfig(prev => prev ? { ...prev, refresh_list: parseInt(e.target.value) || 0 } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Rota (segundos)</label>
              <input
                type="number"
                value={motoristaConfig?.refresh_route || ''}
                onChange={(e) => setMotoristaConfig(prev => prev ? { ...prev, refresh_route: parseInt(e.target.value) || 0 } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="monitoramento"
                checked={motoristaConfig?.monitoramento || false}
                onChange={(e) => setMotoristaConfig(prev => prev ? { ...prev, monitoramento: e.target.checked } : null)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="monitoramento" className="ml-2 block text-sm text-gray-900">
                Monitoramento ativo
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveMotorista}
              disabled={savingMotorista}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {savingMotorista ? 'Salvando...' : 'Salvar Configuração Motoristas'}
            </button>
          </div>
        </div>

        {/* XPTs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📍 XPTs (Destinos)</h2>
            <button onClick={openNewXptModal} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              + Novo XPT
            </button>
          </div>

          {xpts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum XPT cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {xpts.map((xpt) => (
                <div key={xpt.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{xpt.cidade}</h3>
                      <p className="text-sm text-gray-600">Código: {xpt.codigo}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Raio: {xpt.raio}m</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p>Lat: {xpt.latitude.toFixed(6)}</p>
                    <p>Lon: {xpt.longitude.toFixed(6)}</p>
                    {xpt.origin && <p className="text-gray-500">Origem: {xpt.origin}</p>}
                  </div>
                  <div className="mt-3 flex justify-end space-x-2">
                    <button onClick={() => openEditXptModal(xpt)} className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                    <button onClick={() => deleteXpt(xpt.id)} className="text-red-600 hover:text-red-800 text-sm">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal XPT */}
        {xptModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{editingXpt ? 'Editar XPT' : 'Novo XPT'}</h2>
              {xptError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{xptError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cidade *</label>
                  <input type="text" name="cidade" value={xptForm.cidade} onChange={handleXptInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código *</label>
                  <input type="text" name="codigo" value={xptForm.codigo} onChange={handleXptInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Latitude *</label>
                  <input type="number" step="any" name="latitude" value={xptForm.latitude} onChange={handleXptInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Longitude *</label>
                  <input type="number" step="any" name="longitude" value={xptForm.longitude} onChange={handleXptInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Raio (metros) *</label>
                  <input type="number" name="raio" value={xptForm.raio} onChange={handleXptInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Origem (opcional)</label>
                  <input type="text" name="origin" value={xptForm.origin} onChange={handleXptInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setXptModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={saveXpt} disabled={xptSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {xptSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}