from datetime import datetime, timezone, timedelta
from struct import pack
import re
from urllib import parse
import zstd
import json
import zendriver as zd # New SiivaGunner Wiki uses Cloudflare protection


""" Convert datetime object to UTC 2016 timestamp """
def toUTCTimestamp(stamp: datetime):
    return int((stamp - datetime(2016, 1, 1, tzinfo=timezone.utc)).total_seconds())

def fromUTCTimestamp(seconds: int):
    return datetime(2016, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=seconds)

wikifiles = re.compile(r"\[\[File:.+?\]\]")
wikilinks = re.compile(r"\"?\'?\'?\[\[(?:.+?\|)??([^|]+?)\]\]\'?\'?\"?")
wikicomments = re.compile(r"<!--.+?-->", flags=re.DOTALL | re.MULTILINE)
externallinks = re.compile(r"([^\[])\[http[^ \[]+ (.+?)\]([^\]])")
wikicategories = re.compile(r"\'?\'?\"?\{\{(?:Category|category)\|(?:.+?\|)?([^|]+?)?\}\}\"?\'?\'?")
wikirefs = re.compile(r"<ref.+?(?:</ref>|/>)", flags=re.DOTALL | re.MULTILINE)
collapsedWikitables = re.compile(r"{\|[ ]*class[ ]*=[ ]*\"[^\"]*mw-collapsed.+\|}", flags=re.DOTALL | re.MULTILINE)
nowiki = re.compile(r"<\/?nowiki[ \/]*?>", flags=re.IGNORECASE)

class SiivaDB:
    nameTable = []
    ytidTable = []
    uploadDateTable = []
    durationTable = []
    jokeTable = []

    def __init__(self, filename: str|None = None):
        if filename is not None:
            self.read(filename)


    async def _fetchPageData(self, browser: zd.Browser, name: str) -> dict:
        print(f"Fetching page data for {name}...")
        try:
            page = await browser.get(
                "https://www.siivagunner.wiki/w/api.php?action=parse&format=json&prop=wikitext&page=" + parse.quote_plus(name.replace("#", ""))
            )
        except Exception as e:
            print(f"Failed to fetch page for {name}: {e}")
            raise e

        tries = 5
        element = None
        while tries > 0:
            try:
                print("Waiting for page data...")
                await page
                body = await page.find("body")
                await body.apply("""(elem) => {
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// old method wouldn't work on 4k screens

let screenX = getRandomInt(800, 1200);
let screenY = getRandomInt(400, 600);

Object.defineProperty(MouseEvent.prototype, 'screenX', { value: screenX });

Object.defineProperty(MouseEvent.prototype, 'screenY', { value: screenY });
}
""")
                print("Page loaded, waiting for element...")
                element = await page.wait_for(selector="pre", timeout=15)
                break
            except TimeoutError as e:
                tries -= 1
                print(f"[!] Couldn't find element in {name}, retrying... ({5 - tries}/10)", e)
                await page.reload()
        
        if element is None:
            raise Exception(f"Failed to fetch page data for {name}.")
        text = await element.apply("(elem) => elem.textContent")
        js = json.loads(fr"{text}")

        return js
      
    def parseJokeText(self, wikitext: str):
        joke = None
        wikitext = "\n".join([x.strip() for x in wikitext.split("\n")])
        if "==Joke" in wikitext:
            joke = wikitext.split("==Joke")[1].split("=\n", 1)[1].split("==")[0].strip()
        elif "== Joke" in wikitext:
            joke = wikitext.split("== Joke")[1].split("=\n", 1)[1].split("==")[0].strip()

        if joke:
            if '<gallery' in joke:
                  joke = joke.split("<gallery")[0].strip()

            if "[[Category:" in joke:
                # Split before the Categories section
                joke = joke.split("[[Category:")[0].strip()
            elif "[[category:" in joke:
                joke = joke.split("[[category:")[0].strip()

            joke = wikicomments.sub("", joke)
            joke = collapsedWikitables.sub("[View this table on the Wiki.]", joke)
            joke = wikifiles.sub("", joke)
            joke = wikirefs.sub("", joke)
            joke = wikilinks.sub(r'"\1"', joke)
            joke = wikicategories.sub(r"\1", joke)
            joke = externallinks.sub(r"\1\2\3", joke)
            joke = nowiki.sub("", joke)
            
            return joke

        return "This rip doesn't have any jokes in it."

    async def fetchJoke(self, browser: zd.Browser, name: str):
        try:
            js = await self._fetchPageData(browser, name)
            print(js)
            nojoke = ""

            if "error" in js:
                return nojoke

            wikitext = js["parse"]["wikitext"]["*"]

            return self.parseJokeText(wikitext)
        except Exception as e:
            print(f"Failed to fetch joke for {name}: {e}")
            return "Something went wrong when fetching the joke... maybe we just didn't get it? :("

    async def fetchJokes(self, names: list[str]) -> list[str]:
        browser = await zd.start(headless=True, sandbox=False, browser_connection_timeout=3, browser_connection_max_tries=15)
        jokes = []
        for name in names:
            jokes.append(await self.fetchJoke(browser, name))
        await browser.stop()
        return jokes
    
    def fetchJokesSync(self, names: list[str]) -> list[str]:
        return zd.loop().run_until_complete(self.fetchJokes(names))

    def addRip(self, name: str, ytid: str, uploadDate: datetime, duration: int, joke: str = None):
        self.nameTable.append(name)
        self.ytidTable.append(ytid)
        self.uploadDateTable.append(toUTCTimestamp(uploadDate))
        self.durationTable.append(duration)

        if joke is None:
            joke = "MUST_FETCH"
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
        if filename.endswith('.zst'):
            with open(filename[:-4], 'wb') as rawf:
                rawf.write(zstd.decompress(f.read()))
            f = open(filename[:-4], 'rb')

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

        # Before writing, fetch any MUST_FETCH jokes
        needToFetchIndexes = []
        for i in range(len(self.jokeTable)):
            if self.jokeTable[i] == "MUST_FETCH":
                needToFetchIndexes.append(i)
        if len(needToFetchIndexes) > 0:
            print(f"Fetching {len(needToFetchIndexes)} jokes before writing...")
            namesToFetch = [self.nameTable[i] for i in needToFetchIndexes]
            fetchedJokes = self.fetchJokesSync(namesToFetch)
            for i in range(len(needToFetchIndexes)):
                self.jokeTable[needToFetchIndexes[i]] = fetchedJokes[i]

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


        f = open(filename, 'wb+')
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
        
        f.seek(0)

        with open(filename + ".zst", "wb") as zstdfile:
            zstdfile.write(zstd.compress(f.read()))
        
        f.close()

        print("Done :)")