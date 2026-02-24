const sqlite = require('../database/sqlite');

const bootstrapGuard = async (req, res, next) => {
  try {
    // Evitar bucles infinitos y permitir recursos básicos
    const isBootstrapApi = req.originalUrl.startsWith('/api/bootstrap');
    const isBootstrapPage = req.originalUrl === '/bootstrap.html';
    const isStaticAsset = req.originalUrl.startsWith('/css') ||
                          req.originalUrl.startsWith('/js') ||
                          req.originalUrl.startsWith('/design-system');

    // Consultar estado actual del sistema
    const row = await sqlite.get("SELECT valor FROM sistema_config WHERE clave = 'estado_sistema'");
    const isInitialized = row && row.valor === 'INICIALIZADO';

    if (!isInitialized) {
      // Si NO está inicializado, solo permitimos bootstrap (API y página) y assets
      if (isBootstrapApi || isBootstrapPage || isStaticAsset) {
        return next();
      }
      // Redirigir al flujo de bootstrap si es una página, o error si es API
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Sistema no inicializado. Debe completar el flujo de bootstrap.'
        });
      } else {
        return res.redirect('/bootstrap.html');
      }
    } else {
      // Si YA está inicializado, prohibimos acceso a bootstrap.html y api/bootstrap/init
      if (isBootstrapPage || req.originalUrl === '/api/bootstrap/init') {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(403).json({
            success: false,
            data: null,
            error: 'El sistema ya ha sido inicializado.'
          });
        }
        return res.redirect('/login.html');
      }
      return next();
    }
  } catch (error) {
    console.error('Error en bootstrapGuard:', error);
    next(error);
  }
};

module.exports = bootstrapGuard;
