"""Fail fast when a visual derivation loses its student-facing safeguards."""

from __future__ import annotations

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]

EXPECTED = {
    "f2-qvm": ROOT / "foundations" / "f2-beam-forces.qmd",
    "f3-flexure": ROOT / "foundations" / "f3-beam-stress.qmd",
    "f4-curvature": ROOT / "foundations" / "f4-deflection.qmd",
    "m1-reliability": ROOT / "chapters" / "m1-reliability.qmd",
    "m3-rc-bending": ROOT / "chapters" / "m3-bending.qmd",
    "m5-eccentric": ROOT / "chapters" / "m5-eccentric.qmd",
    "m6-prestress": ROOT / "chapters" / "m6-prestress.qmd",
}


def require(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def main() -> int:
    failures: list[str] = []
    script_path = ROOT / "assets" / "derivation-workbench.js"
    style_path = ROOT / "assets" / "derivation-workbench.css"
    wrapper_path = ROOT / "includes" / "derivation-workbench-script.html"
    config_path = ROOT / "_quarto.yml"

    for path in (script_path, style_path, wrapper_path, config_path):
        require(path.exists(), f"缺少文件：{path.relative_to(ROOT)}", failures)

    script = script_path.read_text(encoding="utf-8") if script_path.exists() else ""
    styles = style_path.read_text(encoding="utf-8") if style_path.exists() else ""
    config = config_path.read_text(encoding="utf-8") if config_path.exists() else ""

    for derivation_id, qmd_path in EXPECTED.items():
        qmd = qmd_path.read_text(encoding="utf-8")
        mount = f'data-derivation="{derivation_id}"'
        require(qmd.count(mount) == 1, f"{qmd_path.name} 应且仅应挂载一次 {derivation_id}", failures)
        require(derivation_id in script, f"脚本未注册推导 {derivation_id}", failures)

        match = re.search(
            rf'<div[^>]+data-derivation="{re.escape(derivation_id)}"[^>]*>(.*?)</div>',
            qmd,
            flags=re.DOTALL,
        )
        require(match is not None, f"{derivation_id} 缺少可解析的挂载块", failures)
        if match:
            fallback = match.group(1)
            require("derive-fallback" in fallback, f"{derivation_id} 缺少无脚本回退内容", failures)
            require("figcaption" in fallback, f"{derivation_id} 回退内容缺少图注", failures)

    require("assets/derivation-workbench.css" in config, "Quarto 未载入推导台 CSS", failures)
    require("includes/derivation-workbench-script.html" in config, "Quarto 未载入推导台脚本包装器", failures)

    for safeguard in ("focus-visible", "prefers-reduced-motion", "@container", "@media print"):
        require(safeguard in styles, f"CSS 缺少无障碍/响应式保障：{safeguard}", failures)

    require("--dw-load: #945800" in styles and 'load: "#945800"' in script,
            "推导台琥珀色未保持可读对比度", failures)
    require("derive-zoom-toggle" in styles and "图太小？放大" in script,
            "窄屏缺少可选放大阅读路径", failures)

    require("aria-live" in script, "脚本缺少分步反馈的 aria-live 区域", failures)
    require("eval(" not in script and "new Function" not in script, "脚本不得执行配置字符串", failures)
    require("setInterval(" not in script, "推导不得自动播放", failures)

    # Regression guards for visual mechanics caught by adversarial review.
    for required in (
        "M = −∫A σy dA",
        'line(390, 226, 438, 226, "dw-tension-dash"',
        'line(392, 92, 240, 92, "dw-compression"',
        'M442 75L500 75L442 180Z',
        'M390 88 C454 88 530 130 570 252',
        'M465 72L510 72L465 177Z',
        'M390 90L350 90L390 188Z',
    ):
        require(required in script, f"关键视觉力学约束丢失：{required}", failures)

    for forbidden in (
        "M=∫σy dA",
        "M442 75L500 75L442 285Z",
        "M390 252 Q470 72 570 246",
        "M430 72L475 72L430 282L505 282Z",
    ):
        require(forbidden not in script, f"已知误导图形回归：{forbidden}", failures)

    for path in (
        ROOT / "assets" / "illustrations" / "beam-four-lenses.webp",
        ROOT / "assets" / "illustrations" / "student-derivation-workbench.webp",
    ):
        require(path.exists() and path.stat().st_size > 10_000, f"概念插画缺失或异常：{path}", failures)

    symbol_checks = {
        ROOT / "foundations" / "f1-axial-torsion.qmd": ("$Delta", "$sigma"),
        ROOT / "foundations" / "f3-beam-stress.qmd": ("$sigma",),
        ROOT / "foundations" / "f5-stress-stability.qmd": ("$sigma", "$\tau".replace("\\t", "\t")),
    }
    for path, bad_tokens in symbol_checks.items():
        text = path.read_text(encoding="utf-8")
        for token in bad_tokens:
            require(token not in text, f"{path.name} 仍含阻断符号 {token!r}", failures)

    if failures:
        print("Visual derivation verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print(f"Verified {len(EXPECTED)} visual derivations, fallbacks, accessibility, and concept-image boundaries.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
