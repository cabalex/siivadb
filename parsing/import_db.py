from write_db import SiivaDB
import csv
import re
from datetime import datetime, timedelta, timezone

""" Convert PTHHMMSS to 16 bit int seconds"""
def durationTo16BitIntSecs(stamp: str):
    if stamp == "P0D": # weird bug
        return 0

    result = re.findall('PT(\d\d|\d)(|H|M|S)(\d\d|\d)?(H|M|S)?(\d\d|\d)?(H|M|S)?', stamp)[0]
    result = [x for x in result if x != '']

    hours = 0
    minutes = 0
    seconds = 0
    for i in range(0, len(result), 2):
        if result[i+1] == "H":
            hours = int(result[i])
        elif result[i+1] == "M":
            minutes = int(result[i])
        elif result[i+1] == "S":
            seconds = int(result[i])

    td = timedelta(hours=hours, minutes=minutes, seconds=seconds)
    return int(td.total_seconds())

if __name__ == "__main__":
    db = SiivaDB()

    with open("siivadb.csv", "r", encoding="utf-8") as csvfile:
        reader = csv.reader(csvfile)
        for row in reader:
            if row[3] == "Public":
                print(f"Adding rip {len(db.durationTable) + 1}...", durationTo16BitIntSecs(row[5]))
                db.addRip(
                    row[1],
                    row[0],
                    datetime.strptime(row[4], "%Y-%m-%d %H:%M:%S").astimezone(timezone.utc),
                    durationTo16BitIntSecs(row[5])
                )

                if len(db.durationTable) % 1000 == 0:
                    # save
                    db.write(f"../app/public/db/db.siivadb")

    db.write("../app/public/db/db.siivadb")