"""
Lambda handler for proxy subscription API.
GET /mihomo/proxies/{token}  → Clash/mihomo proxy-provider YAML
GET /singbox/proxies/{token} → sing-box outbound JSON
"""

import json
import os
import time
import boto3
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource("dynamodb")
secrets_client = boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION", "us-west-2"))

TOKENS_TABLE = os.environ.get("TOKENS_TABLE", "proxy-tokens")
NODES_TABLE = os.environ.get("NODES_TABLE", "proxy-nodes")
SECRET_NAME = "proxy/sing-box-credentials"

REGION_LABELS = {
    "us": "US", "jp": "JP", "tw": "TW", "hk": "HK",
    "sg": "SG", "kr": "KR", "de": "DE", "uk": "UK",
}

_cached_creds = None


def _get_credentials():
    global _cached_creds
    if _cached_creds is None:
        resp = secrets_client.get_secret_value(SecretId=SECRET_NAME)
        _cached_creds = json.loads(resp["SecretString"])
    return _cached_creds


def handler(event, context):
    path_params = event.get("pathParameters") or {}
    token = path_params.get("token", "")
    raw_path = event.get("rawPath", "")

    if not token:
        return _response(404, "Not found")

    token_record = _get_token(token)
    if not token_record:
        # Return 404 instead of 403 to avoid token existence probing
        return _response(404, "Not found")

    # Track access: count, timestamp, source IP
    source_ip = ""
    try:
        source_ip = event.get("requestContext", {}).get("http", {}).get("sourceIp", "")
    except Exception:
        pass
    _track_token_access(token, source_ip)

    # Optional: daily request limit (100/day)
    daily_count = token_record.get("daily_count", 0)
    daily_date = token_record.get("daily_date", "")
    today = time.strftime("%Y-%m-%d", time.gmtime())
    if daily_date == today and int(daily_count) > 100:
        return _response(429, "Rate limit exceeded")

    nodes = _get_active_nodes()
    if not nodes:
        return _response(404, "No active nodes available")

    allowed_regions = token_record.get("allowed_regions", [])
    if allowed_regions:
        nodes = [n for n in nodes if n.get("region") in allowed_regions]

    if not nodes:
        return _response(404, "No nodes in allowed regions")

    creds = _get_credentials()

    # Route by path prefix
    if "/singbox/" in raw_path:
        body = _generate_singbox_json(nodes, creds)
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "private",
            },
            "body": body,
        }
    else:
        body = _generate_clash_yaml(nodes, creds)
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "text/yaml; charset=utf-8",
                "Cache-Control": "private",
            },
            "body": body,
        }


# ============================================================
# Common helpers
# ============================================================

def _get_token(token):
    table = dynamodb.Table(TOKENS_TABLE)
    try:
        resp = table.get_item(Key={"token": token})
    except Exception:
        return None
    item = resp.get("Item")
    if not item:
        return None
    if not item.get("enabled", False):
        return None
    expires_at = item.get("expires_at", 0)
    if expires_at and int(expires_at) < int(time.time()):
        return None
    return item


def _track_token_access(token, source_ip=""):
    """Atomically increment access_count, update last_access and daily counters."""
    table = dynamodb.Table(TOKENS_TABLE)
    today = time.strftime("%Y-%m-%d", time.gmtime())
    now = int(time.time())
    try:
        # Reset daily counter if date changed
        table.update_item(
            Key={"token": token},
            UpdateExpression=(
                "SET access_count = if_not_exists(access_count, :zero) + :one, "
                "last_access = :now, last_ip = :ip, "
                "daily_count = if_not_exists(daily_count, :zero) + :one, "
                "daily_date = :today"
            ),
            ConditionExpression="daily_date = :today OR attribute_not_exists(daily_date)",
            ExpressionAttributeValues={
                ":zero": 0,
                ":one": 1,
                ":now": now,
                ":ip": source_ip,
                ":today": today,
            },
        )
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        # Date changed — reset daily counter
        table.update_item(
            Key={"token": token},
            UpdateExpression=(
                "SET access_count = if_not_exists(access_count, :zero) + :one, "
                "last_access = :now, last_ip = :ip, "
                "daily_count = :one, daily_date = :today"
            ),
            ExpressionAttributeValues={
                ":zero": 0,
                ":one": 1,
                ":now": now,
                ":ip": source_ip,
                ":today": today,
            },
        )
    except Exception:
        pass  # Non-critical — don't fail the request


