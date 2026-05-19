from PIL import Image

img = Image.open('src-tauri/icons/app-icon.png').convert('RGBA')
pixels = img.load()

width, height = img.size

for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        
        # Hacer los bordes blancos transparentes (anti-aliasing tolerance)
        if r > 220 and g > 220 and b > 220:
            pixels[x, y] = (0, 0, 0, 0)
            continue
            
        # Convertir a escala de grises
        gray = int(0.2989 * r + 0.5870 * g + 0.1140 * b)
        pixels[x, y] = (gray, gray, gray, a)

img.save('src-tauri/icons/app-icon.png', 'PNG')
