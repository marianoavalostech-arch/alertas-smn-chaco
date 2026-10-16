# Dibuja compartir.png: la imagen que muestran WhatsApp, Facebook y otras redes cuando alguien comparte el enlace del sitio.
# Mismo aspecto que el sitio: fondo lavanda-rosado, franja del degradado del portal arriba, ícono de la app,
# título en Kanit (marino) y texto en Manrope, con las letras guardadas en fuentes/.
# Uso (necesita Python 3 con Pillow, fontTools y brotli):  python3 herramientas/compartir.py
#   pip install pillow fonttools brotli
# Escribe compartir.png (1200 x 630). Al cambiarla, subir el número de ?v= en og:image de index.html,
# así las redes no siguen mostrando la imagen vieja guardada.
import io, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.dont_write_bytecode = True  # no deja la carpeta __pycache__ en el repositorio
from iconos import icono, color_degrade  # mismo dibujo y mismo degradado que el ícono de la app

RAIZ = os.path.join(AQUI, '..')
W, H = 1200, 630
MARINO, TEXTO, GRIS, ACENTO = '#0b3158', '#1d2333', '#454c5c', '#4446b8'
SITIO = 'panel-alertas-chaco.netlify.app'


def letra(archivo, tam, peso=None):
    # Las letras del sitio están en woff2 (comprimidas): se pasan a TTF en memoria para que Pillow las use.
    f = TTFont(os.path.join(RAIZ, 'fuentes', archivo))
    f.flavor = None
    b = io.BytesIO(); f.save(b); b.seek(0)
    fnt = ImageFont.truetype(b, tam)
    if peso is not None:
        fnt.set_variation_by_axes([peso])
    return fnt


def fondo():
    # Como --fondo del sitio: de lavanda (#f4f5fa) a rosado (#fcecf9), de izquierda a derecha.
    paradas = [(0, (0xf4, 0xf5, 0xfa)), (.42, (0xf7, 0xf5, 0xfa)), (.72, (0xfa, 0xf3, 0xf9)), (1, (0xfc, 0xec, 0xf9))]
    fila = []
    for x in range(W):
        t = x / (W - 1)
        for (a, ca), (b, cb) in zip(paradas, paradas[1:]):
            if t <= b:
                f = (t - a) / (b - a); fila.append(tuple(round(p + (q - p) * f) for p, q in zip(ca, cb))); break
    img = Image.new('RGB', (W, 1)); img.putdata(fila)
    return img.resize((W, H))


def franja(alto):
    img = Image.new('RGB', (W, 1)); img.putdata([color_degrade(x / (W - 1)) for x in range(W)])
    return img.resize((W, alto))


def main():
    img = fondo().convert('RGBA')
    img.paste(franja(14), (0, 0))

    # Tarjeta blanca redondeada con sombra suave, como las secciones del sitio.
    tx, ty, tw, th, r = 60, 74, W - 120, H - 148, 40
    sombra = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle([tx, ty + 10, tx + tw, ty + th + 10], radius=r, fill=(80, 89, 188, 40))
    img = Image.alpha_composite(img, sombra.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(img).rounded_rectangle([tx, ty, tx + tw, ty + th], radius=r, fill='#ffffff')

    # Ícono de la app a la izquierda.
    ic = icono(300, False)
    img.alpha_composite(ic, (tx + 52, ty + (th - 300) // 2))

    d = ImageDraw.Draw(img)
    x = tx + 52 + 300 + 56
    titulo = letra('kanit-700.woff2', 86)
    sub = letra('manrope-wght.woff2', 36, 700)
    chico = letra('manrope-wght.woff2', 30, 600)
    # Se mide cada renglón (con su espacio real) y el bloque de texto queda centrado en la tarjeta.
    lineas = [('Ríos y Clima', titulo, MARINO, 6), ('del Chaco', titulo, MARINO, 26), (None, None, None, 30),
              ('Alertas, lluvias y ríos del Chaco', sub, TEXTO, 18), (SITIO, chico, ACENTO, 0)]
    def alto(t, f):
        b = d.textbbox((0, 0), t, font=f, anchor='ls'); return -b[1], b[3]  # sobre y debajo de la línea de base
    total = 0
    for t, f, _, sep in lineas:
        total += (9 if t is None else sum(alto(t, f))) + sep
    y = ty + (th - total) // 2
    for t, f, c, sep in lineas:
        if t is None:
            # Barrita violeta-rosa debajo del título, como en el encabezado del sitio.
            barra = Image.new('RGB', (130, 1)); barra.putdata([color_degrade(i / 129) for i in range(130)])
            m = Image.new('L', (130, 9), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 129, 8], radius=4, fill=255)
            img.paste(barra.resize((130, 9)), (x + 4, y), m); y += 9 + sep; continue
        arriba, abajo = alto(t, f)
        d.text((x, y + arriba), t, font=f, fill=c, anchor='ls'); y += arriba + abajo + sep

    img.convert('RGB').save(os.path.join(RAIZ, 'compartir.png'), optimize=True)
    print('compartir.png')


if __name__ == '__main__':
    main()
