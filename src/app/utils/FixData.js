// ─────────────────────────────────────────────────────────────────
//  CORREÇÃO DE FUSO HORÁRIO — por data específica
//  Troque apenas o valor abaixo e rode no mongosh ou Compass
// ─────────────────────────────────────────────────────────────────

const DATA_ALVO = "12/02/2026"; // ← altere aqui: "DD/MM/AAAA"

// ─────────────────────────────────────────────────────────────────

db.carregamentos.updateMany(
  {
    "motorista.dataInicio": {
      $eq:     DATA_ALVO,   // somente o dia escolhido
      $type:   "string"
    }
  },
  [
    // 1. Extrai a data-base a partir do campo brasileiro
    {
      $set: {
        dataBase: {
          $cond: {
            if: {
              $regexMatch: {
                input: "$motorista.dataInicio",
                regex: /\//
              }
            },
            then: {
              $dateFromString: {
                dateString: "$motorista.dataInicio",
                format:     "%d/%m/%Y"
              }
            },
            else: {
              // fallback: ISO (YYYY-MM-DD) — segurança caso algum registro escape
              $dateFromString: { dateString: "$motorista.dataInicio" }
            }
          }
        }
      }
    },

    // 2. Reaplica a data correta mantendo o horário original de cada campo
    {
      $set: {
        timestamp: {
          $dateToString: {
            date: {
              $dateFromParts: {
                year:   { $year:        "$dataBase" },
                month:  { $month:       "$dataBase" },
                day:    { $dayOfMonth:  "$dataBase" },
                hour:   { $hour:   { $toDate: "$timestamp" } },
                minute: { $minute: { $toDate: "$timestamp" } },
                second: { $second: { $toDate: "$timestamp" } }
              }
            }
          }
        },

        dataCriacao: {
          $dateFromParts: {
            year:   { $year:        "$dataBase" },
            month:  { $month:       "$dataBase" },
            day:    { $dayOfMonth:  "$dataBase" },
            hour:   { $hour:   "$dataCriacao" },
            minute: { $minute: "$dataCriacao" },
            second: { $second: "$dataCriacao" }
          }
        },

        dataEnvio: {
          $dateToString: {
            date: {
              $dateFromParts: {
                year:   { $year:        "$dataBase" },
                month:  { $month:       "$dataBase" },
                day:    { $dayOfMonth:  "$dataBase" },
                hour:   { $hour:   { $toDate: "$dataEnvio" } },
                minute: { $minute: { $toDate: "$dataEnvio" } },
                second: { $second: { $toDate: "$dataEnvio" } }
              }
            }
          }
        },

        dataAtualizacao: {
          $dateFromParts: {
            year:   { $year:        "$dataBase" },
            month:  { $month:       "$dataBase" },
            day:    { $dayOfMonth:  "$dataBase" },
            hour:   { $hour:   "$dataAtualizacao" },
            minute: { $minute: "$dataAtualizacao" },
            second: { $second: "$dataAtualizacao" }
          }
        }
      }
    },

    // 3. Remove o campo auxiliar
    { $unset: "dataBase" }
  ]
);

// ─────────────────────────────────────────────────────────────────
//  CONSULTA DE CONFERÊNCIA — rode após o updateMany para validar
// ─────────────────────────────────────────────────────────────────

db.carregamentos.find(
  { "motorista.dataInicio": DATA_ALVO },
  {
    "motorista.nome":        1,
    "motorista.dataInicio":  1,
    timestamp:               1,
    dataCriacao:             1,
    dataEnvio:               1,
    dataAtualizacao:         1
  }
).limit(5).pretty();