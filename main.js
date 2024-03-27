import * as consts from './const.js'
import {Scenes, session, Telegraf} from 'telegraf';
import fs from 'fs';
import {Markup} from 'telegraf';
import {message} from "telegraf/filters";
import surveyData from './quiz.json' assert {type: 'json'};
import userResponses from './userResponses.json' assert {type: 'json'};
import answers from './answers.json' assert {type: 'json'};
import botUsers from './botUsers.json' assert {type: 'json'};
import {addUuidToQuestion} from "./utils.js";
import {sendExcelFile} from "./export.js";
const xlsxFile = "responses.xlsx"; // файл для хранения созданного xlsx
const surveyFile = "quiz.json";//quiz
const answerFile = "answers.json";
const userResponsesFile = "userResponses.json"
const adminPass = process.env.ADMIN_PASSWORD
const activeSurvey = {};
let surveyDataObj = surveyData;
let userResponsesObj = userResponses;
addUuidToQuestion(surveyDataObj);
addUuidToQuestion(surveyDataObj);
consts.bot.start((ctx) => {
    ctx.reply('Привет! Нажми на /quiz чтобы начать проходить опрос.')
    const userId = ctx.from.id;
    if (!botUsers.users.find((element) => element === userId)) {
        botUsers.users.push(userId)
        fs.writeFileSync('botUsers.json', JSON.stringify(botUsers), 'utf-8');
    }
});

let surveyIndex = null;
const admPan = new Scenes.BaseScene("admin");
admPan.enter(ctx => ctx.reply("Введите пароль"));
admPan.on(message('text'), async ctx => {
    const adPass = adminPass; // Replace with your actual admin password
    if (ctx.message.text === adPass) {
        ctx.session.adminPassword = adPass;
        await ctx.reply("Вы внутри",adminMenu);
        return ctx.scene.leave();
    } else {
       ctx.reply("Неверный пароль!!!!!!!!");
       return ctx.scene.leave();
    }
});

const stage = new Scenes.Stage([admPan]);
consts.bot.use(session());
consts.bot.use(stage.middleware());

// Register the command handler to enter the admin scene
consts.bot.command("admin", ctx => ctx.scene.enter("admin"));


const adminMenu = Markup.keyboard([
    Markup.button.webApp("Создать опрос", consts.WEB_APP_URL),
    Markup.button.callback('Просмотр результатов', 'view_results'),
    Markup.button.callback('Опубликовать опрос', 'опубликовать')
]);


consts.bot.on(message('web_app_data'), (ctx) => {
    const survey = ctx.message.web_app_data.data;
    console.log("Новый опрос получен: ", survey);
    fs.writeFileSync(surveyFile, survey);
    surveyDataObj=JSON.parse(fs.readFileSync(surveyFile,"utf-8"));
    addUuidToQuestion(surveyDataObj);
    fs.writeFileSync(userResponsesFile, '{}');
    userResponsesObj=JSON.parse(fs.readFileSync(userResponsesFile,"utf-8"));
});



consts.bot.hears('Просмотр результатов', (ctx) => {
    sendExcelFile(ctx, answerFile, xlsxFile);
});


consts.bot.hears('Опубликовать опрос', (ctx) => {
    if (ctx.session.adminPassword === adminPass) {
        console.log("АААААААААААААААА");
        // Загрузка данных о пользователях из файла Obj.json
        let messageText = "Привет появился новый опрос! Кликни /quiz чтобы пройти!!!!";
        botUsers.users.forEach(async(element) => {
            ctx.telegram.sendMessage(element, messageText).catch(e=> console.log(`${element} заблокинован`));
        });
    } else {
        return ctx.telegram.sendMessage(ctx.from.id, "НЕДОСТАТОЧНО ПРАВ");
    }
});

consts.bot.command('quiz', (ctx) => {
    const userId = ctx.from.id;
    // Проверяем, есть ли информация о пользователе в файле Obj.json
    if (userResponsesObj[userId]) {
        ctx.reply('Вы уже прошли опрос.'); // Если есть, отправляем сообщение о том, что опрос уже пройден
    } else {
        // Иначе начинаем опрос
        const keyboard = Markup.inlineKeyboard(
            surveyDataObj.map((survey, index) => [Markup.button.callback(survey.name, `survey:${index}`)])
        );
        ctx.reply('Пройдите опрос:', keyboard);
    }
});

