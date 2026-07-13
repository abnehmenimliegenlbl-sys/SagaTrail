import { createUseStrings, StringsDict } from "../createStrings";

export interface TabsStrings {
  entdecken: string;
  sammlung: string;
  gruppe: string;
  einstellungen: string;
}

const TABS_STRINGS: StringsDict<TabsStrings> = {
  de:  { entdecken: "Entdecken",  sammlung: "Sammlung",   gruppe: "Gruppe",  einstellungen: "Einstellungen"  },
  gsw: { entdecken: "Entdecke",   sammlung: "Sammlig",    gruppe: "Gruppe",  einstellungen: "Iistellige"     },
  fr:  { entdecken: "Découvrir",  sammlung: "Collection", gruppe: "Groupe",  einstellungen: "Réglages"       },
  it:  { entdecken: "Scopri",     sammlung: "Raccolta",   gruppe: "Gruppo",  einstellungen: "Impostazioni"   },
  en:  { entdecken: "Explore",    sammlung: "Collection", gruppe: "Group",   einstellungen: "Settings"       },
  zh:  { entdecken: "探索",        sammlung: "收藏",        gruppe: "群组",    einstellungen: "设置"            },
  es:  { entdecken: "Explorar",   sammlung: "Colección",  gruppe: "Grupo",   einstellungen: "Ajustes"        },
  pt:  { entdecken: "Explorar",   sammlung: "Coleção",    gruppe: "Grupo",   einstellungen: "Configurações"  },
  ru:  { entdecken: "Открыть",    sammlung: "Коллекция",  gruppe: "Группа",  einstellungen: "Настройки"      },
};

export const useTabsStrings = createUseStrings(TABS_STRINGS);
