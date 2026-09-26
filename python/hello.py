import json
import sys


def main():
    print(json.dumps({
        "message": "hello from python",
        "python_version": sys.version,
    }))


if __name__ == "__main__":
    main()
