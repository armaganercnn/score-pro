import requests
import json

base_url = "http://localhost:8092/api"

def run_test():
    # 1. Login
    login_url = f"{base_url}/auth/login"
    login_payload = {
        "email": "ayse.yilmaz@voilalojistik.com",
        "password": "Demo123!",
        "tenantSlug": "default"
    }
    
    r = requests.post(login_url, json=login_payload)
    auth_data = r.json()
    token = auth_data["accessToken"]
    tenant_id = auth_data["tenantId"]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Id": str(tenant_id),
        "Content-Type": "application/json"
    }
    
    # 2. Create conversation
    conv_url = f"{base_url}/chatbot/conversations"
    conv_payload = {
        "title": "Work Test"
    }
    r = requests.post(conv_url, json=conv_payload, headers=headers)
    conv_data = r.json()
    conv_id = conv_data["conversation"]["id"]
    
    # 3. Send message: selam
    msg_url = f"{base_url}/chatbot/conversations/{conv_id}/messages"
    print("\nSending: selam")
    r = requests.post(msg_url, json={"content": "selam"}, headers=headers)
    print(f"Response: {r.json().get('content')}")
    
    # 4. Send message: bana aktif projeleri listele
    print("\nSending: bana aktif projeleri listele")
    r = requests.post(msg_url, json={"content": "bana aktif projeleri listele"}, headers=headers)
    print(f"Response: {r.json().get('content')}")

if __name__ == "__main__":
    run_test()
