import {parseTimeline} from './parse-timeline.mjs';
import {adjustVTT} from './adjust-vtt.mjs';

const canvas = document.getElementById('composer');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start');
/*
const videoStream = canvas.captureStream();
const stream = new MediaStream([...videoStream.getVideoTracks()]);

const recorder = new MediaRecorder(stream, {mimeType: 'video/webm'});

const chunks = [];
recorder.ondataavailable = (e) => {
  chunks.push(e.data);
};
recorder.onstop = () => {
  const blob = new Blob(chunks, {'type': 'video/webm'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('download', 'video.webm');
  link.href = url;
  link.textContent = "video";
  document.querySelector('body').appendChild(link);
};
*/



fetch("script").then(r => r.text())
  .then(text => parseTimeline(text, canvas.width, canvas.height))
  .then(({timeline, assets}) => {
    const vttByKind = adjustVTT({timeline, assets});
    Object.keys(vttByKind).forEach(k => {
      const vtt = vttByKind[k];
      const link = document.createElement('a');
      link.setAttribute('download', k + '.webvtt');
      link.href = "data: text/webvtt," + encodeURIComponent(vtt);
      link.textContent = "merged " + k;
      document.querySelector('body').appendChild(link);
    });
    let start;
    const end = Math.max.apply(null, timeline.map(t => t.end));
    const render = () => {
      const now = performance.now() - start;
      timeline.filter(t => t.start <= now && t.end >= now)
        .forEach(t => t.commands.forEach(command => {
          const {verb, target, options} = command;
          const type = target.slice(0, 1);
          const targetEl = assets[target].el;
          const dur = t.end - t.start;
          ctx.globalAlpha = 1;
          if (!command.done) {
            if (verb === 'pause') {
              targetEl.pause();
            } else if (verb === 'play') {
              if (type !== 'i')
                targetEl.play();
            }
          }
          if (!options.includes("fadein") && !options.includes("fadeout"))
            command.done = true;
          if (options.includes("fadein")) {
            ctx.globalAlpha = 1 - (t.end - now)/dur;
          } else if (options.includes("fadeout")) {
            ctx.globalAlpha = (t.end - now)/dur;
          }
          if (type === 'v' || type === 't' || type === 'i' || type === 'f') {
            ctx.drawImage(targetEl, 0, 0, canvas.width, canvas.height);
          }
        })
                );
      if (now <= end) {
        requestAnimationFrame(render);
      } else {
        //recorder.stop();
      }
    };
    startBtn.disabled = false;
    const run = () => {
      start = performance.now();
      //recorder.start();
      requestAnimationFrame(render);
    };
    startBtn.onclick = run;
    document.addEventListener("keypress", run);
  });

