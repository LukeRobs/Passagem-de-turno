const { google } = require('googleapis');

// 📊 CONFIGURAÇÃO DAS PLANILHAS
const SPREADSHEET_ID = '1dMTrj5Pl4fujD3xoRoVgCW3_xtAG1a-bdM6TKi1S_EU';
const METRICAS_SHEET = 'Métricas';

// 🚚 PLANILHA DE VEÍCULOS LIBERADOS
const EXPEDICAO_SPREADSHEET_ID = '1BmtGEa7LFCATCdQxIAv8CWc2NUojk6N3k41LA6WjK8s';
const EXPEDICAO_SHEET = 'dbExpedicao';

// 🚛 PLANILHA BASE LH (MAPEAMENTO LT → TURNO)
const BASE_LH_SPREADSHEET_ID = '1YCjI5mkWWxuv9rzjBxAcLib4X1oUbk_nrWMVFKZ0jTk';
const BASE_LH_SHEET = 'Base LH🚛';

// 📦 PLANILHA DE VEÍCULOS RECEBIDOS
const RECEBIDOS_SPREADSHEET_ID = '1S84eENWSJdx1LnDlSMqZfVxPpg2ycgGpqx0O9XXOVow';
const RECEBIDOS_SHEET = 'db_base';

// 🔧 Inicializar Google Sheets API
const getGoogleSheetsClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
};

// 📅 Formatar data para buscar na planilha
const formatarDataParaPlanilha = (date) => {
  // Recebe no formato: "2025-10-24"
  // Retorna no formato: "24/10/2025"
  const [ano, mes, dia] = date.split('-');
  return `${dia}/${mes}/${ano}`;
};
const normalizarData = (data) => {
  if (!data) return '';

  const dataStr = data.toString().trim();

  // Se já está no formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
    return dataStr;
  }

  // Se está no formato YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(dataStr)) {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
  }

  // Se está no formato DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dataStr)) {
    return dataStr.replace(/-/g, '/');
  }

  // Tentar converter objeto Date
  try {
    const dateObj = new Date(dataStr);
    if (!isNaN(dateObj.getTime())) {
      const dia = String(dateObj.getDate()).padStart(2, '0');
      const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
      const ano = dateObj.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
  } catch (e) {
    console.warn(`⚠️ Não foi possível normalizar a data: ${dataStr}`);
  }

  return dataStr;
};
// 🚛 Buscar mapeamento LT → Turno da Base LH
const buscarMapeamentoLTTurno = async () => {
  try {
    console.log('🚛 Buscando mapeamento LT → Turno da Base LH...');
    
    const sheets = getGoogleSheetsClient();
    
    // Buscar todas as linhas da aba Base LH
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: BASE_LH_SPREADSHEET_ID,
      range: `${BASE_LH_SHEET}!A:N`,
    });
    
    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.warn('⚠️ Nenhum dado encontrado na Base LH');
      return new Map();
    }
    
    // Criar mapa: LT → Turno
    const mapeamento = new Map();
    
    // Primeira linha é cabeçalho, começar da linha 2
    for (let i = 1; i < rows.length; i++) {
      const lt = rows[i][0]; // Coluna A (índice 0) - LH
      const turno = rows[i][13]; // Coluna N (índice 13) - Turno
      
      if (lt && turno) {
        mapeamento.set(lt.trim(), turno.trim());
      }
    }
    
    console.log(`✅ Mapeamento carregado: ${mapeamento.size} LTs encontradas`);
    
    return mapeamento;
    
  } catch (error) {
    console.error('❌ Erro ao buscar mapeamento Base LH:', error.message);
    // Retornar mapa vazio em caso de erro (não quebrar o sistema)
    return new Map();
  }
};

