from write_db import SiivaDB
import html

print("Updating database...")

db = SiivaDB("../app/public/db/db.siivadb.zst")

dump_file = open("siivagunner.fandom.com-20250515-history.xml", "r", encoding="utf-8")

indices = {}

print("Reading and indexing dump file (this may take a while...)")
lastname = ""
while True:
  line = dump_file.readline()
  if not line:
    break
  if line.startswith("    <title>"):
    name = line.strip()[7:-8]
    lastname = name
    indices[name] = dump_file.tell()
  elif line.startswith("    <redirect"):
    newname = line.split('title="', 1)[1].split('"', 1)[0]
    indices[newname] = indices[lastname]

print(f"Found {len(indices)} jokes in the dump file.")

def getArticleText(name):
  if name in indices:
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
    
    return html.unescape(joke.replace("\r", ""))
  
  return None

redone = 0
for i in range(len(db.nameTable)):
  name = db.nameTable[i]
  if name in indices:
    redone += 1
    joke = getArticleText(name)

    if joke is None:
      continue
    elif joke.startswith("#REDIRECT "):
      redirectTarget = joke.split("[[", 1)[1].split("]]", 1)[0]
      print(f"{name} is a redirect to {redirectTarget}... fetching joke for that instead.")
      joke = getArticleText(redirectTarget)
      if joke is None:
        print(f"Couldn't find joke for redirect target {redirectTarget}... skipping.")
        continue
    
    try:
      db.jokeTable[i] = db.parseJokeText(joke)
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