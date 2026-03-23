from write_db import SiivaDB

print("Updating database...")

db = SiivaDB("../app/public/db/db.siivadb.zst")

invalidated = 0
indexes = []
names = []

maxItems = 9999
startAt = 0

for i in range(len(db.nameTable)):
  if i < startAt:
    continue

  name = db.nameTable[i]
  if db.jokeTable[i] is None or db.jokeTable[i] in ["Something went wrong when fetching the joke... maybe we just didn't get it? :("]:
    indexes.append(i)
    names.append(name)
    invalidated += 1

    if invalidated >= maxItems:
      break

print(f"Invalidated {invalidated} jokes. Fetching new jokes for these rips...")
jokes = db.fetchJokesSync(names)

for i in range(len(indexes)):
  db.jokeTable[indexes[i]] = jokes[i]


db.write("../app/public/db/db.siivadb")

print(f"Database updated successfully.")