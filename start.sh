#!/bin/bash

# start.sh - Script de inicio y configuración inicial del proyecto PROD-SYS

echo "🚀 Iniciando configuración de PROD-SYS..."

# 1. Verificar dependencias
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
else
    echo "✅ Dependencias ya instaladas."
fi

# 2. Configurar variables de entorno
if [ ! -f ".env" ]; then
    echo "⚙️  Creando archivo .env desde .env.example..."
    cp .env.example .env
    # Generar un JWT_SECRET aleatorio si no existe
    echo "JWT_SECRET=prod_sys_secret_$(date +%s)" >> .env
else
    echo "✅ Archivo .env detectado."
fi

# 3. Iniciar el servidor
echo "🌐 Iniciando servidor en puerto 3000..."
npm start
