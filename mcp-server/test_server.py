#!/usr/bin/env python3
"""
Test script to directly call the MCP server and see the response
"""

import requests
import json

url = "http://localhost:8000/mcp"

# Test 1: Initialize session first (proper MCP flow)
print("=" * 60)
print("Test 1: Initialize session")
print("=" * 60)

headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "mcp-protocol-version": "2024-11-05"
}

init_payload = {
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {
            "name": "test-client",
            "version": "1.0.0"
        }
    },
    "id": 1
}

print(f"\nRequest URL: {url}")
print(f"Request Headers: {json.dumps(headers, indent=2)}")
print(f"Request Body: {json.dumps(init_payload, indent=2)}")

session_id = None

try:
    response = requests.post(url, headers=headers, json=init_payload)
    print(f"\nResponse Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")

    if response.status_code == 200:
        print("\n✅ Initialize SUCCESS!")
        session_id = response.headers.get('mcp-session-id')
        print(f"Session ID: {session_id}")
    else:
        print(f"\n❌ FAILED with status {response.status_code}")

except Exception as e:
    print(f"\n❌ ERROR: {e}")

# Test 2: tools/list with session ID
if session_id:
    print("\n\n" + "=" * 60)
    print("Test 2: List tools with session ID")
    print("=" * 60)

    headers_with_session = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "mcp-protocol-version": "2024-11-05",
        "mcp-session-id": session_id
    }

    tools_payload = {
        "jsonrpc": "2.0",
        "method": "tools/list",
        "id": 2
    }

    print(f"\nRequest Headers: {json.dumps(headers_with_session, indent=2)}")
    print(f"Request Body: {json.dumps(tools_payload, indent=2)}")

    try:
        response = requests.post(url, headers=headers_with_session, json=tools_payload)
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Body: {response.text}")

        if response.status_code == 200:
            print("\n✅ SUCCESS!")
            result = response.json()
            tools = result.get('result', {}).get('tools', [])
            print(f"Tools found: {len(tools)}")
            for tool in tools:
                print(f"  - {tool['name']}: {tool['description']}")
        else:
            print(f"\n❌ FAILED with status {response.status_code}")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
else:
    print("\n❌ Cannot proceed without session ID")
