'use client';

import { CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  operador: {
    nome: string;
    cargo: string;
  } | null;
}

export default function OperatorModal({ isOpen, onClose, operador }: OperatorModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && operador) {
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          // Redireciona para a página de dispatch
          router.push('/dispatch');
        }, 300);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, operador, router]);

  if (!isOpen && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping"></div>
            <CheckCircle className="w-20 h-20 text-green-600 relative z-10 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-800 animate-slide-up">
              Bem vindo
            </h2>
            
            <p className="text-lg text-gray-600 animate-slide-up-delayed">
              Operador: <span className="font-semibold text-blue-600">{operador?.nome}</span>
            </p>
            
            <p className="text-sm text-gray-500 animate-fade-in">
              {operador?.cargo}
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-green-600 h-full rounded-full animate-progress"></div>
          </div>
        </div>
      </div>
    </div>
  );
}