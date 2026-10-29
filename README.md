# Vamos — стартовый набор для разработки в Cursor

Приложение для изучения испанского от A1 до C2: короткие уроки, интервальные повторения,
ИИ-собеседник, тесты в формате DELE. Этот набор — каркас, который Cursor превращает в рабочее приложение.

## Что внутри

| Файл                  | Зачем                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `.cursor/rules/*.mdc` | Правила для ИИ в Cursor: стек, дизайн, контент, качество кода. Cursor подхватывает их автоматически |
| `docs/PLAN.md`        | План разработки по фазам с готовыми промптами для Cursor                                            |
| `docs/CURRICULUM.md`  | Структура курса A1→C2 и формат контента                                                             |
| `docs/DESIGN.md`      | Дизайн-система: цвета, шрифты, анимации, экраны                                                     |
| `src/theme/tokens.ts` | Токены дизайна в коде                                                                               |
| `.env.example`        | Список ключей, которые понадобятся                                                                  |

## Стек (почему именно он)

- **Expo + React Native + TypeScript** — один код для iOS и Android. Локально — development build на Mac, в облаке — EAS.
- **expo-router** — навигация файлами.
- **react-native-reanimated + Moti + Lottie** — плавные анимации на 60 fps.
- **Supabase** — авторизация, Postgres, хранилище аудио, Edge Functions (ключи ИИ не попадают в приложение).
- **RevenueCat** — подписки в App Store и Google Play, пейволы, A/B-тесты цен.
- **ts-fsrs** — алгоритм интервальных повторений FSRS.
- **LLM через Edge Function** — ИИ-собеседник и проверка ответов.
- **Azure Speech (Pronunciation Assessment)** или аналог — оценка произношения.
- **PostHog** — аналитика воронки, **Sentry** — ошибки.

## Настройка за 30 минут

1. Установите **Node.js LTS**, **Git** и **Cursor** (cursor.com).
2. Поставьте **Xcode 26.4 или новее** — это минимум для текущего Expo SDK 58. Он собирает iOS-клиент и открывает симулятор.
3. Создайте пустую папку `vamos`, распакуйте туда этот набор и откройте папку в Cursor.
4. В Cursor: Settings → Rules — убедитесь, что правила из `.cursor/rules` видны (Project Rules).
5. Откройте чат Cursor в режиме **Agent** и вставьте первый промпт из `docs/PLAN.md` (Фаза 0).
   Агент создаст проект Expo **в этой же папке**, не трогая `.cursor`, `docs` и `src/theme`.
6. Соберите и запустите приложение по разделу «Сборка и запуск» ниже.
7. Создайте аккаунты (бесплатных тарифов хватит на старт): Supabase, RevenueCat, PostHog, Sentry,
   Expo (EAS). Ключи — в `.env` по образцу `.env.example`.
8. Аккаунты разработчика для публикации: Apple Developer ($99/год) и Google Play Console ($25 один раз).

## Сборка и запуск

Приложение работает как **development build** (`expo-dev-client`): так доступны микрофон и распознавание речи. Идентификаторы: iOS `com.iaroslavus.vamos`, Android `com.iaroslavus.vamos`. Папки `ios/` и `android/` появляются при сборке и в Git не коммитятся.

