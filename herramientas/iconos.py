# Dibuja los íconos de la app (los que usa el celular al "Instalar app") a partir del mismo dibujo que icono.svg:
# degradado violeta-rosa del portal, semáforo a la izquierda, sol detrás de una nube y el río en celeste.
# Uso (necesita Python 3 con Pillow):  python3 herramientas/iconos.py
# Escribe iconos/icono-192.png, iconos/icono-512.png, iconos/icono-maskable-512.png e iconos/icono-apple-180.png.
# Si se cambia el dibujo, cambiarlo también en icono.svg (el ícono de la pestaña) y en manifest.webmanifest si cambian nombres.
import os
from PIL import Image, ImageDraw

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DEGRADE = [(0, (0x50, 0x59, 0xbc)), (.5, (0x8d, 0x58, 0xe8)), (1, (0xf2, 0x6d, 0xf9))]
SS = 4  # se dibuja 4 veces más grande y se achica: bordes suaves


def color_degrade(t):
    for (a, ca), (b, cb) in zip(DEGRADE, DEGRADE[1:]):
        if t <= b:
            f = (t - a) / (b - a)
            return tuple(round(x + (y - x) * f) for x, y in zip(ca, cb))
    return DEGRADE[-1][1]


def fondo(n):
    # Degradado en diagonal, de arriba a la izquierda a abajo a la derecha (como x1=0 y1=0 x2=1 y2=1 en el SVG).
    chico = Image.new('RGB', (150, 150))
    chico.putdata([color_degrade((x + y) / 298) for y in range(150) for x in range(150)])
    return chico.resize((n, n), Image.BICUBIC)


def olas(y0):
    # La ola del SVG: M28 y0 q11.75-9 23.5 0 t23.5 0 t23.5 0 t23.5 0 (cuatro curvas que suben y bajan).
    pts, x = [], 28.0
    for i in range(4):
        cy = y0 - 9 if i % 2 == 0 else y0 + 9
        p0, p1, p2 = (x, y0), (x + 11.75, cy), (x + 23.5, y0)
        for k in range(41):
            t = k / 40
            pts.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                        (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]))
        x += 23.5
    return pts


def dibujo(d, e, dx=0, dy=0):
    # e: escala de las coordenadas del SVG (150 x 150) a píxeles; dx, dy: corrimiento.
    P = lambda x, y: (dx + x * e, dy + y * e)
    def circ(cx, cy, r, c):
        (x, y) = P(cx, cy); d.ellipse([x - r * e, y - r * e, x + r * e, y + r * e], fill=c)
    def rrect(x, y, w, h, r, c):
        (a, b) = P(x, y); d.rounded_rectangle([a, b, a + w * e, b + h * e], radius=r * e, fill=c)
    circ(90, 46, 20, '#f7c531')                                   # sol
    for cx, cy, r in [(106, 80, 15), (86, 68, 21), (64, 82, 14)]:  # nube
        circ(cx, cy, r, '#ffffff')
    rrect(49, 78, 72, 22, 11, '#ffffff')
    rrect(18, 22, 26, 68, 13, '#0b3158')                          # semáforo
    for cy, c in [(36, '#e0533d'), (56, '#f2b705'), (76, '#2fa36b')]:
        circ(31, cy, 8, c)
    for y0 in (116, 132):                                         # río
        for (x, y) in olas(y0):
            circ(x, y, 4, '#8fd3ff')


def icono(n, lleno):
    N = n * SS
    img = fondo(N).convert('RGBA')
    d = ImageDraw.Draw(img)
    if lleno:
        # Para Android ("maskable") y iPhone: fondo hasta el borde y dibujo más chico en el centro,
        # porque el celular recorta el ícono con su propia forma (círculo, gota, cuadrado redondeado).
        e = N / 150 * .78
        dibujo(d, e, N * .11, N * .11)
    else:
        dibujo(d, N / 150)
        mascara = Image.new('L', (N, N), 0)
        ImageDraw.Draw(mascara).rounded_rectangle([0, 0, N - 1, N - 1], radius=34 * N / 150, fill=255)
        img.putalpha(mascara)
    img = img.resize((n, n), Image.LANCZOS)
    return img if not lleno else img.convert('RGB')


if __name__ == '__main__':
    carpeta = os.path.join(RAIZ, 'iconos')
    os.makedirs(carpeta, exist_ok=True)
    for nombre, n, lleno in [('icono-192.png', 192, False), ('icono-512.png', 512, False),
                             ('icono-maskable-512.png', 512, True), ('icono-apple-180.png', 180, True)]:
        icono(n, lleno).save(os.path.join(carpeta, nombre), optimize=True)
        print('iconos/' + nombre)
