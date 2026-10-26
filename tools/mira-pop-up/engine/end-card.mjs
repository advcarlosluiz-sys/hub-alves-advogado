export function totalDuration(story) {
  return story.duration + (story.endCard?.duration || 0);
}
export function drawEndCard(
  ctx,
  card,
  width = 1280,
  height = 720,
  plate = null,
) {
  ctx.clearRect(0, 0, width, height);
  if (!card) return;
  ctx.save();
  ctx.scale(width / 1280, height / 720);
  if (plate) {
    ctx.fillStyle = "#fff9e9";
    ctx.fillRect(0, 0, 1280, 720);
    const scale = Math.min(
        1280 / plate.naturalWidth,
        720 / plate.naturalHeight,
      ),
      w = plate.naturalWidth * scale,
      h = plate.naturalHeight * scale;
    ctx.drawImage(plate, (1280 - w) / 2, (720 - h) / 2, w, h);
    ctx.textAlign = "center";
    const x = 940;
    ctx.fillStyle = "#74502b";
    ctx.font = "15px Arial";
    ctx.fillText("ACOMPANHE NOSSOS CANAIS", x, 130);
    ctx.fillStyle = "#70441e";
    ctx.font = "20px Arial";
    ctx.fillText("YouTube", x, 226);
    ctx.fillStyle = "#34251b";
    ctx.font = "36px Georgia";
    ctx.fillText(card.youtube.name, x, 278);
    ctx.font = "31px Georgia";
    ctx.fillText(card.youtube.handle, x, 324);
    ctx.fillStyle = "#70441e";
    ctx.font = "20px Arial";
    ctx.fillText("TikTok", x, 390);
    ctx.fillStyle = "#34251b";
    ctx.font = "33px Georgia";
    ctx.fillText(card.tiktok.handle, x, 436);
    ctx.fillStyle = "#70441e";
    ctx.font = "18px Arial";
    ctx.fillText("tiktok.com/" + card.tiktok.handle, x, 472);
    ctx.fillStyle = "#34251b";
    ctx.font = "27px Georgia";
    ctx.fillText(card.callToAction || "Inscreva-se e ative o sininho!", x, 560);
    ctx.fillStyle = "#74502b";
    ctx.font = "20px Arial";
    ctx.fillText("Siga também no TikTok", x, 604);
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#241c18";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.strokeStyle = "#b6955d";
  ctx.lineWidth = 2;
  ctx.strokeRect(45, 40, 1190, 640);
  ctx.textAlign = "center";
  ctx.fillStyle = "#c8a971";
  ctx.font = "16px Georgia";
  ctx.fillText("ACOMPANHE NOSSOS CANAIS", 640, 138);
  ctx.fillStyle = "#fff0d1";
  ctx.font = "58px Georgia";
  ctx.fillText(card.youtube.name, 640, 244);
  ctx.fillStyle = "#b6955d";
  ctx.fillRect(490, 281, 300, 2);
  ctx.font = "21px Arial";
  ctx.fillStyle = "#c8a971";
  ctx.fillText("YouTube", 390, 361);
  ctx.fillText("TikTok", 890, 361);
  ctx.fillStyle = "#fff0d1";
  ctx.font = "34px Georgia";
  ctx.fillText(card.youtube.handle, 390, 419);
  ctx.fillText(card.tiktok.handle, 890, 419);
  ctx.font = "18px Arial";
  ctx.fillStyle = "#c8b79a";
  ctx.fillText("tiktok.com/" + card.tiktok.handle, 890, 459);
  ctx.strokeStyle = "#755e3f";
  ctx.beginPath();
  ctx.moveTo(640, 329);
  ctx.lineTo(640, 480);
  ctx.stroke();
  ctx.fillStyle = "#fff0d1";
  ctx.font = "32px Georgia";
  ctx.fillText(card.callToAction || "Inscreva-se e ative o sininho!", 640, 566);
  ctx.fillStyle = "#c8b79a";
  ctx.font = "20px Arial";
  ctx.fillText("Siga também no TikTok", 640, 609);
  ctx.restore();
}
