import os
from pathlib import Path
from PIL import Image

def optimizar_carpeta(directorio_entrada, calidad=80, ancho_max=1920):
    # Crear carpeta de salida si no existe
    ruta_entrada = Path(directorio_entrada)
    ruta_salida = ruta_entrada / "optimizadas"
    ruta_salida.mkdir(exist_ok=True)

    # Extensiones compatibles
    extensiones = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')

    print(f"🚀 Iniciando optimización en: {ruta_entrada}")
    
    for archivo in ruta_entrada.iterdir():
        if archivo.suffix.lower() in extensiones:
            try:
                with Image.open(archivo) as img:
                    # Convertir a RGB si es necesario (evita errores con PNG transparentes a JPG)
                    if img.mode in ("RGBA", "P"):
                        img = img.convert("RGB")

                    # Redimensionar proporcionalmente
                    ancho, alto = img.size
                    if ancho > ancho_max:
                        proporcion = ancho_max / float(ancho)
                        nuevo_alto = int(float(alto) * proporcion)
                        img = img.resize((ancho_max, nuevo_alto), Image.Resampling.LANCZOS)

                    # Guardar con el mismo nombre en la carpeta de salida
                    # Puedes cambiar "WEBP" por "JPEG" si lo prefieres
                    destino = ruta_salida / archivo.name
                    # Cambia esta línea en el script:
                    img.save(destino, "WEBP", quality=calidad, method=6)
                    
                    print(f"✅ {archivo.name} optimizado.")
            except Exception as e:
                print(f"❌ No se pudo procesar {archivo.name}: {e}")

    print(f"\n✨ Proceso terminado. Revisa la carpeta: {ruta_salida}")

# --- CONFIGURACIÓN ---
if __name__ == "__main__":
    # Cambia esto por la ruta de tu carpeta
    mi_carpeta = "D:/Mis Documentos/Desktop" 
    
    if os.path.exists(mi_carpeta):
        optimizar_carpeta(mi_carpeta)
    else:
        print("La ruta especificada no existe.")