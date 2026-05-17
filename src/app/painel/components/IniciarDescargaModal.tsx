"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  XMarkIcon,
  BellIcon,
  QrCodeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface Props {
  motorista: { id: string; nome: string; doca?: string };
  onClose: () => void;
  onConfirm: (id: string, doca: string) => void;
}

export default function IniciarDescargaModal({
  motorista,
  onClose,
  onConfirm,
}: Props) {
  const [doca, setDoca] = useState(motorista.doca || "");
  const [notificacaoEnviada, setNotificacaoEnviada] = useState(!!motorista.doca);
  const [qrValidado, setQrValidado] = useState(false);
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const [erro, setErro] = useState("");
  const [loadingNotificar, setLoadingNotificar] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => () => pararCamera(), []);

  const pararCamera = () => {
    scanningRef.current = false;
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScannerAtivo(false);
  };

  const handleNotificar = async () => {
    if (!doca.trim()) {
      setErro("Informe o número da doca");
      return;
    }
    setErro("");
    setLoadingNotificar(true);
    try {
      const res = await fetch(
        `/api/melicage/motoristas/${motorista.id}/doca`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doca: doca.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.erro || "Erro ao notificar");
      setNotificacaoEnviada(true);
      toast.success(`Motorista notificado — Doca ${doca}`);
    } catch (err: any) {
      const msg = err.message || "Erro ao notificar motorista";
      toast.error(msg);
      setErro(msg);
    } finally {
      setLoadingNotificar(false);
    }
  };

  const iniciarScanner = async () => {
    setErro("");
    try {
      // Tenta câmera traseira; se falhar, usa a frontal (mesmo padrão  do QRScanner)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScannerAtivo(true);

      if (!("BarcodeDetector" in window)) {
        setErro(
          "Seu navegador não suporta leitura automática de QR Code. Use Chrome ou Edge.",
        );
        return;
      }

      // @ts-ignore
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      scanningRef.current = true;

      const detectFrame = async () => {
        if (
          !scanningRef.current ||
          !videoRef.current ||
          videoRef.current.readyState !== 4
        ) {
          if (scanningRef.current) requestAnimationFrame(detectFrame);
          return;
        }
        try {
          // @ts-ignore
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const scannedId = barcodes[0].rawValue.trim();
            if (scannedId === motorista.id) {
              setQrValidado(true);
              pararCamera();
              toast.success("✅ QR Code validado!");
            } else {
              setErro("QR Code não corresponde a este motorista");
              requestAnimationFrame(detectFrame);
            }
            return;
          }
        } catch {
          // erro pontual de frame — ignora e tenta no próximo
        }
        requestAnimationFrame(detectFrame);
      };

      requestAnimationFrame(detectFrame);
    } catch (err: any) {
      setErro(
        err.name === "NotAllowedError"
          ? "Permissão de câmera negada. Habilite nas configurações do navegador."
          : "Erro ao acessar câmera: " + err.message,
      );
    }
  };

  const handleConfirmar = () => {
    if (!notificacaoEnviada) {
      setErro("Notifique o motorista primeiro");
      return;
    }
    if (!qrValidado) {
      setErro("Valide o QR Code antes de confirmar");
      return;
    }
    onConfirm(motorista.id, doca.trim());
    onClose();
  };

  const etapa = !notificacaoEnviada ? 1 : !qrValidado ? 2 : 3;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Iniciar Descarga</h2>
            <p className="text-blue-100 text-sm mt-0.5">{motorista.nome}</p>
          </div>
          <button
            onClick={() => {
              pararCamera();
              onClose();
            }}
            className="text-blue-200 hover:text-white transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Indicador de etapas */}
        <div className="flex border-b border-gray-100">
          {[
            { num: 1, label: "Atribuir Doca" },
            { num: 2, label: "Escanear QR" },
            { num: 3, label: "Confirmar" },
          ].map((e) => (
            <div
              key={e.num}
              className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
                etapa === e.num
                  ? "border-blue-600 text-blue-600"
                  : etapa > e.num
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-400"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-1 ${
                  etapa > e.num
                    ? "bg-green-100"
                    : etapa === e.num
                      ? "bg-blue-100"
                      : "bg-gray-100"
                }`}
              >
                {etapa > e.num ? "✓" : e.num}
              </span>
              {e.label}
            </div>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* Etapa 1: Doca + Notificar */}
          <div className={etapa > 1 ? "opacity-50 pointer-events-none" : ""}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Número da Doca <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={doca}
                onChange={(e) => {
                  setDoca(e.target.value);
                  setErro("");
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50"
                placeholder="ex: 3A"
                disabled={notificacaoEnviada}
              />
              <button
                onClick={handleNotificar}
                disabled={
                  notificacaoEnviada || !doca.trim() || loadingNotificar
                }
                className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
                  notificacaoEnviada
                    ? "bg-green-100 text-green-700 cursor-default"
                    : "bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50"
                }`}
              >
                {notificacaoEnviada ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4" /> Enviado
                  </>
                ) : loadingNotificar ? (
                  <>
                    <span className="animate-spin inline-block">↻</span>{" "}
                    Enviando...
                  </>
                ) : (
                  <>
                    <BellIcon className="w-4 h-4" /> Notificar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Etapa 2: Scanner */}
          {notificacaoEnviada && !qrValidado && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Aguarde o motorista apresentar o QR Code e escaneie para
                validar.
              </p>
              {/* Botão iniciar — visível apenas quando scanner inativo */}
              {!scannerAtivo && (
                <button
                  onClick={iniciarScanner}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <QrCodeIcon className="w-5 h-5" /> Abrir Câmera e Escanear QR
                  Code
                </button>
              )}

              {/* Vídeo SEMPRE no DOM para que videoRef.current nunca seja null.
                  Escondido via CSS quando inativo — exibido quando scanner ativo. */}
              <div className={scannerAtivo ? "space-y-2" : "hidden"}>
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white rounded-lg opacity-70" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Aponte para o QR Code do motorista
                </p>
                <button
                  onClick={pararCamera}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
                >
                  Cancelar câmera
                </button>
              </div>
            </div>
          )}

          {/* Etapa 3: Confirmação */}
          {qrValidado && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircleIcon className="w-8 h-8 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">
                  QR Code Validado!
                </p>
                <p className="text-sm text-green-600">
                  {motorista.nome} — Doca <strong>{doca}</strong>
                </p>
              </div>
            </div>
          )}

          {erro && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {erro}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                pararCamera();
                onClose();
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={!qrValidado}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ✓ Iniciar Descarga
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
