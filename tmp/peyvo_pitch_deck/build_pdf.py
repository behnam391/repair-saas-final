from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

ROOT = Path(r"C:\Users\Behnam\Desktop\repair-saas-clone\repair-saas-final")
RENDERED = ROOT / "tmp" / "peyvo_pitch_deck" / "rendered"
JPEG_DIR = ROOT / "tmp" / "peyvo_pitch_deck" / "pdf_jpegs"
OUTPUT = ROOT / "output" / "pdf" / "Peyvo-Arvan-Pitch-Deck.pdf"

JPEG_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

slides = sorted(RENDERED.glob("slide-*.png"))
if not slides:
    raise RuntimeError("No rendered slides found")

page_w, page_h = 1280, 720
pdf = canvas.Canvas(str(OUTPUT), pagesize=(page_w, page_h), pageCompression=1)

for index, source in enumerate(slides, 1):
    image = Image.open(source).convert("RGB")
    target = JPEG_DIR / f"slide-{index:02d}.jpg"
    image.save(target, "JPEG", quality=78, optimize=True, progressive=True)
    pdf.drawImage(ImageReader(str(target)), 0, 0, width=page_w, height=page_h, preserveAspectRatio=True, mask="auto")
    pdf.showPage()

pdf.save()
print(OUTPUT)
