<?php
/**
 * SAGATRAIL PARTNER-PORTAL | WPCode PHP Snippet
 * Typ: PHP Snippet
 * Slugs: portal (DE) · portail (FR) · portal-2 (EN) · portale (IT)
 * Benötigt: partner-portal-handler.php als separates PHP-Snippet (Run Everywhere)
 */

if ( ! is_page( [ 'portal', 'portail', 'portal-2', 'portale' ] ) ) return;

/* ── Sprache aus Slug ── */
$spp_lang = 'de';
if ( is_page( 'portail' )  ) $spp_lang = 'fr';
elseif ( is_page( 'portal-2' ) ) $spp_lang = 'en';
elseif ( is_page( 'portale' )  ) $spp_lang = 'it';

$spp_i18n = [
  'de' => [
    /* Login */
    'login_h2'        => 'Partner-Portal',
    'login_desc'      => 'Geben Sie Ihre E-Mail-Adresse ein. Wenn Sie als Partner registriert sind, erhalten Sie einen Anmeldelink — gültig für 24 Stunden.',
    'login_label'     => 'E-Mail-Adresse',
    'login_ph'        => 'name@betrieb.ch',
    'login_btn'       => 'Link anfordern',
    /* Dashboard */
    'logout_btn'      => 'Abmelden',
    'stat_views'      => '👁 Profil-Aufrufe',
    'stat_taps'       => '🛍 Angebot-Tipps',
    'billing_btn'     => '💳 Abo &amp; Rechnungen verwalten',
    /* Foto */
    'foto_h2'         => 'Titelfoto',
    'foto_desc'       => 'Das Foto erscheint oben auf Ihrer Partnerkachel in der App. Querformat, mind. 800 × 450 px, max. 8 MB (JPEG, PNG, WebP).',
    'foto_choose'     => 'Datei wählen',
    'foto_drag'       => 'oder hierher ziehen',
    'foto_preview'    => 'Vorschau',
    /* Profil */
    'profil_h2'       => 'Profil bearbeiten',
    'beschr_label'    => 'Kurzbeschreibung',
    'beschr_max'      => '(max. 250 Zeichen)',
    'beschr_ph'       => 'Was macht Ihren Betrieb besonders? Spezialitäten, Atmosphäre, Lage …',
    'angebot_label'   => 'SagaTrail-Angebot',
    'angebot_max'     => '(max. 120 Zeichen)',
    'angebot_ph'      => 'z.B. Gratis Kaffee auf Vorzeigen der App',
    'angebot_hint'    => 'wird auch bei der automatischen Wanderer-Ansage verwendet',
    'tel_label'       => 'Telefon',
    'web_label'       => 'Website',
    'reserv_label'    => 'Reservierungs-Link',
    'reserv_opt'      => '(optional)',
    'reserv_ph'       => 'https://www.opentable.com/… oder eigene Buchungsseite',
    'reserv_hint'     => 'Erscheint als prominenter Button auf Ihrer Kachel',
    'save_btn'        => 'Änderungen speichern',
    /* Öffnungszeiten */
    'oz_h2'           => 'Öffnungszeiten',
    'oz_saison_h3'    => 'Saison',
    'oz_von_label'    => 'Geöffnet ab',
    'oz_von_hint'     => 'Leer = ganzjährig',
    'oz_bis_label'    => 'Geschlossen ab',
    'oz_ft_h3'        => 'Feiertage',
    'oz_ft_desc'      => 'Abweichung vom normalen Wochenplan. «Wochenplan» = kein Sonderfall.',
    'oz_save_btn'     => 'Öffnungszeiten speichern',
    /* Verband */
    'vbd_h2'          => 'Verbandsportal',
    'vbd_desc'        => 'Ihr Verbandsportal ist aktiv. Bei Fragen oder Anpassungen melden Sie sich direkt bei uns.',
    'vbd_kantone'     => 'Kantone',
    'vbd_email'       => 'E-Mail',
    'vbd_seit'        => 'Mitglied seit',
    /* Karte */
    'map_h2'          => 'Standort auf der Karte',
    'map_desc'        => 'Setzen Sie Ihren genauen Standort — wichtig für Bergrestaurants und Betriebe ohne präzise Strassenadresse. Der Marker bestimmt, wo Sie auf der Wanderroute erscheinen.',
    'map_gps_btn'     => '📍 Meinen Standort verwenden',
    'map_hint'        => 'Marker verschieben oder oben auf «Meinen Standort verwenden» tippen — dann speichern.',
    'map_save_btn'    => 'Standort speichern',
    /* Footer */
    'footer_q'        => 'Fragen?',
    /* JS-Strings */
    'js_days'         => ['Mo','Di','Mi','Do','Fr','Sa','So'],
    'js_ft_plan'      => 'Wochenplan',
    'js_ft_open'      => 'Geöffnet',
    'js_ft_closed'    => 'Geschlossen',
    'js_gps_na'       => 'GPS nicht verfügbar in diesem Browser.',
    'js_gps_searching'=> 'Standort wird ermittelt…',
    'js_gps_err'      => 'Standort konnte nicht ermittelt werden. Bitte Marker manuell setzen.',
    'js_loc_saved'    => 'Standort gespeichert! Sichtbar in der App nach dem nächsten Routen-Abgleich.',
    'js_loc_nosess'   => 'Sitzung abgelaufen.',
    'js_loc_nopos'    => 'Bitte zuerst Standort setzen.',
    'js_billing_err'  => 'Fehler beim Öffnen des Portals.',
    'js_billing_conn' => 'Verbindungsfehler. Bitte erneut versuchen.',
    'js_login_empty'  => 'Bitte E-Mail-Adresse eingeben.',
    'js_login_noajax' => 'Konfigurationsfehler (kein AJAX-Endpunkt).',
    'js_login_ok'     => 'Falls diese E-Mail registriert ist, erhalten Sie in Kürze einen Anmeldelink. Bitte prüfen Sie Ihren Posteingang.',
    'js_login_err'    => 'Fehler. Bitte versuchen Sie es erneut.',
    'js_conn_err'     => 'Verbindungsfehler.',
    'js_token_err'    => 'Ungültiger oder abgelaufener Link.',
    'js_vbd_type'     => 'Tourismusverband',
    'js_active'       => '✓ Aktiv',
    'js_inactive'     => 'Inaktiv',
    'js_active_app'   => '✓ Aktiv in der App',
    'js_laufzeit'     => 'Laufzeit: ',
    'js_pkt_basic'    => '📦 Basic — Ihr Betrieb erscheint als Kartenmarker. Für Foto, Beschreibung und Angebot auf Standard oder Premium upgraden.',
    'js_pkt_std'      => '⭐ Standard — Ihr Betrieb erscheint mit Foto, Beschreibung und Kontaktdaten.',
    'js_pkt_prem'     => '🏆 Premium — Ihr Betrieb erscheint vollständig mit Foto, Angebot und wird Wanderern automatisch angesagt wenn sie in der Nähe sind.',
    'js_foto_big'     => 'Datei zu gross (max. 8 MB).',
    'js_foto_fmt'     => 'Ungültiges Format. Bitte JPEG, PNG oder WebP verwenden.',
    'js_foto_ok'      => 'Foto erfolgreich hochgeladen!',
    'js_foto_err'     => 'Upload fehlgeschlagen: ',
    'js_foto_unk'     => 'Unbekannter Fehler.',
    'js_foto_conn'    => 'Verbindungsfehler beim Hochladen.',
    'js_foto_read'    => 'Bild konnte nicht gelesen werden.',
    'js_save_ok'      => 'Gespeichert! Änderungen sind sofort in der App sichtbar.',
    'js_save_err'     => 'Speichern fehlgeschlagen.',
    'js_oz_ok'        => 'Öffnungszeiten gespeichert!',
    'js_oz_nosess'    => 'Sitzung abgelaufen.',
    'js_feiertage'    => [
      ['key'=>'neujahr',            'label'=>'Neujahr',              'datum'=>'1. Jan.'],
      ['key'=>'berchtoldstag',      'label'=>'Berchtoldstag',        'datum'=>'2. Jan.'],
      ['key'=>'heiligeDreiKoenige', 'label'=>'Heilige Drei Könige',  'datum'=>'6. Jan.'],
      ['key'=>'josefstag',          'label'=>'Josefstag',            'datum'=>'19. März'],
      ['key'=>'karfreitag',         'label'=>'Karfreitag',           'datum'=>'variabel'],
      ['key'=>'ostermontag',        'label'=>'Ostermontag',          'datum'=>'variabel'],
      ['key'=>'tagDerArbeit',       'label'=>'Tag der Arbeit',       'datum'=>'1. Mai'],
      ['key'=>'auffahrt',           'label'=>'Auffahrt',             'datum'=>'variabel'],
      ['key'=>'pfingstmontag',      'label'=>'Pfingstmontag',        'datum'=>'variabel'],
      ['key'=>'fronleichnam',       'label'=>'Fronleichnam',         'datum'=>'variabel'],
      ['key'=>'nationalfeiertag',   'label'=>'Nationalfeiertag',     'datum'=>'1. Aug.'],
      ['key'=>'mariaHimmelfahrt',   'label'=>'Maria Himmelfahrt',    'datum'=>'15. Aug.'],
      ['key'=>'bettag',             'label'=>'Eidg. Bettag',         'datum'=>'3. So. Sept.'],
      ['key'=>'allerheiligen',      'label'=>'Allerheiligen',        'datum'=>'1. Nov.'],
      ['key'=>'mariaEmpfaengnis',   'label'=>'Maria Empfängnis',     'datum'=>'8. Dez.'],
      ['key'=>'heiligabend',        'label'=>'Heiligabend',          'datum'=>'24. Dez.'],
      ['key'=>'weihnachten',        'label'=>'Weihnachten',          'datum'=>'25. Dez.'],
      ['key'=>'stephanstag',        'label'=>'Stephanstag',          'datum'=>'26. Dez.'],
      ['key'=>'silvester',          'label'=>'Silvester',            'datum'=>'31. Dez.'],
    ],
  ],
  'fr' => [
    'login_h2'        => 'Portail partenaire',
    'login_desc'      => 'Saisissez votre adresse e-mail. Si vous êtes enregistré comme partenaire, vous recevrez un lien de connexion valable 24 heures.',
    'login_label'     => 'Adresse e-mail',
    'login_ph'        => 'nom@etablissement.ch',
    'login_btn'       => 'Recevoir le lien',
    'logout_btn'      => 'Se déconnecter',
    'stat_views'      => '👁 Vues du profil',
    'stat_taps'       => '🛍 Clics sur l\'offre',
    'billing_btn'     => '💳 Gérer l\'abonnement &amp; factures',
    'foto_h2'         => 'Photo principale',
    'foto_desc'       => 'La photo apparaît en haut de votre fiche partenaire dans l\'app. Format paysage, min. 800 × 450 px, max. 8 Mo (JPEG, PNG, WebP).',
    'foto_choose'     => 'Choisir un fichier',
    'foto_drag'       => 'ou glisser ici',
    'foto_preview'    => 'Aperçu',
    'profil_h2'       => 'Modifier le profil',
    'beschr_label'    => 'Description courte',
    'beschr_max'      => '(max. 250 caractères)',
    'beschr_ph'       => 'Qu\'est-ce qui rend votre établissement unique ? Spécialités, ambiance, situation …',
    'angebot_label'   => 'Offre SagaTrail',
    'angebot_max'     => '(max. 120 caractères)',
    'angebot_ph'      => 'p.ex. Café offert sur présentation de l\'app',
    'angebot_hint'    => 'utilisé aussi lors de l\'annonce automatique aux randonneurs',
    'tel_label'       => 'Téléphone',
    'web_label'       => 'Site web',
    'reserv_label'    => 'Lien de réservation',
    'reserv_opt'      => '(optionnel)',
    'reserv_ph'       => 'https://www.opentable.com/… ou votre page de réservation',
    'reserv_hint'     => 'Apparaît comme bouton prominent sur votre fiche',
    'save_btn'        => 'Enregistrer les modifications',
    'oz_h2'           => 'Horaires d\'ouverture',
    'oz_saison_h3'    => 'Saison',
    'oz_von_label'    => 'Ouvert dès le',
    'oz_von_hint'     => 'Vide = toute l\'année',
    'oz_bis_label'    => 'Fermé dès le',
    'oz_ft_h3'        => 'Jours fériés',
    'oz_ft_desc'      => 'Dérogation au plan hebdomadaire normal. «Plan hebdomadaire» = pas de cas particulier.',
    'oz_save_btn'     => 'Enregistrer les horaires',
    'vbd_h2'          => 'Portail association',
    'vbd_desc'        => 'Votre portail d\'association est actif. Pour toute question ou adaptation, contactez-nous directement.',
    'vbd_kantone'     => 'Cantons',
    'vbd_email'       => 'E-mail',
    'vbd_seit'        => 'Membre depuis',
    'map_h2'          => 'Emplacement sur la carte',
    'map_desc'        => 'Indiquez votre emplacement exact — important pour les restaurants de montagne et établissements sans adresse précise. Le marqueur détermine où vous apparaissez sur l\'itinéraire.',
    'map_gps_btn'     => '📍 Utiliser ma position',
    'map_hint'        => 'Déplacez le marqueur ou utilisez «Ma position» ci-dessus — puis enregistrez.',
    'map_save_btn'    => 'Enregistrer l\'emplacement',
    'footer_q'        => 'Des questions ?',
    'js_days'         => ['Lu','Ma','Me','Je','Ve','Sa','Di'],
    'js_ft_plan'      => 'Plan hebdomadaire',
    'js_ft_open'      => 'Ouvert',
    'js_ft_closed'    => 'Fermé',
    'js_gps_na'       => 'GPS non disponible dans ce navigateur.',
    'js_gps_searching'=> 'Localisation en cours…',
    'js_gps_err'      => 'Impossible de déterminer la position. Veuillez placer le marqueur manuellement.',
    'js_loc_saved'    => 'Emplacement enregistré ! Visible dans l\'app après la prochaine synchronisation.',
    'js_loc_nosess'   => 'Session expirée.',
    'js_loc_nopos'    => 'Veuillez d\'abord définir un emplacement.',
    'js_billing_err'  => 'Erreur lors de l\'ouverture du portail.',
    'js_billing_conn' => 'Erreur de connexion. Veuillez réessayer.',
    'js_login_empty'  => 'Veuillez saisir votre adresse e-mail.',
    'js_login_noajax' => 'Erreur de configuration (pas d\'endpoint AJAX).',
    'js_login_ok'     => 'Si cette adresse e-mail est enregistrée, vous recevrez bientôt un lien de connexion. Veuillez vérifier votre boîte de réception.',
    'js_login_err'    => 'Erreur. Veuillez réessayer.',
    'js_conn_err'     => 'Erreur de connexion.',
    'js_token_err'    => 'Lien invalide ou expiré.',
    'js_vbd_type'     => 'Association touristique',
    'js_active'       => '✓ Actif',
    'js_inactive'     => 'Inactif',
    'js_active_app'   => '✓ Actif dans l\'app',
    'js_laufzeit'     => 'Durée : ',
    'js_pkt_basic'    => '📦 Basic — Votre établissement apparaît comme marqueur sur la carte. Pour ajouter photo, description et offre, passez à Standard ou Premium.',
    'js_pkt_std'      => '⭐ Standard — Votre établissement apparaît avec photo, description et coordonnées.',
    'js_pkt_prem'     => '🏆 Premium — Votre établissement apparaît avec photo, offre et est annoncé automatiquement aux randonneurs à proximité.',
    'js_foto_big'     => 'Fichier trop grand (max. 8 Mo).',
    'js_foto_fmt'     => 'Format non valide. Veuillez utiliser JPEG, PNG ou WebP.',
    'js_foto_ok'      => 'Photo téléversée avec succès !',
    'js_foto_err'     => 'Échec du téléversement : ',
    'js_foto_unk'     => 'Erreur inconnue.',
    'js_foto_conn'    => 'Erreur de connexion lors du téléversement.',
    'js_foto_read'    => 'Impossible de lire l\'image.',
    'js_save_ok'      => 'Enregistré ! Les modifications sont immédiatement visibles dans l\'app.',
    'js_save_err'     => 'Échec de l\'enregistrement.',
    'js_oz_ok'        => 'Horaires enregistrés !',
    'js_oz_nosess'    => 'Session expirée.',
    'js_feiertage'    => [
      ['key'=>'neujahr',            'label'=>'Nouvel An',              'datum'=>'1 jan.'],
      ['key'=>'berchtoldstag',      'label'=>'St-Berthold',            'datum'=>'2 jan.'],
      ['key'=>'heiligeDreiKoenige', 'label'=>'Épiphanie',             'datum'=>'6 jan.'],
      ['key'=>'josefstag',          'label'=>'St-Joseph',              'datum'=>'19 mars'],
      ['key'=>'karfreitag',         'label'=>'Vendredi Saint',         'datum'=>'variable'],
      ['key'=>'ostermontag',        'label'=>'Lundi de Pâques',        'datum'=>'variable'],
      ['key'=>'tagDerArbeit',       'label'=>'Fête du Travail',        'datum'=>'1 mai'],
      ['key'=>'auffahrt',           'label'=>'Ascension',              'datum'=>'variable'],
      ['key'=>'pfingstmontag',      'label'=>'Lundi de Pentecôte',     'datum'=>'variable'],
      ['key'=>'fronleichnam',       'label'=>'Fête-Dieu',              'datum'=>'variable'],
      ['key'=>'nationalfeiertag',   'label'=>'Fête Nationale',         'datum'=>'1 août'],
      ['key'=>'mariaHimmelfahrt',   'label'=>'Assomption',             'datum'=>'15 août'],
      ['key'=>'bettag',             'label'=>'Jeûne fédéral',          'datum'=>'3e di. sept.'],
      ['key'=>'allerheiligen',      'label'=>'Toussaint',              'datum'=>'1 nov.'],
      ['key'=>'mariaEmpfaengnis',   'label'=>'Immaculée Conception',   'datum'=>'8 déc.'],
      ['key'=>'heiligabend',        'label'=>'Veille de Noël',         'datum'=>'24 déc.'],
      ['key'=>'weihnachten',        'label'=>'Noël',                   'datum'=>'25 déc.'],
      ['key'=>'stephanstag',        'label'=>'St-Étienne',             'datum'=>'26 déc.'],
      ['key'=>'silvester',          'label'=>'Saint-Sylvestre',        'datum'=>'31 déc.'],
    ],
  ],
  'en' => [
    'login_h2'        => 'Partner Portal',
    'login_desc'      => 'Enter your email address. If you are registered as a partner, you will receive a login link valid for 24 hours.',
    'login_label'     => 'Email address',
    'login_ph'        => 'name@business.ch',
    'login_btn'       => 'Request link',
    'logout_btn'      => 'Sign out',
    'stat_views'      => '👁 Profile views',
    'stat_taps'       => '🛍 Offer taps',
    'billing_btn'     => '💳 Manage subscription &amp; invoices',
    'foto_h2'         => 'Cover photo',
    'foto_desc'       => 'The photo appears at the top of your partner tile in the app. Landscape format, min. 800 × 450 px, max. 8 MB (JPEG, PNG, WebP).',
    'foto_choose'     => 'Choose file',
    'foto_drag'       => 'or drag here',
    'foto_preview'    => 'Preview',
    'profil_h2'       => 'Edit profile',
    'beschr_label'    => 'Short description',
    'beschr_max'      => '(max. 250 characters)',
    'beschr_ph'       => 'What makes your establishment special? Specialities, atmosphere, location …',
    'angebot_label'   => 'SagaTrail offer',
    'angebot_max'     => '(max. 120 characters)',
    'angebot_ph'      => 'e.g. Free coffee when showing the app',
    'angebot_hint'    => 'also used in the automatic hiker announcement',
    'tel_label'       => 'Phone',
    'web_label'       => 'Website',
    'reserv_label'    => 'Reservation link',
    'reserv_opt'      => '(optional)',
    'reserv_ph'       => 'https://www.opentable.com/… or your own booking page',
    'reserv_hint'     => 'Appears as a prominent button on your tile',
    'save_btn'        => 'Save changes',
    'oz_h2'           => 'Opening hours',
    'oz_saison_h3'    => 'Season',
    'oz_von_label'    => 'Open from',
    'oz_von_hint'     => 'Empty = year-round',
    'oz_bis_label'    => 'Closed from',
    'oz_ft_h3'        => 'Public holidays',
    'oz_ft_desc'      => 'Exception to the normal weekly schedule. «Weekly schedule» = no special case.',
    'oz_save_btn'     => 'Save opening hours',
    'vbd_h2'          => 'Association portal',
    'vbd_desc'        => 'Your association portal is active. For questions or changes, please contact us directly.',
    'vbd_kantone'     => 'Cantons',
    'vbd_email'       => 'Email',
    'vbd_seit'        => 'Member since',
    'map_h2'          => 'Location on map',
    'map_desc'        => 'Set your exact location — important for mountain restaurants and businesses without a precise street address. The marker determines where you appear on the hiking route.',
    'map_gps_btn'     => '📍 Use my location',
    'map_hint'        => 'Drag the marker or tap «Use my location» above — then save.',
    'map_save_btn'    => 'Save location',
    'footer_q'        => 'Questions?',
    'js_days'         => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    'js_ft_plan'      => 'Weekly schedule',
    'js_ft_open'      => 'Open',
    'js_ft_closed'    => 'Closed',
    'js_gps_na'       => 'GPS not available in this browser.',
    'js_gps_searching'=> 'Locating…',
    'js_gps_err'      => 'Could not determine location. Please set the marker manually.',
    'js_loc_saved'    => 'Location saved! Visible in the app after the next route sync.',
    'js_loc_nosess'   => 'Session expired.',
    'js_loc_nopos'    => 'Please set a location first.',
    'js_billing_err'  => 'Error opening the portal.',
    'js_billing_conn' => 'Connection error. Please try again.',
    'js_login_empty'  => 'Please enter your email address.',
    'js_login_noajax' => 'Configuration error (no AJAX endpoint).',
    'js_login_ok'     => 'If this email is registered, you will receive a login link shortly. Please check your inbox.',
    'js_login_err'    => 'Error. Please try again.',
    'js_conn_err'     => 'Connection error.',
    'js_token_err'    => 'Invalid or expired link.',
    'js_vbd_type'     => 'Tourism association',
    'js_active'       => '✓ Active',
    'js_inactive'     => 'Inactive',
    'js_active_app'   => '✓ Active in app',
    'js_laufzeit'     => 'Duration: ',
    'js_pkt_basic'    => '📦 Basic — Your business appears as a map marker. For photo, description and offer, upgrade to Standard or Premium.',
    'js_pkt_std'      => '⭐ Standard — Your business appears with photo, description and contact details.',
    'js_pkt_prem'     => '🏆 Premium — Your business appears fully with photo, offer and is automatically announced to nearby hikers.',
    'js_foto_big'     => 'File too large (max. 8 MB).',
    'js_foto_fmt'     => 'Invalid format. Please use JPEG, PNG or WebP.',
    'js_foto_ok'      => 'Photo uploaded successfully!',
    'js_foto_err'     => 'Upload failed: ',
    'js_foto_unk'     => 'Unknown error.',
    'js_foto_conn'    => 'Connection error during upload.',
    'js_foto_read'    => 'Could not read the image.',
    'js_save_ok'      => 'Saved! Changes are immediately visible in the app.',
    'js_save_err'     => 'Save failed.',
    'js_oz_ok'        => 'Opening hours saved!',
    'js_oz_nosess'    => 'Session expired.',
    'js_feiertage'    => [
      ['key'=>'neujahr',            'label'=>'New Year\'s Day',       'datum'=>'Jan. 1'],
      ['key'=>'berchtoldstag',      'label'=>'Berchtold\'s Day',      'datum'=>'Jan. 2'],
      ['key'=>'heiligeDreiKoenige', 'label'=>'Epiphany',              'datum'=>'Jan. 6'],
      ['key'=>'josefstag',          'label'=>'St Joseph\'s Day',      'datum'=>'Mar. 19'],
      ['key'=>'karfreitag',         'label'=>'Good Friday',           'datum'=>'variable'],
      ['key'=>'ostermontag',        'label'=>'Easter Monday',         'datum'=>'variable'],
      ['key'=>'tagDerArbeit',       'label'=>'Labour Day',            'datum'=>'May 1'],
      ['key'=>'auffahrt',           'label'=>'Ascension Day',         'datum'=>'variable'],
      ['key'=>'pfingstmontag',      'label'=>'Whit Monday',           'datum'=>'variable'],
      ['key'=>'fronleichnam',       'label'=>'Corpus Christi',        'datum'=>'variable'],
      ['key'=>'nationalfeiertag',   'label'=>'National Day',          'datum'=>'Aug. 1'],
      ['key'=>'mariaHimmelfahrt',   'label'=>'Assumption',            'datum'=>'Aug. 15'],
      ['key'=>'bettag',             'label'=>'Federal Fast',          'datum'=>'3rd Sun. Sept.'],
      ['key'=>'allerheiligen',      'label'=>'All Saints\' Day',      'datum'=>'Nov. 1'],
      ['key'=>'mariaEmpfaengnis',   'label'=>'Immaculate Conception', 'datum'=>'Dec. 8'],
      ['key'=>'heiligabend',        'label'=>'Christmas Eve',         'datum'=>'Dec. 24'],
      ['key'=>'weihnachten',        'label'=>'Christmas Day',         'datum'=>'Dec. 25'],
      ['key'=>'stephanstag',        'label'=>'St Stephen\'s Day',     'datum'=>'Dec. 26'],
      ['key'=>'silvester',          'label'=>'New Year\'s Eve',       'datum'=>'Dec. 31'],
    ],
  ],
  'it' => [
    'login_h2'        => 'Portale partner',
    'login_desc'      => 'Inserisci il tuo indirizzo e-mail. Se sei registrato come partner, riceverai un link di accesso valido per 24 ore.',
    'login_label'     => 'Indirizzo e-mail',
    'login_ph'        => 'nome@azienda.ch',
    'login_btn'       => 'Ricevi il link',
    'logout_btn'      => 'Disconnettersi',
    'stat_views'      => '👁 Visualizzazioni profilo',
    'stat_taps'       => '🛍 Clic sull\'offerta',
    'billing_btn'     => '💳 Gestisci abbonamento &amp; fatture',
    'foto_h2'         => 'Foto principale',
    'foto_desc'       => 'La foto appare in cima alla tua scheda partner nell\'app. Formato orizzontale, min. 800 × 450 px, max. 8 MB (JPEG, PNG, WebP).',
    'foto_choose'     => 'Scegli file',
    'foto_drag'       => 'o trascina qui',
    'foto_preview'    => 'Anteprima',
    'profil_h2'       => 'Modifica profilo',
    'beschr_label'    => 'Breve descrizione',
    'beschr_max'      => '(max. 250 caratteri)',
    'beschr_ph'       => 'Cosa rende speciale la tua attività? Specialità, atmosfera, posizione …',
    'angebot_label'   => 'Offerta SagaTrail',
    'angebot_max'     => '(max. 120 caratteri)',
    'angebot_ph'      => 'p.es. Caffè gratuito mostrando l\'app',
    'angebot_hint'    => 'usato anche nell\'annuncio automatico agli escursionisti',
    'tel_label'       => 'Telefono',
    'web_label'       => 'Sito web',
    'reserv_label'    => 'Link di prenotazione',
    'reserv_opt'      => '(facoltativo)',
    'reserv_ph'       => 'https://www.opentable.com/… o la tua pagina di prenotazione',
    'reserv_hint'     => 'Appare come pulsante in evidenza sulla tua scheda',
    'save_btn'        => 'Salva modifiche',
    'oz_h2'           => 'Orari di apertura',
    'oz_saison_h3'    => 'Stagione',
    'oz_von_label'    => 'Aperto dal',
    'oz_von_hint'     => 'Vuoto = tutto l\'anno',
    'oz_bis_label'    => 'Chiuso dal',
    'oz_ft_h3'        => 'Giorni festivi',
    'oz_ft_desc'      => 'Eccezione al normale piano settimanale. «Piano settimanale» = nessun caso speciale.',
    'oz_save_btn'     => 'Salva orari',
    'vbd_h2'          => 'Portale associazione',
    'vbd_desc'        => 'Il tuo portale dell\'associazione è attivo. Per domande o modifiche, contattaci direttamente.',
    'vbd_kantone'     => 'Cantoni',
    'vbd_email'       => 'E-mail',
    'vbd_seit'        => 'Membro dal',
    'map_h2'          => 'Posizione sulla mappa',
    'map_desc'        => 'Imposta la tua posizione esatta — importante per i ristoranti di montagna e le attività senza un indirizzo preciso. Il marcatore determina dove appari sul percorso.',
    'map_gps_btn'     => '📍 Usa la mia posizione',
    'map_hint'        => 'Sposta il marcatore o tocca «Usa la mia posizione» sopra — poi salva.',
    'map_save_btn'    => 'Salva posizione',
    'footer_q'        => 'Domande?',
    'js_days'         => ['Lu','Ma','Me','Gi','Ve','Sa','Do'],
    'js_ft_plan'      => 'Piano settimanale',
    'js_ft_open'      => 'Aperto',
    'js_ft_closed'    => 'Chiuso',
    'js_gps_na'       => 'GPS non disponibile in questo browser.',
    'js_gps_searching'=> 'Localizzazione in corso…',
    'js_gps_err'      => 'Impossibile determinare la posizione. Posiziona il marcatore manualmente.',
    'js_loc_saved'    => 'Posizione salvata! Visibile nell\'app dopo la prossima sincronizzazione.',
    'js_loc_nosess'   => 'Sessione scaduta.',
    'js_loc_nopos'    => 'Imposta prima una posizione.',
    'js_billing_err'  => 'Errore nell\'apertura del portale.',
    'js_billing_conn' => 'Errore di connessione. Riprova.',
    'js_login_empty'  => 'Inserisci il tuo indirizzo e-mail.',
    'js_login_noajax' => 'Errore di configurazione (nessun endpoint AJAX).',
    'js_login_ok'     => 'Se questa e-mail è registrata, riceverai presto un link di accesso. Controlla la tua casella di posta.',
    'js_login_err'    => 'Errore. Riprova.',
    'js_conn_err'     => 'Errore di connessione.',
    'js_token_err'    => 'Link non valido o scaduto.',
    'js_vbd_type'     => 'Associazione turistica',
    'js_active'       => '✓ Attivo',
    'js_inactive'     => 'Inattivo',
    'js_active_app'   => '✓ Attivo nell\'app',
    'js_laufzeit'     => 'Durata: ',
    'js_pkt_basic'    => '📦 Basic — La tua attività appare come marcatore sulla mappa. Per foto, descrizione e offerta, passa a Standard o Premium.',
    'js_pkt_std'      => '⭐ Standard — La tua attività appare con foto, descrizione e dati di contatto.',
    'js_pkt_prem'     => '🏆 Premium — La tua attività appare con foto, offerta e viene annunciata automaticamente agli escursionisti nelle vicinanze.',
    'js_foto_big'     => 'File troppo grande (max. 8 MB).',
    'js_foto_fmt'     => 'Formato non valido. Usa JPEG, PNG o WebP.',
    'js_foto_ok'      => 'Foto caricata con successo!',
    'js_foto_err'     => 'Caricamento fallito: ',
    'js_foto_unk'     => 'Errore sconosciuto.',
    'js_foto_conn'    => 'Errore di connessione durante il caricamento.',
    'js_foto_read'    => 'Impossibile leggere l\'immagine.',
    'js_save_ok'      => 'Salvato! Le modifiche sono immediatamente visibili nell\'app.',
    'js_save_err'     => 'Salvataggio fallito.',
    'js_oz_ok'        => 'Orari salvati!',
    'js_oz_nosess'    => 'Sessione scaduta.',
    'js_feiertage'    => [
      ['key'=>'neujahr',            'label'=>'Capodanno',              'datum'=>'1 gen.'],
      ['key'=>'berchtoldstag',      'label'=>'Giorno di Berchtold',    'datum'=>'2 gen.'],
      ['key'=>'heiligeDreiKoenige', 'label'=>'Epifania',               'datum'=>'6 gen.'],
      ['key'=>'josefstag',          'label'=>'San Giuseppe',           'datum'=>'19 mar.'],
      ['key'=>'karfreitag',         'label'=>'Venerdì Santo',          'datum'=>'variabile'],
      ['key'=>'ostermontag',        'label'=>'Lunedì di Pasqua',       'datum'=>'variabile'],
      ['key'=>'tagDerArbeit',       'label'=>'Festa del Lavoro',       'datum'=>'1 mag.'],
      ['key'=>'auffahrt',           'label'=>'Ascensione',             'datum'=>'variabile'],
      ['key'=>'pfingstmontag',      'label'=>'Lunedì di Pentecoste',   'datum'=>'variabile'],
      ['key'=>'fronleichnam',       'label'=>'Corpus Domini',          'datum'=>'variabile'],
      ['key'=>'nationalfeiertag',   'label'=>'Festa Nazionale',        'datum'=>'1 ago.'],
      ['key'=>'mariaHimmelfahrt',   'label'=>'Assunzione',             'datum'=>'15 ago.'],
      ['key'=>'bettag',             'label'=>'Digiuno federale',       'datum'=>'3ª dom. sett.'],
      ['key'=>'allerheiligen',      'label'=>'Ognissanti',             'datum'=>'1 nov.'],
      ['key'=>'mariaEmpfaengnis',   'label'=>'Immacolata Concezione',  'datum'=>'8 dic.'],
      ['key'=>'heiligabend',        'label'=>'Vigilia di Natale',      'datum'=>'24 dic.'],
      ['key'=>'weihnachten',        'label'=>'Natale',                 'datum'=>'25 dic.'],
      ['key'=>'stephanstag',        'label'=>'Santo Stefano',          'datum'=>'26 dic.'],
      ['key'=>'silvester',          'label'=>'San Silvestro',          'datum'=>'31 dic.'],
    ],
  ],
];

