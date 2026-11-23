"""Builds multipart/form-data responses so one call can return several images plus metadata.
Node's built-in fetch parses these natively via `response.formData()`."""
from __future__ import annotations

import secrets
from dataclasses import dataclass

from fastapi.responses import Response


@dataclass(frozen=True)
class Part:
    name: str
    content: bytes
    content_type: str
    filename: str | None = None


def multipart_response(parts: list[Part]) -> Response:
    boundary = f"labclarity-{secrets.token_hex(16)}"
    chunks: list[bytes] = []
    for part in parts:
        disposition = f'form-data; name="{part.name}"'
        if part.filename:
            disposition += f'; filename="{part.filename}"'
        headers = f"--{boundary}\r\nContent-Disposition: {disposition}\r\nContent-Type: {part.content_type}\r\n\r\n"
        chunks += [headers.encode(), part.content, b"\r\n"]
    chunks.append(f"--{boundary}--\r\n".encode())
    return Response(content=b"".join(chunks), media_type=f"multipart/form-data; boundary={boundary}")
