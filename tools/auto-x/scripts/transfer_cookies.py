#!/usr/bin/env python3
"""
从有头 Chrome 导出 X.com cookies，导入到 headless Chrome
用法: python3 transfer_cookies.py <from_port> <to_port>
"""

import subprocess
import json
import sys
import os
from pathlib import Path

AB = str(Path.home() / ".local/bin/actionbook")


def run_ab(port, command, timeout=10):
    """执行 actionbook 命令"""
    cmd = f"{AB} --cdp {port} browser {command}"
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return result.stdout.strip(), result.returncode
    except Exception as e:
        return str(e), 1


def main():
    from_port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222
    to_port = int(sys.argv[2]) if len(sys.argv) > 2 else 9223

    print(f"[cookies] 从 port {from_port} 导出 → port {to_port} 导入")

    # 1. 从有头 Chrome 导出 cookies
    output, rc = run_ab(from_port, "cookies list --json")
    if rc != 0:
        print(f"[cookies] 导出失败: {output}")
        sys.exit(1)

    try:
        all_cookies = json.loads(output)
    except json.JSONDecodeError:
        print(f"[cookies] JSON 解析失败")
        sys.exit(1)

    # 过滤 X.com 相关 cookies
    x_cookies = [c for c in all_cookies
                 if any(d in c.get('domain', '') for d in ['x.com', 'twitter.com'])]

    print(f"[cookies] 导出 {len(x_cookies)} 个 X.com cookies")

    if not x_cookies:
        print("[cookies] 未找到 X.com cookies，跳过")
        sys.exit(0)

    # 2. 在 headless Chrome 上先打开 x.com
    run_ab(to_port, 'open "https://x.com"', timeout=15)

    import time
    time.sleep(2)

    # 3. 逐个设置 cookie
    set_count = 0
    for cookie in x_cookies:
        name = cookie.get('name', '')
        value = cookie.get('value', '')
        domain = cookie.get('domain', '')

        if not name or not value:
            continue

        # 用 eval 设置 cookie（通过 CDP Network.setCookie 更可靠）
        cookie_json = json.dumps({
            "name": name,
            "value": value,
            "domain": domain,
            "path": cookie.get('path', '/'),
            "secure": cookie.get('secure', True),
            "httpOnly": cookie.get('httpOnly', False),
        })

        # 使用 actionbook 的 cookies set
        _, rc = run_ab(to_port, f'cookies set "{name}" "{value}" --domain "{domain}"')
        if rc == 0:
            set_count += 1

    print(f"[cookies] 已导入 {set_count}/{len(x_cookies)} 个 cookies")

    # 4. 刷新页面使 cookies 生效
    run_ab(to_port, 'goto "https://x.com"', timeout=15)
    time.sleep(3)

    print("[cookies] 转移完成")


if __name__ == '__main__':
    main()
