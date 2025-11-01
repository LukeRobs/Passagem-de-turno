const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Criar diretório de upload se não existir
const uploadDir = path.join(__dirname, '..', 'uploads', 'passagem-turno');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Diretório de uploads criado:', uploadDir);
}

// ✅ Configuração do Multer - Armazenar em memória temporariamente
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    console.log(`✅ Arquivo aceito: ${file.originalname}`);
    return cb(null, true);
  } else {
    console.log(`❌ Arquivo rejeitado: ${file.originalname} (tipo inválido)`);
    cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'));
  }
};

// ✅ Configuração do upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max antes da compressão
  },
  fileFilter: fileFilter
});

// ✅ Middleware para processar e comprimir imagens
const processarImagens = async (req, res, next) => {
  try {
    console.log('📸 Iniciando processamento de imagens...');
    console.log('📦 Arquivos recebidos:', req.files?.length || 0);

    if (!req.files || req.files.length === 0) {
      console.log('⚠️ Nenhum arquivo foi enviado');
      return next();
    }

    const fotosProcessadas = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      console.log(`\n🔄 Processando foto ${i + 1}/${req.files.length}:`);
      console.log(`   - Nome original: ${file.originalname}`);
      console.log(`   - Tamanho original: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`   - Tipo: ${file.mimetype}`);

      try {
        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const filename = `img-${timestamp}-${randomString}.jpg`;
        const filepath = path.join(uploadDir, filename);

        console.log(`   - Salvando como: ${filename}`);

        // Processar e comprimir com Sharp
        await sharp(file.buffer)
          .resize(1920, 1920, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 85,
            progressive: true
          })
          .toFile(filepath);

        // Verificar o arquivo salvo
        const stats = fs.statSync(filepath);
        console.log(`   ✅ Foto processada com sucesso!`);
        console.log(`   - Tamanho final: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   - Caminho: ${filepath}`);

        // Adicionar às fotos processadas
        fotosProcessadas.push({
          filename: filename,
          originalName: file.originalname,
          path: filepath,
          url: `/uploads/passagem-turno/${filename}`,
          size: stats.size
        });

      } catch (error) {
        console.error(`   ❌ Erro ao processar foto ${i + 1}:`, error.message);
        // Continuar processando outras fotos mesmo se uma falhar
      }
    }

    // Adicionar fotos processadas ao request
    req.fotosProcessadas = fotosProcessadas;
    console.log(`\n✅ Total de fotos processadas: ${fotosProcessadas.length}`);
    
    next();

  } catch (error) {
    console.error('❌ Erro no processamento de imagens:', error);
    next(error);
  }
};

module.exports = {
  upload,
  processarImagens
};