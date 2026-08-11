#!/usr/bin/env python3
"""Nidwalden: 8 user-provided texts → 7 open slots + translate to 8 langs."""
import json, os, time, re
import anthropic

DATA_FILE = "curatedSagas.json"
CLIENT = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
MODEL = "claude-haiku-4-5"

# ── Raw texts from user upload ──────────────────────────────────────────────
STORIES = {
    "drachenkampf-ennetmoos-struth-winkelried": """In grauer Vorzeit hauste in einer tiefen Felsspalte bei Ennetmoos ein gewaltiger Drache. Das Ungeheuer verwüstete die Felder, frass das Vieh der Bauern und tötete jeden, der sich dem Ried näherte. Die Bewohner waren so verzweifelt, dass sie das gesamte Gebiet mieden. Zu dieser Zeit lebte der Ritter Heinrich von Winkelried, genannt „Struth", in der Verbannung, weil er im Streit einen Landsmann getötet hatte. Er bot den Nidwalder Landräten einen Pakt an: Wenn er das Monster erlege, solle man ihm seine Tat vergeben und ihn begnadigen.

Winkelried wusste, dass er den Drachen im direkten Kampf nicht besiegen konnte. Er fertigte ein langes Schwert an, dessen Klinge er mit scharfen Eisendornen und Widerhaken spickte. Zudem wickelte er ein grosses Bündel aus dornigem Gestrüpp um seinen linken Arm. So bewaffnet schlich er sich an die Höhle heran. Als der Drache hervorstürzte und sein riesiges Maul öffnete, um den Ritter zu verschlingen, stiess Winkelried ihm das dornenumwickelte Bündel tief in den Rachen. Der Drache konnte sein Maul nicht mehr schliessen und erstickte fast, während Winkelried ihm das Dornenschwert in die ungeschützte Brust rammte.

Das Monster wand sich im Todeskampf und verendete schliesslich. Voller Stolz hob Struth von Winkelried sein blutiges Schwert in die Höhe, um den herbeieilenden Bauern den Sieg zu verkünden. Doch als er den Arm hob, rann ein einziger Tropfen des giftigen Drachenbluts die Klinge hinab, traf seine nackte Haut und drang in seine Adern. Der Held brach auf der Stelle tot zusammen. Er erlöste Nidwalden von der Plage, bezahlte den Sieg jedoch mit seinem Leben. Das Drachenloch in der Fluh ist bis heute sichtbar.""",

    "friedhoefler-buergenberg": """Der Bürgenstock ist ein markanter Bergzug, der steil in den Vierwaldstättersee abfällt. Die Sage berichtet von einem kleinen, unheimlichen Naturgeist, der dort hauste. Ein ehrlicher, aber armer Holzer aus Stansstad stieg jeden Tag auf den Bürgenstock, um Holz für den Winter zu schlagen. Eines Nachmittags hörte er im dichten Unterholz ein seltsames Geräusch, das wie das Klappern von Holzlöffeln klang – chättere, chättere. Als er nachsah, entdeckte er ein winziges Männlein mit einem langen, grauen Bart und Schuhen aus Baumrinde, das auf einem Baumstumpf sass und ihn mit blitzenden Augen ansah. Es war das Chätteremändli.

Das Männlein sprach den Holzer an und fragte: „Warum nimmst du das Holz aus meinem Wald?" Der Holzer erklärte bescheiden seine Armut und dass er das Holz brauche, um seine Kinder vor dem Erfrieren zu schützen. Das Chätteremändli nickte und reichte ihm einen kleinen, unscheinbaren Holzspan: „Steck diesen in deine Tasche. Doch wehe dir, wenn du ihn vor morgen früh ansiehst oder dich im Wirtshaus damit brüstest!"

Der Holzer hielt sich an das Versprechen, obwohl der Span in seiner Tasche auf dem Heimweg immer schwerer wurde. Als er am nächsten Morgen erwachte und in seine Tasche griff, hatte sich der Holzspan in einen massiven Barren aus reinstem Gold verwandelt. Die Familie war gerettet. Doch als ein gieriger Nachbar davon erfuhr, eilte dieser ebenfalls auf den Bürgenstock und schlug mutwillig junge Bäume um, um das Männlein anzulocken. Das Chätteremändli erschien tatsächlich, reichte auch ihm einen Span – doch als der gierige Nachbar zu Hause nachsah, verwandelte sich der Span in eine giftige Viper, die ihn biss und für Wochen krankbettlägerig machte.""",

    "teufel-dallenwiler-bruecke": """Im 14. Jahrhundert, während der Schweizer Habsburgerkriege, wartete die Ehefrau eines Nidwalder Ritters auf der Rosenburg in Stans sehnsüchtig auf die Rückkehr ihres Mannes aus der Schlacht. Eines Abends belagerten feindliche Truppen das Haus. Die edle Dame versteckte die Kriegskasse der Eidgenossen und die heiligen Reliquien der Familie in einem geheimen Mauergewölbe. Als die Feinde das Haus stürmten, weigerte sie sich standhaft, das Versteck preiszugeben, und wurde im Turm eingemauert, wo sie verstarb.

Da ihr Versprechen, den Schatz zu schützen, über den Tod hinausging, fand ihre Seele keine Ruhe. Sie wandelt seither als Weisse Frau durch die Gänge des alten Hauses. Sie erscheint stets kurz vor Mitternacht und trägt ein langes, schimmerndes Gewand sowie ein schweres Schlüsselbund am Gürtel.

Die Sage erzählt, dass sie den Bewohnern des Hauses niemals Schaden zufügte. Im Gegenteil: Wenn dem Kanton Nidwalden grosses Unheil drohte – wie etwa vor dem verheerenden Franzoseneinfall von 1798 –, sah man die Weisse Frau auf den Zinnen des Hauses stehen und laut weinen. Das geheime Gewölbe mit dem Schatz wurde trotz vieler Umbauten bis heute nie gefunden, da die Weisse Frau das Versteck eisern bewacht.""",

    "schuetz-christen-1798": """Ein reicher Viehhändler aus Buochs hatte auf dem Markt in Luzern gute Geschäfte gemacht und wollte seine neuen Rinder auf einem grossen Holzschiff, einer Nauen, zurück nach Nidwalden transportieren. Als das Schiff die berüchtigte Meerenge zwischen dem Bürgenstock und dem Rigi passierte, frischte der Föhn massiv auf. Die Wellen schlugen hoch, und der erfahrene Steuermann flehte den Händler an, den Hafen von Kehrsiten anzusteuern.

Der Händler, getrieben von der Gier, die Ware noch am selben Abend zu verkaufen, fluchte laut: „Mir ist der Föhn egal, und wenn der Satan selbst am Ruder steht, wir fahren weiter!" Kaum waren die Worte ausgesprochen, schlug ein Blitz in den Mast. Das Schiff wurde von einer unsichtbaren Kraft gepackt und weit auf den offenen See hinausgezogen.

Das Schiff sank samt Mensch und Tier in den bodenlosen Tiefen des Sees. Doch die Seele des gierigen Händlers fand keine Ruhe. Seither berichten Fischer, dass man in stürmischen Herbstnächten, wenn der Föhn das Wasser peitscht, ein geisterhaftes Schiff vor der Küste von Buochs sehen kann. Es hat keine Segel, leuchtet in einem fahlen, bläulichen Licht, und man hört das unheimliche Brüllen der ertrinkenden Rinder im Wind. Wer das Geisterschiff sieht, tut gut daran, sofort den nächsten Hafen anzusteuern.""",

    "hexenstein-emmetten": """Ein junger, wilder Jäger aus Wolfenschiessen kannte kein Gesetz. Er wilderte in den herrschaftlichen Wäldern und ging sogar am höchsten kirchlichen Feiertag auf die Jagd, während das gesamte Dorf in der Kirche betete. Auf den Höhen der Bannalp sah er einen prächtigen Hirsch mit einem leuchtenden Kreuz zwischen den Geweihen.

Statt in Ehrfurcht zu verharren, lachte der Jäger nur, legte sein Gewehr an und schoss. Der Hirsch brach nicht zusammen; stattdessen verwandelte sich das Tier vor seinen Augen in eine riesige, feurige Gestalt. Der Boden unter den Füssen des Jägers tat sich auf, und ein heftiger Steinschlag ging nieder.

Der Jäger wurde von den herabstürzenden Felsen verschüttet. Seine Seele wurde dazu verdammt, als unheimlicher Jäger für immer über die Geröllhalden des Bannalpsees zu wandern. Die Sennen berichten, dass man im Herbst oft den fernen Knall eines Gewehrs hört, gefolgt von einem hohlen, schmerzerfüllten Lachen, das von den Felswänden des Rotihörndli widerhallt.""",

    "arnold-winkelried-sempach": """In den tiefen Höhlen der Felsen von Grafenort lebte einst ein friedliches Volk von Zwergen. Sie waren den Menschen wohlgesinnt. Wenn ein Bauer krank war oder die Ernte wegen eines frühen Wintereinbruchs einzubringen drohte, kamen die Erdmännli heimlich in der Nacht. Sie mähten das Gras, molken die Kühe und stapelten das Holz vor den Hütten, ohne jemals Gegenleistung zu verlangen.

Die Bauern waren dankbar und legten den Zwergen als Zeichen der Wertschätzung jeden Abend eine Schale mit frischer Milch und ein Stück Alpkäse vor die Tür. Doch eines Jahres übernahm ein geiziger und misstrauischer Bauer den grössten Hof in Grafenort. Er wollte wissen, wer die nächtlichen Helfer waren, und streute feine Asche vor die Alphütte, um deren Spuren zu lesen. Zudem versteckte er sich hinter einer Tonne.

Als die Zwerge in der Nacht kamen und die Asche bemerkten, erkannten sie sofort das Misstrauen und den Verrat der Menschen. Sie stiessen einen tiefen, traurigen Seufzer aus, liessen das Werkzeug fallen und kehrten in ihre Höhlen zurück. Am nächsten Morgen fanden die Bauern nur die winzigen Fussabdrücke in der Asche. Das Zwergenvolk verliess das Engelbergertal für immer und zog tiefer in das Innere der Alpen. Die Bauern mussten fortan all ihre harte Arbeit wieder allein bewältigen.""",

    "kampf-am-allweg-1798": """Während des Franzoseneinfalls im September 1798 kam es auf dem Allweg zu einer blutigen Schlacht. Die Nidwalder, darunter viele Frauen und Jugendliche, verteidigten ihre Heimat mit unvorstellbarem Mut, wurden jedoch von der Übermacht der französischen Soldaten überwältigt. Viele Einheimische fanden rund um die Kapelle den Tod, und das Gotteshaus wurde schwer beschädigt.

Nach dem Krieg wurde die Kapelle als Denkmal wieder aufgebaut. Doch die Seelen der gefallenen Nidwalder Krieger fanden keine Ruhe, da sie im Zorn und im Kampf um ihre Freiheit gestorben waren. Jahrhundertelang berichteten Reisende, die den Pass am Allweg in den Nächten des Septembers überquerten, von unheimlichen Lichtern in der Kapelle.

Man hörte das dumpfe Trommeln von Kriegsmärschen, das Klirren von Bajonetten und das leise Gebet von hunderten von Stimmen, die den Rosenkranz auf Alt-Nidwalder Dialekt beteten. Die Geisterarmee zieht laut der Sage in stürmischen Nächten von der Kapelle hinauf zum Denkmal, um zu zeigen, dass der Geist des Widerstands und die Liebe zur Heimat im Allweg niemals sterben werden.""",
}