def _get_active_nodes():
    table = dynamodb.Table(NODES_TABLE)
    try:
        resp = table.scan(FilterExpression=Attr("status").eq("active"))
        return resp.get("Items", [])
    except Exception:
        return []


def _node_label(node_id):
    region_code = node_id.split("-")[0] if "-" in node_id else node_id
    label = REGION_LABELS.get(region_code, region_code.upper())
    suffix = node_id.split("-", 1)[1] if "-" in node_id else "1"
    return f"{label}-{suffix}"


# ============================================================
# Clash / mihomo YAML format
# ============================================================

def _generate_clash_yaml(nodes, creds):
    # Collect all proxy names
    proxy_names = []
    proxy_lines = []
    for node in nodes:
        ip = node.get("public_ip", "")
        if not ip:
            continue
        name_base = _node_label(node.get("node_id", "unknown"))

        for builder in [_clash_ss, _clash_vless, _clash_trojan, _clash_hy2]:
            entry = builder(name_base, ip, creds)
            proxy_lines.extend(entry)
            # Extract name from first line
            name_line = entry[0]
            pname = name_line.split('"')[1]
            proxy_names.append(pname)

    all_proxies_str = ", ".join(f"'{n}'" for n in proxy_names)

    lines = [
        # Global settings
        "mixed-port: 7890",
        "allow-lan: true",
        "mode: Rule",
        "log-level: info",
        "external-controller: '127.0.0.1:9090'",
        "",
        # Proxies
        "proxies:",
    ]
    lines.extend(proxy_lines)

    # proxy-groups
    lines.extend([
        "",
        "proxy-groups:",
        f"    - {{ name: Proxy, type: select, proxies: ['Auto - UrlTest', DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: Domestic, type: select, proxies: [DIRECT, Proxy, {all_proxies_str}] }}",
        f"    - {{ name: Others, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: AdBlock, type: select, proxies: [REJECT, DIRECT, Proxy] }}",
        f"    - {{ name: Netflix, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: 'Disney Plus', type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: YouTube, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: Spotify, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: 'AI Suite', type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: Telegram, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: 'Global TV', type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: 'Asian TV', type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: 'CN Mainland TV', type: select, proxies: [DIRECT, Proxy, {all_proxies_str}] }}",
        f"    - {{ name: Apple, type: select, proxies: [DIRECT, Proxy, {all_proxies_str}] }}",
        f"    - {{ name: 'Apple TV', type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: Microsoft, type: select, proxies: [DIRECT, Proxy, {all_proxies_str}] }}",
        f"    - {{ name: Google, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: Discord, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: Crypto, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: Steam, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: TikTok, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: PayPal, type: select, proxies: [DIRECT, Proxy, {all_proxies_str}] }}",
        f"    - {{ name: Speedtest, type: select, proxies: [Proxy, DIRECT, {all_proxies_str}] }}",
        f"    - {{ name: 'Auto - UrlTest', type: url-test, proxies: [{all_proxies_str}], url: 'http://cp.cloudflare.com/generate_204', interval: '3600' }}",
    ])

    # rule-providers
    DLER = "https://raw.dler.io/dler-io/Rules/main/Clash/Provider"
    lines.extend([
        "",
        "rule-providers:",
        f"    AdBlock: {{ type: http, behavior: classical, url: '{DLER}/AdBlock.yaml', path: ./Rules/AdBlock, interval: 86400 }}",
        f"    Special: {{ type: http, behavior: classical, url: '{DLER}/Special.yaml', path: ./Rules/Special, interval: 86400 }}",
        f"    PROXY: {{ type: http, behavior: classical, url: '{DLER}/Proxy.yaml', path: ./Rules/Proxy, interval: 86400 }}",
        f"    Domestic: {{ type: http, behavior: classical, url: '{DLER}/Domestic.yaml', path: ./Rules/Domestic, interval: 86400 }}",
        f"    'Domestic IPs': {{ type: http, behavior: classical, url: '{DLER}/Domestic%20IPs.yaml', path: ./Rules/Domestic_IPs, interval: 86400 }}",
        f"    LAN: {{ type: http, behavior: classical, url: '{DLER}/LAN.yaml', path: ./Rules/LAN, interval: 86400 }}",
        f"    Netflix: {{ type: http, behavior: classical, url: '{DLER}/Media/Netflix.yaml', path: ./Rules/Media/Netflix, interval: 86400 }}",
        f"    'Disney Plus': {{ type: http, behavior: classical, url: '{DLER}/Media/Disney%20Plus.yaml', path: ./Rules/Media/Disney_Plus, interval: 86400 }}",
        f"    YouTube: {{ type: http, behavior: classical, url: '{DLER}/Media/YouTube.yaml', path: ./Rules/Media/YouTube, interval: 86400 }}",
        f"    Spotify: {{ type: http, behavior: classical, url: '{DLER}/Media/Spotify.yaml', path: ./Rules/Media/Spotify, interval: 86400 }}",
        f"    'AI Suite': {{ type: http, behavior: classical, url: '{DLER}/AI%20Suite.yaml', path: './Rules/AI Suite', interval: 86400 }}",
        f"    Telegram: {{ type: http, behavior: classical, url: '{DLER}/Telegram.yaml', path: ./Rules/Telegram, interval: 86400 }}",
        f"    Crypto: {{ type: http, behavior: classical, url: '{DLER}/Crypto.yaml', path: ./Rules/Crypto, interval: 86400 }}",
        f"    Discord: {{ type: http, behavior: classical, url: '{DLER}/Discord.yaml', path: ./Rules/Discord, interval: 86400 }}",
        f"    Steam: {{ type: http, behavior: classical, url: '{DLER}/Steam.yaml', path: ./Rules/Steam, interval: 86400 }}",
        f"    Speedtest: {{ type: http, behavior: classical, url: '{DLER}/Speedtest.yaml', path: ./Rules/Speedtest, interval: 86400 }}",
        f"    PayPal: {{ type: http, behavior: classical, url: '{DLER}/PayPal.yaml', path: ./Rules/PayPal, interval: 86400 }}",
        f"    Microsoft: {{ type: http, behavior: classical, url: '{DLER}/Microsoft.yaml', path: ./Rules/Microsoft, interval: 86400 }}",
        f"    Apple: {{ type: http, behavior: classical, url: '{DLER}/Apple.yaml', path: ./Rules/Apple, interval: 86400 }}",
        f"    'Apple TV': {{ type: http, behavior: classical, url: '{DLER}/Media/Apple%20TV.yaml', path: ./Rules/Media/Apple_TV, interval: 86400 }}",
        f"    'Apple Music': {{ type: http, behavior: classical, url: '{DLER}/Media/Apple%20Music.yaml', path: ./Rules/Media/Apple_Music, interval: 86400 }}",
        f"    'Google FCM': {{ type: http, behavior: classical, url: '{DLER}/Google%20FCM.yaml', path: './Rules/Google FCM', interval: 86400 }}",
        f"    TikTok: {{ type: http, behavior: classical, url: '{DLER}/TikTok.yaml', path: ./Rules/TikTok, interval: 86400 }}",
        f"    Bilibili: {{ type: http, behavior: classical, url: '{DLER}/Media/Bilibili.yaml', path: ./Rules/Media/Bilibili, interval: 86400 }}",
        f"    'Bahamut': {{ type: http, behavior: classical, url: '{DLER}/Media/Bahamut.yaml', path: ./Rules/Media/Bahamut, interval: 86400 }}",
        f"    'Hulu': {{ type: http, behavior: classical, url: '{DLER}/Media/Hulu.yaml', path: ./Rules/Media/Hulu, interval: 86400 }}",
        f"    Amazon: {{ type: http, behavior: classical, url: '{DLER}/Media/Amazon.yaml', path: ./Rules/Media/Amazon, interval: 86400 }}",
    ])

    # rules
    lines.extend([
        "",
        "rules:",
        "    - 'RULE-SET,AdBlock,AdBlock'",
        "    - 'RULE-SET,Special,DIRECT'",
        "    - 'RULE-SET,Netflix,Netflix'",
        "    - 'RULE-SET,Disney Plus,Disney Plus'",
        "    - 'RULE-SET,YouTube,YouTube'",
        "    - 'RULE-SET,Spotify,Spotify'",
        "    - 'RULE-SET,Bahamut,Asian TV'",
        "    - 'RULE-SET,Hulu,Global TV'",
        "    - 'RULE-SET,Amazon,Global TV'",
        "    - 'RULE-SET,Bilibili,CN Mainland TV'",
        "    - 'RULE-SET,Telegram,Telegram'",
        "    - 'RULE-SET,Crypto,Crypto'",
        "    - 'RULE-SET,Discord,Discord'",
        "    - 'RULE-SET,Google FCM,Google'",
        "    - 'RULE-SET,Microsoft,Microsoft'",
        "    - 'RULE-SET,AI Suite,AI Suite'",
        "    - 'RULE-SET,PayPal,PayPal'",
        "    - 'RULE-SET,Speedtest,Speedtest'",
        "    - 'RULE-SET,Steam,Steam'",
        "    - 'RULE-SET,TikTok,TikTok'",
        "    - 'RULE-SET,Apple Music,Apple TV'",
        "    - 'RULE-SET,Apple TV,Apple TV'",
        "    - 'RULE-SET,Apple,Apple'",
        "    - 'DOMAIN-SUFFIX,weixin.qq.com,DIRECT'",
        "    - 'DOMAIN-SUFFIX,wechat.com,DIRECT'",
        "    - 'DOMAIN-SUFFIX,qq.com,Domestic'",
        "    - 'DOMAIN-SUFFIX,tencent.com,Domestic'",
        "    - 'RULE-SET,PROXY,Proxy'",
        "    - 'RULE-SET,Domestic,Domestic'",
        "    - 'RULE-SET,Domestic IPs,Domestic'",
        "    - 'RULE-SET,LAN,DIRECT'",
        "    - 'GEOIP,CN,Domestic'",
        "    - 'MATCH,Others'",
    ])

    return "\n".join(lines) + "\n"


