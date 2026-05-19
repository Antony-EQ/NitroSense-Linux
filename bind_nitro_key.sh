#!/bin/bash

echo "=========================================="
echo " Configurando el botón 'N' (NitroSense)   "
echo "=========================================="

SCHEMA="org.gnome.settings-daemon.plugins.media-keys"
CUSTOM_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom-nitrosense/"

# Obtener los atajos actuales
current_bindings=$(gsettings get $SCHEMA custom-keybindings)

# Validar y agregar el nuevo path a la lista si no existe
if [[ $current_bindings == "@as []" ]] || [[ -z $current_bindings ]]; then
    new_bindings="['$CUSTOM_PATH']"
    gsettings set $SCHEMA custom-keybindings "$new_bindings"
elif [[ $current_bindings != *"$CUSTOM_PATH"* ]]; then
    # Eliminar el corchete final, agregar coma, el nuevo path y cerrar corchete
    new_bindings="${current_bindings%]}, '$CUSTOM_PATH']"
    gsettings set $SCHEMA custom-keybindings "$new_bindings"
fi

# Configurar el atajo (Nombre, Comando y Tecla)
gsettings set $SCHEMA.custom-keybinding:$CUSTOM_PATH name "'NitroSense'"
gsettings set $SCHEMA.custom-keybinding:$CUSTOM_PATH command "'nitrosense'"

# El botón 'N' de Acer suele mapearse como XF86Launch3 o XF86Launch1 en Linux
gsettings set $SCHEMA.custom-keybinding:$CUSTOM_PATH binding "'XF86Launch3'"

echo "✅ ¡Atajo vinculado con éxito!"
echo ""
echo "Nota: El script ha asignado la tecla estándar (XF86Launch3). Si al presionar"
echo "la tecla 'N' no se abre, ve a 'Configuración > Teclado > Atajos personalizados',"
echo "busca 'NitroSense', haz clic en él y presiona físicamente tu tecla 'N' para reasignarlo."
