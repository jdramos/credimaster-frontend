"""
Genera los favicons/app icons de CrediMaster a partir del isotipo original
(src/assets/credimaster-mark.png), recortado a circulo -- mismo criterio
(zoom 122%, sin redibujar nada) que BrandMark.jsx usa en la app via CSS.
Un archivo estatico (favicon, apple-touch-icon, manifest icons) no puede
usar el truco de CSS background-size, asi que aqui se hace el mismo recorte
pero horneado en los pixeles del PNG exportado.

Uso: python scripts/make_favicons.py
"""
from PIL import Image, ImageDraw
import os

SRC = os.path.join("src", "assets", "credimaster-mark.png")
OUT_PUBLIC = "public"

ZOOM = 1.22  # mismo factor que BrandMark.jsx (backgroundSize: "122% 122%")

def make_circular_crop(src_img, out_size):
    # 1) recortar al cuadrado central (la fuente es casi cuadrada, 524x518)
    w, h = src_img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    square = src_img.crop((left, top, left + side, top + side))

    # 2) aplicar el mismo zoom que el CSS (122%): nos quedamos con el
    # 1/ZOOM central de la imagen (recorta el borde negro) y lo escalamos
    # de vuelta a `side`.
    visible_frac = 1 / ZOOM
    crop_side = int(side * visible_frac)
    c_left = (side - crop_side) // 2
    c_top = (side - crop_side) // 2
    cropped = square.crop((c_left, c_top, c_left + crop_side, c_top + crop_side))
    cropped = cropped.resize((out_size, out_size), Image.LANCZOS)

    # 3) mascara circular (esquinas transparentes)
    mask = Image.new("L", (out_size, out_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, out_size, out_size), fill=255)

    result = Image.new("RGBA", (out_size, out_size), (0, 0, 0, 0))
    result.paste(cropped.convert("RGBA"), (0, 0), mask)
    return result


def main():
    src = Image.open(SRC)

    sizes = {
        "logo192.png": 192,
        "logo512.png": 512,
        "apple-touch-icon.png": 180,
        "favicon-32.png": 32,
        "favicon-16.png": 16,
    }

    generated = {}
    for filename, size in sizes.items():
        icon = make_circular_crop(src, size)
        path = os.path.join(OUT_PUBLIC, filename)
        icon.save(path)
        generated[filename] = path
        print(f"  {filename} ({size}x{size}) -> {path}")

    # favicon.ico multi-resolucion (16/32/48) a partir de los ya recortados
    ico_sizes = [16, 32, 48]
    ico_base = make_circular_crop(src, 48)
    ico_path = os.path.join(OUT_PUBLIC, "favicon.ico")
    ico_base.save(ico_path, sizes=[(s, s) for s in ico_sizes])
    print(f"  favicon.ico (16/32/48) -> {ico_path}")


if __name__ == "__main__":
    main()
