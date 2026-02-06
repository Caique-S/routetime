import mongoose from 'mongoose';

const operadorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
  cargo: {
    type: String,
    required: true,
  },
  dataDeCadastro: {
    type: Date,
    default: Date.now,
  },
});

export const Operador = mongoose.models.Operador || mongoose.model('Operador', operadorSchema);