#!/bin/bash
echo "=========================================================="
echo " Instalando dependencias y el módulo del kernel para Acer "
echo "=========================================================="

echo "[1/4] Instalando dependencias necesarias (gcc, linux-headers, git, rsync)..."
sudo apt update
sudo apt install -y build-essential linux-headers-$(uname -r) git rsync

echo "[2/4] Clonando el repositorio oficial de JafarAkhondali..."
if [ ! -d "acer-predator-turbo-and-rgb-keyboard-linux-module" ]; then
    git clone https://github.com/JafarAkhondali/acer-predator-turbo-and-rgb-keyboard-linux-module.git
else
    echo "El repositorio ya existe, actualizando..."
    cd acer-predator-turbo-and-rgb-keyboard-linux-module
    git pull
    cd ..
fi

echo "[3/4] Entrando al directorio y dando permisos..."
cd acer-predator-turbo-and-rgb-keyboard-linux-module
chmod +x ./*.sh

echo "[4/4] Compilando e instalando el servicio del kernel..."
echo "(Si esto falla con un error de 'Key was rejected', significa que tienes Secure Boot activado en la BIOS)"
sudo ./install_service.sh

echo "=========================================================="
echo " Proceso completado. Revisa la salida arriba por si hay errores."
echo " Si no hubo errores, el módulo 'facer' ya está cargado."
echo "=========================================================="
