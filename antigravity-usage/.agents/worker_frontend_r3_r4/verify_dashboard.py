import sys
import subprocess
import time
import urllib.request
import urllib.error
import json
import socket
from pathlib import Path

def get_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    return port

def main():
    port = get_free_port()
    project_root = Path(__file__).resolve().parent.parent.parent
    
    # Start dashboard.py server
    cmd = [
        sys.executable,
        "-c",
        f"import sys; sys.path.insert(0, '{project_root}'); import dashboard; dashboard.run_server({port})"
    ]
    
    print(f"Starting dashboard server on port {port}...")
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    base_url = f"http://localhost:{port}"
    up = False
    start_time = time.time()
    
    # Poll until up (up to 10 seconds)
    while time.time() - start_time < 10.0:
        try:
            with urllib.request.urlopen(base_url, timeout=1.0) as response:
                if response.status == 200:
                    up = True
                    break
        except Exception:
            pass
        time.sleep(0.1)
        
    if not up:
        proc.terminate()
        proc.wait()
        stdout, stderr = proc.communicate()
        print(f"Error: Dashboard server failed to start on port {port}.")
        print(f"Stdout:\n{stdout.decode()}")
        print(f"Stderr:\n{stderr.decode()}")
        sys.exit(1)
        
    print("Dashboard server started successfully. Verifying endpoints...")
    
    # Verify index page
    try:
        with urllib.request.urlopen(f"{base_url}/") as response:
            assert response.status == 200, f"Expected 200, got {response.status}"
            html = response.read().decode('utf-8')
            assert "Google Antigravity 2.0" in html, "Could not find header in index page"
            print("[OK] Endpoint '/' verified successfully.")
    except Exception as e:
        print(f"[FAIL] Endpoint '/' failed: {e}")
        proc.terminate()
        sys.exit(1)
        
    # Verify API data endpoint
    try:
        with urllib.request.urlopen(f"{base_url}/api/data") as response:
            assert response.status == 200, f"Expected 200, got {response.status}"
            data = json.loads(response.read().decode('utf-8'))
            assert "all_models" in data, "No all_models key"
            assert "daily" in data, "No daily key"
            assert "projects" in data, "No projects key"
            assert "sessions" in data, "No sessions key"
            print("[OK] Endpoint '/api/data' verified successfully.")
    except Exception as e:
        print(f"[FAIL] Endpoint '/api/data' failed: {e}")
        proc.terminate()
        sys.exit(1)
        
    print("All endpoints verified. Terminating server...")
    proc.terminate()
    try:
        proc.wait(timeout=2.0)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
    print("Verification completed successfully!")

if __name__ == "__main__":
    main()
