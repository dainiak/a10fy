import DataTable from 'datatables.net-bs5';
import 'datatables.net-colreorder-bs5';
import 'datatables.net-fixedheader-bs5';
import {chatListTab} from './htmlElements';
import {getChat, getChats, saveUpdatedChat, SerializedChat} from "./chatStorage";
import {ensureNonEmptyModels, ensureNonEmptyPersonas} from "../settings/ensureNonEmpty";
import {SerializedPersona} from "../settings/dataModels";
import {summarizeChat} from "../summarization";
import {getCurrentChatId, updateCurrentChatSettings} from "./messages";

declare module 'datatables.net-bs5' {
    interface Config {
        fixedHeader?: any;
        colReorder?: boolean;
    }
}

export async function initializeChatListTable(openChatCallback: (chatId: string) => void, deleteChatCallback: (chatId: string) => void) {
    DataTable.ext.errMode = 'none';
    let scrollPos: number;
    let tableBody: HTMLDivElement;

    const getData = async () => {
        return (await getChats()).map((chat) => {
            return {
                timestamp: chat.timestamp,
                topic: chat.topic,
                persona: chat.persona,
                model: chat.model,
                id: chat.id
            }
        });
    }

    const models = await ensureNonEmptyModels();
    const personas: SerializedPersona[] = await ensureNonEmptyPersonas();
    const modelNames = new Map(models.map((model) => [model.id, model.name]));
    const personaNames = new Map(personas.map((persona) => [persona.id, persona.name]));

    const chatListTable = new DataTable('#chatListTable', {
        layout: {
            top: 'search',
            topStart: null,
            topEnd: null,
            bottom: null,
            bottomStart: null,
            bottomEnd: null,
        },
        fixedHeader: {
            header: true,
            footer: false
        },
        ordering: true,
        searching: true,
        autoWidth: true,
        paging: false,
        colReorder: true,
        order: [{name: 'timestamp', dir: 'desc'}],
        scrollX: false,
        scrollY: 'calc(100vh - 250px)',
        scrollCollapse: true,
        language: {
            search: '<i class="bi bi-search"></i>',
            searchPlaceholder: "start typing here…",
            emptyTable: "No chats available",
            zeroRecords: "No matching chats found",
        },
        preDrawCallback: () => {
            tableBody ||= document.querySelector("#chatListPane .dt-scroll-body") as HTMLDivElement;
            scrollPos = tableBody.scrollTop;
        },
        drawCallback: () => {
            (tableBody as HTMLDivElement).scrollTop = scrollPos;
        },
        columns: [
            {
                title: '',
                data: 'id',
                searchable: false,
                orderable: false,
                render: (data) => `<button class="btn btn-outline-secondary btn-sm open-chat-btn" data-chat-id="${data}" aria-label="Open chat" title="Open chat"><i class="bi bi-chat-text"></i></button>`,
            },
            {title: 'Timestamp', data: 'timestamp', name: 'timestamp', searchable: true, className: 'dt-left text-left chat-timestamp'},
            {title: 'Topic', data: 'topic', name: 'topic', searchable: true, className: 'dt-left text-left chat-topic'},
            {
                title: 'LLM persona', data: 'persona', name: 'persona', searchable: true, className: 'dt-left text-left chat-persona',
                render: (data) => personaNames.has(data) ? personaNames.get(data) : "???",
            },
            {
                title: 'LLM model', data: 'model', name: 'model', searchable: true, className: 'dt-left text-left chat-model',
                render: (data) => modelNames.has(data) ? modelNames.get(data) : "???",
            },
            {
                title: '',
                data: 'id',
                searchable: false,
                orderable: false,
                render: (data) => `
<button class="btn btn-outline-danger btn-sm delete-chat-btn" data-chat-id="${data}" aria-label="Delete chat" title="Delete chat"><i class="bi bi-trash"></i></button>
<button class="btn btn-outline-danger btn-sm summarize-chat-btn" data-chat-id="${data}" aria-label="Summarize chat" title="Summarize chat"><i class="bi bi-journal-text"></i></button>
`.trim(),
            }
        ],
        data: await getData()
    });

    chatListTable.on('click', 'button', function(e) {
        const button = (e.target as HTMLElement).closest('button') as HTMLButtonElement;
        if(button.classList.contains('open-chat-btn')) {
            openChatCallback(button.dataset.chatId as string);
        }
        else if(button.classList.contains('delete-chat-btn')) {
            const tr = button.closest('tr') as HTMLTableRowElement;
            chatListTable.row(tr).remove().draw();
            deleteChatCallback(button.dataset.chatId as string);
        }
        else if(button.classList.contains('summarize-chat-btn')) {
            const tr = button.closest('tr') as HTMLTableRowElement;
            const chatId = button.dataset.chatId || "";
            getChat(chatId).then((chat) => {
                if(!chat)
                    return;
                summarizeChat(chat).then((title: string) => {
                    const td = tr.querySelector(".chat-topic") as HTMLTableCellElement;
                    if(getCurrentChatId() === chatId) {
                        updateCurrentChatSettings({topic: title});
                    } else {
                        chat.topic = title;
                        saveUpdatedChat(chat)?.catch();
                    }
                    td.textContent = title;
                })
            });
        }
    });

    chatListTab.addEventListener('shown.bs.tab', () => {
        getData().then(data => {
            chatListTable.clear();
            chatListTable.rows.add(data);
            chatListTable.draw();
        })
    });

    const searchControl = document.querySelector("#chatListPane div.dt-search") as HTMLDivElement;
    const searchLabel = document.querySelector("#chatListPane div.dt-search label") as HTMLLabelElement;
    const searchField = document.querySelector("#chatListPane div.dt-search input") as HTMLInputElement;
    searchControl.classList.add("input-group");
    searchLabel.classList.add("input-group-text");
    searchField.classList.remove("form-control-sm");
    searchField.classList.add("form-control");
    searchField.ariaLabel = "Search chats";

    return chatListTable;
}
