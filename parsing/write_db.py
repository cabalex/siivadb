from datetime import datetime, timezone, timedelta
from struct import pack
import re
from urllib import parse
import requests

""" Convert datetime object to UTC 2016 timestamp """
def toUTCTimestamp(stamp: datetime):
    return int((stamp - datetime(2016, 1, 1, tzinfo=timezone.utc)).total_seconds())

def fromUTCTimestamp(seconds: int):
    return datetime(2016, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=seconds)

wikilinks = re.compile(r"\'?\'?\[\[(.+?)(?:\|.+)?\]\]\'?\'?")
externallinks = re.compile(r"[^\[]\[[^ \[]+ (.+?)\][^\]]")
wikicategories = re.compile(r"\'?\'?\{\{(?:[\w ]+)\|(.+?)?\}\}\'?\'?")
categorylinks = re.compile(r"\[\[Category:.+?\]\]")

class SiivaDB:
    nameTable = []
    ytidTable = []
    uploadDateTable = []
    durationTable = []
    jokeTable = []

    def __init__(self, filename: str = None):
        if filename is not None:
            self.read(filename)

    def fetchJoke(self, name: str):
        try:
            request = requests.get("https://siivagunner.fandom.com/api.php?action=parse&format=json&prop=wikitext&page=" + parse.quote_plus(name.replace("#", "")))
            js = request.json()
            nojoke = "We don't have this rip in our database... yet. Contribute to the Wiki to add it!"

            if "error" in js:
                return nojoke

            wikitext = js["parse"]["wikitext"]["*"]

            joke = None
            if "==Joke" in wikitext:
                joke = wikitext.split("==Joke")[1].split("==\n")[1].split("==")[0].strip()
            elif "== Joke" in wikitext:
                joke = wikitext.split("== Joke")[1].split("==\n")[1].split("==")[0].strip()

            if joke:
                joke = categorylinks.sub("", joke)
                joke = wikilinks.sub(r"\1", joke)
                joke = wikicategories.sub(r"\1", joke)
                joke = externallinks.sub(r"\1", joke)

                if '<gallery' in joke:
                    joke = joke.split("<gallery")[0].strip()

                if 'article-table' in joke:
                    joke = joke.split("{|")[0].strip() + "[Please see the Wiki for the full list of jokes.]"
                return joke

            return "This rip doesn't appear to have traditional \"jokes\". It must be VERY high quality..."
        except:
            return "Something went wrong when fetching the joke... maybe we just didn't get it? :("


    def addRip(self, name: str, ytid: str, uploadDate: datetime, duration: int, joke: str = None):
        self.nameTable.append(name)
        self.ytidTable.append(ytid)
        self.uploadDateTable.append(toUTCTimestamp(uploadDate))
        self.durationTable.append(duration)

        if joke is None:
            joke = self.fetchJoke(name)
        self.jokeTable.append(joke)
    
    def removeRip(self, ytid: str):
        index = self.ytidTable.index(ytid)
        self.nameTable.pop(index)
        self.ytidTable.pop(index)
        self.uploadDateTable.pop(index)
        self.durationTable.pop(index)
        self.jokeTable.pop(index)

    def read(self, filename: str):
        self.nameTable = []
        self.ytidTable = []
        self.uploadDateTable = []
        self.durationTable = []
        self.jokeTable = []

        f = open(filename, 'rb')
        if f.read(4) != b"SIIV":
            raise Exception("Invalid database file")
        
        version = int.from_bytes(f.read(4), "little")
        rips = int.from_bytes(f.read(4), "little")
        updatedAt = int.from_bytes(f.read(4), "little")
        timestamp = fromUTCTimestamp(updatedAt).strftime("%Y-%m-%d %H:%M:%S")

        print("Reading database... Last updated at " + timestamp)

        uploadDateTableOffset = int.from_bytes(f.read(4), "little")
        durationTableOffset = int.from_bytes(f.read(4), "little")
        nameTableOffset = int.from_bytes(f.read(4), "little")
        descriptionTableOffset = int.from_bytes(f.read(4), "little")

        # Read main rip table
        for i in range(rips):
            f.seek(32 + i * 19)
            self.ytidTable.append(f.read(11).decode("utf-8"))
            nameOffset = int.from_bytes(f.read(4), "little")
            descriptionOffset = int.from_bytes(f.read(4), "little")

            # Read name table
            f.seek(nameTableOffset + nameOffset)
            nameLength = int.from_bytes(f.read(1), "little")
            self.nameTable.append(f.read(nameLength).decode("utf-8"))

            # Read description table
            f.seek(descriptionTableOffset + descriptionOffset)
            descriptionLength = int.from_bytes(f.read(2), "little")
            self.jokeTable.append(f.read(descriptionLength).decode("utf-8"))

        f.seek(uploadDateTableOffset)
        for i in range(rips):
            self.uploadDateTable.append(int.from_bytes(f.read(4), "little"))

        f.seek(durationTableOffset)
        for i in range(rips):
            self.durationTable.append(int.from_bytes(f.read(2), "little"))
        
        f.close()
        print(f"Done reading database. {rips} rips loaded.")
        

    def write(self, filename: str):
        print("Writing database...")
        nameTable = b""
        mainTable = b""
        uploadDateTable = b""
        durationTable = b""
        jokeTable = b""

        # sort database by time
        self.nameTable, self.ytidTable, self.uploadDateTable, self.durationTable, self.jokeTable = zip(*sorted(zip(self.nameTable, self.ytidTable, self.uploadDateTable, self.durationTable, self.jokeTable), key=lambda x: -x[2]))
        
        # write main rip table
        for i in range(len(self.nameTable)):
            name = self.nameTable[i].encode("utf-8") + b"\0"
            desc = self.jokeTable[i].encode("utf-8") + b"\0"

            mainTable += self.ytidTable[i].encode("utf-8") + pack("<II", len(nameTable), len(jokeTable)) # yt ids are all 11 chars

            nameTable += pack("B", len(name) - 1) + name
            uploadDateTable += pack("<I", self.uploadDateTable[i])
            durationTable += pack("<H", self.durationTable[i])
            jokeTable += pack("<H", len(desc) - 1) + desc


        f = open(filename, 'wb')
        f.write(b"SIIV")
        f.write(pack("<I", 1)) # Version
        f.write(pack("<I", len(self.nameTable))) # Rip count
        f.write(pack("<I", toUTCTimestamp(datetime.utcnow().astimezone(timezone.utc)))) # Time generated

        # Write rip table
        f.seek(32)
        f.write(mainTable)

        if f.tell() % 16 != 0:
            f.write(b''.join([b'\0'] * (16 - (f.tell() % 16))))
        uploadDateTableOffset = f.tell()
        f.write(uploadDateTable)

        if f.tell() % 16 != 0:
            f.write(b''.join([b'\0'] * (16 - (f.tell() % 16))))
        durationTableOffset = f.tell()
        f.write(durationTable)

        if f.tell() % 16 != 0:
            f.write(b''.join([b'\0'] * (16 - (f.tell() % 16))))
        nameTableOffset = f.tell()
        f.write(nameTable)

        if f.tell() % 16 != 0:
            f.write(b''.join([b'\0'] * (16 - (f.tell() % 16))))
        descriptionTableOffset = f.tell()
        f.write(jokeTable)

        f.seek(16)
        f.write(pack("<IIII", uploadDateTableOffset, durationTableOffset, nameTableOffset, descriptionTableOffset))
        
        f.close()

        print("Done :)")