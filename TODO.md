# TODO List

## Train/Tune an AI to Match Download Files to Thread Titles?

It would probably be much more reliable to use an AI to match download files to threads, but it'd be more complicated to implement. This would involve either making an AI from scratch--and figuring out how the extension would communicate with it--or tuning an existing one which adds costs unless there's a free tunable AI service out there?

## Testing

- Figure out how to do automated tests for chrome extensions
- Log failed search queries to a file with entries formattes as "{directory item name} -> {URL}"

## Deleted & Updated Downloads

I'd like for the extension to show when users USED to have any particular media downloaded but have deleted it OR if their version is older. That way, there could be different visuals for media that have never been downloaded vs. ones that were but have since been removed. Both are difficult for different reasons.

### Deleted Downloads

For security reasons, chrome extensions can't read user files unless explicitly given permission via those file/directory selector popups. This complicates checking when downloads are deleted.

### Updates

While it's not uncommon for game's download files to include their version number, it is inconsistent--not to mention this wouldn't work for comics and animations. A simple solution would be to scrape that information from the threadpage, but it would add another fetch request to the import process. Every import would need to wait for both their search results and their threadpage request. I don't know how much longer that'd make importing.

For visuals, I'm thinking update the text content of the version/release element on every media tile. Could either show the exact version number the user has for direct comparison or simply change the text to green and add a "+" to show that it's a newer version. Maybe there could even be a list at the top of the page for updated media so you don't have to scroll down to check?
