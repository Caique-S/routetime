const { io } = require('socket.io-client');

const socket = io('http://localhost:3000'); // mesma URL do seu servidor

socket.on('connect', () => {
  console.log('✅ Conectado ao servidor!');
  // Simula um motorista entrando na sala
  socket.emit('entrar-fila', { motoristaId: '65f2a1b2c3d4e5f6a7b8c9d0' });
});

socket.on('notificacao-doca', (data: any) => {
  console.log('📩 Notificação recebida:', data);
});

socket.on('connect_error', (err: { message: any; }) => {
  console.log('❌ Erro de conexão:', err.message);
});

// Mantém o processo rodando  
setTimeout(() => {}, 10000);