consts.bot.action(/survey:(\d+)/, (ctx) => {
    surveyIndex = parseInt(ctx.match[1]);
    const userId = ctx.from.id;
    activeSurvey[userId] = surveyIndex;
    if (userResolvedAll(userId, surveyIndex)) {
    } else {
        const survey = surveyDataObj[surveyIndex];
        if (survey) {
            const question = getNextQuestionForUser(userId, surveyIndex);
            if (question) {
                sendQuestion(ctx, question, null, null, surveyIndex);
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
    const userAnswers = userResponsesObj[userId];
    // Получаем имя текущего опроса из первого элемента surveyDataObj
    const surveyName = surveyDataObj[0].name;
    // Подготовка результатов опроса с включением имени опроса
    let results = `Результаты опроса "${surveyName}":\n`;
    for (const text in userAnswers) {
        results += `${text}: ${userAnswers[text]}\n`;
    }

    // Отправка результатов пользователю
    ctx.reply(results);
}

const getKeyByQuestion = (question) => {
    return question.id
}
consts.bot.action(/answer:(.+)/, async (ctx) => {
    const userId = ctx.from.id;
    console.log(ctx.match)
    const [id, answer] = ctx.match[1].split("|");
    console.log(id)
    console.log(answer)

    // Определяем тип вопроса
    const question = surveyDataObj[0].questions.find(element => element.id === id);
    if (!question) {
        return ctx.reply('Вопрос не найден - вы что-то сломали)');
    }

// Обрабатываем пропуск необязательного вопроса
    if (answer === 'skipped' && question.optional) {
        saveAnswer(userId, question.text, 'пропущен', surveyDataObj[0].name);
        const surveyIndex = parseInt(id.substring(1, 2)); // Извлекаем индекс опроса из ключа вопроса
        if (userResolvedAll(userId, surveyIndex)) {
            await deleteSurveyMessages(ctx, userId);
            sendSurveyResults(ctx, userId);
        } else {
            const nextQuestion = getNextQuestionForUser(userId);
            await sendQuestion(ctx, nextQuestion);
        }
        return;
    }

    // Обработка ответа в зависимости от типа вопроса
    if (question.type === 'text') {
        saveAnswer(userId, question.text, answer, surveyDataObj[0].name);
    } else if (question.type === 'radio') {
        saveAnswer(userId, question.text, answer, surveyDataObj[0].name);
    } else if (question.type === 'checkbox') {
        const userAnswers = userResponsesObj[userId] && userResponsesObj[userId][question.text] ? userResponsesObj[userId][question.text] : [];
        if (answer === 'done') {
            saveAnswer(userId, question.text, userAnswers, surveyDataObj[0].name);
        } else {
            const index = userAnswers.indexOf(answer);
            if (index !== -1) {
                userAnswers.splice(index, 1); // Удаляем ответ, если он уже выбран
            } else {
                userAnswers.push(answer); // Добавляем ответ, если его нет в списке
            }
            userResponsesObj[userId][question.text] = userAnswers;

            // Отправляем новое сообщение с обновленной клавиатурой, передавая идентификатор предыдущего сообщения
            const previousMessageId = ctx.callbackQuery.message.message_id;
            await sendQuestion(ctx, question, previousMessageId);
            return;
        }
    }

    // Обновленная обработка завершения опроса
    const surveyIndex = parseInt(id.substring(1, 2)); // Извлекаем индекс опроса из ключа вопроса
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
async function sendQuestion(ctx, question, previousMessageId, surveyName, surveyIndex) {
    // Удаляем предыдущее сообщение, если есть его идентификатор
    if (!question) {
        // Отправляем результаты опроса и выполняем все необходимые действия по очистке
        const userId = ctx.from.id;
        await deleteSurveyMessages(ctx, userId);
        sendSurveyResults(ctx, userId);
        return; // Выходим из функции, так как вопросов для отправки нет
    }
    if (previousMessageId) {
        try {
            await ctx.deleteMessage(previousMessageId);
        } catch (error) {
            console.error('Error deleting previous message:', error);
        }
    }

    let messageId = null; // Переменная для хранения идентификатора отправленного сообщения
    let keyboard = null; // Переменная для клавиатуры

    if (question.optional) {
        keyboard = {
            inline_keyboard: [
                [{text: 'Пропустить', callback_data: `answer:${getKeyByQuestion(question)}|skipped`}]
            ]
        };
    }

    if (question.type === 'text') {
        console.log(keyboard)
        const msgReply = await ctx.reply(question.text, {reply_markup: keyboard})
        messageId = msgReply.message_id; // Сохраняем идентификатор отправленного сообщения
    } else if (question.type === 'radio') {
        keyboard = {
            inline_keyboard: question.options.map(option => [{
                text: option,
                callback_data: `answer:${getKeyByQuestion(question)}|${option}`
            }]).concat(keyboard ? keyboard.inline_keyboard : [])
        };
        messageId = (await ctx.reply(question.text, {reply_markup: keyboard})).message_id; // Сохраняем идентификатор отправленного сообщения
    } else if (question.type === 'checkbox') {
        keyboard = {
            inline_keyboard: question.options.map(option => [{
                text: `${userResponsesObj[ctx.from.id]?.[question.text]?.includes(option) ? '☑️' : ' '} ${option}`,
                callback_data: `answer:${getKeyByQuestion(question)}|${option}`
            }]).concat([[{
                text: 'Done',
                callback_data: `answer:${getKeyByQuestion(question)}|done`
            }]]).concat(keyboard ? keyboard.inline_keyboard : [])
        };
        messageId = (await ctx.reply(question.text, {reply_markup: keyboard})).message_id; // Сохраняем идентификатор отправленного сообщения
    }

    // Сохраняем идентификатор отправленного сообщения опроса
    saveSurveyMessage(ctx.from.id, messageId);

    // Если это не последний вопрос, сохраняем идентификатор следующего сообщения
    if (!userResolvedAll(ctx.from.id, surveyIndex)) {
        saveSurveyMessage(ctx.from.id, messageId);
    }

    // Возвращаем идентификатор отправленного сообщения для дальнейшего использования
    return messageId;
}


function getNextQuestionForUser(userId) {
    const answeredKeys = userResponsesObj[userId] ? Object.keys(userResponsesObj[userId]) : [];
    let nextQuestion;
    for (let i = 0; i < surveyDataObj.length; i++) {
        const survey = surveyDataObj[i];
        for (let j = 0; j < survey.questions.length; j++) {
            const question = survey.questions[j];
            if (!answeredKeys.includes(question.text)) {
                return question; // Найден следующий вопрос, сразу возвращаем его
            }
        }
    }
    return nextQuestion;
}


function saveAnswer(userId, text, answer, surveyName) {
    if (!userResponsesObj[userId]) {
        userResponsesObj[userId] = {};
    }
    userResponsesObj[userId][text] = answer;

    // Запись userResponsesObj в userResponsesObj.json
    fs.writeFileSync('userResponses.json', JSON.stringify(userResponsesObj, null, 2), 'utf-8');

    // Обновление answers.json
    if (!answers[surveyName]) {
        answers[surveyName] = {};
    }
    if (!answers[surveyName][text]) {
        answers[surveyName][text] = [];
    }
    answers[surveyName][text].push(answer);

    // Запись answers в answers.json
    fs.writeFileSync('answers.json', JSON.stringify(answers, null, 2), 'utf-8');
}

function userResolvedAll(userId, surveyIndex) {
    if (!userResponsesObj[userId] || !surveyDataObj[surveyIndex]) {
        return false;
    }

    const answeredKeys = Object.keys(userResponsesObj[userId]);
    const allQuestionTexts = surveyDataObj[surveyIndex].questions.map(question => question.text);
    return answeredKeys.length === allQuestionTexts.length;
}

consts.bot.on(message("text"), (ctx) => {
    const userId = ctx.from.id;
    if (activeSurvey[userId] === surveyIndex) {
        const question = getNextQuestionForUser(userId); // Получаем текущий вопрос пользователя
        // Проверяем, является ли текущий вопрос текстовым
        if (question && question.type === 'text') {
            const answer = ctx.message.text; // Получаем текстовый ответ пользователя
            saveAnswer(userId, question.text, answer, surveyDataObj[0].name); // Сохраняем ответ
            if (userResolvedAll(userId, surveyIndex)) {
            } else {
                const question = getNextQuestionForUser(userId);
                sendQuestion(ctx, question, null, surveyDataObj[0].name, surveyIndex);
            }
        }
    }
});

consts.bot.launch();


process.once('SIGINT', () => consts.bot.stop('SIGINT'));
process.once('SIGTERM', () => consts.bot.stop('SIGTERM'));