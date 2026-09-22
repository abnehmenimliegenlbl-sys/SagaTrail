t, lng]-Paare (nur bei realen OSM-Routen vorhanden).'),
  "featured": zod.boolean(),
  "photoUrl": zod.string().nullish().describe('Foto-URL aus Wikimedia Commons, bereits in DB gecacht. Null wenn noch kein Foto vorhanden.'),
  "photoAttribution": zod.string().nullish().describe('Urheber-\/Lizenzangabe zum Foto.'),
  "description": zod.string().nullish().describe('Kurzbeschreibung der Route aus Wikipedia (de); null wenn keine vorhanden.'),
  "descriptionSource": zod.string().nullish().describe('URL des Wikipedia-Artikels, aus dem die Beschreibung stammt.'),
  "themeKeys": zod.array(zod.string()).optional().describe('Serverseitig geprüfte Themenbelege der Route.'),
  "qualityStatus": zod.string().optional().describe('Ergebnis des letzten Plausibilitätschecks: verified, partial, invalid oder unverified.\n'),
  "qualityCheckedAt": zod.coerce.date().nullish().describe('Zeitpunkt des letzten erfolgreichen Qualitätschecks.'),
  "sources": zod.object({
  "route": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
}),
  "geometry": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
}),
  "distance": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
}),
  "ascent": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
}),
  "difficulty": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
})
}).optional()
})


/**
 * Liest den Track aus einer GPX-Datei (trkpt, ersatzweise rtept), prueft, ob er in der Schweiz liegt, und reichert ihn mit denselben Quellen wie eigene Routen an (swisstopo-Hoehenmeter, SAC-Grad, Saison-Heuristik, Ortsnamen). Die Route wird nicht persistiert.
 * @summary Importiert eine GPX-Datei als Wanderroute
 */



export const ImportGpxRouteBody = zod.object({
  "gpx": zod.string().min(1).describe('Kompletter Inhalt der GPX-Datei (XML als Text)'),
  "name": zod.string().optional().describe('Optionaler Anzeigename (z. B. Dateiname ohne Endung)')
})

export const ImportGpxRouteResponse = zod.object({
  "id": zod.string(),
  "sagaId": zod.string(),
  "name": zod.string(),
  "region": zod.string(),
  "distanceKm": zod.number().describe('Aus der gespeicherten Geometrie berechnete Streckenlänge in km (weisse Kachel, Navigation).'),
  "distanceTagKm": zod.number().describe('Amtliche Distanz aus dem OSM-Relation-Tag `distance` (SchweizMobil-Wert); Fallback auf berechnete Geometrie-Distanz wenn kein Tag vorhanden. Immer gesetzt.'),
  "ascentM": zod.number(),
  "maxElevationM": zod.number().describe('Hoechster Punkt der Route in Metern ue. M. (swisstopo-Hoehenprofil).'),
  "season": zod.enum(['ganzjaehrig', 'eher_sommer', 'nur_sommer']).describe('Grobe Saison-Einschaetzung aus maximaler Hoehe und SAC-Schwierigkeit (Heuristik, keine amtliche Aussage zum aktuellen Zustand).\n'),
  "minutes": zod.number(),
  "sac": zod.string(),
  "sacSource": zod.string().nullish().describe('Herkunft des SAC-Werts; osm_exact ist ein exakter OSM-Tag, swisstopo_derived eine amtliche Ableitung, unknown unbekannt.'),
  "schweizMobilCondition": zod.string().nullish().describe('Offizielle SchweizMobil-Kategorie für Kondition (easy, medium oder difficult), nicht auf SAC umgerechnet.'),
  "schweizMobilTechnique": zod.string().nullish().describe('Offizielle SchweizMobil-Kategorie für Technik (easy, medium oder difficult), nicht auf SAC umgerechnet.'),
  "terrain": zod.string(),
  "familyFriendly": zod.boolean().nullish().describe('Konservative technische Familien-Empfehlung aus SAC, Distanz und Aufstieg; null bedeutet unbekannt.'),
  "wheelchairAccessible": zod.boolean().nullish().describe('Offizielle SchweizMobil-Klassifikation handicap; wird nicht aus Distanz, Höhe oder SAC abgeleitet.'),
  "technicalDifficulty": zod.string().nullish(),
  "coordinates": zod.object({
  "lat": zod.number(),
  "lng": zod.number()
}),
  "geometry": zod.array(zod.array(zod.number())).optional().describe('Ausgeduennter Wegverlauf als [lat, lng]-Paare (nur bei realen OSM-Routen vorhanden).'),
  "featured": zod.boolean(),
  "photoUrl": zod.string().nullish().describe('Foto-URL aus Wikimedia Commons, bereits in DB gecacht. Null wenn noch kein Foto vorhanden.'),
  "photoAttribution": zod.string().nullish().describe('Urheber-\/Lizenzangabe zum Foto.'),
  "description": zod.string().nullish().describe('Kurzbeschreibung der Route aus Wikipedia (de); null wenn keine vorhanden.'),
  "descriptionSource": zod.string().nullish().describe('URL des Wikipedia-Artikels, aus dem die Beschreibung stammt.'),
  "themeKeys": zod.array(zod.string()).optional().describe('Serverseitig geprüfte Themenbelege der Route.'),
  "qualityStatus": zod.string().optional().describe('Ergebnis des letzten Plausibilitätschecks: verified, partial, invalid oder unverified.\n'),
  "qualityCheckedAt": zod.coerce.date().nullish().describe('Zeitpunkt des letzten erfolgreichen Qualitätschecks.'),
  "sources": zod.object({
  "route": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
}),
  "geometry": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
}),
  "distance": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
}),
  "ascent": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
}),
  "difficulty": zod.object({
  "label": zod.string(),
  "url": zod.string().url().nullable()
})
}).optional()
})


/**
 * Liefert die naechstgelegene kuratierte, gemeinfrei belegte Sage zur Route (kantonsweise Naehe). Es wird nichts erzeugt; ausschliesslich kuratierte Katalogdaten werden gelesen.
 * @summary Naechstgelegene kuratierte Sage zu einer Route
 */
export const GetRouteSagaParams = zod.object({
  "routeId": zod.coerce.string()
})

export const GetRouteSagaResponse = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "canton": zod.string(),
  "coreMotif": zod.string(),
  "bildmotiv": zod.string().optional().describe('Konkreter, fotografierbarer Suchbegriff fuer das Sagenbild (z. B. \"Vogel Gryff Basel\", \"Braunbär\"), unabhaengig vom Handlungsort.\n'),
  "mood": zod.string(),
  "summary": zod.string(),
  "summaries": zod.record(zod.string(), zod.object({
  "text": zod.string(),
  "reviewEmpfohlen": zod.boolean()
})),
  "altersstufenHinweis": zod.string().optional(),
  "quelle": zod.object({
  "autor": zod.string(),
  "werk": zod.string(),
  "jahr": zod.string(),
  "fundstelleUrl": zod.string()
}).optional(),
  "source": zod.string(),
  "coordinates": zod.object({
  "lat": zod.number(),
  "lng": zod.number()
}).optional(),
  "koordinatenSicherheit": zod.enum(['exakt', 'ungefaehr', 'nicht_lokalisierbar', 'Ort identifiziert', 'Region identifiziert', 'Muss GPS Verifiziert werden', 'Nur Kanton identifiziert']),
  "isAnchorPlace": zod.boolean(),
  "fotoUrl": zod.string().nullish().describe('Gecachtes Foto aus Wikimedia Commons (Motiv-Suche). Null wenn noch kein Foto vorhanden.'),
  "fotoAttribution": zod.string().nullish().describe('Urheber-\/Lizenzangabe zum Sagenfoto.')
})


/**
 * Liefert das Profil des authentifizierten Nutzers. 404, wenn nach dem Onboarding noch kein Profil angelegt wurde.
 * @summary Eigenes Profil laden
 */
export const getMyProfileResponseBioMax = 160;

export const getMyProfileResponseNavAnnouncementsEnabledDefault = true;
export const getMyProfileResponsePendingPackRewardsDefault = 0;

