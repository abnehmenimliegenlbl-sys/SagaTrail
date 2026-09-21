import type { Meetup } from "@workspace/api-client-react";

import { haversineKm } from "@/lib/geo";

export type MeetupSortMode = "date" | "distance";
export type MeetupPosition = { lat: number; lng: number };

export function getMeetupDistanceKm(
  meetup: Meetup,
  position: MeetupPosition | null,
): number | null {
  if (
    !position ||
    meetup.routeStartLat == null ||
    meetup.routeStartLng == null
  ) {
    return null;
  }

  return haversineKm(position, {
    lat: meetup.routeStartLat,
    lng: meetup.routeStartLng,
  });
}

export function sortMeetups(
  meetups: Meetup[],
  mode: MeetupSortMode,
  position: MeetupPosition | null,
): Meetup[] {
  return [...meetups].sort((a, b) => {
    if (mode === "distance" && position) {
      const distanceA = getMeetupDistanceKm(a, position);
      const distanceB = getMeetupDistanceKm(b, position);

      if (distanceA != null && distanceB != null) {
        return distanceA - distanceB || dateValue(a) - dateValue(b);
      }
      if (distanceA != null) return -1;
      if (distanceB != null) return 1;
    }

    return dateValue(a) - dateValue(b);
  });
}

function dateValue(meetup: Meetup): number {
  return new Date(meetup.startsAt).getTime();
}