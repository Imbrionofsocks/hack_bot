import fs from "fs";


export class FileService{
    fileName;
    constructor(fileName) {
        this.fileName = fileName;
    }
    setData(data){
        fs.writeFileSync(this.fileName,JSON.stringify(data, null, 2));
    }
    getData(){
        return JSON.parse(fs.readFileSync(this.fileName,"utf-8"));
    }
}