export const GetMyProfileResponse = zod.object({
  "id": zod.string().describe('Clerk-Benutzer-ID'),
  "name": zod.string(),
  "bio": zod.string().max(getMyProfileResponseBioMax).nullish(),
  "avatarUrl": zod.string().nullish().describe('Privater Objektpfad des Profilbilds'),
  "dateOfBirth": zod.coerce.date().nullish().describe('Eigenes Geburtsdatum; wird nie in Community-Antworten ausgegeben'),
  "archetype": zod.enum(['reisende', 'hueterin', 'gewitzte', 'senn']),
  "homeCanton": zod.string().optional(),
  "language": zod.string(),
  "ageTier": zod.enum(['kinder', 'jugendliche', 'erwachsene']),
  "navAnnouncementsEnabled": zod.boolean().default(getMyProfileResponseNavAnnouncementsEnabledDefault).describe('Ob automatische Navigationsanweisungen waehrend der Wanderung abgespielt werden.'),
  "premium": zod.boolean(),
  "freeHikeUsed": zod.boolean().describe('Ob die einmalige kostenlose Wanderung bereits verbraucht wurde. Solange false, ist genau eine Wanderung (egal welcher Kanton) auch ohne Premium freigeschaltet.'),
  "purchasedPacks": zod.array(zod.string()).describe('Liste der DB-Pack-Slugs, die dieser Nutzer freigeschaltet hat (z.B. \"schwyz\", \"bern_2\"). Autoritaetive Quelle fuer Saga-Pack-Zugang.'),
  "subscriptionTier": zod.string().optional().describe('Abo-Stufe des Nutzers (z.B. \"free\", \"premium\", \"elite\", \"family\", \"elite_family\"). DB-Spalte ist NOT NULL (Default \"free\").'),
  "pendingPackRewards": zod.number().default(getMyProfileResponsePendingPackRewardsDefault).describe('Anzahl ausstehender Pack-Belohnungen aus erfolgreichen Einladungen. Wird > 0, sobald ein eingeladener Freund Premium kauft.')
})


/**
 * Legt das Profil des authentifizierten Nutzers an (Onboarding) oder aktualisiert es.
 * @summary Eigenes Profil anlegen oder aktualisieren
 */
export const saveMyProfileBodyNameMin = 2;

export const saveMyProfileBodyBioMax = 160;


export const saveMyProfileBodyLanguageMin = 2;

export const saveMyProfileBodyNavAnnouncementsEnabledDefault = true;

export const SaveMyProfileBody = zod.object({
  "name": zod.string().min(saveMyProfileBodyNameMin),
  "bio": zod.string().max(saveMyProfileBodyBioMax).nullish(),
  "dateOfBirth": zod.coerce.date().nullish(),
  "archetype": zod.enum(['reisende', 'hueterin', 'gewitzte', 'senn']),
  "homeCanton": zod.string().min(1).optional(),
  "language": zod.string().min(saveMyProfileBodyLanguageMin),
  "ageTier": zod.enum(['kinder', 'jugendliche', 'erwachsene']),
  "navAnnouncementsEnabled": zod.boolean().default(saveMyProfileBodyNavAnnouncementsEnabledDefault).describe('Ob automatische Navigationsanweisungen waehrend der Wanderung abgespielt werden.')
})

export const saveMyProfileResponseBioMax = 160;

export const saveMyProfileResponseNavAnnouncementsEnabledDefault = true;
export const saveMyProfileResponsePendingPackRewardsDefault = 0;

export const SaveMyProfileResponse = zod.object({
  "id": zod.string().describe('Clerk-Benutzer-ID'),
  "name": zod.string(),
  "bio": zod.string().max(saveMyProfileResponseBioMax).nullish(),
  "avatarUrl": zod.string().nullish().describe('Privater Objektpfad des Profilbilds'),
  "dateOfBirth": zod.coerce.date().nullish().describe('Eigenes Geburtsdatum; wird nie in Community-Antworten ausgegeben'),
  "archetype": zod.enum(['reisende', 'hueterin', 'gewitzte', 'senn']),
  "homeCanton": zod.string().optional(),
  "language": zod.string(),
  "ageTier": zod.enum(['kinder', 'jugendliche', 'erwachsene']),
  "navAnnouncementsEnabled": zod.boolean().default(saveMyProfileResponseNavAnnouncementsEnabledDefault).describe('Ob automatische Navigationsanweisungen waehrend der Wanderung abgespielt werden.'),
  "premium": zod.boolean(),
  "freeHikeUsed": zod.boolean().describe('Ob die einmalige kostenlose Wanderung bereits verbraucht wurde. Solange false, ist genau eine Wanderung (egal welcher Kanton) auch ohne Premium freigeschaltet.'),
  "purchasedPacks": zod.array(zod.string()).describe('Liste der DB-Pack-Slugs, die dieser Nutzer freigeschaltet hat (z.B. \"schwyz\", \"bern_2\"). Autoritaetive Quelle fuer Saga-Pack-Zugang.'),
  "subscriptionTier": zod.string().optional().describe('Abo-Stufe des Nutzers (z.B. \"free\", \"premium\", \"elite\", \"family\", \"elite_family\"). DB-Spalte ist NOT NULL (Default \"free\").'),
  "pendingPackRewards": zod.number().default(saveMyProfileResponsePendingPackRewardsDefault).describe('Anzahl ausstehender Pack-Belohnungen aus erfolgreichen Einladungen. Wird > 0, sobald ein eingeladener Freund Premium kauft.')
})


/**
 * @summary Eigenes Profilbild hochladen
 */
export const uploadMyAvatarResponseBioMax = 160;

export const uploadMyAvatarResponseNavAnnouncementsEnabledDefault = true;
export const uploadMyAvatarResponsePendingPackRewardsDefault = 0;

export const UploadMyAvatarResponse = zod.object({
  "id": zod.string().describe('Clerk-Benutzer-ID'),
  "name": zod.string(),
  "bio": zod.string().max(uploadMyAvatarResponseBioMax).nullish(),
  "avatarUrl": zod.string().nullish().describe('Privater Objektpfad des Profilbilds'),
  "dateOfBirth": zod.coerce.date().nullish().describe('Eigenes Geburtsdatum; wird nie in Community-Antworten ausgegeben'),
  "archetype": zod.enum(['reisende', 'hueterin', 'gewitzte', 'senn']),
  "homeCanton": zod.string().optional(),
  "language": zod.string(),
  "ageTier": zod.enum(['kinder', 'jugendliche', 'erwachsene']),
  "navAnnouncementsEnabled": zod.boolean().default(uploadMyAvatarResponseNavAnnouncementsEnabledDefault).describe('Ob automatische Navigationsanweisungen waehrend der Wanderung abgespielt werden.'),
  "premium": zod.boolean(),
  "freeHikeUsed": zod.boolean().describe('Ob die einmalige kostenlose Wanderung bereits verbraucht wurde. Solange false, ist genau eine Wanderung (egal welcher Kanton) auch ohne Premium freigeschaltet.'),
  "purchasedPacks": zod.array(zod.string()).describe('Liste der DB-Pack-Slugs, die dieser Nutzer freigeschaltet hat (z.B. \"schwyz\", \"bern_2\"). Autoritaetive Quelle fuer Saga-Pack-Zugang.'),
  "subscriptionTier": zod.string().optional().describe('Abo-Stufe des Nutzers (z.B. \"free\", \"premium\", \"elite\", \"family\", \"elite_family\"). DB-Spalte ist NOT NULL (Default \"free\").'),
  "pendingPackRewards": zod.number().default(uploadMyAvatarResponsePendingPackRewardsDefault).describe('Anzahl ausstehender Pack-Belohnungen aus erfolgreichen Einladungen. Wird > 0, sobald ein eingeladener Freund Premium kauft.')
})


/**
 * Aktiviert oder deaktiviert Premium fuer den authentifizierten Nutzer.
 * @summary Premium-Status setzen
 */
export const UpdateMyPremiumBody = zod.object({
  "premium": zod.boolean()
})

export const updateMyPremiumResponseBioMax = 160;

export const updateMyPremiumResponseNavAnnouncementsEnabledDefault = true;
export const updateMyPremiumResponsePendingPackRewardsDefault = 0;

export const UpdateMyPremiumResponse = zod.object({
  "id": zod.string().describe('Clerk-Benutzer-ID'),
  "name": zod.string(),
  "bio": zod.string().max(updateMyPremiumResponseBioMax).nullish(),
  "avatarUrl": zod.string().nullish().describe('Privater Objektpfad des Profilbilds'),
  "dateOfBirth": zod.coerce.date().nullish().describe('Eigenes Geburtsdatum; wird nie in Community-Antworten ausgegeben'),
  "archetype": zod.enum(['reisende', 'hueterin', 'gewitzte', 'senn']),
  "homeCanton": zod.string().optional(),
  "language": zod.string(),
  "ageTier": zod.enum(['kinder', 'jugendliche', 'erwachsene']),
  "navAnnouncementsEnabled": zod.boolean().default(updateMyPremiumResponseNavAnnouncementsEnabledDefault).describe('Ob automatische Navigationsanweisungen waehrend der Wanderung abgespielt werden.'),
  "premium": zod.boolean(),
  "freeHikeUsed": zod.boolean().describe('Ob die einmalige kostenlose Wanderung bereits verbraucht wurde. Solange false, ist genau eine Wanderung (egal welcher Kanton) auch ohne Premium freigeschaltet.'),
  "purchasedPacks": zod.array(zod.string()).describe('Liste der DB-Pack-Slugs, die dieser Nutzer freigeschaltet hat (z.B. \"schwyz\", \"bern_2\"). Autoritaetive Quelle fuer Saga-Pack-Zugang.'),
  "subscriptionTier": zod.string().optional().describe('Abo-Stufe des Nutzers (z.B. \"free\", \"premium\", \"elite\", \"family\", \"elite_family\"). DB-Spalte ist NOT NULL (Default \"free\").'),
  "pendingPackRewards": zod.number().default(updateMyPremiumResponsePendingPackRewardsDefault).describe('Anzahl ausstehender Pack-Belohnungen aus erfolgreichen Einladungen. Wird > 0, sobald ein eingeladener Freund Premium kauft.')
})


