#!/usr/bin/env python3
"""Assemble the single-file builds.

Inlines css/styles.css and dist/bundle.js into one document. Google Fonts and
Chart.js stay as CDN references (both are on the Artifact CSP allowlist).

Two shapes come out of the same parts:

    python3 scripts/bundle.py > dist/bundle.js

    # for publishing as a Claude Artifact — no doctype/html/head/body,
    # because the Artifact tool supplies its own wrapper
    python3 scripts/build_artifact.py > artifact.html

    # a complete HTML document you can double-click and open in any browser,
    # no local server needed (the multi-file index.html can't do this: ES
    # modules are blocked over file:// by the browser's CORS rules)
    python3 scripts/build_artifact.py --standalone > standalone.html
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

TITLE = "Joel Transformation"
DESCRIPTION = "An 84-day fat-loss and training tracker built from your own meal and workout plan."
FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
CHARTJS = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js"
FAVICON = (
    'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22>'
    '<text y=%2220%22 font-size=%2220%22>\U0001f30a</text></svg>'
)

MOUNT = """<div id="app"></div>
<div id="sheet-root"></div>
<div id="toast-root" class="toast"></div>
"""


def head(standalone: bool) -> str:
    parts = []
    if standalone:
        parts.append(
            "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n"
            '<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="theme-color" content="#04081a">\n'
            f'<link rel="icon" href="{FAVICON}">\n'
        )
    parts.append(f"<title>{TITLE}</title>\n")
    parts.append(f'<meta name="description" content="{DESCRIPTION}">\n')
    parts.append('<link rel="preconnect" href="https://fonts.googleapis.com">\n')
    parts.append('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n')
    parts.append(f'<link rel="stylesheet" href="{FONTS}">\n')
    parts.append("<style>\n")
    return "".join(parts)


def main() -> None:
    standalone = "--standalone" in sys.argv[1:]

    css = (ROOT / "css" / "styles.css").read_text()
    bundle_path = ROOT / "dist" / "bundle.js"
    if not bundle_path.exists():
        sys.exit("dist/bundle.js is missing — run scripts/bundle.py first.")
    bundle = bundle_path.read_text()

    out = [head(standalone), css, "</style>\n"]
    if standalone:
        out.append("</head>\n<body>\n")
    out.append(MOUNT)
    out.append(f'<script src="{CHARTJS}"></script>\n<script>\n')
    out.append(bundle)
    out.append("</script>\n")
    if standalone:
        out.append("</body>\n</html>\n")

    sys.stdout.write("".join(out))


if __name__ == "__main__":
    main()
