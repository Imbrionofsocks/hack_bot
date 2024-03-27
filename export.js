import fs from 'fs';
import xlsx from "json-as-xlsx";
import { bot } from "./const.js";

const sendDocument = async (chatId, documentPath, caption) => {
    try {
        await bot.telegram.sendDocument(chatId, { source: documentPath }, { caption: caption });
        console.log('Document sent successfully');
    } catch (error) {
        console.error('Error sending document:', error);
    }
};


export const sendExcelFile = async (ctx, sourceFilePath, destFilePath) => {
    console.log(sourceFilePath)
    fs.readFile(sourceFilePath, 'utf8', async (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return;
        }

        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch (parseError) {
            console.error('Error parsing JSON data:', parseError);
            return;
        }

        if (!jsonData) {
            console.error('No data found or data is not in correct JSON format');
            return;
        }

        //Continue with the data if no errors
        console.log(jsonData);

        // This block goes right after the console.log(jsonData)
        let processedData = [];
        for (let index = 0; index < Object.keys(jsonData).length; index++) {
            let columns = [];
            let content = [];

            Object.keys(jsonData[Object.keys(jsonData)[index]]).forEach(key => {
                // Assuming first object dictates the structure
                columns.push({ label: key, value: key });
            });

            // Initialize content with empty objects. Assuming the length of jsonData[key] is the same for all keys.
            // Find the maximum length of the arrays in jsonData
            let maxLength = Math.max(...Object.values(jsonData[Object.keys(jsonData)[index]]).map(arr => arr.length));
            for (let i = 0; i < maxLength; i++) {
                content.push({});
            }

            // Fill in the content
            Object.entries(jsonData[Object.keys(jsonData)[index]]).forEach(([key, values]) => {
                for (let i = 0; i < values.length; i++) {
                    let value = values[i];
                    if (Array.isArray(value)) {
                        // Join if array, you can adjust based on your data needs
                        content[i][key] = value.join('; ');
                    } else {
                        content[i][key] = value;
                    }
                }
            });

            let processedDataPart = {
                sheet: Object.keys(jsonData)[index],
                columns, // Shorthand for columns: columns
                content,
            };
            processedData.push(processedDataPart);
        }

        let settings = {
            fileName: "Responses", // Name of the resulting spreadsheet
            extraLength: 3, // A bigger number means that columns will be wider
        }

        console.log(processedData)
        // Generate the Excel file
        xlsx(processedData, settings);
        console.log('Excel file has been created successfully');
        await sendDocument(ctx.message.chat.id, destFilePath, "");
    })

}