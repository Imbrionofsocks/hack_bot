import {Scenes, session} from "telegraf";
import {usersDb, surveyDb} from "./datastore.js";
//НУЖНА ФУНКЦИЯ
export const sampleScene = (surveyName)=>{

    const surveyRush = new Scenes.BaseScene(surveyName)
    console.log(surveyRush)
    surveyRush.enter(async (ctx) => {
      await ctx.reply("Начат опрос:" + surveyName)
        //let qArray = [];
        //surveyDb.find({name: surveyName}).forEach((element) => qArray.push(element.question.toString()));
    })

    surveyRush.action('text', (ctx) => {
        const userId = ctx.chat.id;
        usersDb.find({userId}, (err, docs) => {
            if (docs[0].passedSurveys.forEach((element) => (element) === false)) {
                const answer = ctx.message.text;
                surveyDb.update({name: surveyName}, {$set: {"questions.answers": answer}});
                usersDb.persistence.compactDatafile();
                console.log(`User answer ${answer} added`)
                ctx.reply(`Ответ: ${answer} - успешно отправлен!`)
            }
        });
    });
    return surveyRush
}

