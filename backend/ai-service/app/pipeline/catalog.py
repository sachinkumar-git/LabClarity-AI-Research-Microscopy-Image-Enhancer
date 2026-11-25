"""Human-readable catalogue of pipeline operations (served to the UI's pipeline builder).
Ranges mirror the validators in schemas.py."""

OPERATIONS = [
    {
        "op": "denoise",
        "label": "Noise removal",
        "methods": {
            "nlm": "Non-local means (classical, patch-based)",
            "tv": "Total-variation (classical, edge-preserving)",
            "ai": "Neural denoiser (requires a denoise model)",
        },
        "params": {"strength": {"min": 0.1, "max": 3.0, "default": 1.0, "step": 0.1}},
        "modelTask": "denoise",
    },
    {
        "op": "deblur",
        "label": "Blur reduction",
        "methods": {
            "richardson_lucy": "Richardson-Lucy deconvolution (Gaussian PSF)",
            "unsharp": "Unsharp masking",
        },
        "params": {
            "psf_sigma": {"min": 0.3, "max": 5.0, "default": 1.0, "step": 0.1},
            "iterations": {"min": 1, "max": 50, "default": 10, "step": 1},
            "amount": {"min": 0.1, "max": 3.0, "default": 1.0, "step": 0.1},
        },
    },
    {
        "op": "contrast",
        "label": "Contrast enhancement",
        "methods": {"clahe": "CLAHE (adaptive histogram equalisation)", "stretch": "Percentile stretch"},
        "params": {
            "clip_limit": {"min": 0.001, "max": 0.1, "default": 0.01, "step": 0.001},
            "low_pct": {"min": 0, "max": 10, "default": 0.5, "step": 0.1},
            "high_pct": {"min": 90, "max": 100, "default": 99.5, "step": 0.1},
        },
        "warning": "Changes relative intensities; outputs are not suitable for intensity quantification.",
    },
    {
        "op": "super_resolution",
        "label": "Super-resolution",
        "params": {"scale": {"options": [2, 4], "default": 4}},
        "modelTask": "super_resolution",
    },
]
