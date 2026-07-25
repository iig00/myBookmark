/*
 * ==========================================
 * BOOKMARKS_DATA 記入例
 * ==========================================
 *
 * このファイルはデータ記入例になります
 * 実際に使用のときにはbookmarks-data.jsに変名し使用願います
 * /


/*
 * ==========================================
 * データ編集ルール
 * ==========================================
 *
 * ■ BOOKMARKS_DATA
 *
 * ・カテゴリはデータ整理用です。
 * ・カテゴリ名は自由に設定できます。
 * ・ブックマークキーは全体で一意にしてください。
 * ・titleを省略した場合はブックマークキーを表示名に使用します。
 * ・urlとtagsは必須です。
 * ・tagsはタグ名の配列で指定してください。
 * ・タグ名は大文字・小文字を区別します。
 * ・同じタグとして扱う場合は、表記を完全に統一してください。
 *
 * 例
 *
 * Google: {
 *   url: "...",
 *   tags: ["search", "engine"],
 * }
 *
 *
 * ■ TAG_GROUP
 *
 * ・キーがグループ名になります。
 * ・mainには所属条件となるタグを配列で指定します。
 * ・mainは1個以上指定してください。
 * ・mainを複数指定した場合は、すべて必須になります。
 * ・subには関連タグを配列で指定します。
 * ・subを使用しない場合でも省略せず、[] を指定してください。
 *
 * 例
 *
 * search: {
 *   main: ["search"],
 *   sub: ["engine", "news"],
 * }
 *
 * 通販: {
 *   main: ["shopping", "online"],
 *   sub: [],
 * }
 */




window.TAG_GROUP = {

    Search: {
        main: ["search"],
        sub: ["engine", "news"],
    },

    Shopping: {
        main: ["shopping", "online"],
        sub: [],
    },

    Ebook: {
        main: ["ebook"],
        sub: ["manga"],
    },
};

window.BOOKMARKS_DATA = {

    Search: {

        ExampleSearch: {
            url: "https://example.com/",

            tags: [
                "search",
                "engine",
            ],

            lower: {
                news: "ExampleNews",
            },
        },

        ExampleSearch2: {
            title: "Another Search",

            url: "https://example.net/",

            tags: [
                "search",
                "engine",
            ],
        },
    },

    News: {

        ExampleNews: {
            url: "https://news.example.com/",

            tags: [
                "news",
                "information",
            ],
        },
    },

    Shopping: {

        ExampleShop: {
            url: "https://shop.example.com/",

            tags: [
                "shopping",
                "online",
                "electronics",
            ],
        },
    },

    Ebook: {

        ExampleBook: {
            title: "Example eBook",

            url: "https://book.example.com/",

            tags: [
                "ebook",
                "shopping",
                "online",
                "manga",
            ],
        },
    },
};