"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode, X, Camera, CameraOff, Scan, Smartphone } from "lucide-react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [isWebView, setIsWebView] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidWebView =
      /wv/.test(userAgent) || /android.*wv/.test(userAgent);
    setIsWebView(isAndroidWebView);

    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      setError(null);

      if (isWebView) {
        console.log("🔄 Iniciando câmera no WebView");
      }

      // Verificar se estamos em um contexto seguro (HTTPS ou localhost)
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const isSecure = window.location.protocol === "https:" || isLocalhost;

      if (!isSecure) {
        setError(
          "Acesso à câmera requer HTTPS. Em desenvolvimento, use localhost.",
        );
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Seu navegador não suporta acesso à câmera. Tente usar Chrome ou Edge.",
        );
        return;
      }

      // Primeiro listar dispositivos disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );

      if (videoDevices.length === 0) {
        setError("Nenhuma câmera encontrada no dispositivo.");
        return;
      }

      // Tentar acessar a câmera traseira primeiro (environment), depois frontal (user)
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (err) {
        // Se falhar, tentar câmera frontal
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);

        // Usar a API de Barcode Detection se disponível (navegadores modernos)
        if ("BarcodeDetector" in window) {
          detectBarcodes();
        } else {
          setError(
            "Seu navegador não suporta leitura automática de QR Code. Use o campo manual.",
          );
        }
      }
    } catch (err: any) {
      console.error("Erro ao acessar câmera:", err);

      if (err.name === "NotAllowedError") {
        if (isWebView) {
          setError(
            "Permissão de câmera necessária. Verifique: \n1. Permissões do aplicativo\n2. Configurações do dispositivo\n3. Tente reiniciar o app",
          );
        }
        setError(
          "Permissão de câmera negada. Por favor, permita o acesso à câmera.",
        );
      } else if (err.name === "NotFoundError") {
        setError("Nenhuma câmera encontrada no dispositivo.");
      } else if (err.name === "NotSupportedError") {
        setError("Seu navegador não suporta esta funcionalidade.");
      } else {
        setError(`Erro: ${err.message || "Não foi possível acessar a câmera"}`);
      }
    }
  };

  const detectBarcodes = async () => {
    if (!videoRef.current || !("BarcodeDetector" in window)) return;

    try {
      // @ts-ignore - BarcodeDetector é uma API experimental
      const barcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });

      const detectFrame = async () => {
        if (
          !scanning ||
          !videoRef.current ||
          videoRef.current.readyState !== 4
        ) {
          requestAnimationFrame(detectFrame);
          return;
        }

        try {
          // @ts-ignore
          const barcodes = await barcodeDetector.detect(videoRef.current);

          if (barcodes.length > 0) {
            const qrCode = barcodes[0];
            handleScanSuccess(qrCode.rawValue);
            return;
          }
        } catch (err) {
          console.error("Erro na detecção:", err);
        }

        requestAnimationFrame(detectFrame);
      };

      detectFrame();
    } catch (err) {
      console.error("Erro ao criar detector:", err);
      setError("Não foi possível iniciar o scanner de QR Code.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const handleScanSuccess = (result: string) => {
    if (!scanning) return;

    setScanning(false);
    stopCamera();
    onScan(result);
    onClose();
  };

  const handleManualInput = () => {
    const code = prompt("Digite o código do operador:");
    if (code && code.trim()) {
      handleScanSuccess(code.trim());
    }
  };

  const toggleCamera = async () => {
    stopCamera();
    await startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-linear-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <QrCode className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-lg">Escanear QR Code</h3>
              {isWebView && (
                <p className="text-xs opacity-90 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  Modo Aplicativo
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área da Câmera */}
        <div className="relative bg-black aspect-square flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-center p-6">
              <CameraOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-red-500 font-medium mb-2">{error}</p>
              <p className="text-gray-300 text-sm mb-6">
                {window.location.protocol === "http:" &&
                !window.location.hostname.includes("localhost") &&
                !window.location.hostname.includes("127.0.0.1")
                  ? "Acesso à câmera requer HTTPS em produção."
                  : "Verifique as permissões da câmera."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={handleManualInput}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Inserir Manualmente
                </button>
              </div>
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

              {/* Overlay de escaneamento */}
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-blue-500 rounded-xl relative">
                  {/* Cantos decorativos */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-blue-500 rounded-tl"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-blue-500 rounded-tr"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-blue-500 rounded-bl"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-blue-500 rounded-br"></div>

                  {/* Linha de escaneamento animada */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent animate-scan"></div>
                </div>
              </div>

              {/* Indicador de estado */}
              {cameraActive && scanning && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Escaneando...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controles e Informações */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm">
              {cameraActive ? (
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Câmera ativa</span>
                </div>
              ) : (
                <span className="text-gray-500">Câmera inativa</span>
              )}
            </div>

            {isWebView && !cameraActive && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 mx-4 mt-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>WebView Detectado:</strong> Se a câmera não funcionar:
                </p>
                <ul className="text-xs text-yellow-700 mt-1 ml-4 list-disc">
                  <li>Verifique as permissões do aplicativo</li>
                  <li>Reinicie o aplicativo</li>
                  <li>Use o modo manual se necessário</li>
                </ul>
              </div>
            )}

            {cameraActive && (
              <button
                onClick={toggleCamera}
                className="flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Trocar Câmera</span>
              </button>
            )}
          </div>

          <div className="space-y-3 text-center">
            <p className="text-sm text-gray-600">
              Posicione o QR Code dentro da área destacada
            </p>
            <p className="text-xs text-gray-500">
              A leitura é automática. Mantenha o código estável e bem iluminado.
            </p>

            <div className="pt-4">
              <button
                onClick={handleManualInput}
                className="w-full py-3 bg-linear-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all font-medium shadow-sm"
              >
                Inserir Código Manualmente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dica para mobile */}
      <div className="mt-4 text-center text-white/80 max-w-md">
        <p className="text-sm">
          Dica: Mantenha o QR Code a cerca de 15-20cm da câmera para melhor
          leitura
        </p>
      </div>

      {/* Animação CSS */}
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
