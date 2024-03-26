const { Scenes, session, Telegraf } = require("telegraf") ;
const fs = require('fs');
const { Extra, Markup } = require('telegraf');
const bot = new Telegraf('6713294070:AAFxIF9_I1ENuXIEkqX6-vS32hokO2Thsrs');
const surveyData = require('./quiz.json');
const { message } = require("telegraf/filters");

const userResponses = {}; // Store user responses
const adminPass = "@Hello_amma_5-STUD-2_brick_dealer@"
const activeSurvey = {};
bot.start((ctx) => ctx.reply('Привет! Кликни /quiz чтобы проходить опросы.'));
let surveyIndex=null;
const admPan = new Scenes.BaseScene("admin");
admPan.enter(ctx => ctx.reply("Введите пароль"));
admPan.on('text', async ctx => {
    const adPass = adminPass; // Replace with your actual admin password
    if(ctx.message.text === adPass) {
        ctx.session.adminPassword = adPass;
        await ctx.reply("Выберите действия!!!", adminMenu);
        isAdmin = true;
        return ctx.scene.leave();
    } else {
        return ctx.reply("Неверный пароль. Попробуйте ещё раз.");
    }
});

const stage = new Scenes.Stage([admPan]);
bot.use(session());
bot.use(stage.middleware());

// Register the command handler to enter the admin scene
bot.command("admin", ctx => ctx.scene.enter("admin"));

const adminMenu = Markup.keyboard([
    Markup.button.callback('Создать опрос', 'create_survey'),
    Markup.button.callback('Просмотр результатов', 'view_results'),
    Markup.button.callback('Опубликовать опрос', 'publish_survey')
]);

// Обработка нажатий кнопок администратора
bot.action('create_survey', (ctx) => {

});

bot.action('view_results', (ctx) => {

});

bot.action('publish_survey', (ctx) => {

});

bot.command('quiz', (ctx) => {
    const userId = ctx.from.id;
    const keyboard = Markup.inlineKeyboard(
        surveyData.map((survey, index) => [Markup.button.callback(survey.name, `survey:${index}`)])
    );
    ctx.reply('Выберите опрос:', keyboard);
});

bot.action(/survey:(\d+)/, (ctx) => {
    surveyIndex = parseInt(ctx.match[1]);
    const userId = ctx.from.id;
    activeSurvey[userId] = surveyIndex;
    if (userResolvedAll(userId, surveyIndex)) {
    } else {
        const survey = surveyData[surveyIndex];
        if (survey) {
            const question = getNextQuestionForUser(userId, surveyIndex);
            if (question) {
                sendQuestion(ctx, question, null, survey.name);
            } else {
                ctx.reply('Нет доступных опросов.');
            }
        } else {
            ctx.reply('Молодец-ты что-то сломал');
        }
    }
});
const surveyMessages = {};

// Функция сохранения идентификатора сообщения опроса
function saveSurveyMessage(userId, messageId) {
    if (!surveyMessages[userId]) {
        surveyMessages[userId] = [];
    }
    surveyMessages[userId].push(messageId);
}

// Функция удаления всех сообщений опроса
async function deleteSurveyMessages(ctx, userId) {
    if (surveyMessages[userId]) {
        for (const messageId of surveyMessages[userId]) {
            try {
                await ctx.telegram.deleteMessage(userId, messageId);
            } catch (error) {
                console.error('Error deleting message:', error);
            }
        }
        // Очищаем массив идентификаторов сообщений опроса
        delete surveyMessages[userId];
    }
}

function sendSurveyResults(ctx, userId) {
    const userAnswers = userResponses[userId];
    // Получаем имя текущего опроса из первого элемента surveyData
    const surveyName = surveyData[0].name;
    // Подготовка результатов опроса с включением имени опроса
    let results = `Результаты опроса "${surveyName}":\n`;
    for (const key in userAnswers) {
        results += `${key}: ${userAnswers[key]}\n`;
    }

    // Отправка результатов пользователю
    ctx.reply(results);
}

