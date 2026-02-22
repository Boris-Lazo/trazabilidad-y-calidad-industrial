#!/bin/bash

# Script de configuración inicial para PROD-SYS
# Este script prepara el entorno de desarrollo, instala dependencias y configura las variables de entorno iniciales.

# Colores para la salida
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Iniciando configuración de trazabilidad-y-calidad-industrial...${NC}"

# 1. Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias de Node.js...${NC}"
    npm install
else
    echo -e "${BLUE}Dependencias ya instaladas.${NC}"
fi

# 2. Verificar archivo .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creando archivo .env a partir de la configuración recomendada...${NC}"

    # Generar un JWT_SECRET aleatorio
    RANDOM_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    cat <<EOT > .env
PORT=3000
NODE_ENV=development
JWT_SECRET=$RANDOM_SECRET
# Contraseña inicial para el usuario 'admin'
ADMIN_PASSWORD=admin123
# Nombre del archivo de base de datos SQLite
DB_SOURCE=mfcalidad.sqlite
EOT
    echo -e "${GREEN}Archivo .env creado con éxito.${NC}"
    echo -e "${YELLOW}NOTA: Se ha configurado 'admin123' como contraseña inicial del administrador.${NC}"
else
    echo -e "${BLUE}Archivo .env ya existe.${NC}"
fi

# 3. Asegurar que las carpetas necesarias existen
echo -e "${YELLOW}Asegurando estructura de directorios...${NC}"
mkdir -p backend/database
mkdir -p backend/logs

# 4. Información final y ejecución
echo -e "\n${GREEN}Configuración verificada con éxito.${NC}"
echo -e "-------------------------------------------------------"
echo -e "1. El usuario inicial es: ${BLUE}admin${NC}"
echo -e "2. La contraseña inicial es: ${BLUE}admin123${NC} (definida en .env)"
echo -e "-------------------------------------------------------"

# Preguntar si se desea iniciar el servidor
echo -e "${YELLOW}¿Deseas iniciar el servidor ahora? (s/n)${NC}"
read -r response
if [[ "$response" =~ ^([sS][iI]|[sS])$ ]]; then
    echo -e "${GREEN}Iniciando servidor en modo desarrollo...${NC}"
    npm run dev
else
    echo -e "Puedes iniciar el servidor más tarde con: ${GREEN}npm run dev${NC}"
fi
