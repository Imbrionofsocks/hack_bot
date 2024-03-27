import dotenv from 'dotenv'
dotenv.config()

import {Telegraf} from "telegraf";

export const WEB_APP_URL = 'https://timely-valkyrie-5bbccb.netlify.app';
export const bot = new Telegraf(process.env.BOT_TOKEN);