/**
 * Prueft serverseitig bei RevenueCat, ob der authentifizierte Nutzer (Customer-ID = Nutzer-ID) ein aktives "premium"-Entitlement besitzt, und setzt das Premium-Flag entsprechend. Nur Upgrades werden uebernommen; ein fehlendes Entitlement fuehrt NICHT zum Entzug (Downgrade bleibt Self-Service ueber PATCH /me/premium).
 * @summary Premium-Status verifiziert mit RevenueCat abgleichen
 */
export const syncMyPremiumResponseBioMax = 160;

export const syncMyPremiumResponseNavAnnouncementsEnabledDefault = true;
export const syncMyPremiumResponsePendingPackRewardsDefault = 0;

export const SyncMyPremiumResponse = zod.object({
  "id": zod.string().describe('Clerk-Benutzer-ID'),
  "name": zod.string(),
  "bio": zod.string().max(syncMyPremiumResponseBioMax).nullish(),
  "avatarUrl": zod.string().nullish().describe('Privater Objektpfad des Profilbilds'),
  "dateOfBirth": zod.coerce.date().nullish().describe('Eigenes Geburtsdatum; wird nie in Community-Antworten ausgegeben'),
  "archetype": zod.enum(['reisende', 'hueterin', 'gewitzte', 'senn']),
  "homeCanton": zod.string().optional(),
  "language": zod.string(),
  "ageTier": zod.enum(['kinder', 'jugendliche', 'erwachsene']),
  "navAnnouncementsEnabled": zod.boolean().default(syncMyPremiumResponseNavAnnouncementsEnabledDefault).describe('Ob automatische Navigationsanweisungen waehrend der Wanderung abgespielt werden.'),
  "premium": zod.boolean(),
  "freeHikeUsed": zod.boolean().describe('Ob die einmalige kostenlose Wanderung bereits verbraucht wurde. Solange false, ist genau eine Wanderung (egal welcher Kanton) auch ohne Premium freigeschaltet.'),
  "purchasedPacks": zod.array(zod.string()).describe('Liste der DB-Pack-Slugs, die dieser Nutzer freigeschaltet hat (z.B. \"schwyz\", \"bern_2\"). Autoritaetive Quelle fuer Saga-Pack-Zugang.'),
  "subscriptionTier": zod.string().optional().describe('Abo-Stufe des Nutzers (z.B. \"free\", \"premium\", \"elite\", \"family\", \"elite_family\"). DB-Spalte ist NOT NULL (Default \"free\").'),
  "pendingPackRewards": zod.number().default(syncMyPremiumResponsePendingPackRewardsDefault).describe('Anzahl ausstehender Pack-Belohnungen aus erfolgreichen Einladungen. Wird > 0, sobald ein eingeladener Freund Premium kauft.')
})


/**
 * Gleicht den lokal auf dem Geraet gefuehrten Wanderverlauf (hikeHistory) und die Errungenschaften (achievements) mit dem serverseitig gespeicherten Stand des authentifizierten Nutzers ab. Die Vereinigung beider Mengen (per id) wird serverseitig persistiert und zurueckgegeben, sodass ein An-/Abmelden oder ein Geraetewechsel keine bereits abgeschlossenen Wanderungen verliert.
 * @summary Wanderverlauf und Errungenschaften mit dem Server abgleichen
 */
export const SyncMyProgressBody = zod.object({
  "hikeHistory": zod.array(zod.object({
  "id": zod.string()
}).describe('Ein abgeschlossenes Wander-Erlebnis. Die genaue Feldstruktur wird clientseitig verwaltet (Kapitel, Geometrie, Fotos etc.); der Server speichert und merged Eintraege nur ueber ihre id, ohne den Inhalt zu interpretieren.')),
  "achievements": zod.array(zod.object({
  "id": zod.string().describe('Sagen-ID'),
  "sagaTitle": zod.string(),
  "unlockedAt": zod.number().describe('Unix-Timestamp (ms)')
}))
})

export const SyncMyProgressResponse = zod.object({
  "hikeHistory": zod.array(zod.object({
  "id": zod.string()
}).describe('Ein abgeschlossenes Wander-Erlebnis. Die genaue Feldstruktur wird clientseitig verwaltet (Kapitel, Geometrie, Fotos etc.); der Server speichert und merged Eintraege nur ueber ihre id, ohne den Inhalt zu interpretieren.')),
  "achievements": zod.array(zod.object({
  "id": zod.string().describe('Sagen-ID'),
  "sagaTitle": zod.string(),
  "unlockedAt": zod.number().describe('Unix-Timestamp (ms)')
}))
})


/**
 * Ordnet einen bezahlten Kantonspack-Kauf (Einzelprodukt "sagatrail_kantonspack") dem gewaehlten Kanton zu. Der Server prueft bei RevenueCat, dass der Customer mehr gueltige Kantonspack-Kaeufe als bereits vergebene pack_<kanton>-Entitlements hat, und vergibt dann das Entitlement des Kantons per Grant. Idempotent, falls der Kanton bereits freigeschaltet ist.
 * @summary Kantonspack-Kauf einem Kanton zuordnen
 */
export const ClaimKantonspackBody = zod.object({
  "kanton": zod.string().describe('Kanton-Slug (z. B. \"zuerich\", wie kantonSlug(name))')
})

export const ClaimKantonspackResponse = zod.object({
  "entitlement": zod.string().describe('Vergebenes Entitlement (pack_<kanton>)'),
  "bereitsFreigeschaltet": zod.boolean().describe('True, wenn der Kanton schon vorher freigeschaltet war')
})


/**
 * Markiert die einmalige kostenlose Wanderung des authentifizierten Nutzers als verbraucht. Wird beim Start der ersten Wanderung aufgerufen (nicht-Premium-Nutzer).
 * @summary Kostenlose Wanderung verbrauchen
 */
export const consumeMyFreeHikeResponseBioMax = 160;

export const consumeMyFreeHikeResponseNavAnnouncementsEnabledDefault = true;
export const consumeMyFreeHikeResponsePendingPackRewardsDefault = 0;

export const ConsumeMyFreeHikeResponse = zod.object({
  "id": zod.string().describe('Clerk-Benutzer-ID'),
  "name": zod.string(),
  "bio": zod.string().max(consumeMyFreeHikeResponseBioMax).nullish(),
  "avatarUrl": zod.string().nullish().describe('Privater Objektpfad des Profilbilds'),
  "dateOfBirth": zod.coerce.date().nullish().describe('Eigenes Geburtsdatum; wird nie in Community-Antworten ausgegeben'),
  "archetype": zod.enum(['reisende', 'hueterin', 'gewitzte', 'senn']),
  "homeCanton": zod.string().optional(),
  "language": zod.string(),
  "ageTier": zod.enum(['kinder', 'jugendliche', 'erwachsene']),
  "navAnnouncementsEnabled": zod.boolean().default(consumeMyFreeHikeResponseNavAnnouncementsEnabledDefault).describe('Ob automatische Navigationsanweisungen waehrend der Wanderung abgespielt werden.'),
  "premium": zod.boolean(),
  "freeHikeUsed": zod.boolean().describe('Ob die einmalige kostenlose Wanderung bereits verbraucht wurde. Solange false, ist genau eine Wanderung (egal welcher Kanton) auch ohne Premium freigeschaltet.'),
  "purchasedPacks": zod.array(zod.string()).describe('Liste der DB-Pack-Slugs, die dieser Nutzer freigeschaltet hat (z.B. \"schwyz\", \"bern_2\"). Autoritaetive Quelle fuer Saga-Pack-Zugang.'),
  "subscriptionTier": zod.string().optional().describe('Abo-Stufe des Nutzers (z.B. \"free\", \"premium\", \"elite\", \"family\", \"elite_family\"). DB-Spalte ist NOT NULL (Default \"free\").'),
  "pendingPackRewards": zod.number().default(consumeMyFreeHikeResponsePendingPackRewardsDefault).describe('Anzahl ausstehender Pack-Belohnungen aus erfolgreichen Einladungen. Wird > 0, sobald ein eingeladener Freund Premium kauft.')
})


