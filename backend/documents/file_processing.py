"""
Validates and normalizes uploaded documents server-side.

This exists as defense-in-depth: the frontend already compresses/converts
images before upload, but that's trivially bypassable (a raw API call, a
future mobile client, a modified browser request). Without a server-side
mirror of that logic, a malicious or just-different client could:
  - upload arbitrarily large files, unbounded storage growth
  - upload a file whose *extension* says .pdf/.jpg but whose *content*
    is something else entirely (spoofed content-type)

So every image is re-verified and re-compressed here regardless of what
the client already did to it, and PDFs are checked against their real
magic bytes rather than trusted extension/content-type headers.
"""
import io

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, UnidentifiedImageError
import pillow_heif

pillow_heif.register_heif_opener()  # lets Pillow open .heic/.heif like any other image

RAW_UPLOAD_CEILING_BYTES = 20 * 1024 * 1024  # hard sanity cap before we even try to process
PDF_MAX_BYTES = 5 * 1024 * 1024  # PDFs aren't compressed, so this is the real final cap
IMAGE_MAX_BYTES = 1_500_000  # target ceiling after compression — real document photos land ~400-550KB at quality 82, so this is a rarely-hit backstop, not the typical size
MAX_DIMENSION = 2000  # long edge, px
JPEG_QUALITIES = (82, 70, 55, 40)

PDF_MAGIC = b"%PDF-"


class DocumentValidationError(Exception):
    """Raised with a message safe to show directly to the user."""


def _looks_like_pdf(file_obj: UploadedFile) -> bool:
    file_obj.seek(0)
    header = file_obj.read(5)
    file_obj.seek(0)
    return header == PDF_MAGIC


def _compress_image(file_obj: UploadedFile) -> ContentFile:
    file_obj.seek(0)
    try:
        with Image.open(file_obj) as img:
            img.verify()  # raises if this isn't actually a valid, undamaged image
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise DocumentValidationError(
            "That file doesn't look like a valid image. Please upload a JPG, PNG, HEIC, or PDF."
        )

    # verify() leaves the image unusable for further work — reopen fresh.
    file_obj.seek(0)
    with Image.open(file_obj) as img:
        img = img.convert("RGB")  # flattens alpha/CMYK/etc; JPEG has no alpha channel
        w, h = img.size
        if max(w, h) > MAX_DIMENSION:
            scale = MAX_DIMENSION / max(w, h)
            img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)

        for quality in JPEG_QUALITIES:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=True)
            if buf.tell() <= IMAGE_MAX_BYTES:
                buf.seek(0)
                return ContentFile(buf.read(), name="document.jpg")

    raise DocumentValidationError(
        "This image is too large to process — please upload a smaller photo."
    )


def process_document_upload(file_obj: UploadedFile) -> ContentFile:
    """Validates file_obj and returns the ContentFile that should actually
    be stored (original for PDFs, recompressed JPEG for images). Raises
    DocumentValidationError with a user-facing message on any problem."""
    if file_obj.size > RAW_UPLOAD_CEILING_BYTES:
        raise DocumentValidationError("File too large.")

    if _looks_like_pdf(file_obj):
        if file_obj.size > PDF_MAX_BYTES:
            raise DocumentValidationError("File too large — max 5MB for PDFs.")
        file_obj.seek(0)
        return ContentFile(file_obj.read(), name="document.pdf")

    # Not a PDF by content — must be a genuine, processable image, or reject.
    return _compress_image(file_obj)