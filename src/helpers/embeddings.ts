import {HNSWWithDB} from "hnsw";

const hnsw = await HNSWWithDB.create(5, 25, "ChatsVectorIndex");
