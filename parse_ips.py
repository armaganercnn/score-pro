import json

with open("/Users/armaganercan/Library/Logs/DiagnosticReports/Antigravity-2026-06-15-015938.ips") as f:
    lines = f.readlines()
    data_str = "".join(lines[1:])
    try:
        d = json.loads(data_str)
        if "usedImages" in d:
            for i, img in enumerate(d["usedImages"]):
                print(f"{i}: {img.get('name')} | {img.get('path')} | {img.get('arch')} | {img.get('uuid')}")
        else:
            print("usedImages not found")
    except Exception as e:
        print("Error:", e)