function getQuestionByKey(key) {
    for (const survey of surveyData) {
        const question = survey.questions.find(q => q.key === key);
        if (question) {
            return question;
        }
    }
    return null;
}
bot.action(/answer:(.+)/, async (ctx) => {
    const userId = ctx.from.id;
    const [key, answer] = ctx.match[1].split("|");

    // Определяем тип вопроса
    const question = getQuestionByKey(key);
    if (!question) {
        return ctx.reply('Вопрос не найден - вы что-то сломали)');
    }

    // Обрабатываем пропуск необязательного вопроса
    if (answer === 'skipped' && question.optional) {
        saveAnswer(userId, key, 'пропущен');
        const surveyIndex = parseInt(key.substring(1, 2)); // Извлекаем индекс опроса из ключа вопроса
        if (userResolvedAll(userId, surveyIndex)) {
            await deleteSurveyMessages(ctx, userId);
            sendSurveyResults(ctx, userId);
        } else {
            const nextQuestion = getNextQuestionForUser(userId);
            sendQuestion(ctx, nextQuestion);
        }
        return;
    }

    // Обработка ответа в зависимости от типа вопроса
    if (question.type === 'text') {
        saveAnswer(userId, key, answer);
    } else if (question.type === 'radio') {
        saveAnswer(userId, key, [answer]);
    } else if (question.type === 'checkbox') {
        const userAnswers = userResponses[userId] && userResponses[userId][key] ? userResponses[userId][key] : [];
        if (answer === 'done') {
            saveAnswer(userId, key, userAnswers);
        } else {
            const index = userAnswers.indexOf(answer);
            if (index !== -1) {
                userAnswers.splice(index, 1); // Удаляем ответ, если он уже выбран
            } else {
                userAnswers.push(answer); // Добавляем ответ, если его нет в списке
            }
            userResponses[userId][key] = userAnswers;

            // Отправляем новое сообщение с обновленной клавиатурой, передавая идентификатор предыдущего сообщения
            const previousMessageId = ctx.callbackQuery.message.message_id;
            await sendQuestion(ctx, question, previousMessageId);
            return;
        }
    }

    // Обновленная обработка завершения опроса
    const surveyIndex = parseInt(key.substring(1, 2)); // Извлекаем индекс опроса из ключа вопроса
    if (userResolvedAll(userId, surveyIndex)) {
        // Удаляем все сообщения опроса
        await deleteSurveyMessages(ctx, userId);

        // Отправляем результаты опроса
        sendSurveyResults(ctx, userId);
    } else {
        const nextQuestion = getNextQuestionForUser(userId);
        sendQuestion(ctx, nextQuestion);
    }
});
// Функция отправки вопроса с возможностью удаления предыдущего сообщения
async function sendQuestion(ctx, question, previousMessageId, surveyName,surveyIndex) {
    // Удаляем предыдущее сообщение, если есть его идентификатор
    if (!question) {
        // Send survey results and perform any necessary cleanup
        const userId = ctx.from.id;
        await deleteSurveyMessages(ctx, userId);
        sendSurveyResults(ctx, userId);
        return; // Exit the function since there's no question to send
    }
    if (previousMessageId) {
        try {
            await ctx.deleteMessage(previousMessageId);
        } catch (error) {
            console.error('Error deleting previous message:', error);
        }
    }

    let messageId = null; // Инициализируем переменную для хранения идентификатора отправленного сообщения

    let keyboard = null; // Инициализируем переменную для клавиатуры

    if (question.optional) {
        keyboard = {
            inline_keyboard: [
                [{ text: 'Пропустить', callback_data: `answer:${question.key}|skipped` }]
            ]
        };
    }

    if (question.type === 'text') {
        messageId = (await ctx.reply(question.text, { reply_markup: keyboard })).message_id; // Сохраняем идентификатор отправленного сообщения
    } else if (question.type === 'radio') {
        keyboard = {
            inline_keyboard: question.options.map(option => [{
                text: option,
                callback_data: `answer:${question.key}|${option}`
            }]).concat(keyboard ? keyboard.inline_keyboard : [])
        };
        messageId = (await ctx.reply(question.text, { reply_markup: keyboard })).message_id; // Сохраняем идентификатор отправленного сообщения
    } else if (question.type === 'checkbox') {
        keyboard = {
            inline_keyboard: question.options.map(option => [{
                text: `${userResponses[ctx.from.id]?.[question.key]?.includes(option) ? '☑️' : ' '} ${option}`,
                callback_data: `answer:${question.key}|${option}`
            }]).concat([[{ text: 'Done', callback_data: `answer:${question.key}|done` }]]).concat(keyboard ? keyboard.inline_keyboard : [])
        };
        messageId = (await ctx.reply(question.text, { reply_markup: keyboard })).message_id; // Сохраняем идентификатор отправленного сообщения
    }

    // Сохраняем идентификатор отправленного сообщения опроса
    saveSurveyMessage(ctx.from.id, messageId);

    // Если это не последний вопрос, сохраняем идентификатор следующего сообщения
    if (!userResolvedAll(ctx.from.id,surveyIndex)) {
        saveSurveyMessage(ctx.from.id, messageId);
    }

    // Возвращаем идентификатор отправленного сообщения для последующего использования
    return messageId;
}


function getNextQuestionForUser(userId) {
    const answeredKeys = userResponses[userId] ? Object.keys(userResponses[userId]) : [];
    let nextQuestion;
    for (let i = 0; i < surveyData.length; i++) {
        const survey = surveyData[i];
        for (let j = 0; j < survey.questions.length; j++) {
            const question = survey.questions[j];
            if (!answeredKeys.includes(question.key)) {
                return question; // Найден следующий вопрос, сразу возвращаем его
            }
        }
    }
    return nextQuestion;
}


function saveAnswer(userId, key, answer) {
    if (!userResponses[userId]) {
        userResponses[userId] = {};
    }
    userResponses[userId][key] = answer;
    fs.writeFileSync('userResponses.json', JSON.stringify(userResponses, null, 2), 'utf-8');
}
function userResolvedAll(userId, surveyIndex) {
    if (!userResponses[userId] || !surveyData[surveyIndex]) {
        return false;
    }

    const answeredKeys = Object.keys(userResponses[userId][surveyIndex] || {});
    const allQuestionKeys = surveyData[surveyIndex].questions.map(question => question.key);
    return answeredKeys.length === allQuestionKeys.length;
}

bot.on(message("text"), (ctx) => {
    const userId = ctx.from.id;
    if( activeSurvey[userId] ===  surveyIndex){
        const question = getNextQuestionForUser(userId); // Получаем текущий вопрос пользователя
        // Проверяем, является ли текущий вопрос текстовым
        if (question && question.type === 'text') {
            const answer = ctx.message.text; // Получаем текстовый ответ пользователя
            saveAnswer(userId, question.key, answer); // Сохраняем ответ
            if (userResolvedAll(userId)) {
            } else {
                const nextQuestion = getNextQuestionForUser(userId);
                sendQuestion(ctx, nextQuestion);
            }
        }
    }
});

bot.launch();
console.log('Bot is running');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));