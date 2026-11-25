"""Validated pipeline specifications. Every parameter is bounded so requests cannot
trigger pathological compute, and the validated spec is what gets recorded in the audit."""
from __future__ import annotations

import json
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError, model_validator

from app.core.errors import BadRequestError

MODEL_ID = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9_-]{1,63}$")]


class _Step(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DenoiseStep(_Step):
    op: Literal["denoise"]
    method: Literal["nlm", "tv", "ai"] = "nlm"
    strength: float = Field(1.0, ge=0.1, le=3.0)  # multiplier on the estimated noise level
    model: MODEL_ID | None = None  # required when method == "ai"

    @model_validator(mode="after")
    def _model_for_ai(self):
        if self.method == "ai" and not self.model:
            raise ValueError("denoise method 'ai' requires a model id")
        return self


class DeblurStep(_Step):
    op: Literal["deblur"]
    method: Literal["richardson_lucy", "unsharp"] = "richardson_lucy"
    psf_sigma: float = Field(1.0, ge=0.3, le=5.0)  # Gaussian PSF width in pixels
    iterations: int = Field(10, ge=1, le=50)
    amount: float = Field(1.0, ge=0.1, le=3.0)  # unsharp-mask gain


class ContrastStep(_Step):
    op: Literal["contrast"]
    method: Literal["clahe", "stretch"] = "clahe"
    clip_limit: float = Field(0.01, ge=0.001, le=0.1)
    low_pct: float = Field(0.5, ge=0.0, le=10.0)
    high_pct: float = Field(99.5, ge=90.0, le=100.0)


class SuperResolutionStep(_Step):
    op: Literal["super_resolution"]
    model: MODEL_ID
    scale: Literal[2, 4] = 4


Step = Annotated[
    Union[DenoiseStep, DeblurStep, ContrastStep, SuperResolutionStep], Field(discriminator="op")
]


class PipelineSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    steps: list[Step] = Field(min_length=1, max_length=6)

    @model_validator(mode="after")
    def _single_sr(self):
        if sum(s.op == "super_resolution" for s in self.steps) > 1:
            raise ValueError("at most one super_resolution step is allowed")
        return self

    @property
    def scale(self) -> int:
        return next((s.scale for s in self.steps if s.op == "super_resolution"), 1)


class Roi(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(ge=16)
    height: int = Field(ge=16)


def _parse(adapter: TypeAdapter, raw: str, label: str):
    try:
        return adapter.validate_python(json.loads(raw))
    except json.JSONDecodeError as exc:
        raise BadRequestError(f"{label} is not valid JSON") from exc
    except ValidationError as exc:
        details = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
        raise BadRequestError(f"Invalid {label}: {details}") from exc


def parse_pipeline(raw: str) -> PipelineSpec:
    return _parse(TypeAdapter(PipelineSpec), raw, "pipeline")


def parse_roi(raw: str | None) -> Roi | None:
    return _parse(TypeAdapter(Roi), raw, "roi") if raw else None