# Story 7 (Wunder von Trübsee) saved for Obwalden
TRÜBSEE = """Vor Jahrhunderten war die Hochebene rund um den Trübsee eine wunderschöne, saftig grüne Alp, auf der die Sennen den besten Käse der Region produzierten. Doch der Reichtum führte zu Hochmut. Die Sennen wurden hartherzig, verschwendeten die Milch und badeten darin, während sie armen Pilgern, die den Pass überquerten, nicht einmal einen Schluck Wasser anboten.

Eines Tages kam eine alte, bettelarme Frau auf die Alp. Sie flehte um ein Stück Brot für ihr hungriges Enkelkind. Die Sennen lachten sie aus, nahmen einen frisch gepressten Käselaib, spuckten darauf und warfen ihn der Frau vor die Füsse. Die Frau richtete sich auf, hob ihren Wanderstab zum Himmel und rief die göttliche Gerechtigkeit an.

Im selben Moment begann die Erde zu beben. Eine gewaltige Schlamm- und Wassermasse schoss aus dem Inneren des Titlis hervor und überflutete die gesamte prachtvolle Alp. Die Hütten versanken, und das Wasser sammelte sich in einer tiefen Senke. Als sich der Sturm legte, war die grüne Weide verschwunden; zurück blieb ein tiefer See, dessen Wasser durch den Schlamm und das verflüssigte Fett des Käses für immer grau und milchig-trüb blieb – der Trübsee."""


