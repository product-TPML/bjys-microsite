"""Refresh data/stories.json with real Deccan Herald stories from a DH collection.

Usage (from the project root):
    py tools/fetch_stories.py                       # every story in top-karnataka-news (up to 500)
    py tools/fetch_stories.py --max 100
    py tools/fetch_stories.py --collection karnataka-politics

How it works:
1. Reads the collection from DH's public collections API
   (https://www.deccanherald.com/api/v1/collections/<slug>?story-fields=...),
   which returns every story's metadata in one request.
   Landing-page collections are made of child collections; the script walks into
   the first child that contains stories, skipping ad slots.
2. Writes {tag, title, summary, url, image, published} items to data/stories.json,
   in the collection's editorial order. The first story is the large lead card on the
   home page, the next few are the cards beside it, and "See all stories" pages through
   the whole list.

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
STORY_FIELDS = "headline,subheadline,sections,url,slug,published-at,hero-image-s3-key"
HEADERS = {"User-Agent": "bjys-microsite-story-fetcher/1.0", "Accept": "application/json"}
ROOT = Path(__file__).resolve().parent.parent


def get_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def collection_stories(slug, limit, depth=0):
    url = f"{API}/collections/{urllib.parse.quote(slug)}?limit={limit}&story-fields={STORY_FIELDS}"
    data = get_json(url)
    items = data.get("items", [])
    stories = [it["story"] for it in items if it.get("type") == "story" and it.get("story", {}).get("headline")]
    if stories or depth >= 2:
        return stories[:limit], data.get("name", slug)
    # Landing page made of child collections: use the first child that has stories (skip ads)
    for it in items:
        if it.get("type") != "collection":
            continue
        layout = (it.get("associated-metadata") or {}).get("layout", "")
        if "Ad" in layout or "ad" in it.get("slug", "").split("-"):
            continue
        child, name = collection_stories(it["slug"], limit, depth + 1)
        if child:
            return child, name
    return [], data.get("name", slug)


def story_item(s, lead):
    sections = s.get("sections") or [{}]
    key = s.get("hero-image-s3-key")
    width = 1600 if lead else 800
    published = s.get("published-at")
    return {
        "tag": sections[0].get("display-name") or sections[0].get("name") or "",
        "title": (s.get("headline") or "").strip(),
        "summary": (s.get("subheadline") or "").strip(),
        "url": s.get("url") or f"https://www.deccanherald.com/{s.get('slug', '')}",
        "image": f"{IMAGE_CDN}{key}?w={width}&auto=format%2Ccompress&fit=max" if key else "",
        "published": datetime.fromtimestamp(int(published) / 1000, timezone.utc).isoformat() if published else "",
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--collection", default="top-karnataka-news")
    ap.add_argument("--max", type=int, default=500, help="most stories to keep (default 500)")
    ap.add_argument("--out", default=str(ROOT / "data" / "stories.json"))
    args = ap.parse_args()

    stories, name = collection_stories(args.collection, args.max)
    if not stories:
        sys.exit(f"No stories found in collection '{args.collection}'.")

    items = [story_item(s, lead=(i == 0)) for i, s in enumerate(stories)]
    print(f"Collection: {name} ({len(items)} stories)")
    for i, item in enumerate(items[:5]):
        print(f"  {i + 1}. [{item['tag']}] {item['title']}")
    if len(items) > 5:
        print(f"  ... and {len(items) - 5} more")

    Path(args.out).write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
