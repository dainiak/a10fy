import {HNSWWithDB} from "hnsw";

const chatsVectorDB = await HNSWWithDB.create(5, 25, "ChatsVectorIndexDB");
const pagesVectorDB = await HNSWWithDB.create(5, 25, "PagesVectorIndexDB");