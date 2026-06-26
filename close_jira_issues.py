import urllib.request
import urllib.parse
import json
import base64
import sys

def get_headers(email, token):
    auth_str = f"{email}:{token}"
    auth_bytes = auth_str.encode('utf-8')
    auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
    return {
        'Authorization': f'Basic {auth_b64}',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }

def fetch_transitions(domain, issue_key, headers):
    url = f"https://{domain}/rest/api/3/issue/{issue_key}/transitions"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data.get('transitions', [])
    except Exception as e:
        print(f"Error fetching transitions for {issue_key}: {e}")
    return []

def transition_issue(domain, issue_key, transition_id, headers):
    url = f"https://{domain}/rest/api/3/issue/{issue_key}/transitions"
    post_data = json.dumps({
        "transition": {
            "id": transition_id
        }
    }).encode('utf-8')
    req = urllib.request.Request(url, data=post_data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            # 204 No Content is standard success for transitions
            if response.status in (200, 204):
                return True
    except Exception as e:
        print(f"Error transitioning {issue_key}: {e}")
    return False

def main():
    domain = "ditravo.atlassian.net"
    email = "armagan.ercan@ditravo.com"
    token = "ATATT3xFfGF0J0w1WsN9-50YRUtF37l-pwTyuVNu7CLlMJixfTFJNvBcefsx4qw4kMu8XDVnh8h3Dl3l-1qF1lugS0kLr1WfqQ7XHocwKSR-qla7q1Snld8s_cYjE3fZ8SG5bOg9kr39AztBRGkHFOXdPypV81280aT-ClIEVs1tv4JsH9DIvpw=8CD91E09"
    
    issues_to_close = [
        "EYP-91", "EYP-109", "EYP-110", "EYP-111",
        "YAP-112", "YAP-131", "YAP-93",
        "DEMO-2", "DEMO-3",
        "DFF-21", "DFF-22", "DFF-30"
    ]
    
    headers = get_headers(email, token)
    
    # Close target status names keywords
    close_keywords = ["done", "close", "kapat", "tamamla", "çöz", "resolve"]
    
    print(f"Starting to close {len(issues_to_close)} Jira issues...\n")
    
    for key in issues_to_close:
        print(f"Checking transitions for {key}...")
        transitions = fetch_transitions(domain, key, headers)
        
        target_transition = None
        # Try to find a transition matching close keywords
        for t in transitions:
            t_name = t.get('name', '').lower()
            if any(kw in t_name for kw in close_keywords):
                target_transition = t
                break
                
        if not target_transition and transitions:
            # If no matches, list the options
            print(f"  Available transitions for {key}: {[t.get('name') for t in transitions]}")
            # As fallback, look for category "done" (statusCategory key == 'done' or id == 3)
            for t in transitions:
                status_cat = t.get('to', {}).get('statusCategory', {})
                if status_cat.get('key') == 'done' or status_cat.get('id') == 3:
                    target_transition = t
                    break
        
        if target_transition:
            t_id = target_transition.get('id')
            t_name = target_transition.get('name')
            print(f"  Attempting transition '{t_name}' (ID: {t_id}) for {key}...")
            success = transition_issue(domain, key, t_id, headers)
            if success:
                print(f"  SUCCESS: Closed {key} via '{t_name}'")
            else:
                print(f"  FAILED: Could not transition {key}")
        else:
            if not transitions:
                print(f"  FAILED: No transitions retrieved (issue may not exist or permissions issue)")
            else:
                print(f"  FAILED: No matching closing transition found for {key}")
        print("-" * 40)

if __name__ == "__main__":
    main()
