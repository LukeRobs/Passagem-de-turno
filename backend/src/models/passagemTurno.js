const mongoose = require('mongoose');

const passagemTurnoSchema = new mongoose.Schema(
  {
    data: {
      type: Date,
      required: [true, 'Data é obrigatória'],
      index: true,
    },
    turno: {
      type: String,
      required: [true, 'Turno é obrigatório'],
      enum: ['manha', 'tarde', 'noite'],
      index: true,
    },
    analista: {
      type: String,
      required: [true, 'Nome do analista é obrigatório'],
      trim: true,
      index: true,
    },

    //CAMPOS DE OPERAÇÃO
    alertasCriticos: {
      type: String,
      default: '',
    },
    pendencias: {
      type: String,
      default: '',
    },
    tarefasConcluidas: {
      type: String,
      default: '',
    },
    problemas: {
      type: String,
      default: '',
    },
    prioridades: {
      type: String,
      default: '',
    },
    observacoes: {
      type: String,
      default: '',
    },
    duvidas: {
      type: String,
      default: '',
    },


    //  INDICADORES - PEDIDOS PROCESSADOS
    pedidosProcessados: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentualMeta: {
      type: String,
      default: '0%',
      trim: true,
    },
    slaPedidos: {
      type: String,
      enum: ['atendido', 'nao-atendido'],
      default: 'atendido',
    },


    // INDICADORES - VEÍCULOS LIBERADOS
    veiculosLiberados: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentualSLAVeiculos: {
      type: String,
      default: '0%',
      trim: true,
    },
    slaVeiculosLiberados: {
      type: String,
      enum: ['atendido', 'nao-atendido'],
      default: 'atendido',
    },

    // INDICADORES - VEÍCULOS RECEBIDOS
    veiculosRecebidos: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentualSLARecebidos: {
      type: String,
      default: '0%',
      trim: true,
    },
    slaVeiculosRecebidos: {
      type: String,
      enum: ['atendido', 'nao-atendido'],
      default: 'atendido',
    },

    //  INDICADORES - ABSENTEÍSMO
    absenteismo: {
      type: String,
      default: '0%',
      trim: true,
    },
    absenteismoNumerico: {
      type: Number,
      default: 0,
      min: 0,
    },
      mediaHoraRealizado: {
    type: Number,
    default: 0
  },
  produtividadeIndividual: {
    type: Number,
    default: 0
  },
  metaHoraProjetada: {
    type: Number,
    default: 0
  },
  metaProdutividade: {
    type: Number,
    default: 0
  },
  desvioProdutividade: {
    type: Number,
    default: 0
  },
  slaProdutividade: {
    type: String,
    enum: ['atendido', 'nao-atendido'],
    default: 'atendido'
  }, 
    // FOTOS ANEXADAS
    fotos: [{
      filename: {
        type: String,
        required: true,
      },
      originalName: {
        type: String,
        required: true,
      },
      path: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      size: {
        type: Number,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      }
    }],

    // METADADOS
    enviadoSeaTalk: {
      type: Boolean,
      default: false,
    },
    leituraConcluida: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  }
);

// ÍNDICES
// Índice composto para busca eficiente
passagemTurnoSchema.index({ data: -1, turno: 1 });


// MÉTODOS
// Método para gerar relatório formatado
passagemTurnoSchema.methods.gerarRelatorio = function () {
  const turnoNome = this.turno === 'manha' ? 'Manhã' :
                    this.turno === 'tarde' ? 'Tarde' :
                    'Noite';

  return `
╔═══════════════════════════════════════════════════╗
║          📋 PASSAGEM DE TURNO - LOGÍSTICA         ║
╚═══════════════════════════════════════════════════╝

📅 Data: ${this.data.toLocaleDateString('pt-BR')}
⏰ Turno: ${turnoNome}
👤 Analista: ${this.analista}
${this.alertasCriticos ? `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🚨 ALERTAS CRÍTICOS - ATENÇÃO IMEDIATA!        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
${this.alertasCriticos.split('\n').map(l => l.trim() ? `🔴 ${l.trim()}` : '').filter(Boolean).join('\n')}
` : ''}
${this.pendencias ? `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⏳ PENDÊNCIAS DO TURNO (NÃO RESOLVIDAS)        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
${this.pendencias.split('\n').map(l => l.trim() ? `⏳ ${l.trim()}` : '').filter(Boolean).join('\n')}
` : ''}
${this.tarefasConcluidas ? `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✅ TAREFAS CONCLUÍDAS NO TURNO                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
${this.tarefasConcluidas.split('\n').map(l => l.trim() ? `✅ ${l.trim()}` : '').filter(Boolean).join('\n')}
` : ''}
${this.problemas ? `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚠️ PROBLEMAS/INCIDENTES DO TURNO                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
${this.problemas.split('\n').map(l => l.trim() ? `⚠️ ${l.trim()}` : '').filter(Boolean).join('\n')}
` : ''}
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📊 INDICADORES DO TURNO                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
${this.slaPedidos === 'atendido' ? '🟢' : '🔴'} 📦 Pedidos processados: ${this.pedidosProcessados || 0} | ${this.slaPedidos === 'atendido' ? '✓ Meta Batida' : '✗ Meta Não Batida'}${this.percentualMeta ? ` (${this.percentualMeta})` : ''}
${this.slaVeiculosLiberados === 'atendido' ? '🟢' : '🟠'} 🚚 Veículos liberados: ${this.veiculosLiberados || 0} | ${this.slaVeiculosLiberados === 'atendido' ? '✓ Atendido' : '✗ Não Atendido'}${this.percentualSLAVeiculos ? ` (SLA: ${this.percentualSLAVeiculos})` : ''}
${this.slaVeiculosRecebidos === 'atendido' ? '🟢' : '🟠'} 📥 Veículos recebidos: ${this.veiculosRecebidos || 0} | ${this.slaVeiculosRecebidos === 'atendido' ? '✓ Atendido' : '✗ Não Atendido'}${this.percentualSLARecebidos ? ` (SLA: ${this.percentualSLARecebidos})` : ''}
👥 Absenteísmo: ${this.absenteismo || '0%'}
${this.prioridades ? `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🎯 PRIORIDADES PARA PRÓXIMO TURNO               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
${this.prioridades.split('\n').map(l => l.trim() ? `🎯 ${l.trim()}` : '').filter(Boolean).join('\n')}
` : ''}
${this.observacoes ? `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  💡 OBSERVAÇÕES GERAIS                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
${this.observacoes.split('\n').map(l => l.trim() ? `💡 ${l.trim()}` : '').filter(Boolean).join('\n')}
` : ''}
${this.duvidas ? `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ❓ DÚVIDAS PARA PRÓXIMO ANALISTA                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
${this.duvidas.split('\n').map(l => l.trim() ? `❓ ${l.trim()}` : '').filter(Boolean).join('\n')}
` : ''}
${this.fotos && this.fotos.length > 0 ? `
📸 ${this.fotos.length} foto(s) anexada(s)
` : ''}
╔═══════════════════════════════════════════════════╗
║  ✓ Relatório gerado em ${new Date().toLocaleString('pt-BR').padEnd(24)} ║
║  📤 Sistema de Passagem de Turno v2.0             ║
╚═══════════════════════════════════════════════════╝
  `.trim();
};

module.exports = mongoose.model('PassagemTurno', passagemTurnoSchema);