def _clash_ss(name_base, ip, creds):
    return [
        f'  - name: "{name_base}-ss"',
        f"    type: ss",
        f"    server: {ip}",
        f"    port: 8388",
        f"    cipher: 2022-blake3-aes-128-gcm",
        f'    password: "{creds["ss_password"]}"',
    ]


def _clash_vless(name_base, ip, creds):
    lines = [
        f'  - name: "{name_base}-vless"',
        f"    type: vless",
        f"    server: {ip}",
        f"    port: 443",
        f"    uuid: {creds['vless_uuid']}",
        f"    network: tcp",
        f"    tls: true",
        f"    udp: true",
        f"    flow: xtls-rprx-vision",
        f"    servername: dl.google.com",
        f"    reality-opts:",
        f"      public-key: {creds['reality_public_key']}",
    ]
    short_id = creds.get('reality_short_id', '')
    if short_id:
        lines.append(f"      short-id: {short_id}")
    return lines


def _clash_trojan(name_base, ip, creds):
    return [
        f'  - name: "{name_base}-trojan"',
        f"    type: trojan",
        f"    server: {ip}",
        f"    port: 8443",
        f'    password: "{creds["trojan_password"]}"',
        f"    skip-cert-verify: true",
    ]


def _clash_hy2(name_base, ip, creds):
    return [
        f'  - name: "{name_base}-hy2"',
        f"    type: hysteria2",
        f"    server: {ip}",
        f"    port: 8844",
        f'    password: "{creds["hy2_password"]}"',
        f"    skip-cert-verify: true",
    ]


