# FIXME

## Apostrophe Problems

f95 searches are VERY specific about apostrophes; e.g., "q=sister+maries" doesn't correctly return results for "Sister Marie's Mission" but "q=sister+marie%27s" does. In this case, searching for just "sister+marie" (dropping the s) does include the correct thread when not searching by titles only but it isn't the first result.

This might? be fixable by not searching by titles only, but it makes results less likely to be relevant. A workaround would be filtering by the expected forum-- Game, Comics & Stills, or Animations--but that would probably require some more user input to prevent just checking all 3.

Could have dialogue to select which forum each import should be on, but that could get ugly with 100+ imports (like I would have).

## Camel-Case inconsistency

Currently, download files are tokenized, in part, by splitting camel-case tokens; i.e, aCamelCaseString -> a camel case string. However, not all files or thread titles with capital letters in the middle of a token are using camel case. For example, "ViciousFox Collection" has a download file named ViciousFox_Collection. While "viciousfox" works, searching for "vicious fox" won't because f95's search system is VERY strict.

This leads to more failed imports because some's thread use camel-case always and others don't. A brute force solution would be checking both--potentially doubling the number of searches each import needs to do, not to mention when there are multiple camel case splits that the thread's title may or may not do as well.
