'use client';

import { useEffect, useRef, useState } from 'react';
import { QrCode, X, Camera, CameraOff } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Seu navegador não suporta acesso à câmera');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setIsScanning(true);
        
        // Iniciar o scanner
        scanFrame();
      }
    } catch (err: any) {
      console.error('Erro ao acessar câmera:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada no dispositivo.');
      } else if (err.name === 'NotSupportedError') {
        setError('Seu navegador não suporta esta funcionalidade.');
      } else {
        setError(`Erro ao acessar câmera: ${err.message || 'Erro desconhecido'}`);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
      setIsScanning(false);
    }
  };

  const toggleCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const scanFrame = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current || !videoRef.current.readyState) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.videoWidth === 0) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Ajustar canvas ao tamanho do vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenhar o frame atual
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obter dados da imagem
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    try {
      // Usar jsQR para detectar QR Code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code) {
        handleScanSuccess(code.data);
        return;
      }
    } catch (err) {
      console.error('Erro ao processar QR Code:', err);
    }

    // Continuar escaneando
    animationRef.current = requestAnimationFrame(scanFrame);
  };

  const handleScanSuccess = (result: string) => {
    if (!isScanning) return;
    
    setIsScanning(false);
    stopCamera();
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    onScan(result);
    onClose();
  };

  const handleManualQR = () => {
    const code = prompt('Digite o código do operador manualmente:');
    if (code && code.trim()) {
      handleScanSuccess(code.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 bg-linear-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center space-x-3">
            <QrCode className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-lg">Escanear QR Code</h3>
              <p className="text-xs opacity-90">Posicione o código na área destacada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black aspect-square flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-center p-8">
              <CameraOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-500 font-medium mb-2">{error}</p>
              <p className="text-gray-300 text-sm mb-4">
                Verifique se a câmera está disponível e as permissões foram concedidas
              </p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-blue-500 rounded-xl relative">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-blue-500 rounded-tl"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-blue-500 rounded-tr"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-blue-500 rounded-bl"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-blue-500 rounded-br"></div>
                  
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent animate-scan"></div>
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {cameraActive ? (
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Câmera ativa • {facingMode === 'environment' ? 'Traseira' : 'Frontal'}
                </span>
              ) : (
                <span className="text-gray-500">Câmera inativa</span>
              )}
            </div>
            
            <button
              onClick={toggleCamera}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              disabled={!cameraActive}
            >
              <Camera className="w-4 h-4" />
              <span className="text-sm">Trocar Câmera</span>
            </button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Posicione o QR Code do operador dentro do quadrado
            </p>
            <p className="text-xs text-gray-500">
              A leitura é automática. Certifique-se de que há boa iluminação.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleManualQR}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium"
            >
              Inserir Código Manualmente
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-white/80 max-w-md">
        <p className="text-sm">
          Dica: Para melhor leitura, aproxime o QR Code até que ele preencha o quadrado
        </p>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(256px);
          }
        }
        
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