// 📊 Buscar dados da planilha
const buscarDadosMetricas = async (turno, data) => {
  try {
    console.log(`📊 Buscando dados da planilha para ${turno} em ${data}`);
    
    const sheets = getGoogleSheetsClient();
    
    // ⭐ NOVO: Buscar meta da célula AM15 da aba Operation Overview
    console.log('🎯 Buscando meta da célula AM15...');
    let meta = 0;
    try {
      const metaResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Operation Overview!AM15:AM15',
      });
      
      // Validação segura dos dados
      if (metaResponse && metaResponse.data && metaResponse.data.values && metaResponse.data.values.length > 0) {
        const metaValor = metaResponse.data.values[0][0];
        if (metaValor) {
          meta = parseFloat(metaValor.toString().replace(/\./g, '').replace(',', '.')) || 0;
        }
      }
      console.log(`🎯 Meta encontrada: ${meta}`);
    } catch (metaError) {
      console.warn('⚠️ Erro ao buscar meta, usando valor padrão 0:', metaError.message);
      meta = 0;
    }
    
    // Buscar todas as linhas da aba Métricas
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${METRICAS_SHEET}!A:ZZ`,
    });
    
    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      throw new Error('Nenhum dado encontrado na planilha');
    }
    
    // Primeira linha é o cabeçalho
    const cabecalho = rows[0];
    console.log('📋 Cabeçalho:', cabecalho.slice(0, 15).join(', '));
    
    // Converter turno do sistema para formato da planilha
    const turnoMap = {
      'manha': 'T1',
      'tarde': 'T2',
      'noite': 'T3'
    };
    const turnoBusca = turnoMap[turno] || turno.toUpperCase();
    
    // Formatar data de busca
    const dataBusca = formatarDataParaPlanilha(data);
    console.log(`🔍 Buscando linha com Turno: ${turnoBusca} e Data: ${dataBusca}`);
    
    // Encontrar linha com turno (coluna A) E data (coluna B)
    let linhaEncontrada = null;
    let linhaIndice = -1;
    
    for (let i = 1; i < rows.length; i++) {
      const turnoLinha = rows[i][0]; // Coluna A (índice 0)
      const dataLinha = rows[i][1];  // Coluna B (índice 1)
      
      if (turnoLinha === turnoBusca && dataLinha === dataBusca) {
        linhaEncontrada = rows[i];
        linhaIndice = i + 1;
        console.log(`✅ Linha encontrada: ${linhaIndice} (Turno: ${turnoBusca}, Data: ${dataBusca})`);
        break;
      }
    }
    
    if (!linhaEncontrada) {
      throw new Error(`Nenhum dado encontrado para Turno ${turnoBusca} e Data ${dataBusca}`);
    }
    
    // Somar colunas C até J (índices 2 até 9)
    let somaCalculada = 0;
    const detalheColunas = [];
    
    for (let i = 2; i <= 9; i++) {
      const valor = parseInt(linhaEncontrada[i]) || 0;
      somaCalculada += valor;
      
      const nomeColuna = cabecalho[i] || `Coluna ${String.fromCharCode(67 + i - 2)}`;
      detalheColunas.push({ coluna: nomeColuna, valor });
      console.log(`  ✓ ${nomeColuna}: ${valor}`);
    }
    
    // Pegar valor da coluna K (TOTAL - índice 10)
    const totalPlanilha = parseInt(linhaEncontrada[10]) || 0;
    
    console.log(`📊 Soma calculada (C:J): ${somaCalculada}`);
    console.log(`📊 Total na planilha (K): ${totalPlanilha}`);
    console.log(`🎯 Meta: ${meta}`);
    
    // Validar se a soma bate com o total
    if (somaCalculada !== totalPlanilha) {
      console.warn(`⚠️ ATENÇÃO: Soma calculada (${somaCalculada}) diferente do total da planilha (${totalPlanilha})`);
    } else {
      console.log(`✅ Validação OK: Soma bate com o total da planilha!`);
    }
    
    // ⭐ NOVO: Calcular comparação com a meta
    const metaBatida = totalPlanilha >= meta;
    const percentual = meta > 0 ? ((totalPlanilha / meta) * 100).toFixed(1) : 0;
    const diferenca = totalPlanilha - meta;
    
    console.log(`📊 Comparação Meta:`);
    console.log(`  - Realizado: ${totalPlanilha}`);
    console.log(`  - Meta: ${meta}`);
    console.log(`  - Percentual: ${percentual}%`);
    console.log(`  - Status: ${metaBatida ? '✅ Meta Batida' : '❌ Meta Não Batida'}`);
    console.log(`  - Diferença: ${diferenca > 0 ? `+${diferenca}` : diferenca}`);
    
    // 🚚 NOVO: Buscar veículos liberados
    let dadosVeiculos = null;
    try {
      const resultadoVeiculos = await buscarVeiculosLiberados(turno, data);
      dadosVeiculos = resultadoVeiculos.data;
      console.log(`🚚 Veículos liberados: ${dadosVeiculos.veiculosLiberados}`);
      console.log(`🚚 SLA Veículos: ${dadosVeiculos.percentualSLA}% (${dadosVeiculos.slaAtendido}/${dadosVeiculos.totalRegistros})`);
    } catch (veiculosError) {
      console.warn('⚠️ Erro ao buscar veículos liberados, continuando sem esses dados:', veiculosError.message);
      dadosVeiculos = {
        veiculosLiberados: 0,
        totalRegistros: 0,
        slaAtendido: 0,
        slaNaoAtendido: 0,
        percentualSLA: 0,
        statusSLA: 'atendido',
        detalheLTs: [],
        dataConsultada: dataBusca
      };
    }
    
    // 📦 NOVO: Buscar veículos recebidos
    let dadosRecebidos = null;
    try {
      const resultadoRecebidos = await buscarVeiculosRecebidos(turno, data);
      dadosRecebidos = resultadoRecebidos.data;
      console.log(`📦 Veículos recebidos: ${dadosRecebidos.veiculosRecebidos}`);
      console.log(`📦 SLA Veículos Recebidos: ${dadosRecebidos.percentualSLA}% (${dadosRecebidos.slaAtendido}/${dadosRecebidos.totalRegistros})`);
    } catch (recebidosError) {
      console.warn('⚠️ Erro ao buscar veículos recebidos, continuando sem esses dados:', recebidosError.message);
      dadosRecebidos = {
        veiculosRecebidos: 0,
        totalRegistros: 0,
        slaAtendido: 0,
        slaNaoAtendido: 0,
        percentualSLA: 0,
        statusSLA: 'atendido',
        detalheLTs: [],
        dataReferencia: null
      };
    }
    
    return {
      success: true,
      data: {
        pedidosProcessados: totalPlanilha,
        meta: meta,
        metaBatida: metaBatida,
        percentual: parseFloat(percentual),
        diferenca: diferenca,
        somaCalculada: somaCalculada,
        divergencia: somaCalculada !== totalPlanilha,
        detalheColunas: detalheColunas,
        dataConsultada: dataBusca,
        turnoConsultado: turnoBusca,
        // 🚚 Dados de veículos liberados
        veiculosLiberados: dadosVeiculos.veiculosLiberados,
        veiculosSlaAtendido: dadosVeiculos.slaAtendido,
        veiculosSlaNaoAtendido: dadosVeiculos.slaNaoAtendido,
        veiculosPercentualSLA: dadosVeiculos.percentualSLA,
        veiculosStatusSLA: dadosVeiculos.statusSLA,
        veiculosDetalheLTs: dadosVeiculos.detalheLTs,
        // 📦 NOVO: Dados de veículos recebidos
        veiculosRecebidos: dadosRecebidos.veiculosRecebidos,
        recebidosSlaAtendido: dadosRecebidos.slaAtendido,
        recebidosSlaNaoAtendido: dadosRecebidos.slaNaoAtendido,
        recebidosPercentualSLA: dadosRecebidos.percentualSLA,
        recebidosStatusSLA: dadosRecebidos.statusSLA,
        recebidosDetalheLTs: dadosRecebidos.detalheLTs,
        recebidosDataReferencia: dadosRecebidos.dataReferencia
      },
      message: `✅ Dados atualizados! ${metaBatida ? '🎉' : '⚠️'} Meta: ${percentual}% ${metaBatida ? '- Meta Batida!' : '- Meta Não Batida'} | 🚚 Veículos Liberados: ${dadosVeiculos.veiculosLiberados} (SLA: ${dadosVeiculos.percentualSLA}%) | 📦 Veículos Recebidos: ${dadosRecebidos.veiculosRecebidos} (SLA: ${dadosRecebidos.percentualSLA}%)`
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados da planilha:', error);
    throw error;
  }
};

// 🚚 Buscar veículos liberados da planilha de expedição
const buscarVeiculosLiberados = async (turno, data) => {
  try {
    console.log(`🚚 Buscando veículos liberados para ${turno} em ${data}`);
    
    const sheets = getGoogleSheetsClient();
    
    // Converter turno do sistema para formato da planilha
    const turnoMap = {
      'manha': 'T1',
      'tarde': 'T2',
      'noite': 'T3'
    };
    const turnoBusca = turnoMap[turno] || turno.toUpperCase();
    console.log(`🔍 Filtrando LTs do turno: ${turnoBusca}`);
    
    // Buscar todas as linhas da aba dbExpedicao
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: EXPEDICAO_SPREADSHEET_ID,
      range: `${EXPEDICAO_SHEET}!A:Z`,
    });
    
    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      throw new Error('Nenhum dado encontrado na planilha de expedição');
    }
    
    // Primeira linha é o cabeçalho
    const cabecalho = rows[0];
    console.log('📋 Cabeçalho Expedição:', cabecalho.slice(0, 15).join(', '));
    
    // Formatar data de busca
    const dataBusca = formatarDataParaPlanilha(data);
    console.log(`🔍 Buscando LTs expedidas em: ${dataBusca}`);
    
    // Filtrar linhas por data e turno, e coletar LTs
    const ltsExpedidas = new Set(); // Usar Set para garantir LTs únicas
    const ltsComSLA = [];
    let linhasEncontradas = 0;
    let ltsFiltradasPorTurno = 0;
    
    for (let i = 1; i < rows.length; i++) {
      const linha = rows[i];
      const dataLinha = linha[2]; // Coluna C (índice 2) - Data
      
      // Debug: mostrar primeiras linhas
      if (i <= 5) {
        console.log(`  Linha ${i}: Data="${dataLinha}", LT="${linha[1]}", Turno="${linha[23]}"`);
      }
      
      if (dataLinha === dataBusca) {
        linhasEncontradas++;
        const lt = linha[1]; // Coluna B (índice 1) - LT
        const cptPlanejado = linha[7]; // Coluna H (índice 7) - CPT_Planejado
        const cptRealizado = linha[8]; // Coluna I (índice 8) - CPT_Realizado
        const turnoLinha = linha[23]; // Coluna X (índice 23) - Turno ⭐ NOVO
        
        if (lt && lt.trim() !== '') {
          const ltTrim = lt.trim();
          
          // 🚚 Verificar se a LT pertence ao turno correto (agora usando coluna X)
          if (turnoLinha === turnoBusca) {
            // ✅ LT pertence ao turno correto
            ltsExpedidas.add(ltTrim);
            ltsFiltradasPorTurno++;
            
            // Verificar SLA: CPT_Realizado <= CPT_Planejado
            let slaAtendido = false;
            if (cptPlanejado && cptRealizado) {
              try {
                // Tentar comparar como strings de hora/data
                slaAtendido = cptRealizado <= cptPlanejado;
              } catch (e) {
                slaAtendido = false;
              }
            }
            
            ltsComSLA.push({
              lt: ltTrim,
              turno: turnoLinha,
              cptPlanejado: cptPlanejado || 'N/A',
              cptRealizado: cptRealizado || 'N/A',
              slaAtendido: slaAtendido
            });
            
            // Log das primeiras 5 LTs para debug
            if (ltsFiltradasPorTurno <= 5) {
              console.log(`  ✅ LT ${ltTrim} (${turnoLinha}): CPT Planejado: ${cptPlanejado}, CPT Realizado: ${cptRealizado}, SLA: ${slaAtendido ? '✅' : '❌'}`);
            }
          } else {
            // ❌ LT de outro turno, ignorar
            if (linhasEncontradas <= 5) {
              console.log(`  ⏭️  LT ${ltTrim} ignorada (pertence ao turno ${turnoLinha || 'desconhecido'}, buscando ${turnoBusca})`);
            }
          }
        }
      }
    }
    
    const totalLTs = ltsExpedidas.size; // Número de LTs ÚNICAS do turno correto
    const totalRegistros = ltsComSLA.length; // Total de registros (pode ter LTs repetidas)
    const ltsComSLAAtendido = ltsComSLA.filter(lt => lt.slaAtendido).length;
    const percentualSLA = totalRegistros > 0 ? ((ltsComSLAAtendido / totalRegistros) * 100).toFixed(1) : 0;
    
    console.log(`📊 Linhas encontradas para a data: ${linhasEncontradas}`);
    console.log(`📊 LTs filtradas pelo turno ${turnoBusca}: ${ltsFiltradasPorTurno}`);
    console.log(`📊 Total de registros processados: ${totalRegistros}`);
    console.log(`📊 LTs ÚNICAS expedidas (turno ${turnoBusca}): ${totalLTs}`);
    console.log(`📊 Lista de LTs únicas: ${Array.from(ltsExpedidas).slice(0, 10).join(', ')}${totalLTs > 10 ? '...' : ''}`);
    console.log(`📊 LTs com SLA atendido: ${ltsComSLAAtendido}/${totalRegistros}`);
    console.log(`📊 Percentual de SLA: ${percentualSLA}%`);
    
    return {
      success: true,
      data: {
        veiculosLiberados: totalLTs, // COUNT de LTs únicas do turno correto
        totalRegistros: totalRegistros, // Total de registros do turno
        slaAtendido: ltsComSLAAtendido,
        slaNaoAtendido: totalRegistros - ltsComSLAAtendido,
        percentualSLA: parseFloat(percentualSLA),
        statusSLA: totalRegistros > 0 && ltsComSLAAtendido === totalRegistros ? 'atendido' : 'nao-atendido', // ⭐ RIGOROSO: 100% apenas
        detalheLTs: ltsComSLA,
        ltsUnicas: Array.from(ltsExpedidas), // Array com LTs únicas do turno
        dataConsultada: dataBusca,
        turnoFiltrado: turnoBusca
      }
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar veículos liberados:', error);
    throw error;
  }
};

// 📦 Buscar veículos recebidos da planilha db_base
// ⭐ FUNÇÃO COMPLETAMENTE REESCRITA
const buscarVeiculosRecebidos = async (turno, data) => {
  console.log('=== BUSCAR VEÍCULOS RECEBIDOS ===');

  let dataBusca = null;

  try {
    console.log(`📦 Origem: Aba ${RECEBIDOS_SHEET}`);
    console.log(`📦 Filtros: Turno=${turno}, Data=${data}`);

    if (!data) {
      console.warn('⚠️ Nenhuma data informada, abortando busca de veículos recebidos.');
      return {
        success: false,
        error: 'Data não informada',
        data: null
      };
    }

    const sheets = getGoogleSheetsClient();

    // Converter turno do sistema para formato da planilha
    const turnoMap = {
      'manha': 'T1',
      'tarde': 'T2',
      'noite': 'T3'
    };
    const turnoBusca = turnoMap[turno] || turno.toUpperCase();

    // Formatar data de busca
    dataBusca = formatarDataParaPlanilha(data);
    console.log(`🔍 Filtrando veículos recebidos de ${dataBusca} do turno: ${turnoBusca}`);

    // ⭐ Buscar da aba db_base até coluna X (índice 23)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: RECEBIDOS_SPREADSHEET_ID,
      range: `${RECEBIDOS_SHEET}!A:X`,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.warn('⚠️ Nenhum dado encontrado na aba db_base');
      return {
        success: true,
        data: {
          veiculosRecebidos: 0,
          totalRegistros: 0,
          slaAtendido: 0,
          slaNaoAtendido: 0,
          percentualSLA: 0,
          statusSLA: 'nao-atendido',
          detalheLTs: [],
          ltsUnicas: [],
          dataReferencia: dataBusca || data,
          turnoFiltrado: turnoBusca
        }
      };
    }

    console.log(`📊 Total de linhas na planilha: ${rows.length}`);

    // Primeira linha é o cabeçalho
    const cabecalho = rows[0];
    console.log('📋 Cabeçalho Recebidos (db_base):', cabecalho.slice(0, 15).join(', '));

    // Remover cabeçalho
    const dataRows = rows.slice(1);

    // Filtrar por data e turno
    const veiculosFiltrados = dataRows.filter(row => {
      // ⭐ Coluna B (índice 1): dt_eta - Data
      const dtEta = row[1] || '';

      // ⭐ Coluna M (índice 12): turno_descarga - Turno
      const turnoDescarga = row[12] || '';

      // Normalizar data para comparação
      const dataRow = normalizarData(dtEta);
      const dataFiltro = normalizarData(dataBusca);

      // Normalizar turno (remover espaços e converter para maiúsculas)
      const turnoRow = turnoDescarga.toString().trim().toUpperCase();
      const turnoFiltro = turnoBusca.toString().trim().toUpperCase();

      const matchData = dataRow === dataFiltro;
      const matchTurno = turnoRow === turnoFiltro;

      return matchData && matchTurno;
    });

    console.log(`✅ Veículos filtrados (data + turno): ${veiculosFiltrados.length}`);

    // Coletar LTs únicas e verificar SLA
    const ltsRecebidas = new Set();
    const ltsComSLA = [];
    let slaAtendido = 0;
    let slaNaoAtendido = 0;

    veiculosFiltrados.forEach((row, index) => {
      // ⭐ Coluna C (índice 2): lh_trip - Código LT
      const lhTrip = row[2] || '';

      // ⭐ Coluna X (índice 23): Status descarga - Verifica SLA
      const statusDescarga = (row[23] || '').toString().trim().toUpperCase();

      if (lhTrip && lhTrip.trim() !== '') {
        const ltTrim = lhTrip.trim();
        ltsRecebidas.add(ltTrim);

        // Lógica de SLA
        const slaOK = statusDescarga && !statusDescarga.includes('ATRASADO');
        if (slaOK) slaAtendido++;
        else slaNaoAtendido++;

        ltsComSLA.push({
          lt: ltTrim,
          turno: row[12] || '',
          statusDescarga: statusDescarga || 'VAZIO',
          slaAtendido: slaOK
        });

        // Log das primeiras 10 LTs
        if (index < 10) {
          console.log(`  ${slaOK ? '✅' : '❌'} LT ${ltTrim}: Status="${statusDescarga || 'VAZIO'}", SLA: ${slaOK ? 'ATENDIDO' : 'NÃO ATENDIDO'}`);
        }
      }
    });

    const totalLTs = ltsRecebidas.size;
    const totalRegistros = ltsComSLA.length;
    const percentualSLA = totalRegistros > 0 ? ((slaAtendido / totalRegistros) * 100).toFixed(1) : 0;

    console.log('\n📈 RESULTADO:');
    console.log(`  Total de registros processados: ${totalRegistros}`);
    console.log(`  LTs ÚNICAS recebidas: ${totalLTs}`);
    console.log(`  SLA Atendido: ${slaAtendido}`);
    console.log(`  SLA NÃO Atendido: ${slaNaoAtendido}`);
    console.log(`  Percentual de SLA: ${percentualSLA}%`);
    console.log('=================================\n');

    return {
      success: true,
      data: {
        veiculosRecebidos: totalLTs,
        totalRegistros: totalRegistros,
        slaAtendido: slaAtendido,
        slaNaoAtendido: slaNaoAtendido,
        percentualSLA: parseFloat(percentualSLA),
        statusSLA: totalRegistros > 0 && slaAtendido === totalRegistros ? 'atendido' : 'nao-atendido',
        detalheLTs: ltsComSLA,
        ltsUnicas: Array.from(ltsRecebidas),
        dataReferencia: dataBusca || data,
        turnoFiltrado: turnoBusca
      }
    };

  } catch (error) {
    console.error('❌ Erro ao buscar veículos recebidos:', error.message);
    console.error('Stack:', error.stack);
    throw new Error(`Erro ao buscar veículos recebidos na aba ${RECEBIDOS_SHEET}: ${error.message}`);
  }
};
async function buscarAbsenteismo() {
  try {
    // ❌ REMOVER ESTA LINHA:
    // await inicializarSheets();
    
    // ✅ ADICIONAR ESTA LINHA:
    const sheets = getGoogleSheetsClient();
    
    console.log('\n=== BUSCAR ABSENTEÍSMO ===');
    console.log('📊 Origem: Célula AI36 da aba Operation Overview');
    
    const SPREADSHEET_ID = '1dMTrj5Pl4fujD3xoRoVgCW3_xtAG1a-bdM6TKi1S_EU';
    const SHEET_NAME = 'Operation Overview';
    const CELULA = 'AI36';
    
    const range = `'${SHEET_NAME}'!${CELULA}`;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });
    
    const valor = response.data.values?.[0]?.[0];
    
    if (!valor) {
      console.log('⚠️ Célula AI36 está vazia');
      return {
        success: true,
        data: {
          absenteismo: 0,
          absenteismoFormatado: '0%',
          observacao: 'Valor não disponível'
        }
      };
    }
    
    // Se o valor já vier com %, remover para cálculo
    let valorNumerico = valor;
    if (typeof valor === 'string' && valor.includes('%')) {
      valorNumerico = parseFloat(valor.replace('%', '').replace(',', '.'));
    } else {
      valorNumerico = parseFloat(valor);
    }
    
    // Se o valor estiver entre 0 e 1 (ex: 0.0523), multiplicar por 100
    if (valorNumerico > 0 && valorNumerico < 1) {
      valorNumerico = valorNumerico * 100;
    }
    
    const absenteismoFormatado = `${valorNumerico.toFixed(2)}%`;
    
    console.log(`📊 Absenteísmo: ${absenteismoFormatado}`);
    console.log(`📍 Origem: ${SHEET_NAME}!${CELULA}`);
    console.log(`📅 Data da consulta: ${new Date().toLocaleString('pt-BR')}`);
    
    return {
      success: true,
      data: {
        absenteismo: valorNumerico,
        absenteismoFormatado: absenteismoFormatado,
        fonte: `${SHEET_NAME}!${CELULA}`,
        dataConsulta: new Date().toLocaleString('pt-BR')
      }
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar absenteísmo:', error.message);
    return {
      success: false,
      error: error.message,
      data: {
        absenteismo: 0,
        absenteismoFormatado: 'N/A',
        observacao: 'Erro ao buscar dados'
      }
    };
  }
}
module.exports = {
  buscarDadosMetricas,
  buscarVeiculosLiberados,
  buscarVeiculosRecebidos,
  buscarAbsenteismo
};