import urllib.request
import urllib.parse
import json
import base64
import sys
import argparse

def main():
    parser = argparse.ArgumentParser(description="Query Jira Issues Assigned to User")
    parser.add_argument("--domain", default="ditravo.atlassian.net", help="Jira domain")
    parser.add_argument("--email", default="armagan.ercan@ditravo.com", help="Atlassian login email")
    parser.add_argument("--token", default="ATATT3xFfGF0J0w1WsN9-50YRUtF37l-pwTyuVNu7CLlMJixfTFJNvBcefsx4qw4kMu8XDVnh8h3Dl3l-1qF1lugS0kLr1WfqQ7XHocwKSR-qla7q1Snld8s_cYjE3fZ8SG5bOg9kr39AztBRGkHFOXdPypV81280aT-ClIEVs1tv4JsH9DIvpw=8CD91E09", help="Jira API Token")
    parser.add_argument("--limit", type=int, default=50, help="Number of issues to display")
    
    args = parser.parse_args()
    
    auth_str = f"{args.email}:{args.token}"
    auth_bytes = auth_str.encode('utf-8')
    auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
    
    # Query issues assigned to the current user that are not closed/done
    jql = "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC"
    params = {
        "jql": jql,
        "fields": "key,summary,status,project,created",
        "maxResults": args.limit
    }
    query = urllib.parse.urlencode(params)
    search_url = f"https://{args.domain}/rest/api/3/search/jql?{query}"
    
    req_search = urllib.request.Request(search_url)
    req_search.add_header('Authorization', f'Basic {auth_b64}')
    req_search.add_header('Accept', 'application/json')
    
    print(f"Querying issues assigned to current user ({args.email}) that are not Done...")
    try:
        with urllib.request.urlopen(req_search) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                issues = data.get('issues', [])
                print(f"\nSUCCESS: Found {len(issues)} issues:")
                print("-" * 80)
                for issue in issues:
                    key = issue.get('key', 'N/A')
                    fields = issue.get('fields', {})
                    summary = fields.get('summary', 'No summary')
                    status = fields.get('status', {}).get('name', 'Unknown')
                    project = fields.get('project', {})
                    project_name = project.get('name', 'Unknown Project')
                    
                    print(f"[{key}] {summary}")
                    print(f"      Project: {project_name} | Status: {status}")
                    print("-" * 80)
            else:
                print(f"FAILED to fetch issues: Status {response.status}")
    except Exception as e:
        print(f"ERROR during query: {e}")

if __name__ == "__main__":
    main()
