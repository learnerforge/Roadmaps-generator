"""Download and cache markdown content from roadmap.sh GitHub repo.

Usage:
    python fetch_content.py              # fetch all missing content
    python fetch_content.py --force      # re-fetch everything
    python fetch_content.py --stats      # show cache statistics

Content is cached in content_body_cache.json to avoid repeated downloads.
"""
import asyncio
import json
import os
import re
import sys
import time
import httpx

CACHE_DIR = os.path.dirname(os.path.abspath(__file__))
CONTENT_CACHE = os.path.join(CACHE_DIR, "content_cache.json")
BODY_CACHE = os.path.join(CACHE_DIR, "content_body_cache.json")
REPO = "nilbuild/developer-roadmap"
BRANCH = "master"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}"
PREFIX = "developer-roadmap-master/"
CONCURRENCY = 20
RETRY_COUNT = 3
RETRY_DELAY = 2
BATCH_DELAY = 0.5


def load_json(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_json(path: str, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)


def clean_markdown(raw: str) -> str:
    """Strip title heading, resource links footer, and clean up formatting."""
    lines = raw.strip().split("\n")
    cleaned = []
    skip_resources = False

    for line in lines:
        lower = line.strip().lower()
        # Skip the title heading (first # heading)
        if not cleaned and line.startswith("# ") and not skip_resources:
            continue
        # Detect resource links section and skip everything after
        if lower.startswith("visit the following resources") or lower.startswith("resources"):
            skip_resources = True
            continue
        if skip_resources:
            continue
        # Clean @article@, @video@, @course@ prefixes from links
        line = re.sub(r"@\w+@", "", line)
        cleaned.append(line)

    # Remove trailing blank lines
    while cleaned and cleaned[-1].strip() == "":
        cleaned.pop()

    return "\n".join(cleaned)


def path_to_url(path: str) -> str:
    """Convert content_cache path to raw GitHub URL."""
    stripped = path[len(PREFIX):] if path.startswith(PREFIX) else path
    return f"{RAW_BASE}/{stripped}"


async def fetch_one(
    client: httpx.AsyncClient,
    path: str,
    semaphore: asyncio.Semaphore,
) -> tuple[str, str | None]:
    """Fetch a single markdown file. Returns (path, cleaned_content or None)."""
    url = path_to_url(path)
    for attempt in range(RETRY_COUNT):
        try:
            async with semaphore:
                resp = await client.get(url, timeout=15)
                if resp.status_code == 200:
                    raw = resp.text
                    cleaned = clean_markdown(raw)
                    return (path, cleaned if cleaned else None)
                elif resp.status_code == 404:
                    return (path, None)
                else:
                    if attempt < RETRY_COUNT - 1:
                        await asyncio.sleep(RETRY_DELAY * (attempt + 1))
        except Exception:
            if attempt < RETRY_COUNT - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
    return (path, None)


async def fetch_all(force: bool = False):
    """Download all markdown content files with concurrency limiting."""
    content_paths = load_json(CONTENT_CACHE)
    if not content_paths:
        print("No content_cache.json found. Run seed_data.py first.")
        return

    body_cache = {} if force else load_json(BODY_CACHE)

    all_paths = []
    for slug, paths in content_paths.items():
        for p in paths:
            if force or p not in body_cache:
                all_paths.append(p)

    if not all_paths:
        print("All content already cached. Use --force to re-download.")
        return

    print(f"Fetching {len(all_paths)} files ({len(body_cache)} cached)...")
    semaphore = asyncio.Semaphore(CONCURRENCY)
    fetched = 0
    failed = 0
    start = time.time()

    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Process in batches for progress reporting and incremental saves
        batch_size = 100
        for i in range(0, len(all_paths), batch_size):
            batch = all_paths[i : i + batch_size]
            tasks = [fetch_one(client, p, semaphore) for p in batch]
            results = await asyncio.gather(*tasks)

            for path, content in results:
                if content:
                    body_cache[path] = content
                    fetched += 1
                else:
                    failed += 1

            # Save after each batch
            save_json(BODY_CACHE, body_cache)

            elapsed = time.time() - start
            total_done = fetched + failed
            rate = total_done / elapsed if elapsed > 0 else 0
            eta = (len(all_paths) - total_done) / rate if rate > 0 else 0
            print(
                f"  [{total_done}/{len(all_paths)}] "
                f"fetched={fetched} failed={failed} "
                f"rate={rate:.1f}/s ETA={eta:.0f}s"
            )

            if i + batch_size < len(all_paths):
                await asyncio.sleep(BATCH_DELAY)

    elapsed = time.time() - start
    print(f"\nDone in {elapsed:.1f}s: {fetched} fetched, {failed} failed")
    print(f"Cache: {len(body_cache)} files in {BODY_CACHE}")


def show_stats():
    """Print cache statistics."""
    content_paths = load_json(CONTENT_CACHE)
    body_cache = load_json(BODY_CACHE)

    total_paths = sum(len(v) for v in content_paths.values())
    cached = len(body_cache)
    total_size = sum(len(v) for v in body_cache.values())

    print(f"Content cache (paths): {len(content_paths)} roadmaps, {total_paths} files")
    print(f"Body cache (content):  {cached} files, {total_size / 1024 / 1024:.1f} MB")
    print(f"Coverage: {cached}/{total_paths} ({100 * cached / total_paths:.1f}%)")

    # Per-roadmap breakdown
    for slug in sorted(content_paths):
        paths = content_paths[slug]
        done = sum(1 for p in paths if p in body_cache)
        pct = 100 * done / len(paths) if paths else 0
        status = "OK" if done == len(paths) else f"{done}/{len(paths)} ({pct:.0f}%)"
        print(f"  {slug}: {status}")


if __name__ == "__main__":
    if "--stats" in sys.argv:
        show_stats()
    elif "--force" in sys.argv:
        asyncio.run(fetch_all(force=True))
    else:
        asyncio.run(fetch_all(force=False))
