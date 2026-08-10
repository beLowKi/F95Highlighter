# F95 Highlighter

## FIXME

### Apostrophe Problems

f95 searches are VERY specific about apostrophes; e.g., "q=sister+maries" doesn't correctly return results for "Sister Marie's Mission" but "q=sister+marie%27s" does. In this case, searching for just "sister+marie" (dropping the s) does include the correct thread when not searching by titles only but it isn't the first result.

This might? be fixable by not searching by titles only, but it makes results less likely to be relevant. A workaround would be filtering by the expected forum-- Game, Comics & Stills, or Animations--but that would probably require some more user input to prevent just checking all 3.

Could have dialogue to select which forum each import should be on, but that could get ugly with 100+ imports (like I would have).

### Camel-Case inconsistency

Currently, download files are tokenized, in part, by splitting camel-case tokens; i.e, aCamelCaseString -> a camel case string. However, not all files or thread titles with capital letters in the middle of a token are using camel case. For example, "ViciousFox Collection" has a download file named ViciousFox_Collection. While "viciousfox" works, searching for "vicious fox" won't because f95's search system is VERY strict.

This leads to more failed imports because some's thread use camel-case always and others don't. A brute force solution would be checking both--potentially doubling the number of searches each import needs to do, not to mention when there are multiple camel case splits that the thread's title may or may not do as well.

## TODO

### Train/Tune an AI to Match Download Files to Thread Titles

It would probably be much more reliable to use an AI to match download files to threads, but it'd be more complicated to implement. This would involve either making an AI from scratch--and figuring out how the extension would communicate with it--or tuning an existing one which adds costs unless there's a free tunable AI service out there?

### Testing

- Figure out how to do automated tests for chrome extensions
- Log failed search queries to a file with entries formattes as "{directory item name} -> {URL}"

### Deleted & Updated Downloads

I'd like for the extension to show when users USED to have any particular media downloaded but have deleted it OR if their version is older. That way, there could be different visuals for media that have never been downloaded vs. ones that were but have since been removed. Both are difficult for different reasons.

#### Deleted Downloads

For security reasons, chrome extensions can't read user files unless explicitly given permission via those file/directory selector popups. This complicates checking when downloads are deleted.

#### Updates

While it's not uncommon for game's download files to include their version number, it is inconsistent--not to mention this wouldn't work for comics and animations. A simple solution would be to scrape that information from the threadpage, but it would add another fetch request to the import process. Every import would need to wait for both their search results and their threadpage request. I don't know how much longer that'd make importing.

For visuals, I'm thinking update the text content of the version/release element on every media tile. Could either show the exact version number the user has for direct comparison or simply change the text to green and add a "+" to show that it's a newer version. Maybe there could even be a list at the top of the page for updated media so you don't have to scroll down to check?
