'use client';

import { useState, useRef, useEffect } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  motorista: {
    id: string;
    nome: string;
  };
  onClose: () => void;
  onConfirm: (id: string, doca: number) => void;
}

export default function IniciarDescargaModal({ motorista, onClose, onConfirm }: Props) {
  const [doca, setDoca] = useState('');
  const [notificacaoEnviada, setNotificacaoEnviada] = useState(false);
  const [qrValidado, setQrValidado] = useState(false);
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState('');

  const handleNotificar = async () => {
    if (!doca) {
      setErro('Informe a doca');
      return;
    }
    try {
      const res = await fetch('/api/melicages/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motoristaId: motorista.id, doca: parseInt(doca) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.erro);
      setNotificacaoEnviada(true);
      toast.success('Notificação enviada ao motorista');
    } catch (err: any) {
      toast.error('Erro ao notificar: ' + err.message);
      setErro(err.message);
    }
  };

  const iniciarScanner = async () => {
    setScannerAtivo(true);
    setErro('');
    try {
      const codeReader = new BrowserQRCodeReader();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;

      codeReader.decodeFromVideoElement(videoRef.current!, (result, error) => {
        if (result) {
          const scannedId = result.getText();
          if (scannedId === motorista.id) {
            setQrValidado(true);
            setScannerAtivo(false);
            toast.success('QR Code validado!');
            stream.getTracks().forEach(track => track.stop());
          } else {
            setErro('QR Code não corresponde a este motorista');
          }
        }
      });
    } catch (err) {
      setErro('Erro ao acessar câmera');
    }
  };

  const handleConfirmar = async () => {
    if (!qrValidado) {
      setErro('Valide o QR Code primeiro');
      return;
    }
    onConfirm(motorista.id, parseInt(doca));
  };

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold mb-4">Iniciar Descarga</h2>
        <p className="mb-4">Motorista: <span className="font-semibold">{motorista.nome}</span></p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Doca <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={doca}
              onChange={(e) => setDoca(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Número da doca"
              disabled={notificacaoEnviada}
            />
          </div>

          <button
            onClick={handleNotificar}
            disabled={notificacaoEnviada || !doca}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
          >
            {notificacaoEnviada ? 'Notificação Enviada' : '🔔 Notificar Motorista'}
          </button>

          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={iniciarScanner}
              disabled={!notificacaoEnviada || qrValidado}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              {qrValidado ? '✅ QR Code Validado' : '📷 Escanear QR Code'}
            </button>

            {scannerAtivo && (
              <div className="mt-4">
                <video ref={videoRef} className="w-full rounded" />
                <p className="text-sm text-gray-500 mt-2">Aponte para o QR Code do motorista</p>
              </div>
            )}

            {erro && <p className="text-red-500 text-sm mt-2">{erro}</p>}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={!qrValidado}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Confirmar Início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}