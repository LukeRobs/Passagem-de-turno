const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
};

module.exports = errorHandler;