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
    
    print("Logging in...")
    r = requests.post(login_url, json=login_payload)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} - {r.text}")
        return
        
    auth_data = r.json()
    token = auth_data["accessToken"]
    tenant_id = auth_data["tenantId"]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Id": str(tenant_id),
        "Content-Type": "application/json"
    }
    
    # Verify profile
    me_url = f"{base_url}/auth/me"
    r = requests.get(me_url, headers=headers)
    print(f"Profile: {r.json().get('firstName')} {r.json().get('lastName')}")
    
    # 2. Create conversation
    conv_url = f"{base_url}/chatbot/conversations"
    conv_payload = {
        "title": "Test Persona Conversation"
    }
    print("Creating conversation...")
    r = requests.post(conv_url, json=conv_payload, headers=headers)
    if r.status_code != 201:
        print(f"Failed to create conversation: {r.status_code} - {r.text}")
        return
        
    conv_data = r.json()
    conv_id = conv_data["conversation"]["id"]
    print(f"Conversation created with ID: {conv_id}")
    
    # 3. Send message: selam
    msg_url = f"{base_url}/chatbot/conversations/{conv_id}/messages"
    print("\nSending: selam")
    r = requests.post(msg_url, json={"content": "selam"}, headers=headers)
    print(f"Response: {r.json().get('content')}")
    
    # 4. Send message: benim adım ne
    print("\nSending: benim adım ne")
    r = requests.post(msg_url, json={"content": "benim adım ne"}, headers=headers)
    print(f"Response: {r.json().get('content')}")

    # 5. Send message: odada tek misin
    print("\nSending: odada tek misin")
    r = requests.post(msg_url, json={"content": "odada tek misin"}, headers=headers)
    print(f"Response: {r.json().get('content')}")

if __name__ == "__main__":
    run_test()
