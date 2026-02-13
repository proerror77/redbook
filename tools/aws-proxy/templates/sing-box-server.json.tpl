{
  "log": {
    "level": "info",
    "timestamp": true
  },
  "inbounds": [
    {
      "type": "shadowsocks",
      "tag": "ss-in",
      "listen": "::",
      "listen_port": 8388,
      "network": "tcp_and_udp",
      "method": "aes-256-gcm",
      "password": "__SS_PASSWORD__"
    },
    {
      "type": "vless",
      "tag": "vless-reality-in",
      "listen": "::",
      "listen_port": 443,
      "users": [
        {
          "uuid": "__VLESS_UUID__",
          "flow": "xtls-rprx-vision"
        }
      ],
      "tls": {
        "enabled": true,
        "server_name": "www.microsoft.com",
        "reality": {
          "enabled": true,
          "handshake": {
            "server": "1.1.1.1",
            "server_port": 443
          },
          "private_key": "__REALITY_PRIVATE_KEY__",
          "short_id": [
            "__REALITY_SHORT_ID__"
          ]
        }
      }
    },
    {
      "type": "trojan",
      "tag": "trojan-in",
      "listen": "::",
      "listen_port": 8443,
      "users": [
        {
          "password": "__TROJAN_PASSWORD__"
        }
      ],
      "tls": {
        "enabled": true,
        "certificate_path": "/etc/sing-box/tls/cert.pem",
        "key_path": "/etc/sing-box/tls/key.pem"
      }
    },
    {
      "type": "hysteria2",
      "tag": "hy2-in",
      "listen": "::",
      "listen_port": 8844,
      "users": [
        {
          "password": "__HY2_PASSWORD__"
        }
      ],
      "tls": {
        "enabled": true,
        "certificate_path": "/etc/sing-box/tls/cert.pem",
        "key_path": "/etc/sing-box/tls/key.pem"
      }
    }
  ],
  "outbounds": [
    {
      "type": "direct",
      "tag": "direct"
    }
  ]
}
