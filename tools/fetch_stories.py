"""Refresh data/stories.json with real Deccan Herald stories from a DH collection.

Usage (from the project root):
    py tools/fetch_stories.py                       # top-karnataka-news, 4 stories
    py tools/fetch_stories.py --count 6
    py tools/fetch_stories.py --collection karnataka-politics

How it works:
1. Reads the collection from DH's public collections API
   (https://www.deccanherald.com/api/v1/collections/<slug>).
   Landing-page collections are made of child collections; the script walks into
   the first child that contains stories, skipping ad slots.
2. Fetches each story's metadata from
   https://www.deccanherald.com/api/v1/stories-by-slug?slug=<slug>
3. Writes {tag, title, summary, url, image, published} items to data/stories.json.
   The first story becomes the large lead card on the page.

Standard library only; no installs needed.
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://www.deccanherald.com/api/v1"
IMAGE_CDN = "https://images.deccanherald.com/"
HEADERS = {"User-Agent": "bjys-microsite-story-fetcher/1.0", "Accept": "application/json"}
ROOT = Path(__file__).resolve().parent.parent


def get_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def collection_story_slugs(slug, count, depth=0):
    data = get_json(f"{API}/collections/{urllib.parse.quote(slug)}?limit={max(count, 10)}")
    items = data.get("items", [])
    slugs = [it["story"]["slug"] for it in items if it.get("type") == "story" and it.get("story", {}).get("slug")]
    if slugs or depth >= 2:
        return slugs[:count], data.get("name", slug)
    # Landing page made of child collections: use the first child that has stories (skip ads)
    for it in items:
        if it.get("type") != "collection":
            continue
        layout = (it.get("associated-metadata") or {}).get("layout", "")
        if "Ad" in layout or "ad" in it.get("slug", "").split("-"):
            continue
        child, name = collection_story_slugs(it["slug"], count, depth + 1)
        if child:
            return child, name
    return [], data.get("name", slug)


def story_item(slug, lead):
    s = get_json(f"{API}/stories-by-slug?slug={urllib.parse.quote(slug, safe='')}")
    s = s.get("story", s)
    sections = s.get("sections") or [{}]
    key = s.get("hero-image-s3-key")
    width = 1600 if lead else 800
    published = s.get("published-at")
    return {
        "tag": sections[0].get("display-name") or sections[0].get("name") or "",
        "title": (s.get("headline") or "").strip(),
        "summary": (s.get("subheadline") or (s.get("seo") or {}).get("meta-description") or "").strip(),
        "url": s.get("url") or f"https://www.deccanherald.com/{slug}",
        "image": f"{IMAGE_CDN}{key}?w={width}&auto=format%2Ccompress&fit=max" if key else "",
        "published": datetime.fromtimestamp(int(published) / 1000, timezone.utc).isoformat() if published else "",
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--collection", default="top-karnataka-news")
    ap.add_argument("--count", type=int, default=4)
    ap.add_argument("--out", default=str(ROOT / "data" / "stories.json"))
    args = ap.parse_args()

    slugs, name = collection_story_slugs(args.collection, args.count)
    if not slugs:
        sys.exit(f"No stories found in collection '{args.collection}'.")
    print(f"Collection: {name} ({len(slugs)} stories)")

    items = []
    for i, slug in enumerate(slugs):
        item = story_item(slug, lead=(i == 0))
        items.append(item)
        print(f"  {i + 1}. [{item['tag']}] {item['title']}")

    Path(args.out).write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