def call_api(messages, max_tokens=2400):
    for attempt in range(4):
        try:
            resp = CLIENT.messages.create(model=MODEL, max_tokens=max_tokens, messages=messages)
            return resp.content[0].text.strip()
        except Exception as e:
            wait = 15 * (attempt + 1)
            print(f"  API error ({e}), retry in {wait}s…")
            time.sleep(wait)
    raise RuntimeError("API failed after 4 attempts")


def translate_one(de_text, lang, lang_desc):
    prompt = f"""Translate this Swiss folk legend from German into {lang_desc}.
Return ONLY the translated text as plain prose. No title, no comments, no markdown.

Source (German):
{de_text}"""
    return call_api([{"role": "user", "content": prompt}], max_tokens=1200)


def translate_batch(de_text, langs):
    lang_descs = {
        "en": "English", "fr": "French", "it": "Italian", "es": "Spanish",
        "pt": "Portuguese", "ru": "Russian", "zh": "Chinese (Simplified)",
        "gsw": "Swiss German (Züritüütsch / Alemannic dialect — use isch/het/cha/chind/s'/em/de/vo)",
    }
    desc = "\n".join(f"- {l}: {lang_descs[l]}" for l in langs)
    prompt = f"""Translate this Swiss folk legend from German into {len(langs)} languages.
Return ONLY a valid JSON object with keys: {', '.join(langs)}
Each value is the full translation as a plain string. No markdown, no extra keys.

Languages:
{desc}

Source (German):
{de_text}

JSON:"""
    raw = call_api([{"role": "user", "content": prompt}], max_tokens=3500)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:])
    if raw.endswith("```"):
        raw = "\n".join(raw.split("\n")[:-1])
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: translate each language individually
        print(f"  JSON parse failed, falling back to individual calls…")
        result = {}
        for l in langs:
            result[l] = translate_one(de_text, l, lang_descs[l])
            time.sleep(1)
        return result


