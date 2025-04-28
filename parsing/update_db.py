from write_db import SiivaDB
from import_db import durationTo16BitIntSecs
import requests
from datetime import datetime, timezone
import os
import time

print("Updating database...")

db = SiivaDB("../app/public/db/db.siivadb.zst")

key = os.environ["YT_API_KEY"]

def backoff_retry():
    attempt = 0
    while True:
        try:
            yield
            break
        except requests.exceptions.RequestException as e:
            attempt += 1
            if attempt > 5:
                raise e
            print(f"Request failed: {e}. Retrying in {attempt} seconds...")
            time.sleep(attempt * attempt)

rips = []
url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=UU9ecwl3FTG66jIKA9JRDtmg&key=" + key
token = None
up_to_date = False
while True:
    for _ in backoff_retry():
        request = requests.get(url + (f"&pageToken={token}" if token else ""))
        js = request.json()

        for rip in js["items"]:
            if rip["snippet"]["resourceId"]["videoId"] not in db.ytidTable:
                rips.append({
                    "title": rip["snippet"]["title"],
                    "ytid": rip["snippet"]["resourceId"]["videoId"],
                    "uploadedAt": datetime.strptime(rip["snippet"]["publishedAt"], "%Y-%m-%dT%H:%M:%SZ").astimezone(timezone.utc),
                })
            else:
                print(f"Rip {rip['snippet']['title']} is already in the database. Ending...")
                up_to_date = True
                break
        if len(js["items"]) > 0:
            print(f"Fetched {len(js['items'])}. Last item: " + js["items"][-1]["snippet"]["publishedAt"])

        token = js.get("nextPageToken")
        break
    
    if token is None or up_to_date:
        break


if len(rips) == 0:
    print("No new rips found.")
    exit(0)

print(f"{len(rips)} need to be updated.")

for i in range(0, len(rips), 50):
    ripIds = ",".join([x["ytid"] for x in rips[i:i+50]])
    for _ in backoff_retry():
        request = requests.get(f"https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id={ripIds}&key=" + key )
        js = request.json()
        for j in range(len(rips[i:i+50])):
            print(f"Adding rip {len(db.durationTable) + 1}...", rips[i+j]["title"])
            db.addRip(
                rips[i+j]["title"],
                rips[i+j]["ytid"],
                rips[i+j]["uploadedAt"],
                durationTo16BitIntSecs(js["items"][j]["contentDetails"]["duration"])
            )
        break

db.write("../app/public/db/db.siivadb")

print(f"Database updated successfully. {len(rips)}/50 rips added.")