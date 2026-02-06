'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          qrbox: {
            width: 250,
            height: 250,
          },
          fps: 5,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          if (isScanning) return;
          setIsScanning(true);
          onScan(decodedText);
          scanner.clear();
          onClose();
        },
        (error) => {
          console.warn('Erro ao escanear QR Code:', error);
        }
      );

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [onScan, onClose, isScanning]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Escanear QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <div id="qr-reader" className="w-full" />
          <p className="text-sm text-gray-600 text-center mt-4">
            Posicione o QR code do operador dentro da área de leitura
          </p>
        </div>
      </div>
    </div>
  );
}