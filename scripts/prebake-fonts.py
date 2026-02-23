#!/usr/bin/env python3
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

CONFIG_PATH = Path("assets/fonts/fonts.json")

def fail(message):
  print(f"Error: {message}")
  sys.exit(1)


def download(url, dest):
  dest.parent.mkdir(parents=True, exist_ok=True)
  if dest.exists() and dest.stat().st_size > 0:
    return
  if dest.exists():
    dest.unlink()
  print(f"Downloading {url} -> {dest}")
  urllib.request.urlretrieve(url, dest)


def extract_font(zip_path, preferred_file, out_path):
  with zipfile.ZipFile(zip_path, "r") as zf:
    candidates = [n for n in zf.namelist() if n.lower().endswith((".ttf", ".otf"))]
    if not candidates:
      fail(f"No font files found in {zip_path}")
    target = None
    if preferred_file:
      for name in candidates:
        if Path(name).name == preferred_file:
          target = name
          break
    if not target:
      target = candidates[0]
      print(f"Warning: preferred file not found, using {Path(target).name}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zf.open(target) as src, open(out_path, "wb") as dst:
      shutil.copyfileobj(src, dst)


def is_zip_file(path):
  try:
    with open(path, "rb") as handle:
      return handle.read(4) == b"PK\x03\x04"
  except OSError:
    return False


def run_msdf(font_path, output_base, font_size, px_range, texture_size, charset_path=None):
  msdf_bin = os.environ.get("MSDF_BMFONT_BIN")
  if not msdf_bin:
    msdf_bin = shutil.which("msdf-bmfont-xml")
  if not msdf_bin:
    msdf_bin = shutil.which("msdf-bmfont")
  if not msdf_bin:
    candidates = [
      "/usr/local/bin/msdf-bmfont-xml",
      "/usr/local/bin/msdf-bmfont",
      "/usr/bin/msdf-bmfont-xml",
      "/usr/bin/msdf-bmfont",
      "/usr/local/lib/node_modules/.bin/msdf-bmfont-xml",
      "/usr/local/lib/node_modules/.bin/msdf-bmfont"
    ]
    msdf_bin = next((c for c in candidates if Path(c).exists()), None)
  if not msdf_bin:
    fail("msdf-bmfont-xml not found. Install it or set MSDF_BMFONT_BIN.")

  cmd = [
    msdf_bin,
    "-f",
    "json",
    "-m",
    f"{texture_size},{texture_size}",
    "-s",
    str(font_size),
    "-r",
    str(px_range)
  ]
  if charset_path:
    cmd.extend(["-i", charset_path])
  cmd.extend(["-o", str(output_base), str(font_path)])
  print(" ".join(cmd))
  subprocess.run(cmd, check=True)


def build_charset_file(charset_name):
  if not charset_name:
    return None
  name = charset_name.lower()
  if name != "latin1":
    fail(f"Unsupported charset: {charset_name}")
  chars = "".join(chr(code) for code in range(0x20, 0x100))
  handle = tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8")
  handle.write(chars)
  handle.close()
  return handle.name


def load_config():
  if not CONFIG_PATH.exists():
    fail(f"Missing config: {CONFIG_PATH}")
  config = json.loads(CONFIG_PATH.read_text())
  fonts_dir = Path(config.get("fontsDir", "assets/fonts"))
  output_dir = Path(config.get("outputDir", "assets/msdf"))
  defaults = {
    "texture": int(config.get("defaultTextureSize", 1024)),
    "size": int(config.get("defaultFontSize", 64)),
    "range": int(config.get("defaultPxRange", 4)),
    "charset": config.get("defaultCharset")
  }
  fonts = config.get("fonts", [])
  if not fonts:
    fail("No fonts listed in config")
  return fonts_dir, output_dir, defaults, fonts


def process_font(font, defaults, fonts_dir, output_dir):
  key = font.get("key")
  url = font.get("downloadUrl")
  if not key or not url:
    fail("Each font needs 'key' and 'downloadUrl'")
  preferred_file = font.get("file")
  font_size = int(font.get("fontSize", defaults["size"]))
  px_range = int(font.get("pxRange", defaults["range"]))
  texture_size = int(font.get("textureSize", defaults["texture"]))
  charset = font.get("charset", defaults["charset"])

  download_path = fonts_dir / "downloads" / f"{key}{Path(url).suffix or '.zip'}"
  download(url, download_path)

  extracted = fonts_dir / "source" / f"{key}{Path(preferred_file or '').suffix or Path(download_path).suffix}"
  if is_zip_file(download_path):
    extract_font(download_path, preferred_file, extracted)
  else:
    extracted.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(download_path, extracted)

  output_base = output_dir / key
  output_dir.mkdir(parents=True, exist_ok=True)
  output_png = output_dir / f"{key}.png"
  output_json = output_dir / f"{key}.json"
  if output_png.exists() and output_json.exists():
    print(f"Skipping {key}: MSDF outputs already exist")
    return
  charset_path = build_charset_file(charset)
  try:
    run_msdf(extracted, output_base, font_size, px_range, texture_size, charset_path)
  finally:
    if charset_path and Path(charset_path).exists():
      Path(charset_path).unlink()


def main():
  fonts_dir, output_dir, defaults, fonts = load_config()
  for font in fonts:
    process_font(font, defaults, fonts_dir, output_dir)


if __name__ == "__main__":
  try:
    main()
  except subprocess.CalledProcessError as error:
    fail(f"Command failed: {error}")
  except Exception as error:
    fail(str(error))
