from write_db import SiivaDB
from import_db import durationTo16BitIntSecs
import requests
from datetime import datetime, timezone
import os

print("Updating database...")

db = SiivaDB("../app/public/db/db.siivadb")

key = "AIzaSyBB8fzumg2e6B3aKtSF2vjO0SmK4YhF9iY"#os.environ["YT_API_KEY"]

request = requests.get("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=UU9ecwl3FTG66jIKA9JRDtmg&key=" + key)

js = request.json()
rips = []
for rip in js["items"]:
    if rip["snippet"]["title"] not in db.nameTable:
        rips.append({
            "title": rip["snippet"]["title"],
            "ytid": rip["snippet"]["resourceId"]["videoId"],
            "uploadedAt": datetime.strptime(rip["snippet"]["publishedAt"], "%Y-%m-%dT%H:%M:%SZ").astimezone(timezone.utc),
        })

if len(rips) == 0:
    print("No new rips found.")
    exit(0)

print(f"{len(rips)} need to be updated.")

ripIds = ",".join([x["ytid"] for x in rips])
request = requests.get(f"https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id={ripIds}&key=" + key )

js = request.json()
for i in range(len(rips)):
    print(f"Adding rip {len(db.durationTable) + 1}...", rips[i]["title"])
    db.addRip(
        rips[i]["title"],
        rips[i]["ytid"],
        rips[i]["uploadedAt"],
        durationTo16BitIntSecs(js["items"][i]["contentDetails"]["duration"])
    )

db.write("../app/public/db/db.siivadb")

print(f"Database updated successfully. {len(rips)}/50 rips added.")