import short from "short-uuid"
import {FileServiceFabric} from "./next_dev/FileServiceFabric.js";

export const addUuidToQuestion = (surveyDataObj) => {

    surveyDataObj.forEach(element => {
        element.questions.forEach(e => {
            if (e.id) {
                return;
            }
            e.id = short.generate();
        })
    })
    FileServiceFabric.getSurveyService().setData(surveyDataObj);
}