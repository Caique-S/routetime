'use client';

import { useState } from 'react';

interface FinalizarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (gaiolas: number, palets: number, mangas: number) => void;
}

export default function FinalizarModal({ isOpen, onClose, onConfirm }: FinalizarModalProps) {
  const [gaiolas, setGaiolas] = useState('');
  const [palets, setPalets] = useState('');
  const [mangas, setMangas] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const g = parseInt(gaiolas, 10);
    const p = parseInt(palets, 10);
    const m = parseInt(mangas, 10);
    if (isNaN(g) || isNaN(p) || isNaN(m) || g < 0 || p < 0 || m < 0) {
      setError('Preencha todos os campos com números válidos (>=0)');
      return;
    }
    setError('');
    onConfirm(g, p, m);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Informe a quantidade</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Gaiolas</label>
            <input
              type="number"
              min="0"
              value={gaiolas}
              onChange={(e) => setGaiolas(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Palets</label>
            <input
              type="number"
              min="0"
              value={palets}
              onChange={(e) => setPalets(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mangas</label>
            <input
              type="number"
              min="0"
              value={mangas}
              onChange={(e) => setMangas(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}