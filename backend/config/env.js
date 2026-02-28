const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnv = ['JWT_SECRET', 'ADMIN_PASSWORD'];

requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    console.error(`ERROR CRÍTICO: La variable de entorno ${env} es obligatoria.`);
    process.exit(1);
  }
});

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  DB_SOURCE: process.env.DB_SOURCE || 'mfcalidad.sqlite',
  NODE_ENV: process.env.NODE_ENV || 'development',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
