export type AuditPoint = { lat: number; lng: number };

export interface ReverseLoopFinding {
  startPoint: number;
  endPoint: number;
  reverseStartPoint: number;
  reverseEndPoint: number;
  lengthM: number;
}

function distanceM(a: AuditPoint, b: AuditPoint): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Finds sufficiently long, near-identical point sequences traversed backwards. */
export function findReverseLoops(points: AuditPoint[]): ReverseLoopFinding[] {
  const toleranceM = 35;
  const minPoints = 5;
  const minLengthM = 200;
  const findings: ReverseLoopFinding[] = [];

  for (let i = 0; i <= points.length - minPoints; i++) {
    for (let j = i + minPoints - 1; j < points.length; j++) {
      let run = 0;
      let lengthM = 0;
      // Do not let a palindromic route consume both halves past their
      // shared turning point; otherwise a loop is reported as one
      // self-overlapping section (reverseStartPoint === startPoint).
      while (i + run <= j - run && i + run < points.length && j - run >= 0) {
        if (distanceM(points[i + run]!, points[j - run]!) > toleranceM) break;
        if (run > 0) lengthM += distanceM(points[i + run - 1]!, points[i + run]!);
        run++;
      }
      if (run >= minPoints && lengthM >= minLengthM) {
        findings.push({
          startPoint: i,
          endPoint: i + run - 1,
          reverseStartPoint: j - run + 1,
          reverseEndPoint: j,
          lengthM: Math.round(lengthM),
        });
        break;
      }
    }
  }

  return findings.filter((finding, index) => {
    const previous = findings[index - 1];
    return !previous
      || finding.startPoint > previous.endPoint
      || finding.reverseStartPoint > previous.reverseEndPoint;
  });
}
