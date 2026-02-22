// Estandarizador de respuestas HTTP
/**
 * Envía una respuesta de éxito
 * @param {Response} res - Objeto de respuesta de Express
 * @param {any} data - Datos a enviar en la respuesta
 * @param {number} statusCode - Código de estado HTTP (por defecto 200)
 */
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null
  });
};

/**
 * Envía una respuesta de error
 * @param {Response} res - Objeto de respuesta de Express
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código de estado HTTP (por defecto 500)
 */
const sendError = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: message
  });
};

module.exports = {
  sendSuccess,
  sendError
};
