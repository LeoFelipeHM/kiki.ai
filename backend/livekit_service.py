import sys
import time


def main() -> int:
    # Placeholder worker entrypoint. Keeps the container alive and provides a
    # predictable command for docker-compose while the real LiveKit integration
    # is implemented.
    args = sys.argv[1:]
    if not args or args[0] != "start":
        print("usage: python livekit_service.py start", flush=True)
        return 2

    print("kiki-worker started (placeholder).", flush=True)
    while True:
        time.sleep(5)


if __name__ == "__main__":
    raise SystemExit(main())

