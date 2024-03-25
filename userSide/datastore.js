import DataStore from 'nedb'
export const usersDb = new DataStore({filename: "usersData"})
export const surveyDb = new DataStore({filename:"surveyData"})
