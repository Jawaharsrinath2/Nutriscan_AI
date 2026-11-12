// The photo is shown with object-cover, so it is scaled and cropped to fill a 4:3 box.
// Detection boxes are fractions of the *original* image; this maps them into the visible box (in %).
export function coverTransform(container, natural) {
  if (!container?.w || !natural?.w) {
    return (x, y) => ({ x: x * 100, y: y * 100 });
  }
  const scale = Math.max(container.w / natural.w, container.h / natural.h);
  const shownW = natural.w * scale;
  const shownH = natural.h * scale;
  const offsetX = (container.w - shownW) / 2;
  const offsetY = (container.h - shownH) / 2;
  return (x, y) => ({
    x: ((offsetX + x * shownW) / container.w) * 100,
    y: ((offsetY + y * shownH) / container.h) * 100,
  });
}
