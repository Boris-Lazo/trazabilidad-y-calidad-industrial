#!/bin/bash

# Script de configuración inicial para PROD-SYS

echo "Iniciando configuración de trazabilidad-y-calidad-industrial..."

# 1. Instalar dependencias
echo "Instalando dependencias de Node.js..."
npm install

# 2. Verificar archivo .env
if [ ! -f .env ]; then
    echo "Creando archivo .env a partir del ejemplo..."
    echo "PORT=3000" > .env
    echo "JWT_SECRET=$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")" >> .env
    echo "ADMIN_PASSWORD=admin_password" >> .env
    echo "DB_SOURCE=mfcalidad.sqlite" >> .env
    echo "NODE_ENV=development" >> .env
else
    echo "Archivo .env ya existe."
fi

# 3. Asegurar que la carpeta de logs existe
mkdir -p backend/src/logs

echo "Configuración completada con éxito."
echo "Puedes iniciar el servidor con: npm start"
