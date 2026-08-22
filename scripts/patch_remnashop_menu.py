#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hide RemnaShop native shop buttons when the web cabinet is enabled.

Keeps: Личный кабинет, custom buttons (agreement/policy), admin dashboard, trial.
Hides: Connect, Devices, Subscription, Invite, Support.
"""
from __future__ import annotations

import pathlib
import sys

MARKER = "# remnashop-web: compact menu when web cabinet is on"
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/opt/remnashop")

DIALOG = ROOT / "src/telegram/routers/menu/dialog.py"
KEYBOARDS = ROOT / "src/telegram/keyboards.py"

DIALOG_REPLACEMENTS = [
    (
        'when=F["has_subscription"] & ~F["connectable"],',
        'when=F["has_subscription"] & ~F["connectable"] & ~F["web_enabled"],',
    ),
    (
        """    Row(
        SwitchTo(
            text=I18nFormat("btn-menu.devices"),
            id="devices",
            state=MainMenu.DEVICES,
            when=F["has_device_limit"],
        ),
        Start(
            text=I18nFormat("btn-menu.subscription"),
            id=f"{PAYMENT_PREFIX}subscription",
            state=Subscription.MAIN,
        ),
    ),""",
        """    Row(
        SwitchTo(
            text=I18nFormat("btn-menu.devices"),
            id="devices",
            state=MainMenu.DEVICES,
            when=F["has_device_limit"],
        ),
        Start(
            text=I18nFormat("btn-menu.subscription"),
            id=f"{PAYMENT_PREFIX}subscription",
            state=Subscription.MAIN,
        ),
        when=~F["web_enabled"],
    ),""",
    ),
    (
        """            url=Format("{support_url}"),
        ),
    ),""",
        """            url=Format("{support_url}"),
        ),
        when=~F["web_enabled"],
    ),""",
    ),
]

KEYBOARD_REPLACEMENTS = [
    (
        'when=F["is_mini_app"] & F["connectable"],',
        'when=F["is_mini_app"] & F["connectable"] & ~F["web_enabled"],',
    ),
    (
        'when=F["is_mini_app_reserve"] & F["connectable"],',
        'when=F["is_mini_app_reserve"] & F["connectable"] & ~F["web_enabled"],',
    ),
    (
        'when=~F["is_mini_app"] & F["connectable"],',
        'when=~F["is_mini_app"] & F["connectable"] & ~F["web_enabled"],',
    ),
]


def apply(path: pathlib.Path, replacements: list[tuple[str, str]]) -> None:
    if not path.is_file():
        raise SystemExit(f"нет файла {path}")
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        print(f"уже пропатчено: {path}")
        return
    missing = []
    new = text
    for old, repl in replacements:
        if old not in new:
            missing.append(old[:100].replace("\n", " / "))
            continue
        new = new.replace(old, repl, 1)
    if missing:
        raise SystemExit(f"{path.name} не совпал с этой версией RemnaShop:\n" + "\n".join(missing))
    path.write_text(MARKER + "\n" + new, encoding="utf-8")
    print(f"ok: {path}")


def main() -> None:
    apply(DIALOG, DIALOG_REPLACEMENTS)
    apply(KEYBOARDS, KEYBOARD_REPLACEMENTS)


if __name__ == "__main__":
    main()
