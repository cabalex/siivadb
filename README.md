# [SiIvaDB](https://cabalex.github.io/siivadb)

A database for browsing [SiIvaGunner's](https://www.youtube.com/@SiIvaGunner) thousands of high quality rips.

## Features

- Browse over a decade of rips; search by title, series, or joke
- Doomscroll rips in an endless feed that's personalized based on your interests
- Watch thousands of rips without leaving the page
- Easy access to SiIvaGunner Wiki pages and original YouTube videos
- Create and share playlists
- ~~See YouTube comments discussing the video~~
- ~~View YouTube playlists ( https://cabalex.github.io/siivadb?list={PLAYLIST_ID} )~~

_Since [The YouTube Operational API](https://yt.lemnoslife.com/) was discontinued, these services can no longer be offered._

## The SiIvaShorts Algorithm

SiIvaShorts's algorithm is loosely based off of [Xikipedia](https://github.com/rebane2001/xikipedia), with some modifications. All rips have tags, which are the title, series, and the blue links in the jokes list. Each interaction gives a base score, that is divided evenly among the tags:

- Liking a post: +50
- Time before skipping: -5 to +3, for between 1s to 20s (no change if watched <1s)

Rips given a weight by averaging the score of all of its tags, to prevent mashups with hundreds of tags from dominating the recommendations.

Posts are recommended in three ways:

- 40%: Pick a random rip, weighted towards rips with higher weights
- 42%: Pick the rip with the highest weight
- 18%: Pick a random rip (not weighted)

Once a post is recommended, it's added to your watch history and isn't recommended again unless you clear your watch history.

## Credits

- The fantastic [SiIvaGunner wiki](https://siivagunner.wiki/) and all its contributors - please support them if you can!
- Chaze and everyone else who has contributed to the channel over the years