# ============================================================
# sing-box JSON format  (exact Dler Cloud structure for SFI)
# ============================================================

_CDN_GEOSITE = "https://testingcf.jsdelivr.net/gh/lyc8503/sing-box-rules@rule-set-geosite"
_CDN_GEOIP = "https://testingcf.jsdelivr.net/gh/lyc8503/sing-box-rules@rule-set-geoip"

# Rule sets — lyc8503/sing-box-rules (enhanced, daily updated)
_SB_RULE_SETS = [
    ("geoip-netflix",     f"{_CDN_GEOIP}/geoip-netflix.srs"),
    ("geosite-netflix",   f"{_CDN_GEOSITE}/geosite-netflix.srs"),
    ("geosite-disney",    f"{_CDN_GEOSITE}/geosite-disney.srs"),
    ("geosite-youtube",   f"{_CDN_GEOSITE}/geosite-youtube.srs"),
    ("geosite-spotify",   f"{_CDN_GEOSITE}/geosite-spotify.srs"),
    ("geosite-apple",     f"{_CDN_GEOSITE}/geosite-apple.srs"),
    ("geoip-telegram",    f"{_CDN_GEOIP}/geoip-telegram.srs"),
    ("geosite-telegram",  f"{_CDN_GEOSITE}/geosite-telegram.srs"),
    ("geosite-openai",    f"{_CDN_GEOSITE}/geosite-openai.srs"),
    ("geosite-microsoft", f"{_CDN_GEOSITE}/geosite-microsoft.srs"),
    ("geosite-tiktok",    f"{_CDN_GEOSITE}/geosite-tiktok.srs"),
]

