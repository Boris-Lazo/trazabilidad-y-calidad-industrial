#!/bin/bash

# Script de automatización para el primer arranque del proyecto

echo "🚀 Iniciando configuración del proyecto..."

# 1. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# 2. Configurar variables de entorno si no existen
if [ ! -f backend/.env ]; then
    echo "⚙️ Configurando archivo .env..."
    cp backend/.env.example backend/.env
fi

# 3. Inicializar la base de datos (Seed)
echo "🗄️ Inicializando base de datos con datos de prueba..."
npm run seed

# 4. Iniciar el servidor
echo "🌐 Iniciando el servidor..."
echo "El proyecto estará disponible en http://localhost:3000"
npm start
