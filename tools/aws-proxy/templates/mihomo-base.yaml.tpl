# mihomo (Clash Meta) base profile
# Auto-generated template - placeholders: __CF_URL__, __APIGW_URL__, __TOKEN__

mixed-port: 7890
allow-lan: true
mode: rule
log-level: info
unified-delay: true
find-process-mode: strict

dns:
  enable: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  nameserver:
    - https://dns.alidns.com/dns-query
    - https://doh.pub/dns-query
  fallback:
    - https://dns.cloudflare.com/dns-query
    - https://dns.google/dns-query
  fallback-filter:
    geoip: true
    geoip-code: CN

proxy-providers:
  all-nodes:
    type: http
    url: "__APIGW_URL__/mihomo/proxies/__TOKEN__"
    interval: 3600
    path: ./providers/all-nodes.yaml
    health-check:
      enable: true
      url: https://www.gstatic.com/generate_204
      interval: 300

proxy-groups:
  - name: Proxy
    type: select
    use:
      - all-nodes
    proxies:
      - Auto
      - US
      - JP
      - TW
      - DIRECT

  - name: Auto
    type: url-test
    use:
      - all-nodes
    url: https://www.gstatic.com/generate_204
    interval: 300
    tolerance: 50

  - name: US
    type: url-test
    use:
      - all-nodes
    filter: "US"
    url: https://www.gstatic.com/generate_204
    interval: 300

  - name: JP
    type: url-test
    use:
      - all-nodes
    filter: "JP"
    url: https://www.gstatic.com/generate_204
    interval: 300

  - name: TW
    type: url-test
    use:
      - all-nodes
    filter: "TW"
    url: https://www.gstatic.com/generate_204
    interval: 300

  - name: Streaming
    type: select
    proxies:
      - Proxy
      - US
      - JP
      - TW
      - Auto

  - name: AI Services
    type: select
    proxies:
      - Proxy
      - US
      - JP
      - Auto

rule-providers:
  geosite-cn:
    type: http
    behavior: domain
    url: "__CF_URL__/rules/geosite-cn.yaml"
    path: ./rules/geosite-cn.yaml
    interval: 86400

  geosite-category-ads:
    type: http
    behavior: domain
    url: "__CF_URL__/rules/geosite-category-ads.yaml"
    path: ./rules/geosite-category-ads.yaml
    interval: 86400

  geoip-cn:
    type: http
    behavior: ipcidr
    url: "__CF_URL__/rules/geoip-cn.yaml"
    path: ./rules/geoip-cn.yaml
    interval: 86400

rules:
  - RULE-SET,geosite-category-ads,REJECT
  - DOMAIN-SUFFIX,openai.com,AI Services
  - DOMAIN-SUFFIX,anthropic.com,AI Services
  - DOMAIN-SUFFIX,claude.ai,AI Services
  - DOMAIN-SUFFIX,googleapis.com,AI Services
  - DOMAIN-SUFFIX,netflix.com,Streaming
  - DOMAIN-SUFFIX,youtube.com,Streaming
  - DOMAIN-SUFFIX,spotify.com,Streaming
  - DOMAIN-SUFFIX,disneyplus.com,Streaming
  - RULE-SET,geosite-cn,DIRECT
  - RULE-SET,geoip-cn,DIRECT
  - MATCH,Proxy
