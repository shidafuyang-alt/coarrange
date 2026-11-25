"""Bundle MusicCraft previews into a portable offline HTML file without a server."""
import base64
import json
import mimetypes
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
DIST = ROOT.parent / "web"
OUTPUT = ROOT.parent / "artifacts" / "MusicCraft_Shareable.html"
OUTPUT.parent.mkdir(exist_ok=True)
assets = {}
for path in sorted((DIST / "assets").rglob("*")):
    if path.is_file() and path.suffix not in (".js",):
        mime = {".m4a": "audio/mp4", ".mid": "audio/midi", ".wav": "audio/wav"}.get(
            path.suffix, mimetypes.guess_type(path.name)[0] or "application/octet-stream")
        assets[path.relative_to(DIST).as_posix()] = {
            "mime": mime, "data": base64.b64encode(path.read_bytes()).decode()
        }

bootstrap = """'use strict';
window.CoAssets=(()=>{
  const assets=ASSET_PAYLOAD;
  const urls=new Map();
  function bytes(path){const data=assets[path];if(!data)throw Error('Missing embedded asset: '+path);const raw=atob(data.data),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
  function url(path){if(!urls.has(path))urls.set(path,URL.createObjectURL(new Blob([bytes(path)],{type:assets[path].mime})));return urls.get(path)}
  async function fetchAsset(path){if(!assets[path])throw Error('Missing embedded asset: '+path);return new Response(bytes(path),{status:200,headers:{'Content-Type':assets[path].mime}})}
  document.querySelectorAll('[data-co-src]').forEach(el=>{el.src=url(el.dataset.coSrc);el.removeAttribute('data-co-src')});
  document.querySelectorAll('[data-co-href]').forEach(el=>{el.href=url(el.dataset.coHref);el.removeAttribute('data-co-href')});
  return {url,fetch:fetchAsset};
})();
""".replace("ASSET_PAYLOAD", json.dumps(assets, separators=(",", ":")))


def inline_script(source):
    """Resolve static and generated asset paths against the embedded asset table."""
    source = re.sub(r"'assets/theme-'\s*\+\s*s\.id\s*\+\s*'\.m4a'",
                    "CoAssets.url('assets/theme-' + s.id + '.m4a')", source)
    source = re.sub(r"'(?P<path>assets/[^'\n]+)'",
                    lambda m: f"CoAssets.url('{m['path']}')" if m["path"] in assets else m[0],
                    source)
    source = re.sub(r'(?P<attr>src|href)="(?P<path>assets/[^"\n]+)"',
                    lambda m: m["attr"] + '="${CoAssets.url(\'' + m["path"] + '\')}"', source)
    source = source.replace("fetch(CoAssets.url('assets/score.json'))",
                            "CoAssets.fetch('assets/score.json')")
    source = source.replace("fetch(`assets/instruments/${id}-${file}`)",
                            "CoAssets.fetch(`assets/instruments/${id}-${file}`)")
    return source


html = (DIST / "index.html").read_text()
def inline_stylesheet(match):
    source = (DIST / match[1]).read_text()
    # Fonts remain available when the shareable file is opened without a network.
    def embed_url(url_match):
        path = url_match[1]
        if path not in assets:
            return url_match[0]
        asset = assets[path]
        return "url('data:" + asset["mime"] + ";base64," + asset["data"] + "')"
    source = re.sub(r"url\(['\"]?(assets/[^)'\"]+)['\"]?\)", embed_url, source)
    return "<style>\n" + source + "\n</style>"

html = re.sub(r'<link rel="stylesheet" href="([^"]+)"\s*/?>', inline_stylesheet, html)
scripts = []
def collect_script(match):
    path = match[1]
    source = (DIST / path).read_text()
    scripts.append(source if path.startswith("assets/") else inline_script(source))
    return ""
html = re.sub(r'<script defer src="([^"]+)"></script>', collect_script, html)
html = re.sub(r'src="(assets/[^"]+)"', r'data-co-src="\1"', html)
html = re.sub(r'href="(assets/[^"]+)"', r'data-co-href="\1"', html)
all_scripts = [bootstrap] + scripts
tail = "\n".join("<script>\n" + re.sub(r"</script", r"<\\/script", script, flags=re.I)
                   + "\n</script>" for script in all_scripts)
html = html.replace("</body>", tail + "\n</body>")
OUTPUT.write_text(html)
print(json.dumps({"file": str(OUTPUT), "size_mb": round(OUTPUT.stat().st_size / 1024**2, 1),
                  "embedded_assets": len(assets)}, ensure_ascii=False))