# Selector groups — exact same as Dler Cloud
_SB_GROUPS = [
    ("Proxy",       "selector", ["Auto - UrlTest", "direct"]),
    ("Domestic",    "selector", ["direct", "Proxy"]),
    ("Others",      "selector", ["Proxy", "direct"]),
    ("AI Suite",    "selector", ["Proxy", "direct"]),
    ("Netflix",     "selector", ["Proxy", "direct"]),
    ("Disney Plus", "selector", ["Proxy", "direct"]),
    ("YouTube",     "selector", ["Proxy", "direct"]),
    ("Spotify",     "selector", ["Proxy", "direct"]),
    ("Apple",       "selector", ["direct", "Proxy"]),
    ("Telegram",    "selector", ["Proxy", "direct"]),
    ("Microsoft",   "selector", ["Proxy", "direct"]),
    ("TikTok",      "selector", ["Proxy", "direct"]),
    ("Auto - UrlTest", "urltest", []),
]


def _generate_singbox_json(nodes, creds):
    outbounds = []
    all_tags = []

    for node in nodes:
        ip = node.get("public_ip", "")
        if not ip:
            continue
        name_base = _node_label(node.get("node_id", "unknown"))
        for builder in [_sb_ss, _sb_vless, _sb_trojan, _sb_hy2]:
            ob = builder(name_base, ip, creds)
            outbounds.append(ob)
            all_tags.append(ob["tag"])

    groups = _sb_build_groups(all_tags)
    direct = {"type": "direct", "tag": "direct"}
    block = {"type": "block", "tag": "block"}
    dns_out = {"type": "dns", "tag": "dns-out"}

    result = {
        "log": {"level": "info"},
        "dns": _sb_dns_config(),
        "inbounds": [
            {
                "type": "tun",
                "tag": "tun-in",
                "inet4_address": "172.19.0.1/30",
                "inet6_address": "fdfe:dcba:9876::1/126",
                "auto_route": True,
                "strict_route": True,
                "stack": "system",
                "sniff": True,
            },
        ],
        "outbounds": groups + outbounds + [direct, block, dns_out],
        "route": _sb_route_config(),
    }
    return json.dumps(result, indent=2, ensure_ascii=False)


