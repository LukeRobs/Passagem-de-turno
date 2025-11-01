const PassagemTurno = require('../models/passagemTurno');
const googleSheetsService = require('../services/googleSheets.service');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 🚀 WEBHOOK DO SEATALK
const SEATALK_WEBHOOK = 'https://openapi.seatalk.io/webhook/group/TgHMlaM9R7iwEqBZNUTTxA';

const gerarRelatorioFormatado = (passagem) => {
  let dataFormatada = '';
  
  if (passagem.data) {
    if (typeof passagem.data === 'string') {
      if (passagem.data.includes('-')) {
        dataFormatada = passagem.data.split('-').reverse().join('/');
      } else {
        dataFormatada = passagem.data;
      }
    } else if (passagem.data instanceof Date) {
      const dateStr = passagem.data.toISOString().split('T')[0];
      dataFormatada = dateStr.split('-').reverse().join('/');
    }
  }
  
  const turnoNome = passagem.turno === 'manha' ? 'Manhã' :
                    passagem.turno === 'tarde' ? 'Tarde' :
                    'Noite';
  
  const formatarLista = (texto, emoji) => {
    if (!texto) return '';
    return texto
      .split('\n')
      .filter(l => l.trim() !== '')
      .map(l => `${emoji} ${l.trim()}`)
      .join('\n');
  };
  
  const formatarIndicador = (label, valor, sla, tipo = 'meta') => {
    let emoji = '';
    let statusTexto = '';
    
    if (tipo === 'meta') {
      emoji = sla === 'atendido' ? '🟢' : '🔴';
      statusTexto = sla === 'atendido' ? '✓ Meta Batida' : '✗ Meta Não Batida';
    } else {
      emoji = sla === 'atendido' ? '🟢' : '🟠';
      statusTexto = sla === 'atendido' ? '✓ Atendido' : '✗ Não Atendido';
    }
    
    return `${emoji} ${label}: ${valor} | ${statusTexto}`;
  };
  
  let relatorio = '';
  
  relatorio += `╔═══════════════════════════════════════════════════╗\n`;
  relatorio += `║          📋 PASSAGEM DE TURNO - LOGÍSTICA         ║\n`;
  relatorio += `╚═══════════════════════════════════════════════════╝\n\n`;
  
  relatorio += `📅 Data: ${dataFormatada}\n`;
  relatorio += `⏰ Turno: ${turnoNome}\n`;
  relatorio += `👤 Analista: ${passagem.analista}\n\n`;
  
  if (passagem.alertasCriticos) {
    relatorio += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    relatorio += `┃  🚨 ALERTAS CRÍTICOS - ATENÇÃO IMEDIATA!        ┃\n`;
    relatorio += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
    relatorio += `${formatarLista(passagem.alertasCriticos, '🔴')}\n\n`;
  }
  
  if (passagem.pendencias) {
    relatorio += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    relatorio += `┃  ⏳ PENDÊNCIAS DO TURNO (NÃO RESOLVIDAS)        ┃\n`;
    relatorio += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
    relatorio += `${formatarLista(passagem.pendencias, '⏳')}\n\n`;
  }
  
  if (passagem.tarefasConcluidas) {
    relatorio += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    relatorio += `┃  ✅ TAREFAS CONCLUÍDAS NO TURNO                  ┃\n`;
    relatorio += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
    relatorio += `${formatarLista(passagem.tarefasConcluidas, '✅')}\n\n`;
  }
  
  if (passagem.problemas) {
    relatorio += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    relatorio += `┃  ⚠️ PROBLEMAS/INCIDENTES DO TURNO                ┃\n`;
    relatorio += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
    relatorio += `${formatarLista(passagem.problemas, '⚠️')}\n\n`;
  }
  
  relatorio += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
  relatorio += `┃  📊 INDICADORES DO TURNO                         ┃\n`;
  relatorio += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
  
  relatorio += formatarIndicador('📦 Pedidos processados', passagem.pedidosProcessados || 'N/A', passagem.slaPedidos, 'meta');
  if (passagem.percentualMeta) relatorio += ` (${passagem.percentualMeta})`;
  relatorio += '\n';
  
  relatorio += formatarIndicador('🚚 Veículos liberados', passagem.veiculosLiberados || 'N/A', passagem.slaVeiculosLiberados, 'sla');
  if (passagem.percentualSLAVeiculos) relatorio += ` (SLA: ${passagem.percentualSLAVeiculos})`;
  relatorio += '\n';
  
  relatorio += formatarIndicador('📥 Veículos recebidos', passagem.veiculosRecebidos || 'N/A', passagem.slaVeiculosRecebidos, 'sla');
  if (passagem.percentualSLARecebidos) relatorio += ` (SLA: ${passagem.percentualSLARecebidos})`;
  relatorio += '\n';
  
  relatorio += `👥 Absenteísmo: ${passagem.absenteismo || '0%'}\n`;
  
  // ✅ ADICIONAR PRODUTIVIDADE
  if (passagem.produtividadeIndividual) {
    relatorio += '\n';
    relatorio += formatarIndicador('📈 Produtividade Individual', passagem.produtividadeIndividual || 'N/A', passagem.slaProdutividade, 'meta');
    relatorio += ` (Meta: ${passagem.metaProdutividade || 'N/A'})`;
    relatorio += '\n';
    
    relatorio += `📦 Média Hora Realizado: ${passagem.mediaHoraRealizado || 0} pacotes (Meta: ${passagem.metaHoraProjetada || 0})\n`;
    
// ✅ DEPOIS (corrigido)
  if (passagem.desvioProdutividade !== undefined) {
    const desvioNumerico = parseFloat(passagem.desvioProdutividade || 0);
    const desvioFormatado = desvioNumerico > 0 
      ? `+${desvioNumerico.toFixed(2)}%` 
      : `${desvioNumerico.toFixed(2)}%`;
    const emojiDesvio = desvioNumerico >= 0 ? '📈' : '📉';
    relatorio += `${emojiDesvio} Desvio de Produtividade: ${desvioFormatado}\n`;
  }
  }
  
  relatorio += '\n';
  
  if (passagem.prioridades) {
    relatorio += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    relatorio += `┃  🎯 PRIORIDADES PARA PRÓXIMO TURNO               ┃\n`;
    relatorio += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
    relatorio += `${formatarLista(passagem.prioridades, '🎯')}\n\n`;
  }
  
  if (passagem.observacoes) {
    relatorio += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    relatorio += `┃  💡 OBSERVAÇÕES GERAIS                           ┃\n`;
    relatorio += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
    relatorio += `${formatarLista(passagem.observacoes, '💡')}\n\n`;
  }
  
  if (passagem.duvidas) {
    relatorio += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    relatorio += `┃  ❓ DÚVIDAS PARA PRÓXIMO ANALISTA                ┃\n`;
    relatorio += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
    relatorio += `${formatarLista(passagem.duvidas, '❓')}\n\n`;
  }
  
  // Adicionar links das fotos no relatório
  if (passagem.fotos && passagem.fotos.length > 0) {
    relatorio += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    relatorio += `┃  📎 EVIDÊNCIAS FOTOGRÁFICAS (${passagem.fotos.length})                 ┃\n`;
    relatorio += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
    
    const baseURL = process.env.BASE_URL || 'http://localhost:5000';
    
    passagem.fotos.forEach((foto, index) => {
      const fotoURL = `${baseURL}${foto.url}`;
      relatorio += `📷 Foto ${index + 1}: ${foto.originalName}\n`;
      relatorio += `🔗 Evidência: ${fotoURL}\n\n`;
    });
  }
  
  relatorio += `╔═══════════════════════════════════════════════════╗\n`;
  relatorio += `║  ✓ Relatório gerado em ${new Date().toLocaleString('pt-BR').padEnd(24)} ║\n`;
  relatorio += `║  📤 Sistema de Passagem de Turno v2.0             ║\n`;
  relatorio += `╚═══════════════════════════════════════════════════╝`;
  
  return relatorio;
};

