# Web Video Composer

This tool allows to compose together videos, audios and pre-defined canvas animations based on a declarative timeline. It can also adjust WebVTT timed text tracks bound to the original timed assets to fit into the new timeline.

## Timeline declaration
A timeline declaration starts with a list associating assets with ids, e.g.

_`v1`_`: `_`video1.mp4`_ _`options`_

_`v2`_`: `_`video2.webm`_ _`options`_


The id must start with one of the following letters based on the content of the asset, and be followed by numbers:

* `v` for videos
* `a` for audio files
* `i` for images
* `t` for "running title"-canvas animations

_`options`_ is a space-separate list of option; the following options are recognized:

* _`texttrackkind`_=_`url`_ where _`texttrackind`_ is one of "captions", "descriptions" or other recognized HTML text tracks, and _`url`_ points to a WebVTT track associated with the asset

Two line returns after the list of assets starts a list of time blocks with the following template:

_`timedecl1`_` -> `_`timedecl2`_

_`operation`_ _`asset_id1`_ _`options`_

_`operation`_ _`asset_id2`_ _`options`_

The following formats are recognizes for time declarations (_`timedecl1`_ & _`timedecl2`_ above):

* _`hh`_`:`_`mm`_`:`_`ss`_`.`_`nnn`_ (hours, minutes, seconds and miliseconds) to define the absolute time at which the operations must start (resp. end)
* `+`_`hh`_`:`_`mm`_`:`_`ss`_`.`_`nnn`_ (resp. `-`_`hh`_`:`_`mm`_`:`_`ss`_`.`_`nnn`_) to define the delay after (resp. the time before) the last time declaration (either the end time of the previous block, or the start time of the current range) at which the operations must start/end
* `>`_`asset_id`_ indicates until the end of the said asset
* `+`_`asset_id`_ (resp. `-`_`asset_id`_) indicates a delay of the length of the said asset

The following operations are recognized:

* `play`
* `pause`

The follow options for operations are recognized:

* `fadein`
* `fadeout`