// MP4 no próprio navegador, com o muxer distribuído pelo Mira.
const button = document.getElementById("export-mp4");
function lines(ctx, text, width) {
  const result = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? line + " " + word : word;
    if (ctx.measureText(trial).width > width && line) {
      result.push(line);
      line = word;
    } else line = trial;
  }
  if (line) result.push(line);
  return result;
}
let exporting = false;
window.exportPopupMP4 = async ({
  duration = window.popupDuration,
  fps = 24,
  download = true,
  allowSilent = false,
} = {}) => {
  if (exporting) throw Error("Já existe uma exportação em andamento");
  if (!window.popupReady) throw Error("Espere o livro carregar");
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > window.popupDuration
  )
    throw Error("Duração inválida");
  if (!Number.isInteger(fps) || fps < 1 || fps > 60)
    throw Error("FPS inválido");
  if (!window.VideoEncoder || !window.Mp4Muxer)
    throw Error(
      "Use Chrome ou Edge atualizado no computador para exportar MP4",
    );
  const config = {
    codec: "avc1.42001f",
    width: 1280,
    height: 720,
    bitrate: window.popupVideoBitrate || 5000000,
    framerate: fps,
    avc: { format: "avc" },
  };
  if (!(await VideoEncoder.isConfigSupported(config)).supported)
    throw Error(
      "Este navegador não oferece o codificador H.264. Use Chrome ou Edge atualizado, ou EXPORTAR-MP4.cmd",
    );
  const audioBuffer = allowSilent
    ? null
    : await window.popupNarrator?.getAudio();
  const audioConfig = {
    codec: "mp4a.40.2",
    sampleRate: 48000,
    numberOfChannels: 2,
    bitrate: 128000,
  };
  let audioCodec = "aac";
  if (audioBuffer) {
    if (!window.AudioEncoder || !window.AudioData)
      throw Error(
        "Este navegador não codifica áudio; use EXPORTAR-MP4 para preservar a narração",
      );
    if (!(await AudioEncoder.isConfigSupported(audioConfig)).supported) {
      audioConfig.codec = "opus";
      audioCodec = "opus";
      if (!(await AudioEncoder.isConfigSupported(audioConfig)).supported)
        throw Error(
          "Este navegador não codifica áudio AAC ou Opus; use EXPORTAR-MP4",
        );
    }
  }
  exporting = true;
  button.disabled = true;
  window.pauseForExport();
  const previous = window.popupState.time;
  const controls = [...document.querySelectorAll("nav button, nav input")].map(
    (el) => [el, el.disabled],
  );
  for (const [el] of controls) el.disabled = true;
  let encoder, audioEncoder;
  try {
    const target = new Mp4Muxer.ArrayBufferTarget();
    const muxer = new Mp4Muxer.Muxer({
      target,
      video: { codec: "avc", width: 1280, height: 720 },
      ...(audioBuffer
        ? {
            audio: {
              codec: audioCodec,
              sampleRate: 48000,
              numberOfChannels: 2,
            },
          }
        : {}),
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    });
    let failure;
    encoder = new VideoEncoder({
      output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
      error: (e) => {
        failure = e;
      },
    });
    encoder.configure(config);
    if (audioBuffer) {
      audioEncoder = new AudioEncoder({
        output: (chunk, metadata) => muxer.addAudioChunk(chunk, metadata),
        error: (e) => {
          failure = e;
        },
      });
      audioEncoder.configure(audioConfig);
      const count = Math.ceil(duration * 48000);
      for (let start = 0; start < count; start += 1024) {
        const length = Math.min(1024, count - start),
          data = new Float32Array(length * 2);
        for (let channel = 0; channel < 2; channel++)
          data.set(
            audioBuffer.getChannelData(channel).subarray(start, start + length),
            channel * length,
          );
        const audio = new AudioData({
          format: "f32-planar",
          sampleRate: 48000,
          numberOfChannels: 2,
          numberOfFrames: length,
          timestamp: Math.round((start / 48000) * 1e6),
          data,
        });
        audioEncoder.encode(audio);
        audio.close();
        if (audioEncoder.encodeQueueSize > 16) await audioEncoder.flush();
        if (failure) throw failure;
      }
      await audioEncoder.flush();
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    const source = document.querySelector("#stage canvas");
    const count = Math.ceil(duration * fps);
    for (let i = 0; i < count; i++) {
      if (failure) throw failure;
      window.renderAt(i / fps);
      ctx.drawImage(source, 0, 0, 1280, 720);
      if (window.popupOpeningTitle)
        ctx.drawImage(window.popupOpeningTitle, 0, 0, 1280, 720);
      const caption = document.getElementById("caption");
      if (Number(caption.style.opacity) > 0.01) {
        ctx.save();
        ctx.globalAlpha = Number(caption.style.opacity);
        ctx.font = "23px Georgia";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const text = lines(ctx, caption.textContent, 940),
          height = text.length * 32 + 16,
          y = 684 - height;
        ctx.fillStyle = "rgba(37,31,25,.86)";
        ctx.fillRect(140, y, 1000, height);
        ctx.fillStyle = "#fff1d2";
        text.forEach((line, n) => ctx.fillText(line, 640, y + 24 + n * 32));
        ctx.restore();
      }
      if (window.popupEndCard?.style.display === "block")
        ctx.drawImage(window.popupEndCard, 0, 0, 1280, 720);
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round((i * 1000000) / fps),
        duration: Math.round(1000000 / fps),
      });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      if (encoder.encodeQueueSize > 8) await encoder.flush();
      if (window.popupReportProgress && i % (fps * 5) === 0)
        await window.popupReportProgress(i, count);
      if (i % 8 === 0) {
        button.textContent =
          "Exportando " + Math.floor((i / count) * 100) + "%";
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    await encoder.flush();
    if (failure) throw failure;
    muxer.finalize();
    const blob = new Blob([target.buffer], { type: "video/mp4" });
    if (download) {
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = (window.popupSlug || "joao-pop-up") + ".mp4";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    return blob;
  } finally {
    encoder?.close();
    audioEncoder?.close();
    window.renderAt(previous);
    exporting = false;
    for (const [el, disabled] of controls) el.disabled = disabled;
    button.disabled = false;
    button.textContent = "Exportar MP4";
  }
};
button.onclick = async () => {
  try {
    await window.exportPopupMP4();
    document.getElementById("status").textContent =
      "MP4 gerado. Procure na pasta Downloads ou no local escolhido pelo navegador.";
  } catch (e) {
    document.getElementById("status").textContent = e.message;
  }
};
