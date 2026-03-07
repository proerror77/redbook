"""
Health check Lambda for proxy nodes.
Triggered by EventBridge every 30 minutes.
- TCP connects to each active node on ports 443 and 8443
- Tracks consecutive failures in DynamoDB
- Sends SNS alert after 3 consecutive failures
"""

import json
import os
import socket
import time
import boto3

dynamodb = boto3.resource("dynamodb")
sns = boto3.client("sns")

NODES_TABLE = os.environ.get("NODES_TABLE", "proxy-nodes")
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN", "")
CHECK_PORTS = [443, 8443]  # TCP ports only (VLESS, Trojan)
CONNECT_TIMEOUT = 5  # seconds
FAILURE_THRESHOLD = 3  # consecutive failures before alert


def handler(event, context):
    table = dynamodb.Table(NODES_TABLE)
    resp = table.scan()
    nodes = resp.get("Items", [])

    results = []
    for node in nodes:
        if node.get("status") != "active":
            continue
        result = _check_node(table, node)
        results.append(result)

    return {
        "statusCode": 200,
        "body": json.dumps({"checked": len(results), "results": results}),
    }


def _check_node(table, node):
    node_id = node.get("node_id", "unknown")
    ip = node.get("public_ip", "")
    region = node.get("region", "")

    if not ip:
        return {"node_id": node_id, "status": "skip", "reason": "no IP"}

    # TCP connect check on each port
    port_results = {}
    all_ok = True
    for port in CHECK_PORTS:
        ok = _tcp_check(ip, port)
        port_results[port] = "ok" if ok else "fail"
        if not ok:
            all_ok = False

    now = int(time.time())
    prev_failures = int(node.get("consecutive_failures", 0))

    if all_ok:
        # Reset failure counter
        table.update_item(
            Key={"node_id": node_id},
            UpdateExpression="SET health_status = :s, last_check = :t, consecutive_failures = :zero",
            ExpressionAttributeValues={
                ":s": "healthy",
                ":t": now,
                ":zero": 0,
            },
        )
        return {"node_id": node_id, "status": "healthy", "ports": port_results}
    else:
        new_failures = prev_failures + 1
        table.update_item(
            Key={"node_id": node_id},
            UpdateExpression="SET health_status = :s, last_check = :t, consecutive_failures = :f",
            ExpressionAttributeValues={
                ":s": "unhealthy",
                ":t": now,
                ":f": new_failures,
            },
        )

        # Alert if threshold reached
        if new_failures >= FAILURE_THRESHOLD and SNS_TOPIC_ARN:
            _send_alert(node_id, region, ip, new_failures, port_results)

        return {
            "node_id": node_id,
            "status": "unhealthy",
            "consecutive_failures": new_failures,
            "ports": port_results,
        }


def _tcp_check(ip, port):
    """Try TCP connect. Returns True if successful."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(CONNECT_TIMEOUT)
        sock.connect((ip, port))
        sock.close()
        return True
    except Exception:
        return False


def _send_alert(node_id, region, ip, failures, port_results):
    """Send SNS alert for unhealthy node."""
    subject = f"[Proxy Alert] Node {node_id} unhealthy ({failures} failures)"
    message = (
        f"Node: {node_id}\n"
        f"Region: {region}\n"
        f"IP: {ip}\n"
        f"Consecutive failures: {failures}\n"
        f"Port results: {json.dumps(port_results)}\n"
        f"\n"
        f"Suggested action:\n"
        f"  Rotate IP: bash tools/aws-proxy/scripts/rotate-ip.sh {node_id}\n"
        f"\n"
        f"Time: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n"
    )
    try:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject[:100],
            Message=message,
        )
    except Exception as e:
        print(f"Failed to send SNS alert: {e}")
