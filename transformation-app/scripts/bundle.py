#!/usr/bin/env python3
"""
Zero-dependency ES-module bundler for this project.

The app ships as plain browser ES modules (works directly, no build step —
see README). This script exists only to produce a SINGLE self-contained
HTML file (inlined CSS + JS, one <script> tag) for hosting contexts that
require one file — e.g. a hosted artifact page. It implements just enough
of a CommonJS-style module runtime to concatenate this project's modules
correctly, including the one circular import (`navigate`, between app.js
and the page modules) via a namespace-safe rewrite rather than naive
destructuring, which would break under module-load ordering.

Usage: python3 scripts/bundle.py > dist/bundle.js
       (or just run scripts/build_single_file.py, which calls this)
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS_DIR = ROOT / "js"

IMPORT_NAMED_RE = re.compile(r'import\s*\{([^}]*)\}\s*from\s*["\']([^"\']+)["\'];?', re.DOTALL)
IMPORT_NS_RE = re.compile(r'import\s*\*\s*as\s+(\w+)\s*from\s*["\']([^"\']+)["\'];?')
DYNAMIC_IMPORT_RE = re.compile(r'import\(\s*["\']([^"\']+)["\']\s*\)')
EXPORT_FN_RE = re.compile(r'export\s+(async\s+function|function)\s+(\w+)')
EXPORT_CONST_RE = re.compile(r'^export\s+(const|let)\s+(\w+)\s*=\s*', re.MULTILINE)


def discover_modules():
    files = sorted(JS_DIR.rglob("*.js"))
    mods = {}
    for f in files:
        mod_id = f.relative_to(JS_DIR).as_posix()
        mods[mod_id] = f
    return mods


def resolve_spec(current_id, spec):
    """Resolve an import spec (relative to current module) to a module id."""
    cur_dir = Path(current_id).parent
    resolved = (cur_dir / spec).as_posix()
    # normalize "./x" "../x" "a/../b" etc.
    parts = []
    for part in resolved.split("/"):
        if part == "." or part == "":
            continue
        if part == "..":
            if parts:
                parts.pop()
        else:
            parts.append(part)
    return "/".join(parts)


def find_statement_end(text, start):
    """Given text[start] is right after '=', find index just after the
    statement-terminating ';' at depth 0 (balances {}, [], ())."""
    depth = 0
    i = start
    n = len(text)
    while i < n:
        c = text[i]
        if c in "{[(":
            depth += 1
        elif c in "}])":
            depth -= 1
        elif c == ";" and depth == 0:
            return i + 1
        i += 1
    return n


def extract_imports(text, current_id):
    """Return list of import records without mutating text; used for graph building."""
    deps = set()
    for m in IMPORT_NAMED_RE.finditer(text):
        deps.add(resolve_spec(current_id, m.group(2)))
    for m in IMPORT_NS_RE.finditer(text):
        deps.add(resolve_spec(current_id, m.group(2)))
    return deps


def can_reach(graph, start, target, seen=None):
    if seen is None:
        seen = set()
    if start in seen:
        return False
    seen.add(start)
    for nxt in graph.get(start, ()):
        if nxt == target or can_reach(graph, nxt, target, seen):
            return True
    return False


def transform_module(mod_id, text, graph):
    # 1) Collect + strip static imports, building require/rewrite instructions.
    require_lines = []
    circular_rewrites = []  # (identifier, nsVar)

    def named_repl(m):
        names_raw, spec = m.group(1), m.group(2)
        names = [n.strip() for n in names_raw.split(",") if n.strip()]
        target_id = resolve_spec(mod_id, spec)
        is_circular = can_reach(graph, target_id, mod_id)
        ns_var = "__ns_" + re.sub(r"[^a-zA-Z0-9]", "_", target_id)
        if is_circular:
            require_lines.append(f'const {ns_var} = require("{target_id}");')
            for n in names:
                circular_rewrites.append((n, ns_var))
        else:
            require_lines.append(f'const {{ {", ".join(names)} }} = require("{target_id}");')
        return ""

    text = IMPORT_NAMED_RE.sub(named_repl, text)

    def ns_repl(m):
        local_name, spec = m.group(1), m.group(2)
        target_id = resolve_spec(mod_id, spec)
        require_lines.append(f'const {local_name} = require("{target_id}");')
        return ""

    text = IMPORT_NS_RE.sub(ns_repl, text)

    # 2) Dynamic imports -> Promise.resolve(require(id))
    def dyn_repl(m):
        target_id = resolve_spec(mod_id, m.group(1))
        return f'Promise.resolve(require("{target_id}"))'

    text = DYNAMIC_IMPORT_RE.sub(dyn_repl, text)

    # 3) export function / export async function -> strip keyword, hoist export assignment
    hoisted_exports = []

    def fn_repl(m):
        hoisted_exports.append(m.group(2))
        return f"{m.group(1)} {m.group(2)}"  # "function NAME" or "async function NAME"

    text = EXPORT_FN_RE.sub(fn_repl, text)

    # 4) export const / export let -> strip keyword, insert exports.NAME = NAME; after statement
    out = []
    pos = 0
    for m in EXPORT_CONST_RE.finditer(text):
        out.append(text[pos:m.start()])
        kind, name = m.group(1), m.group(2)
        stmt_start = m.end()
        stmt_end = find_statement_end(text, stmt_start)
        out.append(f"{kind} {name} = ")
        out.append(text[stmt_start:stmt_end])
        out.append(f"\nexports.{name} = {name};")
        pos = stmt_end
    out.append(text[pos:])
    text = "".join(out)

    # 5) Apply circular-import rewrites (targeted identifiers only, call-form safe)
    for name, ns_var in circular_rewrites:
        text = re.sub(rf"\b{name}\b", f"{ns_var}.{name}", text)

    hoisted_block = "\n".join(f"exports.{n} = {n};" for n in hoisted_exports)
    requires_block = "\n".join(require_lines)

    return f'__defineModule("{mod_id}", function(exports, require) {{\n{hoisted_block}\n{requires_block}\n{text}\n}});\n'


def build():
    mods = discover_modules()
    texts = {mid: p.read_text(encoding="utf-8") for mid, p in mods.items()}

    graph = {mid: extract_imports(t, mid) for mid, t in texts.items()}

    chunks = [
        "// ==========================================================================\n"
        "// Bundled build (generated by scripts/bundle.py). Source of truth is the\n"
        "// multi-file js/ tree — edit there, not here. See README for details.\n"
        "// ==========================================================================\n"
        "(function () {\n"
        '"use strict";\n'
        "const __registry = {};\n"
        "const __cache = {};\n"
        "function __defineModule(id, factory) { __registry[id] = factory; }\n"
        "function require(id) {\n"
        "  if (__cache[id]) return __cache[id].exports;\n"
        "  const mod = { exports: {} };\n"
        "  __cache[id] = mod;\n"
        "  const factory = __registry[id];\n"
        '  if (!factory) throw new Error("Module not found: " + id);\n'
        "  factory(mod.exports, require);\n"
        "  return mod.exports;\n"
        "}\n"
    ]
    for mid, text in texts.items():
        chunks.append(transform_module(mid, text, graph))
    chunks.append('require("main.js");\n')
    chunks.append("})();\n")
    return "".join(chunks)


if __name__ == "__main__":
    import sys
    sys.stdout.write(build())
