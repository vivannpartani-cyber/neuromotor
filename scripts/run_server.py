import uvicorn
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-7s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

if __name__ == "__main__":
    uvicorn.run("neuromotor_auth.api.server:app", host="127.0.0.1", port=8000, reload=True)
