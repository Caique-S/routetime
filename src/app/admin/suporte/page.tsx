"use client";

import { useState, useEffect } from "react";
import { Mail, Github, Linkedin, ChevronRight, MessageSquareText } from "lucide-react";
import Image from "next/image";

export default function SobrePage() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    setMounted(true);
  }, []);

  const technologies = [
    { name: "React", icon: "/icons/react.svg", color: "#61DAFB" },
    { name: "Node.js", icon: "/icons/nodedotjs.svg", color: "#339933" },
    { name: "TypeScript", icon: "/icons/typescript.svg", color: "#3178C6" },
    { name: "HTML5", icon: "/icons/html5.svg", color: "#E34F26" },
    { name: "Next.js", icon: "/icons/nextdotjs.svg", color: "#000000" },
    { name: "Kotlin", icon: "/icons/kotlin.svg", color: "#7F52FF" },
    { name: "MongoDB", icon: "/icons/mongodb.svg", color: "#47A248" },
    { name: "JavaScript", icon: "/icons/javascript.svg", color: "#F7DF1E" },
    { name: "TailWind", icon: "/icons/tailwindcss.svg", color: "#06B6D4" },
  ];

  const duplicatedTechnologies = [...technologies, ...technologies];

  // Se não estiver montado, retorna null para evitar hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-bg-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-bg-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-bg-blob animation-delay-4000"></div>
      </div>

      {/* Conteúdo principal */}
      <div
        className={`relative z-10 max-w-2xl w-full mx-auto transition-all duration-700 ${
          isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        {/* Card principal */}
        <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 border border-white/50">
          {/* Foto */}
          <div className="flex justify-center mb-8">
            <div className="relative group">
              {/* Efeitos de blur */}
              <div className="absolute -inset-1 bg-linear-to-r from-blue-600 via-purple-600 to-green-600 rounded-full opacity-40 blur-xl group-hover:opacity-60 transition-opacity duration-500"></div>
              <div className="absolute -inset-2 bg-linear-to-r from-blue-600 via-purple-600 to-green-600 rounded-full opacity-20 blur-2xl"></div>
              <div className="absolute -inset-3 bg-linear-to-r from-blue-600 via-purple-600 to-green-600 rounded-full opacity-10 blur-3xl"></div>
              
              <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden ring-4 ring-white/50 shadow-xl">
                <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent z-10"></div>
                <Image
                  src="/photo_2023-12-24_20-39-03.jpg"
                  alt="Foto de perfil"
                  fill
                  className="object-cover scale-100 group-hover:scale-105 transition-transform duration-500"
                  style={{ objectPosition: '50% 0%' }}
                  priority
                />
              </div>

              <div className="absolute bottom-4 right-4 w-5 h-5 bg-green-500 rounded-full border-4 border-white/50 animate-pulse"></div>
            </div>
          </div>

          {/* Nome e título */}
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
              Caique Santos
            </h1>
            
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <div className="w-8 h-px bg-blue-400"></div>
              <span className="text-lg font-medium">Full Stack Developer</span>
              <div className="w-8 h-px bg-blue-400"></div>
            </div>
          </div>

          {/* Descrição */}
          <div className="text-center mb-10">
            <p className="text-gray-700 text-lg leading-relaxed">
              Especialista em desenvolvimento de aplicações escaláveis com
              <span className="font-semibold text-gray-900"> React </span>,
              <span className="font-semibold text-gray-900"> Mongo DB</span>,
              <span className="font-semibold text-gray-900"> TypeScript</span>,
              <span className="font-semibold text-gray-900"> Node JS</span>,
              <span className="font-semibold text-gray-900"> React Native</span>,
              <span className="font-semibold text-gray-900"> Next JS</span> e
              <span className="font-semibold text-gray-900"> Java </span>.
            </p>
          </div>

          {/* Carrossel */}
          <div className="w-full mb-12">
            
            <div className="relative flex overflow-hidden group">
              {/* Gradientes laterais */}
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
              
              {/* Carrossel animado */}
              <div className="flex animate-carousel gap-12 md:gap-16 group-hover:[animation-play-state:paused]">
                {duplicatedTechnologies.map((tech, index) => (
                  <div
                    key={`${tech.name}-${index}`}
                    className="flex flex-col items-center justify-center shrink-0 w-20 md:w-24 group/icon"
                  >
                    <div className="relative mb-3">
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover/icon:opacity-20 transition-all duration-500 blur-xl"
                        style={{ backgroundColor: tech.color }}
                      ></div>
                      
                      <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                        <div className="relative w-12 h-12 md:w-14 md:h-14">
                          <Image
                            src={tech.icon}
                            alt={tech.name}
                            fill
                            className="object-contain transition-all duration-500 group-hover/icon:scale-110"
                            style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
                          />
                        </div>
                      </div>
                    </div>

                    <span 
                      className="text-sm font-medium transition-all duration-300 group-hover/icon:scale-105"
                      style={{ color: '#4B5563' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = tech.color;
                        e.currentTarget.style.fontWeight = '600';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#4B5563';
                        e.currentTarget.style.fontWeight = '500';
                      }}
                    >
                      {tech.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botão de contato */}
          <div className="flex justify-center">
            <button
              onClick={() => window.open("https://api.whatsapp.com/send/?phone=5575999872330","_blank")}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-300 ease-in-out overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 via-blue-700 to-purple-700 hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <span className="relative flex items-center gap-3">
                <MessageSquareText className="w-5 h-5" />
                Entrar em Contato
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>

          {/* Redes sociais */}
          <div className="flex justify-center items-center space-x-4 mt-10 pt-6 border-t border-white/50">
            <a
              href="#"
              className="p-3 bg-white/30 backdrop-blur-sm rounded-full text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-300 transform hover:scale-110"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="p-3 bg-white/30 backdrop-blur-sm rounded-full text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-300 transform hover:scale-110"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="p-3 bg-white/30 backdrop-blur-sm rounded-full text-gray-700 hover:text-blue-600 hover:bg-white/50 transition-all duration-300 transform hover:scale-110"
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} • Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* Adicionar estilos no head do documento */}
      <style>{`
        @keyframes bg-blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        @keyframes carousel {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-bg-blob {
          animation: bg-blob 7s infinite;
        }

        .animate-carousel {
          animation: carousel 30s linear infinite;
          width: fit-content;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}