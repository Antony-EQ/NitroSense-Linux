#!/bin/bash
echo "=========================================================="
echo " Instalando NBFC-Linux (Control de Ventiladores)          "
echo "=========================================================="

echo "[1/4] Instalando dependencias (cmake, build-essential, lua, xml, curl)..."
sudo apt update
sudo apt install -y cmake build-essential git liblua5.4-dev libxml2-dev libcurl4-openssl-dev

echo "[2/4] Preparando el repositorio nbfc-linux..."
cd /home/antony/Documentos/NitroSense-Linux/nbfc-linux

echo "[3/4] Compilando e instalando NBFC-Linux..."
make clean
make
sudo make install

echo "[4/4] Habilitando servicio y aplicando perfil para AN515-57..."
sudo systemctl enable --now nbfc_service
sleep 2 # Esperar a que el servicio inicie

echo "Aplicando configuración 'Acer Nitro AN515-57'..."
nbfc config -a "Acer Nitro AN515-57"
nbfc start

echo "=========================================================="
echo " Proceso completado. Para verificar si funciona, ejecuta: "
echo " nbfc set -s 100 (para acelerar al máximo)                "
echo " nbfc set -a     (para volver a automático)               "
echo "=========================================================="