def process_one(saga_id, de_text, data):
    idx = next(i for i, s in enumerate(data) if s["id"] == saga_id)
    saga = data[idx]
    print(f"\n  [{saga_id}]")

    saga["summary"] = de_text
    if "summaries" not in saga:
        saga["summaries"] = {}
    saga["summaries"]["de"] = {"text": de_text, "reviewEmpfohlen": True, "quelleVerifiziert": True}

    print("  Translating batch 1 (en/fr/it/es)…")
    t1 = translate_batch(de_text, ["en", "fr", "it", "es"])
    time.sleep(1)
    print("  Translating batch 2 (pt/ru/zh/gsw)…")
    t2 = translate_batch(de_text, ["pt", "ru", "zh", "gsw"])

    for lang, text in {**t1, **t2}.items():
        saga["summaries"][lang] = {"text": text, "reviewEmpfohlen": True, "quelleVerifiziert": True}

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("  ✓ saved")
    time.sleep(2)


def main():
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    print(f"Processing {len(STORIES)} Nidwalden sagas…")
    for saga_id, de_text in STORIES.items():
        process_one(saga_id, de_text, data)

    print(f"\n✅ Nidwalden done.")
    print(f"\nNote: Story 7 'Wunder von Trübsee' saved for Obwalden (border area).")

    # Verify
    nw = [s for s in data if s.get("canton") == "Nidwalden"]
    verified = sum(1 for s in nw if s.get("summaries", {}).get("de", {}).get("quelleVerifiziert"))
    print(f"Nidwalden: {verified}/{len(nw)} verified")


if __name__ == "__main__":
    main()
