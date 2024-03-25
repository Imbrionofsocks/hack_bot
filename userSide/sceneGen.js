import {Scenes} from "telegraf";
import {usersDb, surveyDb} from "./datastore.js";
//НУЖНА ФУНКЦИЯ
export class sceneGen {
    genSurveyRush() {
        const surveyRush = new Scenes.BaseScene('surveyRush')
        surveyRush.enter(async (ctx) => {
                    let qArray = [];
                    console.log("АХАХАХАХХАХАХАХАХАХХАХА")
                    surveyDb.find({name:surveyName}).forEach((element) =>qArray.push(element.question.toString()));
                    qArray.forEach((element) =>ctx.reply(qArray.push(element.question.toString())));
        })
        return surveyRush;
    }
}