$t = $spp_i18n[ $spp_lang ];

/* Wochentage als JSON für JS */
$spp_days_js = wp_json_encode( array_map( function( $label, $idx ) {
  static $keys = ['montag','dienstag','mittwoch','donnerstag','freitag','samstag','sonntag'];
  return [ 'key' => $keys[ $idx ], 'label' => $label ];
}, $t['js_days'], array_keys( $t['js_days'] ) ), JSON_UNESCAPED_UNICODE );

/* Feiertage als JSON für JS */
$spp_ft_js = wp_json_encode( $t['js_feiertage'], JSON_UNESCAPED_UNICODE );

/* JS-L10N Objekt (alles ohne js_days/js_feiertage, die werden separat übergeben) */
$spp_l10n = [];
foreach ( $t as $k => $v ) {
  if ( strpos( $k, 'js_' ) === 0 && $k !== 'js_days' && $k !== 'js_feiertage' ) {
    $spp_l10n[ $k ] = $v;
  }
}
$spp_l10n_js = wp_json_encode( $spp_l10n, JSON_UNESCAPED_UNICODE );
?>
<style>
*{box-sizing:border-box}
.spp-wrap{max-width:680px;margin:0 auto;padding:24px 16px 60px;font-family:-apple-system,system-ui,sans-serif;color:#1a1a1a}
.spp-logo{font-size:22px;font-weight:800;color:#CC0000 !important;margin-bottom:24px;letter-spacing:.3px}
.spp-card{background:#fff;border:1.5px solid #e5e5e5;border-radius:14px;padding:28px 24px;margin-bottom:20px}
.spp-card h2{font-size:16px;margin:0 0 18px;color:#1a1a1a}
.spp-card h3{font-size:13px;font-weight:700;color:#555 !important;margin:20px 0 12px;text-transform:uppercase;letter-spacing:.5px}
.spp-field{margin-bottom:14px}
.spp-field label{display:block;font-size:12px;font-weight:600;color:#555 !important;margin-bottom:4px}
.spp-field input,.spp-field textarea,.spp-field select{width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;background:#fff;color:#1a1a1a}
.spp-field input:focus,.spp-field textarea:focus,.spp-field select:focus{border-color:#CC0000}
.spp-field textarea{min-height:75px;resize:vertical}
.spp-field .hint{font-size:11px;color:#aaa !important;margin-top:3px}
.spp-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.spp-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:#CC0000;color:#fff !important;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s;text-decoration:none}
.spp-btn:hover{background:#a80000}
.spp-btn:disabled{opacity:.6;cursor:not-allowed}
.spp-btn-sec{background:#f5f5f5;color:#333 !important}
.spp-btn-sec:hover{background:#e8e8e8}
.spp-msg{display:none;padding:10px 14px;border-radius:8px;font-size:13px;margin-top:10px}
.spp-msg.ok{background:#f0faf0;border:1px solid #98d898;color:#2d6b2d !important;display:block}
.spp-msg.err{background:#fff4f4;border:1px solid #f0a0a0;color:#8b0000 !important;display:block}
.spp-stat-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.spp-stat{background:#f7f6f4;border-radius:10px;padding:16px;text-align:center}
.spp-stat .num{font-size:28px;font-weight:700;color:#CC0000 !important;line-height:1}
.spp-stat .lbl{font-size:12px;color:#777 !important;margin-top:4px}
.spp-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600}
.spp-badge-green{background:#e6f4ec;color:#2e7d52}
.spp-badge-gray{background:#f0eeeb;color:#666}
.spp-badge-red{background:#fff0f0;color:#CC0000}
.spp-laufzeit{font-size:12px;color:#777 !important;margin-top:6px}
.spp-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:none}
.spp-btn.loading .spp-spinner{display:block}
@keyframes spin{to{transform:rotate(360deg)}}
.spp-upload-area{border:2px dashed #ddd;border-radius:10px;padding:28px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;position:relative}
.spp-upload-area:hover,.spp-upload-area.drag{border-color:#CC0000;background:#fff8f8}
.spp-upload-area input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.spp-upload-icon{font-size:32px;margin-bottom:8px}
.spp-upload-txt{font-size:13px;color:#777 !important}
.spp-upload-txt strong{color:#CC0000 !important}
.spp-foto-preview{width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-top:12px;display:none}
.spp-upload-progress{margin-top:10px;display:none}
.spp-upload-progress-bar{height:4px;background:#e5e5e5;border-radius:2px;overflow:hidden}
.spp-upload-progress-fill{height:100%;background:#CC0000;border-radius:2px;transition:width .3s}
.spp-oz-grid{display:grid;gap:6px}
.spp-oz-row{display:grid;grid-template-columns:90px 36px 1fr;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f0f0f0}
.spp-oz-row:last-child{border-bottom:none}
.spp-oz-day{font-size:13px;font-weight:600;color:#333 !important}
.spp-oz-toggle{position:relative;width:34px;height:20px;flex-shrink:0}
.spp-oz-toggle input{opacity:0;width:0;height:0;position:absolute}
.spp-oz-slider{position:absolute;inset:0;background:#ddd;border-radius:20px;cursor:pointer;transition:.2s}
.spp-oz-slider:before{content:'';position:absolute;width:14px;height:14px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s}
.spp-oz-toggle input:checked+.spp-oz-slider{background:#CC0000}
.spp-oz-toggle input:checked+.spp-oz-slider:before{transform:translateX(14px)}
.spp-oz-times{display:flex;align-items:center;gap:6px;font-size:13px}
.spp-oz-times input[type=time]{width:88px;padding:4px 8px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;font-family:inherit}
.spp-oz-times.hidden{visibility:hidden}
.spp-oz-sep{color:#aaa;font-size:12px}
.spp-paket-info{background:#f9f7ff;border:1px solid #e0d8f8;border-radius:8px;padding:10px 14px;font-size:13px;color:#5a3fa8 !important;margin-bottom:16px}
.spp-ft-grid{display:grid;gap:4px;margin-top:6px}
.spp-ft-row{display:grid;grid-template-columns:1fr 140px;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid #f5f5f5}
.spp-ft-row:last-child{border-bottom:none}
.spp-ft-label{font-size:12.5px;color:#444 !important}
.spp-ft-date{font-size:11px;color:#aaa !important}
.spp-ft-select{padding:4px 8px;border:1.5px solid #ddd;border-radius:6px;font-size:12px;font-family:inherit;background:#fff;color:#333;cursor:pointer}
.spp-ft-select:focus{border-color:#CC0000;outline:none}
</style>

<div class="spp-wrap">
  <div class="spp-logo">SagaTrail</div>

  <!-- LOGIN -->
  <div id="spp-login" class="spp-card">
    <h2><?php echo esc_html( $t['login_h2'] ); ?></h2>
    <p style="font-size:13px;color:#555;margin-bottom:18px">
      <?php echo esc_html( $t['login_desc'] ); ?>
    </p>
    <div class="spp-field">
      <label for="spp-email"><?php echo esc_html( $t['login_label'] ); ?></label>
      <input type="email" id="spp-email" placeholder="<?php echo esc_attr( $t['login_ph'] ); ?>" autocomplete="email" />
    </div>
    <button class="spp-btn" id="spp-login-btn" onclick="sppRequestLink()">
      <span class="spp-spinner"></span>
      <span class="spp-btn-txt"><?php echo esc_html( $t['login_btn'] ); ?></span>
    </button>
    <div id="spp-login-msg" class="spp-msg"></div>
  </div>

  <!-- DASHBOARD -->
  <div id="spp-dashboard" style="display:none">

    <!-- Übersicht -->
    <div class="spp-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        <div>
          <h2 style="margin:0" id="spp-name">–</h2>
          <div style="margin-top:4px" id="spp-meta"></div>
          <div class="spp-laufzeit" id="spp-laufzeit"></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span id="spp-status-badge"></span>
          <button onclick="sppLogout()" style="background:none;border:1px solid #ccc;border-radius:6px;padding:5px 12px;font-size:12px;color:#666;cursor:pointer;line-height:1.4" onmouseover="this.style.borderColor='#CC0000';this.style.color='#CC0000'" onmouseout="this.style.borderColor='#ccc';this.style.color='#666'"><?php echo esc_html( $t['logout_btn'] ); ?></button>
        </div>
      </div>
      <div class="spp-stat-row">
        <div class="spp-stat"><div class="num" id="spp-views">–</div><div class="lbl"><?php echo esc_html( $t['stat_views'] ); ?></div></div>
        <div class="spp-stat"><div class="num" id="spp-taps">–</div><div class="lbl"><?php echo esc_html( $t['stat_taps'] ); ?></div></div>
      </div>
      <div id="spp-paket-info" class="spp-paket-info" style="display:none"></div>

      <!-- Abo verwalten -->
      <div id="spp-billing-wrap" style="display:none;margin-top:14px;padding-top:14px;border-top:1px solid #eee">
        <button onclick="sppOpenBillingPortal()" id="spp-billing-btn"
          style="background:none;border:1.5px solid #5a3fa8;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;color:#5a3fa8;cursor:pointer;display:inline-flex;align-items:center;gap:7px;line-height:1.4"
          onmouseover="this.style.background='#f3f0ff'" onmouseout="this.style.background='none'">
          <span id="spp-billing-spinner" class="spp-spinner" style="display:none"></span>
          <?php echo $t['billing_btn']; ?>
        </button>
        <div id="spp-billing-msg" style="font-size:12px;color:#CC0000;margin-top:6px;display:none"></div>
      </div>
    </div>

    <!-- Foto -->
    <div class="spp-card" id="spp-foto-card" style="display:none">
      <h2><?php echo esc_html( $t['foto_h2'] ); ?></h2>
      <p style="font-size:13px;color:#555;margin-bottom:14px">
        <?php echo esc_html( $t['foto_desc'] ); ?>
      </p>
      <div class="spp-upload-area" id="spp-dropzone">
        <input type="file" id="spp-foto-input" accept="image/jpeg,image/png,image/webp" onchange="sppHandleFile(this.files[0])" />
        <div class="spp-upload-icon">🖼️</div>
        <div class="spp-upload-txt">
          <strong><?php echo esc_html( $t['foto_choose'] ); ?></strong> <?php echo esc_html( $t['foto_drag'] ); ?><br>
          <span style="font-size:11px">JPEG · PNG · WebP · max. 8 MB</span>
        </div>
      </div>
      <img id="spp-foto-preview" class="spp-foto-preview" alt="<?php echo esc_attr( $t['foto_preview'] ); ?>" />
      <div class="spp-upload-progress" id="spp-upload-progress">
        <div class="spp-upload-progress-bar"><div class="spp-upload-progress-fill" id="spp-upload-fill" style="width:0%"></div></div>
      </div>
      <div id="spp-foto-msg" class="spp-msg"></div>
    </div>

    <!-- Profil -->
    <div class="spp-card">
      <h2><?php echo esc_html( $t['profil_h2'] ); ?></h2>

      <div class="spp-field" id="spp-beschr-wrap" style="display:none">
        <label><?php echo esc_html( $t['beschr_label'] ); ?> <span style="color:#aaa;font-weight:400"><?php echo esc_html( $t['beschr_max'] ); ?></span></label>
        <textarea id="spp-beschr" maxlength="250" placeholder="<?php echo esc_attr( $t['beschr_ph'] ); ?>"></textarea>
        <div class="hint"><span id="spp-beschr-count">0</span>/250</div>
      </div>

      <div class="spp-field" id="spp-angebot-wrap" style="display:none">
        <label><?php echo esc_html( $t['angebot_label'] ); ?> <span style="color:#aaa;font-weight:400"><?php echo esc_html( $t['angebot_max'] ); ?></span></label>
        <input type="text" id="spp-angebot" maxlength="120" placeholder="<?php echo esc_attr( $t['angebot_ph'] ); ?>" />
        <div class="hint"><span id="spp-angebot-count">0</span>/120 — <?php echo esc_html( $t['angebot_hint'] ); ?></div>
      </div>

      <div id="spp-kontakt-wrap" style="display:none">
        <div class="spp-row">
          <div class="spp-field">
            <label><?php echo esc_html( $t['tel_label'] ); ?></label>
            <input type="tel" id="spp-telefon" placeholder="+41 44 123 45 67" />
          </div>
          <div class="spp-field">
            <label><?php echo esc_html( $t['web_label'] ); ?></label>
            <input type="url" id="spp-website" placeholder="https://www.meinbetrieb.ch" />
          </div>
        </div>
      </div>

      <div class="spp-field" id="spp-reserv-wrap" style="display:none">
        <label><?php echo esc_html( $t['reserv_label'] ); ?> <span style="color:#aaa;font-weight:400"><?php echo esc_html( $t['reserv_opt'] ); ?></span></label>
        <input type="url" id="spp-reserv" placeholder="<?php echo esc_attr( $t['reserv_ph'] ); ?>" />
        <div class="hint"><?php echo esc_html( $t['reserv_hint'] ); ?></div>
      </div>

      <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
        <button class="spp-btn" id="spp-save-btn" onclick="sppSave()">
          <span class="spp-spinner"></span>
          <span class="spp-btn-txt"><?php echo esc_html( $t['save_btn'] ); ?></span>
        </button>
        <div id="spp-save-msg" class="spp-msg" style="margin-top:0"></div>
      </div>
    </div>

    <!-- Öffnungszeiten -->
    <div class="spp-card">
      <h2><?php echo esc_html( $t['oz_h2'] ); ?></h2>
      <div class="spp-oz-grid" id="spp-oz-grid"></div>

      <h3 style="margin-top:20px"><?php echo esc_html( $t['oz_saison_h3'] ); ?></h3>
      <div class="spp-row">
        <div class="spp-field">
          <label><?php echo esc_html( $t['oz_von_label'] ); ?></label>
          <input type="date" id="spp-saison-start" />
          <div class="hint"><?php echo esc_html( $t['oz_von_hint'] ); ?></div>
        </div>
        <div class="spp-field">
          <label><?php echo esc_html( $t['oz_bis_label'] ); ?></label>
          <input type="date" id="spp-saison-ende" />
        </div>
      </div>

      <h3 style="margin-top:24px"><?php echo esc_html( $t['oz_ft_h3'] ); ?></h3>
      <p style="font-size:12px;color:#888;margin:0 0 8px">
        <?php echo esc_html( $t['oz_ft_desc'] ); ?>
      </p>
      <div class="spp-ft-grid" id="spp-ft-grid"></div>

      <div style="display:flex;align-items:center;gap:10px;margin-top:18px">
        <button class="spp-btn" id="spp-oz-save-btn" onclick="sppSaveOz()">
          <span class="spp-spinner"></span>
          <span class="spp-btn-txt"><?php echo esc_html( $t['oz_save_btn'] ); ?></span>
        </button>
        <div id="spp-oz-msg" class="spp-msg" style="margin-top:0"></div>
      </div>
    </div>

    <!-- Verband -->
    <div class="spp-card" id="spp-verband-info" style="display:none">
      <h2><?php echo esc_html( $t['vbd_h2'] ); ?></h2>
      <p style="font-size:13px;color:#555;margin-bottom:18px">
        <?php echo esc_html( $t['vbd_desc'] ); ?>
      </p>
      <table style="font-size:13px;border-collapse:collapse;width:100%">
        <tr>
          <td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap;vertical-align:top"><?php echo esc_html( $t['vbd_kantone'] ); ?></td>
          <td id="spp-verband-kantone" style="padding:6px 0;font-weight:500">–</td>
        </tr>
        <tr>
          <td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap"><?php echo esc_html( $t['vbd_email'] ); ?></td>
          <td id="spp-verband-email" style="padding:6px 0">–</td>
        </tr>
        <tr>
          <td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap"><?php echo esc_html( $t['vbd_seit'] ); ?></td>
          <td id="spp-verband-seit" style="padding:6px 0">–</td>
        </tr>
      </table>
    </div>

    <!-- Standort -->
    <div class="spp-card" id="spp-map-card">
      <h2><?php echo esc_html( $t['map_h2'] ); ?></h2>
      <p style="font-size:13px;color:#555;margin-bottom:14px">
        <?php echo esc_html( $t['map_desc'] ); ?>
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="spp-btn" id="spp-gps-btn" onclick="sppUseMyLocation()" type="button">
          <?php echo esc_html( $t['map_gps_btn'] ); ?>
        </button>
        <div id="spp-gps-msg" style="font-size:13px;align-self:center;color:#777"></div>
      </div>
      <div id="spp-map" style="height:320px;border-radius:10px;border:1.5px solid #ddd;overflow:hidden;margin-bottom:12px"></div>
      <p style="font-size:12px;color:#aaa;margin:0 0 12px"><?php echo esc_html( $t['map_hint'] ); ?></p>
      <div style="display:flex;align-items:center;gap:10px">
        <button class="spp-btn" id="spp-map-save-btn" onclick="sppSaveLocation()" type="button">
          <span class="spp-spinner"></span>
          <span class="spp-btn-txt"><?php echo esc_html( $t['map_save_btn'] ); ?></span>
        </button>
        <div id="spp-map-msg" class="spp-msg" style="margin-top:0"></div>
      </div>
    </div>

    <p style="font-size:11px;color:#aaa;text-align:center">
      <?php echo esc_html( $t['footer_q'] ); ?> <a href="mailto:info@sagatrail.ch" style="color:#CC0000">info@sagatrail.ch</a>
    </p>
  </div>
</div>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
/* ── Übersetzungen (PHP-generiert) ── */
var SPP_L10N   = <?php echo $spp_l10n_js; ?>;
var SPP_DAYS   = <?php echo $spp_days_js; ?>;
var SPP_FT     = <?php echo $spp_ft_js; ?>;
</script>
<script>
(function() {
  'use strict';

  var map = null;
  var marker = null;
  var currentLat = 46.8182;
  var currentLng = 8.2275;

  function initMap(lat, lng) {
    if (map) { map.remove(); map = null; }
    currentLat = lat || 46.8182;
    currentLng = lng || 8.2275;
    map = L.map('spp-map').setView([currentLat, currentLng], lat ? 15 : 8);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 19,
    }).addTo(map);
    var icon = L.divIcon({
      className: '',
      html: '<div style="width:22px;height:22px;background:#CC0000;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
      iconSize: [22, 22], iconAnchor: [11, 11],
    });
    marker = L.marker([currentLat, currentLng], { draggable: true, icon: icon }).addTo(map);
    marker.on('dragend', function(e) { var ll = e.target.getLatLng(); currentLat = ll.lat; currentLng = ll.lng; });
    map.on('click', function(e) { currentLat = e.latlng.lat; currentLng = e.latlng.lng; marker.setLatLng([currentLat, currentLng]); });
  }

  window.sppInitMapFromProfile = function(lat, lng) {
    setTimeout(function() { initMap(lat || null, lng || null); }, 200);
  };

  window.sppUseMyLocation = function() {
    var gpsMsg = document.getElementById('spp-gps-msg');
    if (!navigator.geolocation) { gpsMsg.textContent = SPP_L10N.js_gps_na; return; }
    gpsMsg.textContent = SPP_L10N.js_gps_searching;
    var btn = document.getElementById('spp-gps-btn');
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        btn.disabled = false; gpsMsg.textContent = '';
        currentLat = pos.coords.latitude; currentLng = pos.coords.longitude;
        if (!map) { initMap(currentLat, currentLng); } else { marker.setLatLng([currentLat, currentLng]); map.setView([currentLat, currentLng], 16); }
      },
      function() { btn.disabled = false; gpsMsg.textContent = SPP_L10N.js_gps_err; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  function mapShowMsg(msg, ok) {
    var el = document.getElementById('spp-map-msg');
    if (!el) return;
    el.textContent = msg; el.className = 'spp-msg ' + (ok ? 'ok' : 'err');
  }
  function mapSetBtn(loading) {
    var btn = document.getElementById('spp-map-save-btn');
    if (!btn) return;
    btn.disabled = loading; btn.classList.toggle('loading', loading);
  }

  window.sppSaveLocation = function() {
    var tok = (function() { var p = new URLSearchParams(window.location.search); return p.get('token') || localStorage.getItem('spp_token'); })();
    if (!tok) { mapShowMsg(SPP_L10N.js_loc_nosess, false); return; }
    if (!currentLat || !currentLng) { mapShowMsg(SPP_L10N.js_loc_nopos, false); return; }
    mapSetBtn(true);
    var API_BASE = (window.stPartnerData && window.stPartnerData.apiBase) || 'https://api.sagatrail.ch';
    fetch(API_BASE + '/api/partner/portal/me?token=' + encodeURIComponent(tok), {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: currentLat, lng: currentLng }),
    })
      .then(function(r) { if (!r.ok) throw new Error(SPP_L10N.js_save_err); return r.json(); })
      .then(function() { mapSetBtn(false); mapShowMsg(SPP_L10N.js_loc_saved, true); })
      .catch(function(e) { mapSetBtn(false); mapShowMsg(e.message, false); });
  };

  var dashObs = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'attributes' && m.attributeName === 'style') {
        var dash = document.getElementById('spp-dashboard');
        if (dash && dash.style.display !== 'none' && !map) { initMap(null, null); }
      }
    });
  });
  var dashEl = document.getElementById('spp-dashboard');
  if (dashEl) dashObs.observe(dashEl, { attributes: true });
})();
</script>

<script>
(function() {
  'use strict';

  var API_BASE     = (window.stPartnerData && window.stPartnerData.apiBase) || 'https://api.sagatrail.ch';
  var AJAX_URL     = (window.stPartnerData && window.stPartnerData.ajaxUrl) || '/wp-admin/admin-ajax.php';
  var PORTAL_NONCE = (window.stPartnerData && window.stPartnerData.portalNonce) || '';

  function getToken() {
    var p = new URLSearchParams(window.location.search);
    return p.get('token') || localStorage.getItem('spp_token');
  }
  function setBtn(id, loading) {
    var btn = document.getElementById(id); if (!btn) return;
    btn.disabled = loading; btn.classList.toggle('loading', loading);
  }
  function showMsg(id, msg, ok) {
    var el = document.getElementById(id); if (!el) return;
    el.textContent = msg; el.className = 'spp-msg ' + (ok ? 'ok' : 'err');
  }
  function fmt(n)    { return n == null ? '–' : Number(n).toLocaleString('de-CH'); }
  function fmtDate(s){ if (!s) return ''; return new Date(s).toLocaleDateString('de-CH', {day:'2-digit',month:'2-digit',year:'numeric'}); }

  /* Zeichenzähler */
  ['beschr','angebot'].forEach(function(id) {
    var el = document.getElementById('spp-' + id);
    if (el) el.addEventListener('input', function() {
      var cnt = document.getElementById('spp-' + id + '-count');
      if (cnt) cnt.textContent = el.value.length;
    });
  });

  /* Öffnungszeiten-Grid */
  (function buildOzGrid() {
    var grid = document.getElementById('spp-oz-grid');
    SPP_DAYS.forEach(function(d) {
      var row = document.createElement('div');
      row.className = 'spp-oz-row';
      row.innerHTML =
        '<span class="spp-oz-day">' + d.label + '</span>' +
        '<label class="spp-oz-toggle">' +
          '<input type="checkbox" id="oz-open-' + d.key + '" onchange="sppOzToggle(\'' + d.key + '\')" />' +
          '<span class="spp-oz-slider"></span>' +
        '</label>' +
        '<div class="spp-oz-times hidden" id="oz-times-' + d.key + '">' +
          '<input type="time" id="oz-von-' + d.key + '" value="09:00" />' +
          '<span class="spp-oz-sep">–</span>' +
          '<input type="time" id="oz-bis-' + d.key + '" value="17:00" />' +
        '</div>';
      grid.appendChild(row);
    });
  })();

  /* Feiertage-Grid */
  (function buildFtGrid() {
    var grid = document.getElementById('spp-ft-grid');
    SPP_FT.forEach(function(f) {
      var row = document.createElement('div');
      row.className = 'spp-ft-row';
      row.innerHTML =
        '<div><span class="spp-ft-label">' + f.label + '</span> <span class="spp-ft-date">(' + f.datum + ')</span></div>' +
        '<select class="spp-ft-select" id="ft-' + f.key + '">' +
          '<option value="">'   + SPP_L10N.js_ft_plan   + '</option>' +
          '<option value="true">'  + SPP_L10N.js_ft_open   + '</option>' +
          '<option value="false">' + SPP_L10N.js_ft_closed + '</option>' +
        '</select>';
      grid.appendChild(row);
    });
  })();

  window.sppOzToggle = function(key) {
    var chk = document.getElementById('oz-open-' + key);
    var times = document.getElementById('oz-times-' + key);
    times.classList.toggle('hidden', !chk.checked);
  };

  window.sppOpenBillingPortal = function() {
    var tok = getToken(); if (!tok) return;
    var btn = document.getElementById('spp-billing-btn');
    var spinner = document.getElementById('spp-billing-spinner');
    var msg = document.getElementById('spp-billing-msg');
    btn.disabled = true; spinner.style.display = 'inline-block'; msg.style.display = 'none';
    fetch(API_BASE + '/api/partner/portal/billing-portal?token=' + encodeURIComponent(tok), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.url) { window.location.href = data.url; }
      else {
        msg.textContent = data.error || SPP_L10N.js_billing_err;
        msg.style.display = 'block'; btn.disabled = false; spinner.style.display = 'none';
      }
    })
    .catch(function() {
      msg.textContent = SPP_L10N.js_billing_conn;
      msg.style.display = 'block'; btn.disabled = false; spinner.style.display = 'none';
    });
  };

  window.sppLogout = function() {
    localStorage.removeItem('spp_token');
    document.getElementById('spp-dashboard').style.display = 'none';
    document.getElementById('spp-login').style.display = 'block';
    document.getElementById('spp-email').value = '';
    document.getElementById('spp-login-msg').textContent = '';
  };

  var tok = getToken();
  if (tok) {
    localStorage.setItem('spp_token', tok);
    if (history.replaceState) history.replaceState(null, '', window.location.pathname + window.location.hash);
    loadDashboard(tok);
  }

  window.sppRequestLink = function() {
    var email = document.getElementById('spp-email').value.trim();
    if (!email) { showMsg('spp-login-msg', SPP_L10N.js_login_empty, false); return; }
    var ajaxUrl = (window.stPartnerData && window.stPartnerData.ajaxUrl) || '';
    var nonce   = (window.stPartnerData && window.stPartnerData.portalNonce) || '';
    if (!ajaxUrl) { showMsg('spp-login-msg', SPP_L10N.js_login_noajax, false); return; }
    setBtn('spp-login-btn', true);
    var fd = new FormData();
    fd.append('action', 'spp_request_token');
    fd.append('nonce', nonce);
    fd.append('email', email);
    fd.append('portal_url', window.location.href.split('?')[0]); /* für Sprache im Magic-Link */
    fetch(ajaxUrl, { method: 'POST', body: fd })
      .then(function(r) { return r.json(); })
      .then(function(j) {
        setBtn('spp-login-btn', false);
        if (j.success) { showMsg('spp-login-msg', SPP_L10N.js_login_ok, true); }
        else           { showMsg('spp-login-msg', j.data || SPP_L10N.js_login_err, false); }
      })
      .catch(function() { setBtn('spp-login-btn', false); showMsg('spp-login-msg', SPP_L10N.js_conn_err, false); });
  };

  function loadDashboard(token) {
    fetch(API_BASE + '/api/partner/portal/me?token=' + encodeURIComponent(token))
      .then(function(r) { if (!r.ok) throw new Error(SPP_L10N.js_token_err); return r.json(); })
      .then(function(p) {
        document.getElementById('spp-login').style.display = 'none';
        document.getElementById('spp-dashboard').style.display = 'block';

        if (p.type === 'verband') {
          document.getElementById('spp-name').textContent = p.name;
          document.getElementById('spp-meta').innerHTML =
            '<span style="font-size:13px;color:#777">' + SPP_L10N.js_vbd_type + '</span>';
          document.getElementById('spp-status-badge').innerHTML =
            p.isActive
              ? '<span class="spp-badge spp-badge-green">' + SPP_L10N.js_active + '</span>'
              : '<span class="spp-badge spp-badge-gray">'  + SPP_L10N.js_inactive + '</span>';
          document.getElementById('spp-views').textContent = '–';
          document.getElementById('spp-taps').textContent  = '–';
          document.getElementById('spp-verband-info').style.display = 'block';
          document.getElementById('spp-verband-kantone').textContent = p.kantone || '–';
          document.getElementById('spp-verband-email').textContent   = p.email   || '–';
          document.getElementById('spp-verband-seit').textContent    = p.createdAt ? fmtDate(p.createdAt) : '–';
          ['spp-foto-card','spp-beschr-wrap','spp-angebot-wrap',
           'spp-kontakt-wrap','spp-reserv-wrap','spp-paket-info'].forEach(function(id){
            var el = document.getElementById(id); if (el) el.style.display = 'none';
          });
          var cards = document.querySelectorAll('#spp-dashboard .spp-card');
          cards.forEach(function(c) {
            var h = c.querySelector('h2');
            if (h && (h.textContent.trim() === document.getElementById('spp-oz-grid').closest('.spp-card').querySelector('h2').textContent.trim() ||
                       h.textContent.trim() === document.querySelector('#spp-dashboard .spp-card:not(#spp-verband-info) h2:last-of-type') )) {
              /* skip — selectors not reliable; use data attribute instead */
            }
          });
          /* Hide oz and profil cards for verband */
          document.querySelectorAll('#spp-dashboard > div > .spp-card').forEach(function(c){
            var h2 = c.querySelector('h2');
            if(!h2) return;
            var txt = h2.textContent.trim();
            /* match translated heading text */
            if(c.querySelector('#spp-oz-grid') || c.querySelector('#spp-save-btn')) c.style.display='none';
          });
          return;
        }

        document.getElementById('spp-name').textContent = p.name;
        document.getElementById('spp-meta').innerHTML =
          '<span style="font-size:13px;color:#777">' + katLabel(p.kategorie) +
          ' · ' + (p.canton || '') +
          (p.paket ? ' · Paket <strong>' + p.paket.charAt(0).toUpperCase() + p.paket.slice(1) + '</strong>' : '') + '</span>';
        document.getElementById('spp-views').textContent = fmt(p.views);
        document.getElementById('spp-taps').textContent  = fmt(p.offersTapped);
        document.getElementById('spp-status-badge').innerHTML =
          p.isActive
            ? '<span class="spp-badge spp-badge-green">' + SPP_L10N.js_active_app + '</span>'
            : '<span class="spp-badge spp-badge-gray">'  + SPP_L10N.js_inactive + '</span>';

        var lauf = '';
        if (p.laufzeitStart) lauf = SPP_L10N.js_laufzeit + fmtDate(p.laufzeitStart) + (p.laufzeitEnde ? ' – ' + fmtDate(p.laufzeitEnde) : '');
        document.getElementById('spp-laufzeit').textContent = lauf;

        if (typeof window.sppInitMapFromProfile === 'function') {
          window.sppInitMapFromProfile(p.lat || null, p.lng || null);
        }

        var paketEl  = document.getElementById('spp-paket-info');
        var paketTxt = { basic: SPP_L10N.js_pkt_basic, standard: SPP_L10N.js_pkt_std, premium: SPP_L10N.js_pkt_prem }[p.paket] || '';
        if (paketTxt) { paketEl.textContent = paketTxt; paketEl.style.display = 'block'; }

        document.getElementById('spp-billing-wrap').style.display = 'block';

        var isStandard = p.paket === 'standard' || p.paket === 'premium';
        var isPremium  = p.paket === 'premium';

        if (isStandard) {
          document.getElementById('spp-foto-card').style.display = 'block';
          if (p.fotoUrl) {
            var preview = document.getElementById('spp-foto-preview');
            var fotoSrc = p.fotoUrl.startsWith('/api') ? API_BASE + p.fotoUrl : p.fotoUrl;
            preview.src = fotoSrc + (fotoSrc.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
            preview.style.display = 'block';
          }
          document.getElementById('spp-beschr-wrap').style.display = 'block';
          document.getElementById('spp-beschr').value = p.beschreibung || '';
          document.getElementById('spp-beschr-count').textContent = (p.beschreibung || '').length;
          document.getElementById('spp-kontakt-wrap').style.display = 'block';
          document.getElementById('spp-telefon').value = p.telefon || '';
          document.getElementById('spp-website').value = p.websiteUrl || '';
        }
        if (isPremium) {
          document.getElementById('spp-angebot-wrap').style.display = 'block';
          document.getElementById('spp-angebot').value = p.angebot || '';
          document.getElementById('spp-angebot-count').textContent = (p.angebot || '').length;
          document.getElementById('spp-reserv-wrap').style.display = 'block';
          document.getElementById('spp-reserv').value = p.reservierungUrl || '';
        }
        if (p.oeffnungszeiten) {
          try { fillOz(JSON.parse(p.oeffnungszeiten)); } catch(e) {}
        }
      })
      .catch(function(e) {
        localStorage.removeItem('spp_token');
        showMsg('spp-login-msg', e.message || SPP_L10N.js_token_err, false);
      });
  }

  function fillOz(oz) {
    SPP_DAYS.forEach(function(d) {
      var val = oz[d.key]; var chk = document.getElementById('oz-open-' + d.key);
      if (val && val.von) {
        chk.checked = true; sppOzToggle(d.key);
        document.getElementById('oz-von-' + d.key).value = val.von;
        document.getElementById('oz-bis-' + d.key).value = val.bis || '17:00';
      }
    });
    if (oz.saisonStart) { var y  = new Date().getFullYear(); document.getElementById('spp-saison-start').value = y  + '-' + oz.saisonStart; }
    if (oz.saisonEnde)  { var y2 = new Date().getFullYear(); document.getElementById('spp-saison-ende').value  = y2 + '-' + oz.saisonEnde;  }
    if (oz.feiertage) {
      SPP_FT.forEach(function(f) {
        var sel = document.getElementById('ft-' + f.key); if (!sel) return;
        var v = oz.feiertage[f.key];
        if (v === true) sel.value = 'true'; else if (v === false) sel.value = 'false'; else sel.value = '';
      });
    }
  }

  /* Foto Upload */
  var dropzone = document.getElementById('spp-dropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover',  function(e){ e.preventDefault(); dropzone.classList.add('drag'); });
    dropzone.addEventListener('dragleave', function(){  dropzone.classList.remove('drag'); });
    dropzone.addEventListener('drop', function(e){
      e.preventDefault(); dropzone.classList.remove('drag');
      var f = e.dataTransfer.files[0]; if (f) sppHandleFile(f);
    });
  }

  window.sppHandleFile = function(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { showMsg('spp-foto-msg', SPP_L10N.js_foto_big, false); return; }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      showMsg('spp-foto-msg', SPP_L10N.js_foto_fmt, false); return;
    }
    var token  = getToken();
    var bar    = document.getElementById('spp-upload-fill');
    var prog   = document.getElementById('spp-upload-progress');
    var img    = new Image();
    var objUrl = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(objUrl);
      var MAX = 1200, w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      var p = document.getElementById('spp-foto-preview');
      p.src = dataUrl; p.style.display = 'block';
      prog.style.display = 'block'; bar.style.width = '30%';
      fetch(API_BASE + '/api/partner/portal/upload-photo?token=' + encodeURIComponent(token), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fotoBase64: dataUrl }),
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        bar.style.width = '100%';
        setTimeout(function(){ prog.style.display = 'none'; bar.style.width = '0%'; }, 800);
        if (d.ok) {
          showMsg('spp-foto-msg', SPP_L10N.js_foto_ok, true);
          if (d.fotoUrl) { p.src = d.fotoUrl + '?t=' + Date.now(); }
        } else {
          showMsg('spp-foto-msg', SPP_L10N.js_foto_err + (d.error || SPP_L10N.js_foto_unk), false);
        }
      })
      .catch(function() { prog.style.display = 'none'; showMsg('spp-foto-msg', SPP_L10N.js_foto_conn, false); });
    };
    img.onerror = function() { showMsg('spp-foto-msg', SPP_L10N.js_foto_read, false); };
    img.src = objUrl;
  };

  window.sppSave = function() {
    var tok = getToken();
    if (!tok) { showMsg('spp-save-msg', SPP_L10N.js_loc_nosess, false); return; }
    setBtn('spp-save-btn', true);
    var body = {};
    var beschrEl = document.getElementById('spp-beschr');
    if (beschrEl && beschrEl.closest('[style*="block"]')) body.beschreibung = beschrEl.value.trim();
    var angebotEl = document.getElementById('spp-angebot');
    if (angebotEl && document.getElementById('spp-angebot-wrap').style.display !== 'none') body.angebot = angebotEl.value.trim();
    var telEl = document.getElementById('spp-telefon');
    if (telEl && document.getElementById('spp-kontakt-wrap').style.display !== 'none') {
      body.telefon = telEl.value.trim();
      body.websiteUrl = document.getElementById('spp-website').value.trim();
    }
    var resEl = document.getElementById('spp-reserv');
    if (resEl && document.getElementById('spp-reserv-wrap').style.display !== 'none') body.reservierungUrl = resEl.value.trim();
    fetch(API_BASE + '/api/partner/portal/me?token=' + encodeURIComponent(tok), {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
      .then(function(r) { if (!r.ok) throw new Error(SPP_L10N.js_save_err); return r.json(); })
      .then(function() { setBtn('spp-save-btn', false); showMsg('spp-save-msg', SPP_L10N.js_save_ok, true); })
      .catch(function(e) { setBtn('spp-save-btn', false); showMsg('spp-save-msg', e.message, false); });
  };

  window.sppSaveOz = function() {
    var tok = getToken();
    if (!tok) { showMsg('spp-oz-msg', SPP_L10N.js_oz_nosess, false); return; }
    setBtn('spp-oz-save-btn', true);
    var oz = {};
    SPP_DAYS.forEach(function(d) {
      var chk = document.getElementById('oz-open-' + d.key);
      oz[d.key] = (chk && chk.checked) ? { von: document.getElementById('oz-von-' + d.key).value || '09:00', bis: document.getElementById('oz-bis-' + d.key).value || '17:00' } : null;
    });
    var ssEl = document.getElementById('spp-saison-start');
    var seEl = document.getElementById('spp-saison-ende');
    if (ssEl && ssEl.value) oz.saisonStart = ssEl.value.slice(5);
    if (seEl && seEl.value) oz.saisonEnde  = seEl.value.slice(5);
    var feiertage = {};
    SPP_FT.forEach(function(f) {
      var sel = document.getElementById('ft-' + f.key);
      if (!sel || sel.value === '') return;
      feiertage[f.key] = (sel.value === 'true');
    });
    if (Object.keys(feiertage).length > 0) oz.feiertage = feiertage;
    fetch(API_BASE + '/api/partner/portal/me?token=' + encodeURIComponent(tok), {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oeffnungszeiten: JSON.stringify(oz) }),
    })
      .then(function(r) { if (!r.ok) throw new Error(SPP_L10N.js_save_err); return r.json(); })
      .then(function() { setBtn('spp-oz-save-btn', false); showMsg('spp-oz-msg', SPP_L10N.js_oz_ok, true); })
      .catch(function(e) { setBtn('spp-oz-save-btn', false); showMsg('spp-oz-msg', e.message, false); });
  };

  function katLabel(k) {
    return { restaurant:'🍽 Restaurant', cafe:'☕ Café', bar:'🍺 Bar', souvenir:'🎁 Shop',
             uebernachtung:'🏨 Hotel', sac_huette:'🏔 SAC-Hütte', sonstiges:'📌 Partner' }[k] || k;
  }
})();
</script>
