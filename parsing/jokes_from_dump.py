from write_db import SiivaDB
import html

print("Updating database...")

db = SiivaDB("../app/public/db/db.siivadb.zst")

dump_file = open("siivagunner.fandom.com-20250515-history.xml", "r", encoding="utf-8")

indices = {}

print("Reading and indexing dump file (this may take a while...)")
while True:
  line = dump_file.readline()
  if not line:
    break
  if line.startswith("    <title>"):
    name = line.strip()[7:-8]
    if name in db.nameTable:
      indices[name] = dump_file.tell()

print(f"Found {len(indices)} jokes in the dump file.")

redone = 0
for i in range(len(db.nameTable)):
  name = db.nameTable[i]
  if name in indices:
    redone += 1
    dump_file.seek(indices[name])
    joke = ""
    jokeOpen = False
    # We want to iterate until we get to the last revision, since
    # that's the latest
    while True:
      line = dump_file.readline()
      if not line or line.strip() == "</page>":
        break
      if line.strip().startswith("<text"):
        joke = ""
        if line.strip().endswith("</text>"):
          joke += line.split(">", 1)[1].split("</text>", 1)[0] + "\n"
        else:
          joke += line.split(">", 1)[1] + "\n"
          jokeOpen = True
      elif line.strip().endswith("</text>"):
        joke += line.split("</text>", 1)[0] + "\n"
        jokeOpen = False
      elif jokeOpen:
        joke += line
    
    try:
      db.jokeTable[i] = db.parseJokeText(html.unescape(joke.replace("\r", "")))
      if len(db.jokeTable[i].encode("utf-8")) > 65535:
        print(f"Joke for {name} is too long ({len(db.jokeTable[i])})... truncating.")
        with open(f"truncated_{i}.txt", "w", encoding="utf-8") as truncated_file:
          truncated_file.write(db.jokeTable[i])
        db.jokeTable[i] = db.jokeTable[i][:65000]
    except Exception as e:
      with open("error_dump.txt", "a", encoding="utf-8") as error_file:
        error_file.write(joke.replace("\r", ""))
      print(joke)
      raise e


print(f"Rewrote {redone} jokes. Saving...")

db.write("../app/public/db/db.siivadb")

print(f"Database updated successfully.")