const criarPassagem = async (req, res) => {
  try {
    console.log('\n📝 ===== CRIANDO NOVA PASSAGEM =====');
    console.log('📦 Campos recebidos:', Object.keys(req.body).join(', '));
    console.log('📸 Fotos processadas:', req.fotosProcessadas?.length || 0);
    
    // Adicionar fotos processadas ao body
    if (req.fotosProcessadas && req.fotosProcessadas.length > 0) {
      req.body.fotos = req.fotosProcessadas.map(foto => ({
        filename: foto.filename,
        originalName: foto.originalName,
        path: foto.path,
        url: foto.url,
        size: foto.size,
        uploadedAt: new Date()
      }));
      
      console.log(`✅ ${req.body.fotos.length} foto(s) adicionada(s) ao documento`);
      
      // Log detalhado de cada foto
      req.body.fotos.forEach((foto, i) => {
        console.log(`   📷 Foto ${i + 1}:`);
        console.log(`      - Nome: ${foto.originalName}`);
        console.log(`      - Arquivo: ${foto.filename}`);
        console.log(`      - Path: ${foto.path}`);
        console.log(`      - Existe: ${fs.existsSync(foto.path) ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`      - Tamanho: ${(foto.size / 1024).toFixed(2)} KB`);
      });
    } else {
      console.log('ℹ️ Nenhuma foto foi anexada');
    }
    
    const passagem = new PassagemTurno(req.body);
    await passagem.save();
    
    console.log('✅ Passagem salva no MongoDB!');
    console.log('📄 ID: ' + passagem._id);
    console.log('📸 Fotos no banco: ' + (passagem.fotos?.length || 0));
    
    res.status(201).json({
      success: true,
      message: `Passagem criada com sucesso${req.body.fotos ? ` com ${req.body.fotos.length} foto(s)` : ''}`,
      data: passagem
    });
  } catch (error) {
    console.error('❌ Erro ao criar passagem:', error);
    res.status(400).json({
      success: false,
      message: 'Erro ao criar passagem',
      error: error.message
    });
  }
};

const enviarParaSeaTalk = async (req, res) => {
  try {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║         📤 ENVIANDO PARA SEATALK                  ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    
    const { passagemId, dadosFormulario } = req.body;
    
    let passagemCompleta, relatorio;
    
    // Buscar passagem
    if (passagemId) {
      console.log('🔍 Buscando passagem ID:', passagemId);
      passagemCompleta = await PassagemTurno.findById(passagemId);
      
      if (!passagemCompleta) {
        console.log('❌ Passagem não encontrada\n');
        return res.status(404).json({ 
          success: false, 
          message: 'Passagem não encontrada' 
        });
      }
      
      console.log('✅ Passagem encontrada!');
      console.log(`   📊 Analista: ${passagemCompleta.analista}`);
      console.log(`   📅 Data: ${passagemCompleta.data}`);
      console.log(`   ⏰ Turno: ${passagemCompleta.turno}`);
      console.log(`   📸 Fotos: ${passagemCompleta.fotos?.length || 0}`);
      console.log('');
      
      relatorio = gerarRelatorioFormatado(passagemCompleta);
    } else if (dadosFormulario) {
      console.log('📝 Usando dados do formulário\n');
      passagemCompleta = dadosFormulario;
      relatorio = gerarRelatorioFormatado(dadosFormulario);
    } else {
      console.log('❌ Nenhum dado fornecido\n');
      return res.status(400).json({
        success: false,
        message: 'É necessário fornecer passagemId ou dadosFormulario'
      });
    }
    
    // ENVIAR RELATÓRIO
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  📨 ENVIANDO RELATÓRIO COMPLETO                   ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n');
    
    const responseTexto = await axios.post(SEATALK_WEBHOOK, {
      tag: "text",
      text: { 
        format: 1, 
        content: relatorio 
      }
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`📡 Status: ${responseTexto.status}`);
    console.log('✅ Relatório enviado com sucesso!\n');
    
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║         ✅ ENVIO CONCLUÍDO COM SUCESSO!           ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    
    const numFotos = passagemCompleta.fotos?.length || 0;
    const mensagemFinal = numFotos > 0 
      ? `Relatório enviado com ${numFotos} link(s) de foto(s)!`
      : 'Relatório enviado com sucesso!';
    
    res.status(200).json({
      success: true,
      message: mensagemFinal,
      data: {
        timestamp: new Date().toISOString(),
        fotosIncluidas: numFotos
      }
    });
    
  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════╗');
    console.error('║         ❌ ERRO GERAL AO ENVIAR                   ║');
    console.error('╚═══════════════════════════════════════════════════╝');
    console.error('Erro:', error.message);
    console.error('');
    
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar para SeaTalk',
      error: error.message
    });
  }
};

const buscarDadosAutomaticos = async (req, res) => {
  try {
    const { data, turno } = req.query;
    
    console.log('\n🔄 ===== BUSCANDO DADOS AUTOMÁTICOS =====');
    console.log('📅 Data:', data);
    console.log('⏰ Turno:', turno);
    
    if (!data || !turno) {
      return res.status(400).json({ 
        success: false, 
        message: 'Data e turno são obrigatórios' 
      });
    }
    
    // Buscar métricas
    let resultadoMetricas;
    try {
      resultadoMetricas = await googleSheetsService.buscarDadosMetricas(turno, data);
      console.log('📊 Métricas:', resultadoMetricas.success ? '✅ OK' : '❌ Falhou');
    } catch (err) {
      console.error('❌ Erro ao buscar métricas:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar métricas', 
        error: err.message 
      });
    }
    
    if (!resultadoMetricas || !resultadoMetricas.success) {
      const msg = resultadoMetricas?.message || 'Resultado inválido';
      console.warn('⚠️', msg);
      return res.status(500).json({ success: false, message: msg });
    }
    
    const dados = resultadoMetricas.data || {};
    
    // Buscar absenteísmo
    let resultadoAbsenteismo;
    try {
      resultadoAbsenteismo = await googleSheetsService.buscarAbsenteismo();
      console.log('👥 Absenteísmo:', resultadoAbsenteismo.data?.absenteismoFormatado || '0%');
    } catch (err) {
      console.error('⚠️ Erro ao buscar absenteísmo:', err.message);
      resultadoAbsenteismo = { data: { absenteismoFormatado: '0%' } };
    }
    
    // ✅ Buscar produtividade
    let resultadoProdutividade;
    try {
      resultadoProdutividade = await googleSheetsService.buscarProdutividade();
      console.log('📊 Produtividade:', resultadoProdutividade.produtividadeIndividual || 0);
    } catch (err) {
      console.error('⚠️ Erro ao buscar produtividade:', err.message);
      resultadoProdutividade = {
        mediaHoraRealizado: 0,
        produtividadeIndividual: 0,
        metaHoraProjetada: 0,
        metaProdutividade: 0,
        desvioProdutividade: 0,
        metaProdutividadeBatida: false
      };
    }
    
    const dadosAutomaticos = {
      pedidosProcessados: dados.pedidosProcessados || 0,
      slaPedidos: dados.metaBatida ? 'atendido' : 'nao-atendido',
      percentualMeta: dados.percentual || 0,
      metaPedidos: dados.meta || 0,
      veiculosLiberados: dados.veiculosLiberados || 0,
      slaVeiculosLiberados: dados.veiculosStatusSLA || 'nao-atendido',
      percentualSLALiberados: dados.veiculosPercentualSLA || 0,
      veiculosRecebidos: dados.veiculosRecebidos || 0,
      slaVeiculosRecebidos: dados.recebidosStatusSLA || 'nao-atendido',
      percentualSLARecebidos: dados.recebidosPercentualSLA || 0,
      absenteismo: resultadoAbsenteismo.data?.absenteismoFormatado || '0%',
      
      // ✅ ADICIONAR PRODUTIVIDADE
      mediaHoraRealizado: resultadoProdutividade.mediaHoraRealizado,
      produtividadeIndividual: resultadoProdutividade.produtividadeIndividual,
      metaHoraProjetada: resultadoProdutividade.metaHoraProjetada,
      metaProdutividade: resultadoProdutividade.metaProdutividade,
      desvioProdutividade: resultadoProdutividade.desvioProdutividade,
      slaProdutividade: resultadoProdutividade.metaProdutividadeBatida ? 'atendido' : 'nao-atendido'
    };
    
    console.log('✅ Dados preparados com sucesso\n');
    
    res.json({
      success: true,
      data: dadosAutomaticos,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados automáticos',
      error: error.message
    });
  }
};

const listarPassagens = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const { analista } = req.query;
    const filtro = {};
    if (analista) {
      filtro.analista = analista;
      console.log(`🔍 Filtrando passagens do analista: ${analista}`);
    }
    
    const passagens = await PassagemTurno.find(filtro)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await PassagemTurno.countDocuments(filtro);
    
    console.log(`📋 ${passagens.length} passagens encontradas (total: ${total})`);
    
    res.json({
      success: true,
      data: passagens,
      pagination: { 
        page, 
        limit, 
        total, 
        pages: Math.ceil(total / limit) 
      }
    });
  } catch (error) {
    console.error('❌ Erro ao listar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar passagens', 
      error: error.message 
    });
  }
};

const buscarPassagemPorId = async (req, res) => {
  try {
    const passagem = await PassagemTurno.findById(req.params.id);
    
    if (!passagem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Passagem não encontrada' 
      });
    }
    
    res.json({ success: true, data: passagem });
  } catch (error) {
    console.error('❌ Erro ao buscar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar passagem', 
      error: error.message 
    });
  }
};

const atualizarPassagem = async (req, res) => {
  try {
    const passagem = await PassagemTurno.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!passagem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Passagem não encontrada' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Passagem atualizada com sucesso', 
      data: passagem 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Erro ao atualizar passagem', 
      error: error.message 
    });
  }
};

const excluirPassagem = async (req, res) => {
  try {
    const passagem = await PassagemTurno.findByIdAndDelete(req.params.id);
    
    if (!passagem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Passagem não encontrada' 
      });
    }
    
    // Excluir fotos físicas
    if (passagem.fotos && passagem.fotos.length > 0) {
      passagem.fotos.forEach(foto => {
        if (fs.existsSync(foto.path)) {
          fs.unlinkSync(foto.path);
          console.log(`🗑️ Foto excluída: ${foto.filename}`);
        }
      });
    }
    
    res.json({ success: true, message: 'Passagem excluída com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao excluir passagem', 
      error: error.message 
    });
  }
};

const gerarRelatorio = async (req, res) => {
  try {
    const passagem = await PassagemTurno.findById(req.params.id);
    
    if (!passagem) {
      return res.status(404).json({
        success: false,
        message: 'Passagem não encontrada'
      });
    }
    
    const relatorio = gerarRelatorioFormatado(passagem);
    
    res.json({
      success: true,
      data: {
        relatorio,
        passagem
      }
    });
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório',
      error: error.message
    });
  }
};

module.exports = {
  criarPassagem,
  listarPassagens,
  buscarPassagemPorId,
  atualizarPassagem,
  excluirPassagem,
  gerarRelatorioFormatado,
  gerarRelatorio,
  enviarParaSeaTalk,
  buscarDadosAutomaticos
};