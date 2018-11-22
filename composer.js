const canvas = document.getElementById('composer');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start');


const loadAsset = (type, path) => {
  let el, loaded;
  if (type === 'a' || type === 'v' || type === 'i') {
    el = {
      'a': new Audio(),
      'v': document.createElement('video'),
      'i': new Image()
    }[type];
    el.src = path;
    if (type === 'v' || type === 'i') {
      // TODO: set width & height
      el.width = canvas.width;
      el.style.width = canvas.width;
      el.style.objectFit = 'contain';
    }
    if (type === 'i') {
      loaded = new Promise((res, rej) => el.onload = res);
    } else {
      loaded = new Promise((res, rej) => el.onloadedmetadata = res);
    }
  } else if (type === 't') {
    el = document.createElement('canvas');
    el.width = canvas.width;
    el.height = canvas.height;
    loaded = runningTitle(path, el);
  } else if (type === 'f') {
    el = document.createElement('canvas');
    el.width = canvas.width;
    el.height = canvas.height;
    const [dir, dur] = path.split('-');
    loaded = fader(dur, dir, el);
  }

  return {el, loaded};
};



fetch("script").then(r => r.text())
  .then(script => {
    const [assetDefs, timelineDefs] = script.split("\n\n\n");
    const allLoaded = [];
    const assets = assetDefs.split('\n').reduce((acc, def) => {
      const [id, filename] = def.split(':');
      const {el, loaded} = loadAsset(id.slice(0, 1), filename);
      allLoaded.push(loaded);
      acc[id] = {filename, el};
      return acc;
    }, {});
    let assetTimelines = Object.keys(assets).reduce((acc, x) => { acc[x] = 0; return acc;}, {});
    const convertTimeboundaryDef = (boundary, offset = 0) => {
      let comp;
      if (comp = boundary.match(/(\+?)([0-9]{2}):([0-9]{2}):([0-9]{2}),([0-9]{3})/)) {
        const [, sign, hours, minutes, seconds, ms] = comp.map((c,i) => i > 1 ? parseInt(c, 10) : c);
        return (sign === '+' ? offset : 0) + hours * 3600* 1000 + minutes * 60 * 1000 + seconds * 1000 + ms;
      } else if (comp = boundary.match(/([\+>]?)([aitv][0-9]+)/)) {
        const [, sign, id] = comp;
        if (sign === '+') {
          // nothing to do, offset is already set
        } else if (sign === '>') {
          offset -= assetTimelines[id];
        } else {
          offset = 0;
        }
        return offset + assets[id].el.duration * 1000;
      }
    };

    Promise.all(allLoaded).then(() => {
      let prevTime = 0;
      const timeline = [];
      timelineDefs.split('\n\n').forEach(block => {
        const [timing, ...commandLines] = block.split('\n');
        const [start, end] = timing.split('->').map(b => convertTimeboundaryDef(b, prevTime));
        prevTime = end;

        const commands = commandLines.filter(x => x).map(c => { [verb, target, ...options] = c.split(' '); return {verb, target, options, done: false};})
        commands.forEach(({verb, target}) => {
          if (verb === 'play') {
            assetTimelines[target] += end - start;
          }
        });

        timeline.push({start, end, commands});
      });
      let start;
      const end = Math.max.apply(null, timeline.map(t => t.end));
      const render = () => {
        const now = performance.now() - start;
        timeline.filter(t => t.start <= now && t.end >= now)
          .forEach(t => t.commands.forEach(command => {
            const {verb, target} = command;
            const type = target.slice(0, 1);
            const targetEl = assets[target].el;
            if (!command.done) {
              if (verb === 'pause') {
                targetEl.pause();
              } else if (verb === 'play') {
                if (type !== 'i')
                  targetEl.play();
              }
              command.done = true;
            }
            if (type === 'v' || type === 't' || type === 'i' || type === 'f') {
              ctx.drawImage(targetEl, 0, 0, canvas.width, canvas.height);
            } else {

            }
          })
                  );
        if (now <= end) {
          requestAnimationFrame(render);
        }
      }
      startBtn.disabled = false;
      startBtn.onclick = () => {
        start = performance.now();
        requestAnimationFrame(render);
      };
  });
  });