Нужны Node.js и **Xcode 26.4 или новее** (требование Expo SDK 58, [таблица совместимости](https://docs.expo.dev/versions/v58.0.0/#support-for-android-and-ios-versions)) с симулятором iOS. Зависимости: `npm install`.

### Первый раз

```bash
npm run ios:dev
```

Это `npx expo run:ios`: prebuild, компиляция нативного клиента и установка на симулятор. Первый прогон долгий — CocoaPods и Xcode.

### Каждый день

Клиент уже стоит на симуляторе. Пока не менялись нативные модули, плагины или `app.json`, собирать его заново не нужно.

```bash
npm run start:dev
```

Это `npx expo start --dev-client`. В терминале Metro нажмите `i` — откроется установленный клиент.

Снова `npm run ios:dev` — после нового нативного модуля или смены идентификатора, разрешений и плагинов в `app.json`.

### Облако (EAS)

Профили в `eas.json`:

| Профиль       | Назначение                                            |
| ------------- | ----------------------------------------------------- |
| `development` | Dev client для iOS-симулятора (`ios.simulator: true`) |
| `preview`     | Внутренняя сборка для проверки на устройстве          |
| `production`  | Сборка для App Store и Google Play                    |

```bash
npx eas-cli build --profile development --platform ios
```

Нужен аккаунт Expo (`npx eas-cli login`). Ежедневная работа на симуляторе — один раз `ios:dev`, дальше `start:dev`.

## Локальный бэкенд

Для разработки используется **только локальный Supabase** (Docker). Облачный проект не трогаем:
никаких `supabase link`, `supabase db push` и команд с `--linked`.

Понадобятся [Docker Desktop](https://docs.docker.com/desktop/) (или совместимый рантайм)
и [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):

```bash
brew install supabase/tap/supabase   # macOS; другие ОС — см. ссылку выше
```

### Запуск

```bash
supabase start
```

Первый запуск скачивает образы (несколько минут). Конфигурация — `supabase/config.toml`
(порты, redirect URL для `vamos://` и `exp://`, анонимный вход включён). После старта:

- API: `http://127.0.0.1:54321`
- Studio (админка): `http://127.0.0.1:54323`
- Почта (письма magic link и т. п. никуда не уходят, смотреть здесь): `http://127.0.0.1:54324`

### Ключи для приложения

Приложение читает только `EXPO_PUBLIC_*` переменные, схема — `src/lib/env.ts` (Zod).
Если что-то не задано, при запуске будет понятная ошибка со списком переменных.

1. Скопируйте образец: `cp .env.example .env.local` (`.env.local` в `.gitignore`, в Git не попадает
   и имеет приоритет над `.env`).
2. Посмотрите локальные значения:

   ```bash
   supabase status -o env
   ```

3. Подставьте в `.env.local`:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<значение ANON_KEY из вывода supabase status>
   ```

   Нужны только `API_URL` и `ANON_KEY`. `SERVICE_ROLE_KEY` и прочие секреты в приложение не
   копируйте — они обходят RLS.

4. Перезапустите `npx expo start -c`, чтобы Metro подхватил новые переменные.

Телефон с development build не видит `127.0.0.1` вашего компьютера — для устройства укажите LAN-адрес
машины, например `http://192.168.1.10:54321`. iOS-симулятор видит `127.0.0.1` напрямую,
Android-эмулятор — через `http://10.0.2.2:54321`.

### Схема, миграции и тесты БД

Схема живёт в `supabase/migrations` (таблицы `profiles`, `lesson_progress`, `xp_events`, `streaks`,
`review_cards`; профиль и строка серии создаются триггером при регистрации, RLS включён на всех
таблицах — пользователь видит и меняет только свои строки). Проверки доступа — pgTAP-тесты в
`supabase/tests`.

```bash
supabase db reset   # пересоздать БД из миграций и supabase/seed.sql
npm run db:test     # pgTAP: supabase test db
npm run db:types    # обновить src/lib/database.types.ts из локальной БД (коммитить вместе с миграцией)
```

Новая таблица = миграция + RLS-политики + pgTAP-тест + перегенерированные типы.
CI (`.github/workflows/db.yml`) гоняет миграции и pgTAP на каждом PR, затрагивающем `supabase/**`,
и падает, если `database.types.ts` не совпадает со схемой.

### Остановка

```bash
supabase stop            # остановить контейнеры, данные сохраняются
supabase stop --no-backup  # остановить и удалить локальные данные
```

## Шаблоны писем в облаке

Локально письма собирает `supabase/config.toml`: код из 6 цифр (`otp_length = 6`), срок 1 час
(`otp_expiry = 3600`), тексты в `supabase/templates/`. Язык берётся из `user_metadata.ui_language`
(`ru`, `uk`, иначе английский). В облаке `config.toml` не действует — те же три шаблона нужно
вставить вручную.

Authentication → Providers → Email: длина OTP **6**, срок **3600** секунд. **Secure email change**
выключен: у анонимного аккаунта нет старого ящика, иначе «Сохранить прогресс» будет ждать письмо,
которого не существует.

Authentication → Email Templates. В каждое письмо вставьте тему и HTML ниже. `{{ .Token }}` — код,
который вводят в приложении. Ссылка `{{ .ConfirmationURL }}` — второй способ, если код не подошёл.

### Change Email Address

Привязка email к анонимному аккаунту (`updateUser`). В приложении код подтверждают как
`verifyOtp({ type: 'email_change' })`.

Тема:

```
{{ if eq .Data.ui_language "ru" }}Код для сохранения прогресса{{ else if eq .Data.ui_language "uk" }}Код для збереження прогресу{{ else }}Code to save your progress{{ end }}
```

HTML — содержимое `supabase/templates/email_change.html`:

```html
{{ if eq .Data.ui_language "ru" }}
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; line-height: 1.5;"
>
  <h2>Код для сохранения прогресса</h2>
  <p>Введите этот код в приложении Vamos:</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
    {{ .Token }}
  </p>
  <p>Код действует 1 час.</p>
  <p>Или подтвердите по ссылке:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
  <p>Если вы не запрашивали письмо, просто проигнорируйте его.</p>
</div>
{{ else if eq .Data.ui_language "uk" }}
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; line-height: 1.5;"
>
  <h2>Код для збереження прогресу</h2>
  <p>Введіть цей код у застосунку Vamos:</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
    {{ .Token }}
  </p>
  <p>Код діє 1 годину.</p>
  <p>Або підтвердьте за посиланням:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
  <p>Якщо ви не запитували лист, просто проігноруйте його.</p>
</div>
{{ else }}
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; line-height: 1.5;"
>
  <h2>Code to save your progress</h2>
  <p>Enter this code in the Vamos app:</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
    {{ .Token }}
  </p>
  <p>This code is valid for 1 hour.</p>
  <p>Or confirm with this link:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
  <p>If you didn't ask for this email, you can ignore it.</p>
</div>
{{ end }}
```

### Magic Link

Вход по коду на новом устройстве (`signInWithOtp`). Код подтверждают как
`verifyOtp({ type: 'email' })`, не `magiclink`.

Тема:

```
{{ if eq .Data.ui_language "ru" }}Код для входа в Vamos{{ else if eq .Data.ui_language "uk" }}Код для входу у Vamos{{ else }}Your Vamos sign-in code{{ end }}
```

HTML — содержимое `supabase/templates/magic_link.html`:

```html
{{ if eq .Data.ui_language "ru" }}
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; line-height: 1.5;"
>
  <h2>Код для входа в Vamos</h2>
  <p>Введите этот код, чтобы открыть сохранённый аккаунт:</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
    {{ .Token }}
  </p>
  <p>Код действует 1 час.</p>
  <p>Или войдите по ссылке:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
  <p>Если вы не запрашивали письмо, просто проигнорируйте его.</p>
</div>
{{ else if eq .Data.ui_language "uk" }}
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; line-height: 1.5;"
>
  <h2>Код для входу у Vamos</h2>
  <p>Введіть цей код, щоб відкрити збережений акаунт:</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
    {{ .Token }}
  </p>
  <p>Код діє 1 годину.</p>
  <p>Або увійдіть за посиланням:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
  <p>Якщо ви не запитували лист, просто проігноруйте його.</p>
</div>
{{ else }}
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; line-height: 1.5;"
>
  <h2>Your Vamos sign-in code</h2>
  <p>Enter this code to open your saved account:</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
    {{ .Token }}
  </p>
  <p>This code is valid for 1 hour.</p>
  <p>Or sign in with this link:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
  <p>If you didn't ask for this email, you can ignore it.</p>
</div>
{{ end }}
```

### Confirm signup

Тема:

```
{{ if eq .Data.ui_language "ru" }}Подтвердите email в Vamos{{ else if eq .Data.ui_language "uk" }}Підтвердьте email у Vamos{{ else }}Confirm your email in Vamos{{ end }}
```

HTML — содержимое `supabase/templates/confirmation.html`:

```html
{{ if eq .Data.ui_language "ru" }}
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; line-height: 1.5;"
>
  <h2>Подтвердите email</h2>
  <p>Введите этот код в приложении Vamos:</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
    {{ .Token }}
  </p>
  <p>Код действует 1 час.</p>
  <p>Или подтвердите по ссылке:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
  <p>Если вы не запрашивали письмо, просто проигнорируйте его.</p>
</div>
{{ else if eq .Data.ui_language "uk" }}
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; line-height: 1.5;"
>
  <h2>Підтвердьте email</h2>
  <p>Введіть цей код у застосунку Vamos:</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
    {{ .Token }}
  </p>
  <p>Код діє 1 годину.</p>
  <p>Або підтвердьте за посиланням:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
  <p>Якщо ви не запитували лист, просто проігноруйте його.</p>
</div>
{{ else }}
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; line-height: 1.5;"
>
  <h2>Confirm your email</h2>
  <p>Enter this code in the Vamos app:</p>
  <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
    {{ .Token }}
  </p>
  <p>This code is valid for 1 hour.</p>
  <p>Or confirm with this link:</p>
  <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
  <p>If you didn't ask for this email, you can ignore it.</p>
</div>
{{ end }}
```

## Как работать с Cursor эффективно

- Одна задача — один чат. Новая фича — новый чат, чтобы контекст не замусоривался.
- Начинайте промпт с `@docs/PLAN.md` и номера задачи — агент поймёт, что делать.
- Просите сначала план, потом код: «Сначала опиши план изменений, жди подтверждения».
- После каждой рабочей фичи — коммит в Git. Если агент всё сломал — откат на коммит.
- Если агент «плывёт» — откройте новый чат и дайте ему конкретный файл через `@`.