def _sb_build_groups(all_tags):
    """Build outbound selector/urltest groups from _SB_GROUPS definition."""
    groups = []
    for tag, gtype, first_opts in _SB_GROUPS:
        ob = {"type": gtype, "tag": tag}
        if gtype == "urltest":
            ob["outbounds"] = list(all_tags)
            ob["url"] = "http://www.gstatic.com/generate_204"
            ob["interval"] = "5m"
        else:
            ob["outbounds"] = first_opts + list(all_tags)
        groups.append(ob)
    return groups


def _sb_route_config():
    """Route configuration — compatible old format."""
    rules = [
        {"protocol": "dns", "outbound": "dns-out"},
        {"network": "udp", "port": 443, "outbound": "block"},
        {"geoip": "private", "outbound": "direct"},
        {"rule_set": ["geoip-netflix", "geosite-netflix"], "outbound": "Netflix"},
        {"rule_set": "geosite-disney", "outbound": "Disney Plus"},
        {"rule_set": "geosite-youtube", "outbound": "YouTube"},
        {"rule_set": "geosite-spotify", "outbound": "Spotify"},
        {"rule_set": "geosite-apple", "outbound": "Apple"},
        {"rule_set": ["geoip-telegram", "geosite-telegram"], "outbound": "Telegram"},
        {"rule_set": "geosite-openai", "outbound": "AI Suite"},
        {"rule_set": "geosite-microsoft", "outbound": "Microsoft"},
        {"rule_set": "geosite-tiktok", "outbound": "TikTok"},
        {"geoip": "cn", "outbound": "direct"},
        {"geosite": "cn", "outbound": "direct"},
    ]

    rule_set_defs = [
        {"tag": tag, "type": "remote", "format": "binary", "url": url}
        for tag, url in _SB_RULE_SETS
    ]

    return {
        "auto_detect_interface": True,
        "final": "Proxy",
        "rules": rules,
        "rule_set": rule_set_defs,
    }


def _sb_dns_config():
    """DNS configuration — simple, compatible format."""
    return {
        "servers": [
            {"tag": "google", "address": "tls://8.8.8.8"},
            {"tag": "local", "address": "223.5.5.5", "detour": "direct"},
        ],
        "rules": [
            {"geosite": "cn", "server": "local"},
        ],
        "strategy": "ipv4_only",
    }


def _sb_ss(name_base, ip, creds):
    return {
        "type": "shadowsocks",
        "tag": f"{name_base}-ss",
        "server": ip,
        "server_port": 8388,
        "method": "2022-blake3-aes-128-gcm",
        "password": creds["ss_password"],
    }


def _sb_vless(name_base, ip, creds):
    reality = {
        "enabled": True,
        "public_key": creds["reality_public_key"],
    }
    short_id = creds.get("reality_short_id", "")
    if short_id:
        reality["short_id"] = short_id
    return {
        "type": "vless",
        "tag": f"{name_base}-vless",
        "server": ip,
        "server_port": 443,
        "uuid": creds["vless_uuid"],
        "flow": "xtls-rprx-vision",
        "tls": {
            "enabled": True,
            "server_name": "dl.google.com",
            "utls": {"enabled": True, "fingerprint": "chrome"},
            "reality": reality,
        },
    }


def _sb_trojan(name_base, ip, creds):
    return {
        "type": "trojan",
        "tag": f"{name_base}-trojan",
        "server": ip,
        "server_port": 8443,
        "password": creds["trojan_password"],
        "tls": {
            "enabled": True,
            "insecure": True,
        },
    }


def _sb_hy2(name_base, ip, creds):
    return {
        "type": "hysteria2",
        "tag": f"{name_base}-hy2",
        "server": ip,
        "server_port": 8844,
        "password": creds["hy2_password"],
        "tls": {
            "enabled": True,
            "insecure": True,
        },
    }


def _response(status_code, message):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"error": message}),
    }
