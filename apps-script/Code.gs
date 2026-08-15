/**
 * Приём заявок с сайта Scandi Мебель.
 *
 * Что делает: пишет заявку строкой в Google-таблицу и сразу шлёт её в Telegram.
 * Зачем через Google, а не с сайта напрямую: скрипт выполняется на серверах
 * Google, у которых нет проблем с доступом к api.telegram.org. Плюс в таблице
 * остаётся журнал — если Telegram однажды не доставит, заявка не потеряется.
 *
 * Установка — см. README.md рядом с этим файлом.
 */

// ─── Настройки ──────────────────────────────────────────────────────────
// Токен и chat id храним в Script Properties, а НЕ в коде: файл скрипта
// виден всем, у кого есть доступ к таблице.
// Задать: Project Settings → Script Properties.
//   TELEGRAM_BOT_TOKEN — токен от @BotFather
//   TELEGRAM_CHAT_IDS  — id получателей через запятую
const SHEET_NAME = 'Заявки';

// ─── Приём POST с сайта ─────────────────────────────────────────────────
function doPost(e) {
  try {
    // Сайт шлёт text/plain (иначе браузер потребует CORS-preflight,
    // а Apps Script на него не отвечает), поэтому разбираем тело сами.
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Honeypot: поле скрыто от человека и видно только ботам. Заполнено — тихо
    // отвечаем «успех», ничего не записывая: бот не поймёт, что его отсекли.
    if (data.website) {
      return json({ ok: true });
    }

    const name = String(data.name || '').trim();
    const phone = String(data.phone || '').trim();
    const task = String(data.task || '').trim();

    if (!name || !phone) {
      return json({ ok: false, error: 'missing_fields' });
    }

    saveToSheet(name, phone, task);
    sendToTelegram(name, phone, task);

    return json({ ok: true });
  } catch (err) {
    console.error('Ошибка обработки заявки', err);
    return json({ ok: false, error: 'server_error' });
  }
}

// Проверка, что веб-приложение вообще живо: открыть URL в браузере
function doGet() {
  return json({ ok: true, service: 'scandi-lead' });
}

// ─── Таблица ────────────────────────────────────────────────────────────
function saveToSheet(name, phone, task) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Лист и шапку создаём при первой заявке — руками готовить ничего не нужно
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Дата', 'Имя', 'Телефон', 'Что нужно']);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([new Date(), name, phone, task]);
}

// ─── Telegram ───────────────────────────────────────────────────────────
function sendToTelegram(name, phone, task) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  const chatIds = String(props.getProperty('TELEGRAM_CHAT_IDS') || '')
    .split(',')
    .map(function (id) { return id.trim(); })
    .filter(String);

  if (!token || !chatIds.length) {
    // Заявка уже в таблице, поэтому не роняем ответ сайту — только пишем в лог
    console.error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_IDS не заданы в Script Properties');
    return;
  }

  const text = [
    '🪑 Новая заявка — Scandi Мебель',
    'Имя: ' + name,
    'Телефон: ' + phone,
    task ? 'Что нужно: ' + task : null,
  ].filter(String).join('\n');

  chatIds.forEach(function (chatId) {
    try {
      UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ chat_id: chatId, text: text }),
        // Без этого ошибка Telegram выбрасывает исключение и обрывает
        // рассылку остальным получателям
        muteHttpExceptions: true,
      });
    } catch (err) {
      console.error('Не удалось отправить в Telegram, chat_id ' + chatId, err);
    }
  });
}

// ─── Вспомогательное ────────────────────────────────────────────────────
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
