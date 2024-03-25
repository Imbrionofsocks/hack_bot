import {session, Telegraf,Scenes } from 'telegraf'
import {Markup} from 'telegraf'
import 'dotenv/config'
import * as consts from './const.js'
import {usersDb,surveyDb} from "./userSide/datastore.js";
import {sampleScene} from "./userSide/sceneGen.js";
usersDb.loadDatabase();
surveyDb.loadDatabase();
const bot = new Telegraf(process.env.BOT_TOKEN)
const surveyData = {
    name: "tamplate",
    description: "template",
    questions: [{q_id:"q_1",text:"Как дела?",type:"text",answers:[],optional: true}]
}
const greetingUser = (userId,passedSurveys) => {
    usersDb.find({userId}, (err, docs) => {
        if (docs.length === 0) {
            usersDb.insert({userId,passedSurveys});
            console.log(`User ${userId} added`)
        }
    });
}
const addSurveyTemplate = (name,description,questions) => {
    surveyDb.find({name}, (err, docs) => {
        if (docs.length === 0) {
            surveyDb.insert({name,description,questions});
            console.log(`Survey added`)
        }
    });
}
bot.command('start', async (ctx) => {
    const userId = ctx.chat.id;
    greetingUser(ctx.chat.id,[]);
    addSurveyTemplate(surveyData.name,surveyData.description,surveyData.questions);
    if(userId === 2134024173){
        await ctx.reply('Привет!', {
            reply_markup: {
                keyboard: [
                    ['Пройти опрос'],
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });
    }else{
        await ctx.reply('Салют адимну!', {
            reply_markup: {
                keyboard: [
                    ['Добавить опрос'],
                    ['Посмотреть результаты опроса'],
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });
    }
});

function dbChecker(dbName){
    let dataAns=[];
    if(dbName.getAllData()[0].name === undefined){
        console.log(dbName.getAllData())
        return "Нет доступных опросов";
    }else{
        dbName.getAllData().forEach((element) =>dataAns.push(element.name.toString()));
        return "Доступные опросы:" + dataAns;
    }
}

bot.hears('Пройти опрос', async ctx => {
    let dataAns=[];
    surveyDb.getAllData().forEach((element) =>dataAns.push(element.name.toString()))
    await ctx.reply(dbChecker(surveyDb),Markup.keyboard(dataAns));
})
bot.hears('tamplate', async ctx => {
    await sampleScene("tamplate");
})
bot.hears('Добавить опрос', async ctx => {
    await ctx.reply(
        "Launch mini app from  keyboard!",
        Markup.keyboard([Markup.button.webApp("Launch", consts.WEB_APP_URL)]).resize(),
    );
})
bot.hears('Посмотреть результаты опроса', ctx => ctx.reply('AAAAA'))

bot.hears('web_app_data', async (ctx) => {
    console.log(ctx.message.web_app_data)
    await ctx.reply(ctx.message.web_app_data.data)
  
  });

const stage = new Scenes.Stage([sampleScene("tamplate")]);
bot.use(session())
bot.use(stage.middleware());
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))