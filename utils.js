import short from "short-uuid"
import {FileServiceFabric} from "./FileServiceFabric.js";

export const addUuidToQuestion = (surveyData) => {

    surveyData.forEach(element => {
        element.questions.forEach(e => {
            if (e.id) {
                return;
            }
            e.id = short.generate();
        })
    })
    FileServiceFabric.getSurveyService().setData(surveyData);
}