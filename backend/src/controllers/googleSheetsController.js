const { buscarDadosMetricas } = require('../services/googleSheets.service');

// 🔄 Buscar dados automáticos do Google Sheets
const buscarDadosAutomaticos = async (req, res) => {
  try {
    console.log('🔄 Requisição para buscar dados automáticos...');
    const { turno, data } = req.body;

    if (!turno || !data) {
      return res.status(400).json({
        success: false,
        message: 'Turno e data são obrigatórios'
      });
    }

    console.log(`📊 Buscando dados: Turno ${turno}, Data ${data}`);

    // Buscar dados da planilha
    const resultado = await buscarDadosMetricas(turno, data);

    const mensagem = resultado.data.divergencia 
      ? `⚠️ Dados buscados! Atenção: divergência detectada (Soma: ${resultado.data.somaCalculada}, Total: ${resultado.data.pedidosProcessados})`
      : `✅ Dados buscados e validados com sucesso!`;

    res.status(200).json({
      success: true,
      message: mensagem,
      data: resultado.data
    });

  } catch (error) {
    console.error('❌ Erro ao buscar dados automáticos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do Google Sheets',
      error: error.message
    });
  }
};

module.exports = {
  buscarDadosAutomaticos
};