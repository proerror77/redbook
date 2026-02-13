# Rule Providers

Mihomo rule-provider YAML files for traffic routing.

## Sources

| File | Source | Type |
|------|--------|------|
| geosite-cn.yaml | [Loyalsoldier/clash-rules - direct.txt](https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt) | domain |
| geosite-category-ads.yaml | [Loyalsoldier/clash-rules - reject.txt](https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt) | domain |
| geoip-cn.yaml | [Loyalsoldier/clash-rules - cncidr.txt](https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt) | ipcidr |

## Update Rules

Download the latest rule sets:

```bash
cd rules/
curl -L -o geosite-cn.yaml https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt
curl -L -o geosite-category-ads.yaml https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt
curl -L -o geoip-cn.yaml https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt
```

Then re-upload to S3:

```bash
bash scripts/phase-c-config-plane.sh
```

The current files are **placeholders**. You must download the full rule sets before deploying.
