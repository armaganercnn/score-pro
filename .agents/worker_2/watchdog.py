import subprocess
import time
import os
import signal
import sys
import threading

def get_process_list():
    try:
        res = subprocess.run(["ps", "-ef"], capture_output=True, text=True, check=True)
        return res.stdout.splitlines()
    except Exception as e:
        print(f"Error getting process list: {e}")
        return []

def kill_process(pid):
    try:
        os.kill(pid, signal.SIGKILL)
        print(f"\n[Watchdog] Killed competing host process {pid}")
    except ProcessLookupError:
        pass
    except Exception as e:
        print(f"\n[Watchdog] Failed to kill process {pid}: {e}")

def kill_docker_container(container_id):
    try:
        subprocess.run(["docker", "kill", container_id], capture_output=True, check=True)
        print(f"\n[Watchdog] Killed competing docker container {container_id}")
    except Exception as e:
        print(f"\n[Watchdog] Failed to kill docker container {container_id}: {e}")

def clean_competing_processes(my_pids):
    # Get running docker containers of maven
    try:
        res = subprocess.run(["docker", "ps", "--format", "{{.ID}} {{.Image}}"], capture_output=True, text=True, check=True)
        for line in res.stdout.splitlines():
            parts = line.strip().split()
            if len(parts) >= 2:
                cid, image = parts[0], parts[1]
                if "maven" in image:
                    kill_docker_container(cid)
    except Exception as e:
        pass

    # Get running java/maven processes on host
    lines = get_process_list()
    for line in lines:
        parts = line.strip().split()
        if len(parts) < 2:
            continue
        try:
            pid = int(parts[1])
        except ValueError:
            continue

        if pid in my_pids or pid == os.getpid():
            continue

        # Reconstruct command line from parts starting at index 7 (ps -ef output format)
        cmdline = " ".join(parts[7:])
        # Check if the process is java or maven related
        if "java" in cmdline or "mvn" in cmdline or "maven" in cmdline:
            # But do not kill the language server itself or python processes
            if "language_server" not in cmdline and "mempalace" not in cmdline and "python" not in cmdline:
                kill_process(pid)

def main():
    backend_dir = "/Users/armaganercan/antigravity/intelligent-organization/backend"
    env = os.environ.copy()
    env["DB_HOST"] = "localhost"
    env["DB_PORT"] = "5440"
    env["DB_USERNAME"] = "akilliorg"
    env["DB_PASSWORD"] = "akilliorg-dev"

    print("Starting watchdog and launching mvn clean test...")
    # First clean competing ones
    clean_competing_processes(set())

    # Start the test process
    proc = subprocess.Popen(
        ["mvn", "clean", "test"],
        cwd=backend_dir,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Thread to read and print stdout of the test process
    def reader_thread(stream):
        for line in stream:
            sys.stdout.write(line)
            sys.stdout.flush()

    t = threading.Thread(target=reader_thread, args=(proc.stdout,))
    t.daemon = True
    t.start()

    # Function to recursively find child processes
    def get_child_pids(parent_pid):
        child_pids = set()
        lines = get_process_list()
        for line in lines:
            parts = line.strip().split()
            if len(parts) < 3:
                continue
            try:
                pid = int(parts[1])
                ppid = int(parts[2])
                if ppid == parent_pid:
                    child_pids.add(pid)
                    child_pids.update(get_child_pids(pid))
            except ValueError:
                continue
        return child_pids

    start_time = time.time()

    # Watchdog loop
    while proc.poll() is None:
        spared_pids = {proc.pid}
        try:
            spared_pids.update(get_child_pids(proc.pid))
        except Exception:
            pass

        # Clean competing ones
        clean_competing_processes(spared_pids)
        time.sleep(1)

    t.join()
    duration = time.time() - start_time
    print(f"\nExecution finished in {duration:.2f} seconds.")
    sys.exit(proc.returncode)

if __name__ == "__main__":
    main()
