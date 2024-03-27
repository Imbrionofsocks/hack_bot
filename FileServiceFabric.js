import {FileService} from "./FileService.js";

export class FileServiceFabric {

    static  surveyService = new FileService("quiz.json");
    static  userService = new FileService("userResponses.json");

    static getSurveyService() {
        return FileServiceFabric.surveyService;
    }

    static getUserService() {
        return FileServiceFabric.userService;
    }
}