/**
 * @summary Einladungscode abrufen oder erstellen
 */
export const GetMyReferralCodeResponse = zod.object({
  "code": zod.string()
})


/**
 * @summary Einladungscode einlösen
 */



export const ClaimReferralCodeBody = zod.object({
  "code": zod.string().min(1)
})

export const ClaimReferralCodeResponse = zod.object({
  "ok": zod.boolean(),
  "alreadyClaimed": zod.boolean()
})


/**
 * @summary Sagenpaket-Belohnung einlösen
 */



export const ClaimPackRewardBody = zod.object({
  "packSlug": zod.string().min(1)
})

export const claimPackRewardResponseBioMax = 160;

export const claimPackRewardResponseNavAnnouncementsEnabledDefault = true;
export const claimPackRewardResponsePendingPackRewardsDefault = 0;

export const ClaimPackRewardResponse = zod.object({
  "id": zod.string().describe('Clerk-Benutzer-ID'),
  "name": zod.string(),
  "bio": zod.string().max(claimPackRewardResponseBioMax).nullish(),
  "avatarUrl": zod.string().nullish().describe('Privater Objektpfad des Profilbilds'),
  "dateOfBirth": zod.coerce.date().nullish().describe('Eigenes Geburtsdatum; wird nie in Community-Antworten ausgegeben'),
  "archetype": zod.enum(['reisende', 'hueterin', 'gewitzte', 'senn']),
  "homeCanton": zod.string().optional(),
  "language": zod.string(),
  "ageTier": zod.enum(['kinder', 'jugendliche', 'erwachsene']),
  "navAnnouncementsEnabled": zod.boolean().default(claimPackRewardResponseNavAnnouncementsEnabledDefault).describe('Ob automatische Navigationsanweisungen waehrend der Wanderung abgespielt werden.'),
  "premium": zod.boolean(),
  "freeHikeUsed": zod.boolean().describe('Ob die einmalige kostenlose Wanderung bereits verbraucht wurde. Solange false, ist genau eine Wanderung (egal welcher Kanton) auch ohne Premium freigeschaltet.'),
  "purchasedPacks": zod.array(zod.string()).describe('Liste der DB-Pack-Slugs, die dieser Nutzer freigeschaltet hat (z.B. \"schwyz\", \"bern_2\"). Autoritaetive Quelle fuer Saga-Pack-Zugang.'),
  "subscriptionTier": zod.string().optional().describe('Abo-Stufe des Nutzers (z.B. \"free\", \"premium\", \"elite\", \"family\", \"elite_family\"). DB-Spalte ist NOT NULL (Default \"free\").'),
  "pendingPackRewards": zod.number().default(claimPackRewardResponsePendingPackRewardsDefault).describe('Anzahl ausstehender Pack-Belohnungen aus erfolgreichen Einladungen. Wird > 0, sobald ein eingeladener Freund Premium kauft.')
})


/**
 * Gibt die juengsten community-gemeldeten Wegbedingungen fuer eine Route zurueck (max. 10, nur der letzten 7 Tage). Kein Auth erforderlich.
 * @summary Community-Wegbedingungen abrufen
 */
export const GetRouteConditionsParams = zod.object({
  "routeId": zod.coerce.string()
})

export const GetRouteConditionsResponseItem = zod.object({
  "id": zod.string(),
  "routeId": zod.string(),
  "userName": zod.string().nullish(),
  "condition": zod.enum(['excellent', 'clear', 'muddy', 'snow', 'icy', 'blocked']),
  "note": zod.string().nullish(),
  "reportedAt": zod.coerce.date()
}).describe('Ein community-gemeldeter Wegbedingungsbericht. Berichte laufen nach 7 Tagen ab und werden beim Abruf serverseitig gefiltert.')
export const GetRouteConditionsResponse = zod.array(GetRouteConditionsResponseItem)


/**
 * Meldet eine neue Wegbedingung fuer eine Route. Authentifizierung erforderlich. Rate-Limit: max. 1 Bericht pro Nutzer und Route pro 2 Stunden.
 * @summary Wegbedingung melden
 */
export const ReportRouteConditionParams = zod.object({
  "routeId": zod.coerce.string()
})

export const reportRouteConditionBodyNoteMax = 200;



export const ReportRouteConditionBody = zod.object({
  "condition": zod.enum(['excellent', 'clear', 'muddy', 'snow', 'icy', 'blocked']),
  "note": zod.string().max(reportRouteConditionBodyNoteMax).nullish()
})

export const ReportRouteConditionResponse = zod.object({
  "id": zod.string(),
  "routeId": zod.string(),
  "userName": zod.string().nullish(),
  "condition": zod.enum(['excellent', 'clear', 'muddy', 'snow', 'icy', 'blocked']),
  "note": zod.string().nullish(),
  "reportedAt": zod.coerce.date()
}).describe('Ein community-gemeldeter Wegbedingungsbericht. Berichte laufen nach 7 Tagen ab und werden beim Abruf serverseitig gefiltert.')


/**
 * Synthetisiert den uebergebenen Erzaehltext als natuerlich klingende Audio-Erzaehlung via ElevenLabs (Premium-Feature, online-only, kein Offline-Fallback). Fuer Schweizerdeutsch (gsw) muss bereits der Hochdeutsch-Text uebergeben werden -- die Schweizer Faerbung kommt ausschliesslich ueber die Stimme, nie ueber Dialekt-Text. Ergebnisse werden serverseitig nach Textinhalt gecacht. Nur fuer Premium-Nutzer: die kostenlose erste Wanderung nutzt die on-device Stimme und ruft diesen Endpunkt nie auf.
 * @summary Kapitel-Erzaehlung als KI-Audio synthetisieren
 */



export const CreateNarrationBody = zod.object({
  "text": zod.string().min(1),
  "language": zod.string().optional().describe('Sprachcode der Erzaehlung (bestimmt die Stimmwahl, z. B. eine Schweizer Faerbung fuer \"gsw\"). Der uebergebene Text muss fuer \"gsw\" bereits Hochdeutsch sein — Dialekt-Text wird nie an die TTS geschickt.'),
  "provider": zod.enum(['elevenlabs', 'openai']).optional().describe('Expliziter TTS-Anbieter. \"openai\" umgeht ElevenLabs vollstaendig und synthetisiert direkt mit OpenAI (guenstiger, fuer alle Nicht-Story-Inhalte: Einleitung, POIs, Meilensteine, Uebergaenge, Entscheidungs-Feedback). Fehlt der Wert, wird ElevenLabs mit OpenAI-Fallback verwendet (Story-Kapitel).')
})

export const CreateNarrationResponse = zod.unknown()


/**
 * @summary Zeitlich begrenzten Sicherheitslink starten
 */
export const createSafetyShareBodyRouteNameMax = 180;

export const createSafetyShareBodyDurationMinutesMin = 15;
export const createSafetyShareBodyDurationMinutesMax = 1440;



export const CreateSafetyShareBody = zod.object({
  "routeName": zod.string().min(1).max(createSafetyShareBodyRouteNameMax),
  "durationMinutes": zod.number().min(createSafetyShareBodyDurationMinutesMin).max(createSafetyShareBodyDurationMinutesMax)
})

export const createSafetyShareResponseOneLatestLocationOneLatMin = -90;
export const createSafetyShareResponseOneLatestLocationOneLatMax = 90;

export const createSafetyShareResponseOneLatestLocationOneElevationMin = -180;
export const createSafetyShareResponseOneLatestLocationOneElevationMax = 180;

export const createSafetyShareResponseOneLatestLocationOneAccuracyMin = 0;



export const CreateSafetyShareResponse = zod.object({
  "status": zod.enum(['active', 'ended', 'expired']),
  "routeName": zod.string(),
  "startedAt": zod.coerce.date(),
  "expiresAt": zod.coerce.date(),
  "endedAt": zod.coerce.date().nullable(),
  "latestLocation": zod.object({
  "lat": zod.number().min(createSafetyShareResponseOneLatestLocationOneLatMin).max(createSafetyShareResponseOneLatestLocationOneLatMax),
  "lng": zod.number(),
  "elevation": zod.number().min(createSafetyShareResponseOneLatestLocationOneElevationMin).max(createSafetyShareResponseOneLatestLocationOneElevationMax).nullish().describe('OSM-Höhe in Metern über Meer, sofern am POI gepflegt.'),
  "accuracy": zod.number().min(createSafetyShareResponseOneLatestLocationOneAccuracyMin).nullish()
}).and(zod.object({
  "updatedAt": zod.coerce.date()
})).nullable()
}).and(zod.object({
  "id": zod.string(),
  "token": zod.string(),
  "path": zod.string()
}))


/**
 * @summary Frischen GPS-Standort eines Sicherheitslinks aktualisieren
 */
