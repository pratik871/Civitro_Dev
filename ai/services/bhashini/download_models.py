"""Download IndicTrans2 models from HuggingFace at build time."""
import os
from huggingface_hub import snapshot_download

token = os.environ.get("HF_TOKEN", "")
cache_dir = "/models"

models = [
    "ai4bharat/indictrans2-en-indic-dist-200M",
    "ai4bharat/indictrans2-indic-en-dist-200M",
    "ai4bharat/indictrans2-indic-indic-dist-320M",
]

for model in models:
    print(f"Downloading {model}...")
    snapshot_download(model, token=token, cache_dir=cache_dir)
    print(f"  Done: {model}")

print("All 3 models downloaded successfully")
