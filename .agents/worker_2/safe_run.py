import subprocess
import time
import os
import signal
import sys

def get_process_list():
    try:
        res = subprocess.run(["ps", "-ef"], capture_output=True, text=True, check=True)
        return res.stdout.splitlines()
    except Exception as e:
        print(f"Error getting process list: {e}")
        return []

def find_language_server_pid():
    lines = get_process_list()
    for line in lines:
        parts = line.strip().split()
        if len(parts) < 2:
            continue
        cmdline = " ".join(parts[7:])
        if "language_server" in cmdline and "Python" not in cmdline:
            try:
                return int(parts[1])
            except ValueError:
                continue
    return None

def kill_process(pid):
    try:
        os.kill(pid, signal.SIGKILL)
        print(f"Killed competing process {pid}")
    except ProcessLookupError:
        pass
    except Exception as e:
        print(f"Failed to kill process {pid}: {e}")

def kill_docker_container(container_id):
    try:
        subprocess.run(["docker", "kill", container_id], capture_output=True, check=True)
        print(f"Killed docker container {container_id}")
    except Exception as e:
        print(f"Failed to kill docker container {container_id}: {e}")

def clean_competing_processes():
    # Kill docker maven containers
    try:
        res = subprocess.run(["docker", "ps", "--format", "{{.ID}} {{.Image}}"], capture_output=True, text=True, check=True)
        for line in res.stdout.splitlines():
            parts = line.strip().split()
            if len(parts) >= 2:
                cid, image = parts[0], parts[1]
                if "maven" in image:
                    kill_docker_container(cid)
    except Exception:
        pass

    # Kill java/maven host processes
    lines = get_process_list()
    for line in lines:
        parts = line.strip().split()
        if len(parts) < 2:
            continue
        try:
            pid = int(parts[1])
        except ValueError:
            continue

        if pid == os.getpid():
            continue

        cmdline = " ".join(parts[7:])
        if "java" in cmdline or "mvn" in cmdline or "maven" in cmdline:
            if "language_server" not in cmdline and "mempalace" not in cmdline and "python" not in cmdline:
                kill_process(pid)

def main():
    ls_pid = find_language_server_pid()
    if ls_pid is None:
        print("Language Server PID not found. Continuing without suspending.")
    else:
        print(f"Discovered Language Server PID: {ls_pid}")

    backend_dir = "/Users/armaganercan/antigravity/intelligent-organization/backend"
    
    print("1. Cleaning up all active competing build/test processes...")
    clean_competing_processes()
    
    if ls_pid is not None:
        print(f"2. Suspending Language Server (PID {ls_pid})...")
        try:
            os.kill(ls_pid, signal.SIGSTOP)
            print("Language Server suspended.")
        except Exception as e:
            print(f"Error suspending Language Server: {e}")
            sys.exit(1)

    # Make sure to resume LS on exit/errors
    def cleanup_handler(signum=None, frame=None):
        if ls_pid is not None:
            print(f"\nResuming Language Server (PID {ls_pid})...")
            try:
                os.kill(ls_pid, signal.SIGCONT)
                print("Language Server resumed.")
            except Exception as e:
                print(f"Error resuming Language Server: {e}")
        if signum is not None:
            sys.exit(1)

    signal.signal(signal.SIGINT, cleanup_handler)
    signal.signal(signal.SIGTERM, cleanup_handler)

    print("3. Launching mvn clean test...")
    env = os.environ.copy()
    env["DB_HOST"] = "localhost"
    env["DB_PORT"] = "5440"
    env["DB_USERNAME"] = "akilliorg"
    env["DB_PASSWORD"] = "akilliorg-dev"

    start_time = time.time()
    try:
        proc = subprocess.run(
            ["mvn", "clean", "test"],
            cwd=backend_dir,
            env=env,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        exit_code = proc.returncode
    except Exception as e:
        print(f"Error running mvn clean test: {e}")
        exit_code = 1
    finally:
        duration = time.time() - start_time
        print(f"\nExecution finished in {duration:.2f} seconds.")
        cleanup_handler()

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
