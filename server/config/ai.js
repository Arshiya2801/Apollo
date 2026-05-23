import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default openai;
