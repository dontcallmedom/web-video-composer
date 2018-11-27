import {runningTitle} from './one-slider.mjs';
import {fader} from './fader.mjs';

const loadAsset = (type, path, width, height) => {
  let el, loaded;
  if (type === 'a' || type === 'v' || type === 'i') {
    el = {
      'a': new Audio(),
      'v': document.createElement('video'),
      'i': new Image()
    }[type];
    el.src = path;
    if (type === 'v' || type === 'i') {
      el.width = width;
      el.style.width = width;
      el.style.objectFit = 'contain';
    }
    if (type === 'i') {
      loaded = new Promise((res, rej) => el.onload = res);
    } else {
      loaded = new Promise((res, rej) => el.onloadedmetadata = res);
    }
  } else if (type === 't') {
    el = document.createElement('canvas');
    el.width = width;
    el.height = height;
    loaded = runningTitle(path, el);
  } else if (type === 'f') {
    el = document.createElement('canvas');
    el.width = width;
    el.height = height;
    const [dir, dur] = path.split('-');
    loaded = fader(dur, dir, el);
  }
  return {el, loaded};
};

const loadTimeTracks = (el, options) => {
  // options are like
  // captions=foo.webvtt descriptions=bar.webvtt
  const tracks = options.split(' ')
        .reduce((acc, def) => {
          const [kind, filename] = def.split('=');
          acc.push({kind, src: filename});
          return acc;
        }, []);
  el._textTracks = [];
  return Promise.all(
    tracks.map(t =>
               fetch(t.src)
               .then(r => r.text())
               .then(text => t.text = text)
               .then(() => el._textTracks.push(t))
              ));
};

export function parseTimeline(text, width, height) {
  const [assetDefs, ...timelineDefs] = text.split("\n\n");
  const allLoaded = [];
  const assets = assetDefs.split('\n').reduce((acc, def) => {
    const [id, filedesc] = def.split(':');
    const [filename, fileoptions] = filedesc.split(' ');
    const {el, loaded} = loadAsset(id.slice(0, 1), filename, width, height);
    allLoaded.push(loaded);
    if (fileoptions) {
      allLoaded.concat(loadTimeTracks(el, fileoptions));
    }
    acc[id] = {filename, el};
    return acc;
  }, {});
  let assetTimelines = Object.keys(assets).reduce((acc, x) => { acc[x] = 0; return acc;}, {});
  const convertTimeboundaryDef = (boundary, offset = 0) => {
    let comp;
    if ((comp = boundary.match(/([\-\+]?)([0-9]{2}):([0-9]{2}):([0-9]{2}),([0-9]{3})/))) {
      const [, sign, hours, minutes, seconds, ms] = comp.map((c,i) => i > 1 ? parseInt(c, 10) : c);
      return Math.abs((sign === '+' ? offset : (sign === '-' ? -offset : 0)) + hours * 3600* 1000 + minutes * 60 * 1000 + seconds * 1000 + ms);
    } else if ((comp = boundary.match(/([\-\+>]?)([afitv][0-9]+)/))) {
      const [, sign, id] = comp;
      if (sign === '+') {
        // nothing to do, offset is already set
      } else if (sign === '-') {
          offset = -offset;
      } else if (sign === '>') {
        offset -= assetTimelines[id];
      } else {
        offset = 0;
      }
      return Math.abs(offset + assets[id].el.duration * 1000);
    }
    throw new Error("Unexpected format for timeline: " + boundary);
  };

  return Promise.all(allLoaded).then(() => {
    let prevTime = 0;
    const timeline = [];
    timelineDefs.forEach(block => {
        const [timing, ...commandLines] = block.split('\n');
        const [start, end] = timing.split('->').map(b => convertTimeboundaryDef(b, prevTime));
        prevTime = end;

        const commands = commandLines.filter(x => x).map(c => { const [verb, target, ...options] = c.split(' '); return {verb, target, options, done: false};});
        commands.forEach(({verb, target}) => {
          if (verb === 'play') {
            assetTimelines[target] += end - start;
          }
        });

        timeline.push({start, end, commands});
    });
    return {timeline, assets};
  });
};