export const UpdateSafetyShareLocationParams = zod.object({
  "token": zod.coerce.string()
})

export const updateSafetyShareLocationBodyLatMin = -90;
export const updateSafetyShareLocationBodyLatMax = 90;

export const updateSafetyShareLocationBodyElevationMin = -180;
export const updateSafetyShareLocationBodyElevationMax = 180;

export const updateSafetyShareLocationBodyAccuracyMin = 0;



export const UpdateSafetyShareLocationBody = zod.object({
  "lat": zod.number().min(updateSafetyShareLocationBodyLatMin).max(updateSafetyShareLocationBodyLatMax),
  "lng": zod.number(),
  "elevation": zod.number().min(updateSafetyShareLocationBodyElevationMin).max(updateSafetyShareLocationBodyElevationMax).nullish().describe('OSM-Höhe in Metern über Meer, sofern am POI gepflegt.'),
  "accuracy": zod.number().min(updateSafetyShareLocationBodyAccuracyMin).nullish()
})

export const UpdateSafetyShareLocationResponse = zod.unknown()


/**
 * @summary Öffentlichen Sicherheitsstatus per Token laden
 */
export const GetSafetyShareByTokenParams = zod.object({
  "token": zod.coerce.string()
})

export const getSafetyShareByTokenResponseLatestLocationOneLatMin = -90;
export const getSafetyShareByTokenResponseLatestLocationOneLatMax = 90;

export const getSafetyShareByTokenResponseLatestLocationOneElevationMin = -180;
export const getSafetyShareByTokenResponseLatestLocationOneElevationMax = 180;

export const getSafetyShareByTokenResponseLatestLocationOneAccuracyMin = 0;



export const GetSafetyShareByTokenResponse = zod.object({
  "status": zod.enum(['active', 'ended', 'expired']),
  "routeName": zod.string(),
  "startedAt": zod.coerce.date(),
  "expiresAt": zod.coerce.date(),
  "endedAt": zod.coerce.date().nullable(),
  "latestLocation": zod.object({
  "lat": zod.number().min(getSafetyShareByTokenResponseLatestLocationOneLatMin).max(getSafetyShareByTokenResponseLatestLocationOneLatMax),
  "lng": zod.number(),
  "elevation": zod.number().min(getSafetyShareByTokenResponseLatestLocationOneElevationMin).max(getSafetyShareByTokenResponseLatestLocationOneElevationMax).nullish().describe('OSM-Höhe in Metern über Meer, sofern am POI gepflegt.'),
  "accuracy": zod.number().min(getSafetyShareByTokenResponseLatestLocationOneAccuracyMin).nullish()
}).and(zod.object({
  "updatedAt": zod.coerce.date()
})).nullable()
})


/**
 * @summary Eigene Sicherheitsfreigabe beenden
 */
export const EndSafetyShareParams = zod.object({
  "token": zod.coerce.string()
})

export const EndSafetyShareResponse = zod.unknown()


/**
 * @summary Echten SwissTopo-DTM-Korridor entlang einer Route laden
 */
export const createTerrainCorridorBodyGeometryMin = 2;
export const createTerrainCorridorBodyGeometryMax = 500;

export const createTerrainCorridorBodyOptionsRowsDefault = 32;
export const createTerrainCorridorBodyOptionsRowsMin = 12;
export const createTerrainCorridorBodyOptionsRowsMax = 80;

export const createTerrainCorridorBodyOptionsColumnsDefault = 9;
export const createTerrainCorridorBodyOptionsColumnsMin = 5;
export const createTerrainCorridorBodyOptionsColumnsMax = 13;

export const createTerrainCorridorBodyOptionsHalfWidthMDefault = 500;
export const createTerrainCorridorBodyOptionsHalfWidthMMin = 100;
export const createTerrainCorridorBodyOptionsHalfWidthMMax = 1500;



export const CreateTerrainCorridorBody = zod.object({
  "geometry": zod.array(zod.tuple([zod.number(),
zod.number()])).min(createTerrainCorridorBodyGeometryMin).max(createTerrainCorridorBodyGeometryMax),
  "options": zod.object({
  "rows": zod.number().min(createTerrainCorridorBodyOptionsRowsMin).max(createTerrainCorridorBodyOptionsRowsMax).default(createTerrainCorridorBodyOptionsRowsDefault),
  "columns": zod.number().min(createTerrainCorridorBodyOptionsColumnsMin).max(createTerrainCorridorBodyOptionsColumnsMax).default(createTerrainCorridorBodyOptionsColumnsDefault),
  "halfWidthM": zod.number().min(createTerrainCorridorBodyOptionsHalfWidthMMin).max(createTerrainCorridorBodyOptionsHalfWidthMMax).default(createTerrainCorridorBodyOptionsHalfWidthMDefault)
}).optional()
})

export const CreateTerrainCorridorResponse = zod.object({
  "version": zod.number(),
  "source": zod.literal("SwissTopo DTM corridor profiles"),
  "rows": zod.number(),
  "columns": zod.number(),
  "halfWidthM": zod.number(),
  "routeLengthM": zod.number(),
  "origin": zod.object({
  "lat": zod.number(),
  "lng": zod.number()
}),
  "bounds": zod.object({
  "north": zod.number(),
  "south": zod.number(),
  "east": zod.number(),
  "west": zod.number()
}),
  "fetchedAt": zod.number(),
  "grid": zod.array(zod.array(zod.object({
  "lat": zod.number(),
  "lng": zod.number(),
  "elevationM": zod.number().nullable()
})))
})


/**
 * @summary Rechteckiges SwissTopo-DTM-Gelände um eine vollständige Route laden
 */
export const createTerrainAreaBodyGeometryMin = 2;
export const createTerrainAreaBodyGeometryMax = 500;

export const createTerrainAreaBodyOptionsRowsDefault = 24;
export const createTerrainAreaBodyOptionsRowsMin = 12;
export const createTerrainAreaBodyOptionsRowsMax = 40;

export const createTerrainAreaBodyOptionsColumnsDefault = 24;
export const createTerrainAreaBodyOptionsColumnsMin = 12;
export const createTerrainAreaBodyOptionsColumnsMax = 40;

export const createTerrainAreaBodyOptionsPaddingMDefault = 2000;
export const createTerrainAreaBodyOptionsPaddingMMin = 500;
export const createTerrainAreaBodyOptionsPaddingMMax = 5000;

export const createTerrainAreaBodyOptionsViewportAspectDefault = 0.4615384615;
export const createTerrainAreaBodyOptionsViewportAspectMin = 0.4;
export const createTerrainAreaBodyOptionsViewportAspectMax = 1;



export const CreateTerrainAreaBody = zod.object({
  "geometry": zod.array(zod.tuple([zod.number(),
zod.number()])).min(createTerrainAreaBodyGeometryMin).max(createTerrainAreaBodyGeometryMax),
  "options": zod.object({
  "rows": zod.number().min(createTerrainAreaBodyOptionsRowsMin).max(createTerrainAreaBodyOptionsRowsMax).default(createTerrainAreaBodyOptionsRowsDefault),
  "columns": zod.number().min(createTerrainAreaBodyOptionsColumnsMin).max(createTerrainAreaBodyOptionsColumnsMax).default(createTerrainAreaBodyOptionsColumnsDefault),
  "paddingM": zod.number().min(createTerrainAreaBodyOptionsPaddingMMin).max(createTerrainAreaBodyOptionsPaddingMMax).default(createTerrainAreaBodyOptionsPaddingMDefault),
  "viewportAspect": zod.number().min(createTerrainAreaBodyOptionsViewportAspectMin).max(createTerrainAreaBodyOptionsViewportAspectMax).default(createTerrainAreaBodyOptionsViewportAspectDefault)
}).optional()
})

export const CreateTerrainAreaResponse = zod.object({
  "version": zod.number(),
  "source": zod.literal("SwissTopo DTM rectangular route area"),
  "rows": zod.number(),
  "columns": zod.number(),
  "paddingM": zod.number(),
  "viewportAspect": zod.number(),
  "origin": zod.object({
  "lat": zod.number(),
  "lng": zod.number()
}),
  "bounds": zod.object({
  "north": zod.number(),
  "south": zod.number(),
  "east": zod.number(),
  "west": zod.number()
}),
  "fetchedAt": zod.number(),
  "grid": zod.array(zod.array(zod.object({
  "lat": zod.number(),
  "lng": zod.number(),
  "elevationM": zod.number().nullable()
})))
})


/**
 * @summary Oeffentliche Treffpunkte fuer gemeinsame Wanderungen
 */
export const getMeetupsQuerySearchMax = 120;



