from pydantic import BaseModel


class FontUploadResponse(BaseModel):
    font_id: str
    family_name: str
    glyph_count: int
    units_per_em: int
    ascender: int
    descender: int


class GlyphInfo(BaseModel):
    name: str
    unicode: int | None
    character: str | None
    has_outline: bool
    has_centerline: bool = False


class GlyphListResponse(BaseModel):
    glyphs: list[GlyphInfo]
    total: int
    page: int
    per_page: int


class ExtractRequest(BaseModel):
    glyph_names: list[str] | None = None
    all: bool = False


class CenterlineResponse(BaseModel):
    glyph_name: str
    paths: list[str]
    view_box: str
    width: str
    height: str


class ExportRequest(BaseModel):
    stroke_width: float = 80.0
    stroke_cap: str = "round"
    stroke_join: str = "round"
    format: str = "otf"


class DependencyStatus(BaseModel):
    imagemagick: bool
    autotrace: bool
    fontforge: bool
