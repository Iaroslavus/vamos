import type { ContentLocale } from '@/features/content/text';

export type CityName = {
  ru: string;
  uk: string;
  en: string;
};

const city = (ru: string, uk: string, en: string): CityName => ({ ru, uk, en });

/** City shown in the path header, keyed by the course-plan module id. */
export const MODULE_CITIES: Record<string, CityName> = {
  'a1.u01': city('Мадрид', 'Мадрид', 'Madrid'),
  'a1.u02': city('Барселона', 'Барселона', 'Barcelona'),
  'a1.u03': city('Севилья', 'Севілья', 'Seville'),
  'a1.u04': city('Валенсия', 'Валенсія', 'Valencia'),
  'a1.u05': city('Гранада', 'Гранада', 'Granada'),
  'a1.u06': city('Бильбао', 'Більбао', 'Bilbao'),
  'a1.u07': city('Малага', 'Малага', 'Malaga'),
  'a1.u08': city('Сарагоса', 'Сарагоса', 'Zaragoza'),
  'a1.u09': city('Толедо', 'Толедо', 'Toledo'),
  'a1.u10': city('Саламанка', 'Саламанка', 'Salamanca'),
  'a1.u11': city('Кордова', 'Кордова', 'Cordoba'),
  'a1.u12': city('Кадис', 'Кадіс', 'Cadiz'),
  'a2.u01': city('Сан-Себастьян', 'Сан-Себастьян', 'San Sebastian'),
  'a2.u02': city('Памплона', 'Памплона', 'Pamplona'),
  'a2.u03': city('Сантандер', 'Сантандер', 'Santander'),
  'a2.u04': city('Овьедо', "Ов'єдо", 'Oviedo'),
  'a2.u05': city('Сантьяго', 'Сантьяго', 'Santiago'),
  'a2.u06': city('Виго', 'Віго', 'Vigo'),
  'a2.u07': city('Аликанте', 'Аліканте', 'Alicante'),
  'a2.u08': city('Мурсия', 'Мурсія', 'Murcia'),
  'a2.u09': city('Пальма', 'Пальма', 'Palma'),
  'a2.u10': city('Ибица', 'Ібіца', 'Ibiza'),
  'a2.u11': city('Тенерифе', 'Тенерифе', 'Tenerife'),
  'a2.u12': city('Леон', 'Леон', 'Leon'),
  'b1.u01': city('Бургос', 'Бургос', 'Burgos'),
  'b1.u02': city('Сеговия', 'Сеговія', 'Segovia'),
  'b1.u03': city('Авила', 'Авіла', 'Avila'),
  'b1.u04': city('Куэнка', 'Куенка', 'Cuenca'),
  'b1.u05': city('Ронда', 'Ронда', 'Ronda'),
  'b1.u06': city('Мерида', 'Мерида', 'Merida'),
  'b1.u07': city('Хихон', 'Хіхон', 'Gijon'),
  'b1.u08': city('Таррагона', 'Таррагона', 'Tarragona'),
  'b1.u09': city('Жирона', 'Жирона', 'Girona'),
  'b1.u10': city('Вальядолид', 'Вальядолід', 'Valladolid'),
  'b2.u01': city('Логроньо', 'Логроньйо', 'Logrono'),
  'b2.u02': city('Альмерия', 'Альмерія', 'Almeria'),
  'b2.u03': city('Уэльва', 'Уельва', 'Huelva'),
  'b2.u04': city('Бадахос', 'Бадахос', 'Badajoz'),
  'b2.u05': city('Касерес', 'Касерес', 'Caceres'),
  'b2.u06': city('Луго', 'Луго', 'Lugo'),
  'b2.u07': city('Оренсе', 'Оренсе', 'Ourense'),
  'b2.u08': city('Херес', 'Херес', 'Jerez'),
  'b2.u09': city('Марбелья', 'Марбелья', 'Marbella'),
};

export function cityName(moduleId: string, locale: ContentLocale): string {
  return MODULE_CITIES[moduleId]?.[locale] ?? '';
}