export const GetMeetupsQueryParams = zod.object({
  "from": zod.date().optional(),
  "routeId": zod.coerce.string().optional(),
  "communityId": zod.coerce.string().uuid().optional(),
  "search": zod.coerce.string().max(getMeetupsQuerySearchMax).optional(),
  "canton": zod.coerce.string().optional(),
  "difficulty": zod.coerce.string().optional(),
  "mine": zod.coerce.boolean().optional()
})

export const GetMeetupsResponse = zod.object({
  "meetups": zod.array(zod.object({
  "id": zod.string().uuid(),
  "routeId": zod.string(),
  "routeName": zod.string(),
  "canton": zod.string(),
  "startsAt": zod.coerce.date(),
  "maxParticipants": zod.number(),
  "participantCount": zod.number(),
  "pace": zod.string(),
  "note": zod.string().nullish(),
  "communityId": zod.string().uuid().nullable(),
  "organizerName": zod.string(),
  "joined": zod.boolean(),
  "status": zod.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  "routeDistanceKm": zod.number().nullable(),
  "routeDifficulty": zod.string().nullable(),
  "routeStartLat": zod.number().nullable(),
  "routeStartLng": zod.number().nullable(),
  "isWaitlisted": zod.boolean(),
  "waitlistPosition": zod.number().nullable(),
  "waitlistCount": zod.number(),
  "cancellationReason": zod.string().nullish(),
  "cancelledAt": zod.coerce.date().nullish(),
  "isOrganizer": zod.boolean()
}))
})


/**
 * @summary Treffpunkt fuer eine Route erstellen
 */
export const createMeetupBodyMaxParticipantsDefault = 8;
export const createMeetupBodyMaxParticipantsMin = 2;
export const createMeetupBodyMaxParticipantsMax = 30;

export const createMeetupBodyPaceDefault = `gemuetlich`;
export const createMeetupBodyNoteMax = 500;



export const CreateMeetupBody = zod.object({
  "routeId": zod.string(),
  "routeName": zod.string(),
  "canton": zod.string(),
  "startsAt": zod.coerce.date(),
  "maxParticipants": zod.number().min(createMeetupBodyMaxParticipantsMin).max(createMeetupBodyMaxParticipantsMax).default(createMeetupBodyMaxParticipantsDefault),
  "pace": zod.enum(['gemuetlich', 'normal', 'sportlich']).default(createMeetupBodyPaceDefault),
  "note": zod.string().max(createMeetupBodyNoteMax).nullish(),
  "communityId": zod.string().uuid().nullish()
})

export const CreateMeetupResponse = zod.object({
  "id": zod.string().uuid(),
  "routeId": zod.string(),
  "routeName": zod.string(),
  "canton": zod.string(),
  "startsAt": zod.coerce.date(),
  "maxParticipants": zod.number(),
  "participantCount": zod.number(),
  "pace": zod.string(),
  "note": zod.string().nullish(),
  "communityId": zod.string().uuid().nullable(),
  "organizerName": zod.string(),
  "joined": zod.boolean(),
  "status": zod.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  "routeDistanceKm": zod.number().nullable(),
  "routeDifficulty": zod.string().nullable(),
  "routeStartLat": zod.number().nullable(),
  "routeStartLng": zod.number().nullable(),
  "isWaitlisted": zod.boolean(),
  "waitlistPosition": zod.number().nullable(),
  "waitlistCount": zod.number(),
  "cancellationReason": zod.string().nullish(),
  "cancelledAt": zod.coerce.date().nullish(),
  "isOrganizer": zod.boolean()
})


/**
 * @summary Treffpunkt mit Teilnehmern laden
 */
export const GetMeetupParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const getMeetupResponseTwoParticipantsItemAgeMin = 13;
export const getMeetupResponseTwoParticipantsItemAgeMax = 120;

export const getMeetupResponseTwoParticipantsItemBioMax = 160;

export const getMeetupResponseTwoParticipantsItemRankLevelMin = 0;
export const getMeetupResponseTwoParticipantsItemRankLevelMax = 9;

export const getMeetupResponseTwoMessagesItemMessageTextMax = 500;



export const GetMeetupResponse = zod.object({
  "id": zod.string().uuid(),
  "routeId": zod.string(),
  "routeName": zod.string(),
  "canton": zod.string(),
  "startsAt": zod.coerce.date(),
  "maxParticipants": zod.number(),
  "participantCount": zod.number(),
  "pace": zod.string(),
  "note": zod.string().nullish(),
  "communityId": zod.string().uuid().nullable(),
  "organizerName": zod.string(),
  "joined": zod.boolean(),
  "status": zod.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  "routeDistanceKm": zod.number().nullable(),
  "routeDifficulty": zod.string().nullable(),
  "routeStartLat": zod.number().nullable(),
  "routeStartLng": zod.number().nullable(),
  "isWaitlisted": zod.boolean(),
  "waitlistPosition": zod.number().nullable(),
  "waitlistCount": zod.number(),
  "cancellationReason": zod.string().nullish(),
  "cancelledAt": zod.coerce.date().nullish(),
  "isOrganizer": zod.boolean()
}).and(zod.object({
  "participants": zod.array(zod.object({
  "userId": zod.string().optional().describe('Nur für authentifizierte, bereits beigetretene Teilnehmer sichtbar.'),
  "avatarUrl": zod.string().nullish(),
  "age": zod.number().min(getMeetupResponseTwoParticipantsItemAgeMin).max(getMeetupResponseTwoParticipantsItemAgeMax).nullish(),
  "name": zod.string(),
  "joinedAt": zod.coerce.date(),
  "bio": zod.string().max(getMeetupResponseTwoParticipantsItemBioMax).nullish(),
  "attendanceStatus": zod.enum(['confirmed', 'delayed', 'arrived']).optional(),
  "delayMinutes": zod.number().nullish(),
  "statusUpdatedAt": zod.coerce.date().optional(),
  "rankLevel": zod.number().min(getMeetupResponseTwoParticipantsItemRankLevelMin).max(getMeetupResponseTwoParticipantsItemRankLevelMax).optional().describe('Server-verifizierter Gruppenrang für Mitwandernde; nur für Teilnehmende oder den Organisator sichtbar.'),
  "groupAchievements": zod.array(zod.object({
  "id": zod.string(),
  "threshold": zod.number(),
  "title": zod.string()
})).optional().describe('Nur für Teilnehmende oder den Organisator sichtbar.')
})),
  "messages": zod.array(zod.object({
  "id": zod.string().uuid(),
  "senderUserId": zod.string(),
  "senderName": zod.string(),
  "messageText": zod.string().max(getMeetupResponseTwoMessagesItemMessageTextMax),
  "createdAt": zod.coerce.date()
})).describe('Nachrichten sind nur für den Organisator und eingeschriebene Teilnehmende sichtbar.')
}))


/**
 * @summary Eigenen Treffpunkt loeschen
 */
export const DeleteMeetupParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const DeleteMeetupResponse = zod.void()


/**
 * @summary Eigenen geplanten Treffpunkt bearbeiten
 */
export const UpdateMeetupParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const updateMeetupBodyMaxParticipantsMin = 2;
export const updateMeetupBodyMaxParticipantsMax = 30;

export const updateMeetupBodyNoteMax = 500;



export const UpdateMeetupBody = zod.object({
  "startsAt": zod.coerce.date(),
  "maxParticipants": zod.number().min(updateMeetupBodyMaxParticipantsMin).max(updateMeetupBodyMaxParticipantsMax),
  "pace": zod.enum(['gemuetlich', 'normal', 'sportlich']),
  "note": zod.string().max(updateMeetupBodyNoteMax).nullable()
})

export const UpdateMeetupResponse = zod.object({
  "id": zod.string().uuid(),
  "routeId": zod.string(),
  "routeName": zod.string(),
  "canton": zod.string(),
  "startsAt": zod.coerce.date(),
  "maxParticipants": zod.number(),
  "participantCount": zod.number(),
  "pace": zod.string(),
  "note": zod.string().nullish(),
  "communityId": zod.string().uuid().nullable(),
  "organizerName": zod.string(),
  "joined": zod.boolean(),
  "status": zod.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  "routeDistanceKm": zod.number().nullable(),
  "routeDifficulty": zod.string().nullable(),
  "routeStartLat": zod.number().nullable(),
  "routeStartLng": zod.number().nullable(),
  "isWaitlisted": zod.boolean(),
  "waitlistPosition": zod.number().nullable(),
  "waitlistCount": zod.number(),
  "cancellationReason": zod.string().nullish(),
  "cancelledAt": zod.coerce.date().nullish(),
  "isOrganizer": zod.boolean()
})


/**
 * @summary Private Fotos eines abgeschlossenen Treffpunkts laden
 */
export const GetMeetupPhotosParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const GetMeetupPhotosResponse = zod.record(zod.string(), zod.unknown())


/**
 * @summary Freigabe für eine Namensnennung aktualisieren
 */
export const UpdateMeetupPhotoConsentParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const UpdateMeetupPhotoConsentBody = zod.object({
  "allowNameMention": zod.boolean(),
  "consentVersion": zod.string()
})

export const UpdateMeetupPhotoConsentResponse = zod.record(zod.string(), zod.unknown())


/**
 * @summary Privates Foto nach zwei getrennten Einwilligungen hochladen
 */
export const UploadMeetupPhotoParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const UploadMeetupPhotoQueryParams = zod.object({
  "consentVersion": zod.coerce.string(),
  "rightsConsent": zod.enum(['1']),
  "depictedPeopleConsent": zod.enum(['1'])
})

export const UploadMeetupPhotoResponse = zod.record(zod.string(), zod.unknown())


/**
 * @summary Eigenes Meetup-Foto löschen
 */
export const DeleteMeetupPhotoParams = zod.object({
  "id": zod.coerce.string().uuid(),
  "photoId": zod.coerce.string().uuid()
})

export const DeleteMeetupPhotoResponse = zod.record(zod.string(), zod.unknown())


/**
 * @summary Organizer-Beitrag mit Auswahl und Namensfreigaben vorbereiten
 */
export const PrepareMeetupPhotoShareParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const prepareMeetupPhotoShareBodySelectedPhotoIdsMax = 20;

export const prepareMeetupPhotoShareBodyCaptionMax = 1200;



export const PrepareMeetupPhotoShareBody = zod.object({
  "selectedPhotoIds": zod.array(zod.string().uuid()).max(prepareMeetupPhotoShareBodySelectedPhotoIdsMax),
  "caption": zod.string().max(prepareMeetupPhotoShareBodyCaptionMax).optional()
})

export const PrepareMeetupPhotoShareResponse = zod.record(zod.string(), zod.unknown())


/**
 * @summary Eigenen Treffpunkt absagen
 */
export const CancelMeetupParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const cancelMeetupBodyReasonMin = 3;
export const cancelMeetupBodyReasonMax = 300;



export const CancelMeetupBody = zod.object({
  "reason": zod.string().min(cancelMeetupBodyReasonMin).max(cancelMeetupBodyReasonMax)
})

export const CancelMeetupResponse = zod.void()


/**
 * @summary Treffpunkt starten
 */
export const StartMeetupParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const StartMeetupResponse = zod.object({
  "status": zod.enum(['in_progress', 'completed'])
})


/**
 * @summary Treffpunkt abschliessen
 */
export const CompleteMeetupParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const CompleteMeetupResponse = zod.object({
  "status": zod.enum(['in_progress', 'completed'])
})


/**
 * @summary Nachricht an Treffpunktteilnehmer senden
 */
export const SendMeetupMessageParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const sendMeetupMessageBodyMessageTextMax = 500;



export const SendMeetupMessageBody = zod.object({
  "messageText": zod.string().min(1).max(sendMeetupMessageBodyMessageTextMax)
})

export const SendMeetupMessageResponse = zod.object({
  "sent": zod.boolean()
})


/**
 * @summary Bei einem Treffpunkt mitwandern
 */
export const JoinMeetupParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const JoinMeetupResponse = zod.object({
  "joined": zod.boolean(),
  "waitlisted": zod.boolean(),
  "waitlistPosition": zod.number().nullable()
})


/**
 * @summary Teilnahme an einem Treffpunkt aufheben
 */
export const LeaveMeetupParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const LeaveMeetupResponse = zod.object({
  "joined": zod.boolean(),
  "waitlisted": zod.boolean(),
  "waitlistPosition": zod.number().nullable()
})


/**
 * @summary Eigenen Anwesenheitsstatus aktualisieren
 */
export const UpdateMeetupAttendanceParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const updateMeetupAttendanceBodyDelayMinutesMin = 5;
export const updateMeetupAttendanceBodyDelayMinutesMax = 180;



export const UpdateMeetupAttendanceBody = zod.object({
  "status": zod.enum(['confirmed', 'delayed', 'arrived']),
  "delayMinutes": zod.number().min(updateMeetupAttendanceBodyDelayMinutesMin).max(updateMeetupAttendanceBodyDelayMinutesMax).nullish()
})

export const UpdateMeetupAttendanceResponse = zod.object({
  "attendanceStatus": zod.enum(['confirmed', 'delayed', 'arrived']),
  "delayMinutes": zod.number().nullable(),
  "statusUpdatedAt": zod.coerce.date()
})


/**
 * @summary Sicheren Treffpunkt-Link erstellen
 */
export const CreateMeetupShareParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const CreateMeetupShareResponse = zod.object({
  "token": zod.string(),
  "path": zod.string(),
  "expiresAt": zod.coerce.date()
})


/**
 * @summary Öffentlichen Treffpunkt-Link laden
 */
export const GetSharedMeetupParams = zod.object({
  "token": zod.coerce.string()
})

export const GetSharedMeetupResponse = zod.object({
  "routeName": zod.string(),
  "canton": zod.string(),
  "startsAt": zod.coerce.date(),
  "participantCount": zod.number(),
  "maxParticipants": zod.number(),
  "status": zod.enum(['scheduled', 'cancelled']),
  "expiresAt": zod.coerce.date()
})


/**
 * @summary Treffpunkt oder Nutzer melden
 */
export const ReportMeetupParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const reportMeetupBodyNoteMax = 500;



export const ReportMeetupBody = zod.object({
  "reason": zod.enum(['safety', 'harassment', 'spam', 'other']),
  "reportedUserId": zod.string().optional(),
  "note": zod.string().max(reportMeetupBodyNoteMax).optional()
})

export const ReportMeetupResponse = zod.object({
  "ok": zod.boolean()
})


/**
 * @summary Organisator eines Treffpunkts blockieren
 */
export const BlockMeetupOrganizerParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const BlockMeetupOrganizerResponse = zod.object({
  "ok": zod.boolean()
})


/**
 * @summary Nutzer für Treffpunkte blockieren
 */
export const BlockMeetupUserParams = zod.object({
  "userId": zod.coerce.string()
})

export const BlockMeetupUserResponse = zod.object({
  "ok": zod.boolean()
})


/**
 * @summary Nutzerblockierung aufheben
 */
export const UnblockMeetupUserParams = zod.object({
  "userId": zod.coerce.string()
})

export const UnblockMeetupUserResponse = zod.object({
  "ok": zod.boolean()
})


/**
 * @summary Teilnehmer als Organisator entfernen
 */
export const RemoveMeetupParticipantParams = zod.object({
  "id": zod.coerce.string().uuid(),
  "userId": zod.coerce.string()
})

export const RemoveMeetupParticipantResponse = zod.void()


/**
 * Liefert die freigegebenen Informationen einer SagaTrail-Community für eine Landingpage. Die Antwort enthält keinen privaten Kontostand und keine Mitgliederliste.
 * @summary Öffentliche Community-Einladung laden
 */
export const getCommunityInvitationPathSlugMin = 2;
export const getCommunityInvitationPathSlugMax = 80;


export const getCommunityInvitationPathSlugRegExp = new RegExp('^[a-z0-9]+(?:-[a-z0-9]+)*$');


export const GetCommunityInvitationParams = zod.object({
  "slug": zod.coerce.string().min(getCommunityInvitationPathSlugMin).max(getCommunityInvitationPathSlugMax).regex(getCommunityInvitationPathSlugRegExp)
})

export const GetCommunityInvitationResponse = zod.object({
  "id": zod.string().uuid(),
  "slug": zod.string(),
  "name": zod.string(),
  "description": zod.string(),
  "administratorName": zod.string(),
  "language": zod.string(),
  "coverImageUrl": zod.string().url().nullish(),
  "facebookGroupUrl": zod.string().url().nullish(),
  "announcement": zod.string().nullish(),
  "inviteCode": zod.string(),
  "appStoreUrl": zod.string().url().optional(),
  "playStoreUrl": zod.string().url().optional(),
  "deepLink": zod.string().optional(),
  "active": zod.boolean(),
  "createdAt": zod.coerce.date(),
  "updatedAt": zod.coerce.date()
})


/**
 * Liefert die aktiven Communities, denen der eingeloggte Nutzer angehört. Die Reihenfolge ist alphabetisch nach dem Community-Namen.
 * @summary Eigene aktive Communities laden
 */
export const getMyCommunitiesResponseMemberCountMin = 0;



export const GetMyCommunitiesResponseItem = zod.object({
  "id": zod.string().uuid(),
  "slug": zod.string(),
  "name": zod.string(),
  "description": zod.string(),
  "administratorName": zod.string(),
  "language": zod.string(),
  "coverImageUrl": zod.string().url().nullish(),
  "facebookGroupUrl": zod.string().url().nullish(),
  "announcement": zod.string().nullish(),
  "memberCount": zod.number().min(getMyCommunitiesResponseMemberCountMin),
  "inviteCode": zod.string(),
  "deepLink": zod.string(),
  "active": zod.boolean(),
  "joinedAt": zod.coerce.date()
})
export const GetMyCommunitiesResponse = zod.array(GetMyCommunitiesResponseItem)


