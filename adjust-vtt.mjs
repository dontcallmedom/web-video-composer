const parser = new WebVTTParser();

const pad = n => ('' + n).padStart(2, 0);
const padms = n => ('' + n).padEnd(3, 0);

const serializeToTimestamp = t => {
  const hours = Math.floor(t/3600);
  const minutes = Math.floor((t - 3600*hours) / 60);
  const seconds = Math.floor((t - 3600*hours - 60*minutes));
  const ms = Math.round(1000*(t % 1));
  return `${hours}:${pad(minutes)}:${pad(seconds)}.${ms}`;
};

const serializeWebVTT = cues => {
  const lines = cues.map(c =>
                         serializeToTimestamp(c.startTime) + ' --> ' + serializeToTimestamp(c.endTime) + '\n' + c.text + '\n');
  return "WEBVTT\n\n" + lines.join("\n");
};

function listAssetSegments(timeline, id) {
  // list of commands relevant to our asset
  const commands = []
        .concat(... timeline
                .filter(({commands}) => commands.find(({target}) => target === id))
                .map(({start, end, commands}) => { return {start, end, command: commands.find(({target}) => target === id).verb }; } )
               );
  let state = 'paused', playedSoFar = 0, curMove = 0;
  return commands.reduce((segments, {start, end, command}) => {

    if (command === 'play') {
      if (state === 'paused') {
        segments.push({orig: playedSoFar, new: start, move: start - curMove});
        curMove = start;
        state = 'playing';
      }
      playedSoFar += end - start;
    } else if (command === 'pause') {
      if (state === 'playing') {
        state = 'paused';
      }
    }
    return segments;
  }, []);
}

export function adjustVTT({timeline, assets}) {
  const adjustedTracks = {};
  Object.keys(assets).forEach(id => {
    const el = assets[id].el;
    if (!(el._textTracks || []).length) return;
    const segments = listAssetSegments(timeline, id);
    (el._textTracks || []).forEach(track => {
      const tree = parser.parse(track.text);
      const adjustedCues = tree.cues.map(x => { return {...x};});
      if (!adjustedTracks[track.kind]) {
        adjustedTracks[track.kind] = [];
      }
      segments.forEach(segment => {
        // find first cue whose starts is after the end of current segment
        const cueIdx = tree.cues.findIndex(c => c.startTime >= segment.orig / 1000);
        const move = (segment.new - segment.orig) / 1000;
        adjustedCues
          .forEach((c, i) => {
            if (i >= cueIdx) {
              c.startTime = tree.cues[i].startTime + move;
              c.endTime = tree.cues[i].endTime + move;
            }
          });
      });
      // merge text tracks by kind
      adjustedTracks[track.kind] = adjustedTracks[track.kind].concat(adjustedCues);
    });
  });
  // Cues are always listed ordered by their start time.
  const vttByKind = {};
  Object.keys(adjustedTracks).forEach(k => {
    adjustedTracks[k] = adjustedTracks[k].sort((c1, c2) => c1.startTime - c2.startTime);
    vttByKind[k] = serializeWebVTT(adjustedTracks[k]);
  });
  return vttByKind;
};

