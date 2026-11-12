"""Validate and normalise uploaded photos before detection."""

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_SIDE_PX = 1600


class InvalidImageError(ValueError):
    pass


def load_image(raw: bytes, max_bytes: int) -> Image.Image:
    if not raw:
        raise InvalidImageError("The uploaded file is empty.")
    if len(raw) > max_bytes:
        raise InvalidImageError(f"Photo is larger than {max_bytes // (1024 * 1024)} MB.")
    try:
        image = Image.open(BytesIO(raw))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise InvalidImageError("That file isn't a supported image.") from exc

    # Phone photos often store rotation in EXIF instead of rotating pixels.
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((MAX_SIDE_PX, MAX_SIDE_PX))
    return image


def to_jpeg_bytes(image: Image.Image, quality: int = 88) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=quality)
    return buffer.getvalue()