/**
 * @summary Eigene Community-Mitgliedschaft beenden
 */
export const LeaveCommunityParams = zod.object({
  "id": zod.coerce.string().uuid().describe('ID der Community')
})

export const LeaveCommunityResponse = zod.void()


/**
 * Löst einen kurzen Einladungscode auf. Der Code ist ein Fallback für Facebook-In-App-Browser und Store-Weiterleitungen.
 * @summary Community-Einladung über den Fallback-Code laden
 */
export const getCommunityInvitationByCodePathCodeRegExp = new RegExp('^[A-HJ-NP-Z2-9]{6,12}$');


export const GetCommunityInvitationByCodeParams = zod.object({
  "code": zod.coerce.string().regex(getCommunityInvitationByCodePathCodeRegExp)
})

export const GetCommunityInvitationByCodeResponse = zod.object({
  "id": zod.string().uuid(),
  "slug": zod.string(),
  "name": zod.string(),
  "description": zod.string(),
  "administratorName": zod.string(),
  "language": zod.string(),
  "coverImageUrl": zod.string().url().nullish(),
  "facebookGroupUrl": zod.string().url().nullish(),
  "announcement": zod.string().nullish(),
  "inviteCode": zod.string(),
  "appStoreUrl": zod.string().url().optional(),
  "playStoreUrl": zod.string().url().optional(),
  "deepLink": zod.string().optional(),
  "active": zod.boolean(),
  "createdAt": zod.coerce.date(),
  "updatedAt": zod.coerce.date()
})


/**
 * @summary Einer Community mit einem Einladungscode beitreten
 */
export const claimCommunityInvitationBodyCodeRegExp = new RegExp('^[A-HJ-NP-Z2-9]{6,12}$');


export const ClaimCommunityInvitationBody = zod.object({
  "code": zod.string().regex(claimCommunityInvitationBodyCodeRegExp)
})

export const ClaimCommunityInvitationResponse = zod.object({
  "joined": zod.boolean(),
  "alreadyMember": zod.boolean(),
  "community": zod.object({
  "id": zod.string().uuid(),
  "slug": zod.string(),
  "name": zod.string(),
  "description": zod.string(),
  "administratorName": zod.string(),
  "language": zod.string(),
  "coverImageUrl": zod.string().url().nullish(),
  "facebookGroupUrl": zod.string().url().nullish(),
  "announcement": zod.string().nullish(),
  "inviteCode": zod.string(),
  "appStoreUrl": zod.string().url().optional(),
  "playStoreUrl": zod.string().url().optional(),
  "deepLink": zod.string().optional(),
  "active": zod.boolean(),
  "createdAt": zod.coerce.date(),
  "updatedAt": zod.coerce.date()
})
})


/**
 * @summary SagaTrail-Communities verwalten
 */
export const ListCommunitiesResponseItem = zod.object({
  "id": zod.string().uuid(),
  "slug": zod.string(),
  "name": zod.string(),
  "description": zod.string(),
  "administratorName": zod.string(),
  "language": zod.string(),
  "coverImageUrl": zod.string().url().nullish(),
  "facebookGroupUrl": zod.string().url().nullish(),
  "announcement": zod.string().nullish(),
  "inviteCode": zod.string(),
  "appStoreUrl": zod.string().url().optional(),
  "playStoreUrl": zod.string().url().optional(),
  "deepLink": zod.string().optional(),
  "active": zod.boolean(),
  "createdAt": zod.coerce.date(),
  "updatedAt": zod.coerce.date()
})
export const ListCommunitiesResponse = zod.array(ListCommunitiesResponseItem)


/**
 * @summary Neue SagaTrail-Community mit Einladung anlegen
 */
export const createCommunityBodySlugMin = 2;
export const createCommunityBodySlugMax = 80;


export const createCommunityBodySlugRegExp = new RegExp('^[a-z0-9]+(?:-[a-z0-9]+)*$');
export const createCommunityBodyNameMax = 120;

export const createCommunityBodyDescriptionMax = 1000;

export const createCommunityBodyAdministratorNameMax = 120;

export const createCommunityBodyInviteCodeRegExp = new RegExp('^[A-HJ-NP-Z2-9]{6,12}$');
export const createCommunityBodyAppStoreUrlDefault = `https://apps.apple.com/app/id6788260668`;
export const createCommunityBodyPlayStoreUrlDefault = `https://play.google.com/store/apps/details?id=com.sagatrail2.app`;
export const createCommunityBodyActiveDefault = true;

export const CreateCommunityBody = zod.object({
  "slug": zod.string().min(createCommunityBodySlugMin).max(createCommunityBodySlugMax).regex(createCommunityBodySlugRegExp),
  "name": zod.string().min(1).max(createCommunityBodyNameMax),
  "description": zod.string().min(1).max(createCommunityBodyDescriptionMax),
  "administratorName": zod.string().min(1).max(createCommunityBodyAdministratorNameMax),
  "coverImageUrl": zod.string().url().nullish(),
  "facebookGroupUrl": zod.string().url().nullish(),
  "announcement": zod.string().nullish(),
  "inviteCode": zod.string().regex(createCommunityBodyInviteCodeRegExp).optional(),
  "appStoreUrl": zod.string().url().default(createCommunityBodyAppStoreUrlDefault),
  "playStoreUrl": zod.string().url().default(createCommunityBodyPlayStoreUrlDefault),
  "active": zod.boolean().default(createCommunityBodyActiveDefault)
})

export const CreateCommunityResponse = zod.object({
  "id": zod.string().uuid(),
  "slug": zod.string(),
  "name": zod.string(),
  "description": zod.string(),
  "administratorName": zod.string(),
  "language": zod.string(),
  "coverImageUrl": zod.string().url().nullish(),
  "facebookGroupUrl": zod.string().url().nullish(),
  "announcement": zod.string().nullish(),
  "inviteCode": zod.string(),
  "appStoreUrl": zod.string().url().optional(),
  "playStoreUrl": zod.string().url().optional(),
  "deepLink": zod.string().optional(),
  "active": zod.boolean(),
  "createdAt": zod.coerce.date(),
  "updatedAt": zod.coerce.date()
})


/**
 * @summary Community-Einladung aktualisieren oder deaktivieren
 */
export const UpdateCommunityParams = zod.object({
  "id": zod.coerce.string().uuid()
})

export const updateCommunityBodySlugMin = 2;
export const updateCommunityBodySlugMax = 80;


export const updateCommunityBodySlugRegExp = new RegExp('^[a-z0-9]+(?:-[a-z0-9]+)*$');
export const updateCommunityBodyNameMax = 120;

export const updateCommunityBodyDescriptionMax = 1000;

export const updateCommunityBodyAdministratorNameMax = 120;

export const updateCommunityBodyInviteCodeRegExp = new RegExp('^[A-HJ-NP-Z2-9]{6,12}$');


export const UpdateCommunityBody = zod.object({
  "slug": zod.string().min(updateCommunityBodySlugMin).max(updateCommunityBodySlugMax).regex(updateCommunityBodySlugRegExp).optional(),
  "name": zod.string().min(1).max(updateCommunityBodyNameMax).optional(),
  "description": zod.string().min(1).max(updateCommunityBodyDescriptionMax).optional(),
  "administratorName": zod.string().min(1).max(updateCommunityBodyAdministratorNameMax).optional(),
  "coverImageUrl": zod.string().url().nullish(),
  "facebookGroupUrl": zod.string().url().nullish(),
  "announcement": zod.string().nullish(),
  "inviteCode": zod.string().regex(updateCommunityBodyInviteCodeRegExp).optional(),
  "appStoreUrl": zod.string().url().optional(),
  "playStoreUrl": zod.string().url().optional(),
  "active": zod.boolean().optional()
})

export const UpdateCommunityResponse = zod.object({
  "id": zod.string().uuid(),
  "slug": zod.string(),
  "name": zod.string(),
  "description": zod.string(),
  "administratorName": zod.string(),
  "language": zod.string(),
  "coverImageUrl": zod.string().url().nullish(),
  "facebookGroupUrl": zod.string().url().nullish(),
  "announcement": zod.string().nullish(),
  "inviteCode": zod.string(),
  "appStoreUrl": zod.string().url().optional(),
  "playStoreUrl": zod.string().url().optional(),
  "deepLink": zod.string().optional(),
  "active": zod.boolean(),
  "createdAt": zod.coerce.date(),
  "updatedAt": zod.coerce.date()
})


