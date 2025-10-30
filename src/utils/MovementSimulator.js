

export function ensureTimestamps(route) {
 
  const out = route.map((p) => ({
    lat: Number(p.latitude ?? p.lat ?? p.lat),
    lng: Number(p.longitude ?? p.lng ?? p.lon ?? p.lng),
    ts: p.timestamp ? new Date(p.timestamp) : null,
  }));

  const allHaveTs = out.every((p) => p.ts instanceof Date && !isNaN(p.ts));
  if (!allHaveTs) {
    
    const stepMs = 5000;
    const start = new Date();
    return out.map((p, i) => ({ lat: p.lat, lng: p.lng, ts: new Date(start.getTime() + i * stepMs) }));
  }
  return out;
}

export function totalRouteDurationMs(routeWithDates) {
  if (!routeWithDates || routeWithDates.length < 2) return 0;
  const start = routeWithDates[0].ts.getTime();
  const end = routeWithDates[routeWithDates.length - 1].ts.getTime();
  return Math.max(0, end - start);
}


export function computePositionAtOffset(routeWithDates, offsetMs) {
  if (!routeWithDates || routeWithDates.length === 0) return null;
  const startMs = routeWithDates[0].ts.getTime();
  const duration = totalRouteDurationMs(routeWithDates);

  if (offsetMs <= 0) {
    return { pos: { lat: routeWithDates[0].lat, lng: routeWithDates[0].lng }, index: 0, t: 0, segStartMs: 0, segEndMs: 0 };
  }
  if (offsetMs >= duration) {
    const last = routeWithDates[routeWithDates.length - 1];
    return { pos: { lat: last.lat, lng: last.lng }, index: routeWithDates.length - 2, t: 1, segStartMs: duration, segEndMs: duration };
  }

  for (let i = 0; i < routeWithDates.length - 1; i++) {
    const t0 = routeWithDates[i].ts.getTime() - startMs;
    const t1 = routeWithDates[i + 1].ts.getTime() - startMs;
    if (offsetMs >= t0 && offsetMs <= t1) {
      const localT = (offsetMs - t0) / (t1 - t0 || 1);
      const p0 = routeWithDates[i];
      const p1 = routeWithDates[i + 1];
      const lat = p0.lat + (p1.lat - p0.lat) * localT;
      const lng = p0.lng + (p1.lng - p0.lng) * localT;
      return { pos: { lat, lng }, index: i, t: localT, segStartMs: t0, segEndMs: t1 };
    }
  }

  // fallback
  const last = routeWithDates[routeWithDates.length - 1];
  return { pos: { lat: last.lat, lng: last.lng }, index: routeWithDates.length - 2, t: 1, segStartMs: duration, segEndMs: duration };
}
